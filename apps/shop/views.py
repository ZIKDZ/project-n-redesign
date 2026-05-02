import json
import logging
from datetime import date
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from .models import Product, ProductImage, Order, Coupon, WILAYA_CHOICES

logger = logging.getLogger(__name__)


def _product_dict(product):
    """Return product with gallery images."""
    data = product.to_dict()
    data['images'] = [img.to_dict() for img in product.images.all()]
    return data


# ── Public ─────────────────────────────────────────────────────────────────────

@require_http_methods(['GET'])
def list_products(request):
    """Public — active products."""
    qs = Product.objects.filter(is_active=True).prefetch_related('images')
    category = request.GET.get('category')
    if category:
        qs = qs.filter(category=category)
    return JsonResponse({'products': [_product_dict(p) for p in qs]})


@require_http_methods(['GET'])
def get_product(request, pk):
    """Public — single product detail."""
    try:
        product = Product.objects.prefetch_related('images').get(pk=pk, is_active=True)
        return JsonResponse(_product_dict(product))
    except Product.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)


@csrf_exempt
@require_http_methods(['POST'])
def submit_order(request):
    """
    Public — submit an order.

    Payment routing:
    - product.payment_method == 'cod'    → skip Chargily, return checkout_url=''
    - product.payment_method == 'online' → always open Chargily checkout
    - product.payment_method == 'both'   → honour the 'payment_method' field
                                           sent by the client ('cod' | 'online')

    Returns: { success, id, checkout_url }
    checkout_url == '' means COD — the frontend should show the inline success screen.
    """
    try:
        data         = json.loads(request.body)
        product_id   = data.get('product_id')
        product      = None
        product_name = data.get('product_name', '')

        if product_id:
            try:
                product      = Product.objects.get(pk=product_id, is_active=True)
                product_name = product.name
            except Product.DoesNotExist:
                pass

        variant_values      = data.get('variant_values', {})
        custom_field_values = data.get('custom_field_values', {})

        if not isinstance(variant_values, dict):
            variant_values = {}
        if not isinstance(custom_field_values, dict):
            custom_field_values = {}

        coupon_code     = str(data.get('coupon_code', '') or '').strip().upper()
        discount_amount = float(data.get('discount_amount', 0) or 0)
        total_amount    = float(data.get('total_amount', 0) or 0)

        order = Order.objects.create(
            product=product,
            product_name=product_name,
            variant_values=variant_values,
            quantity=int(data.get('quantity', 1)),
            custom_field_values=custom_field_values,
            full_name=data['full_name'],
            email=data.get('email', ''),
            phone=data['phone'],
            wilaya=data.get('wilaya', ''),
            baladiya=data.get('baladiya', ''),
            address=data.get('address', ''),
            coupon_code=coupon_code,
            discount_amount=discount_amount,
            total_amount=total_amount,
        )

        # ── Decide payment route ───────────────────────────────────────────────
        # product_payment_method: 'cod' | 'online' | 'both'
        # client_payment_method:  what the customer chose when product is 'both'
        product_pm = getattr(product, 'payment_method', 'online') if product else 'online'
        client_pm  = str(data.get('payment_method', 'online')).strip().lower()

        # Resolve effective method
        if product_pm == 'cod':
            effective_pm = 'cod'
        elif product_pm == 'online':
            effective_pm = 'online'
        else:  # 'both' — trust the client choice
            effective_pm = client_pm if client_pm in ('cod', 'online') else 'online'

        checkout_url = ''

        if effective_pm == 'online':
            try:
                from .chargily_service import create_chargily_checkout
                chargily_response             = create_chargily_checkout(order)
                order.chargily_checkout_id    = chargily_response.get('id', '')
                order.chargily_checkout_url   = chargily_response.get('checkout_url', '')
                order.save(update_fields=['chargily_checkout_id', 'chargily_checkout_url'])
                checkout_url = order.chargily_checkout_url
            except Exception as exc:
                logger.error(
                    "Chargily checkout creation failed for order #%s: %s", order.id, exc
                )
        # COD orders need no extra work — status stays 'pending' until staff confirms

        return JsonResponse({
            'success':      True,
            'id':           order.id,
            'checkout_url': checkout_url,
        }, status=201)

    except KeyError as e:
        return JsonResponse({'error': f'Missing field: {e}'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# ── Chargily webhook ───────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['POST'])
def chargily_webhook(request):
    """
    Receives Chargily payment events and updates the matching order's status.
    """
    signature = request.headers.get('signature', '')
    payload   = request.body.decode('utf-8')

    if not signature:
        return JsonResponse({'error': 'Missing signature header'}, status=400)

    try:
        from .chargily_service import validate_webhook
        if not validate_webhook(signature, payload):
            logger.warning("Chargily webhook: invalid signature")
            return JsonResponse({'error': 'Invalid signature'}, status=403)
    except Exception as exc:
        logger.error("Chargily signature validation error: %s", exc)
        return JsonResponse({'error': 'Signature validation failed'}, status=403)

    try:
        event = json.loads(payload)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    event_type    = event.get('type', '')
    checkout_data = event.get('data', {})

    logger.info("Chargily webhook received: %s", event_type)

    metadata = checkout_data.get('metadata') or {}
    order_id = metadata.get('order_id')
    order    = None

    if order_id:
        try:
            order = Order.objects.get(pk=order_id)
        except Order.DoesNotExist:
            logger.error(
                "Chargily webhook: order #%s not found (from metadata)", order_id
            )

    if order is None:
        checkout_id = checkout_data.get('id', '')
        try:
            order = Order.objects.get(chargily_checkout_id=checkout_id)
        except Order.DoesNotExist:
            logger.error(
                "Chargily webhook: no order found for checkout %s", checkout_id
            )
            return JsonResponse({'error': 'Order not found'}, status=404)

    if event_type == 'checkout.paid':
        order.status = 'confirmed'
        logger.info("Order #%s marked as confirmed (payment received)", order.id)
    elif event_type == 'checkout.failed':
        order.status = 'cancelled'
        order.notes  = (order.notes + '\nPayment failed via Chargily.').strip()
    elif event_type == 'checkout.canceled':
        order.status = 'cancelled'
        order.notes  = (order.notes + '\nCancelled by customer on Chargily.').strip()
    elif event_type == 'checkout.expired':
        order.status = 'cancelled'
        order.notes  = (order.notes + '\nChargily checkout expired.').strip()
    else:
        logger.info("Chargily webhook: unhandled event type '%s'", event_type)
        return JsonResponse({'received': True}, status=200)

    order.save()
    return JsonResponse({'success': True}, status=200)


# ── Staff — Products ───────────────────────────────────────────────────────────

@login_required
@require_http_methods(['GET'])
def list_products_all(request):
    qs = Product.objects.all().prefetch_related('images').order_by('display_order', 'id')
    return JsonResponse({'products': [_product_dict(p) for p in qs]})


@login_required
@require_http_methods(['POST'])
def create_product(request):
    try:
        if request.content_type and 'multipart' in request.content_type:
            data        = request.POST
            banner_file = request.FILES.get('banner')
        else:
            data        = json.loads(request.body)
            banner_file = None

        variant_config_raw = data.get('variant_config', '{}')
        try:
            variant_config = json.loads(variant_config_raw)
        except (json.JSONDecodeError, TypeError):
            variant_config = {'attributes': [], 'variants': []}

        if isinstance(variant_config, dict):
            clean_attrs = [
                {'name': a['name']}
                for a in variant_config.get('attributes', [])
                if isinstance(a, dict) and a.get('name')
            ]
            clean_variants = [
                {
                    'id':        v.get('id', ''),
                    'attribute': v.get('attribute', ''),
                    'value':     v.get('value', ''),
                    'stock':     int(v.get('stock', 0)),
                }
                for v in variant_config.get('variants', [])
                if isinstance(v, dict) and v.get('attribute') and v.get('value')
            ]
            variant_config = {'attributes': clean_attrs, 'variants': clean_variants}

        custom_fields_raw = data.get('custom_fields', '[]')
        try:
            custom_fields = json.loads(custom_fields_raw)
        except (json.JSONDecodeError, TypeError):
            custom_fields = []

        payment_method = data.get('payment_method', 'online')
        if payment_method not in ('cod', 'online', 'both'):
            payment_method = 'online'

        product = Product(
            name=data['name'],
            description=data.get('description', ''),
            price=data['price'],
            category=data.get('category', 'jersey'),
            banner_url=data.get('banner_url', '') if not banner_file else '',
            variant_config=variant_config,
            custom_fields=custom_fields,
            track_stock=str(data.get('track_stock', 'true')).lower() != 'false',
            payment_method=payment_method,
            is_active=str(data.get('is_active', 'true')).lower() != 'false',
            is_featured=str(data.get('is_featured', 'false')).lower() == 'true',
            display_order=int(data.get('display_order', 0)),
        )
        if banner_file:
            product.banner = banner_file
        product.save()

        gallery_keys = sorted(
            [k for k in request.FILES if k.startswith('gallery_')],
            key=lambda k: int(k.split('_', 1)[1]) if k.split('_', 1)[1].isdigit() else 999,
        )
        for order_idx, key in enumerate(gallery_keys):
            ProductImage.objects.create(
                product=product,
                image=request.FILES[key],
                display_order=order_idx,
            )

        product.refresh_from_db()
        return JsonResponse(_product_dict(product), status=201)

    except KeyError as e:
        return JsonResponse({'error': f'Missing field: {e}'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['PUT', 'PATCH'])
def update_product(request, pk):
    try:
        product = Product.objects.prefetch_related('images').get(pk=pk)

        if request.content_type and 'multipart' in request.content_type:
            from django.http.multipartparser import MultiPartParser
            parser           = MultiPartParser(request.META, request, request.upload_handlers)
            post_data, files = parser.parse()
            data             = post_data
            banner_file      = files.get('banner')
        else:
            data        = json.loads(request.body)
            banner_file = None
            files       = {}

        for field in ['name', 'description', 'price', 'category', 'display_order']:
            if field in data:
                setattr(product, field, data[field])

        if 'is_active' in data:
            product.is_active = str(data['is_active']).lower() != 'false'
        if 'is_featured' in data:
            product.is_featured = str(data['is_featured']).lower() == 'true'
        if 'track_stock' in data:
            product.track_stock = str(data['track_stock']).lower() != 'false'
        if 'payment_method' in data:
            pm = str(data['payment_method']).strip().lower()
            product.payment_method = pm if pm in ('cod', 'online', 'both') else 'online'

        if 'variant_config' in data:
            try:
                variant_config = json.loads(data['variant_config'])
                if isinstance(variant_config, dict):
                    clean_attrs = [
                        {'name': a['name']}
                        for a in variant_config.get('attributes', [])
                        if isinstance(a, dict) and a.get('name')
                    ]
                    clean_variants = [
                        {
                            'id':        v.get('id', ''),
                            'attribute': v.get('attribute', ''),
                            'value':     v.get('value', ''),
                            'stock':     int(v.get('stock', 0)),
                        }
                        for v in variant_config.get('variants', [])
                        if isinstance(v, dict) and v.get('attribute') and v.get('value')
                    ]
                    product.variant_config = {
                        'attributes': clean_attrs,
                        'variants':   clean_variants,
                    }
            except (json.JSONDecodeError, TypeError):
                pass

        if 'custom_fields' in data:
            try:
                product.custom_fields = json.loads(data['custom_fields'])
            except (json.JSONDecodeError, TypeError):
                pass

        if banner_file:
            product.banner     = banner_file
            product.banner_url = ''
        elif 'banner_url' in data:
            product.banner_url = data['banner_url']
            product.banner     = None

        product.save()

        if hasattr(files, 'keys'):
            gallery_keys = sorted(
                [k for k in files if k.startswith('gallery_')],
                key=lambda k: int(k.split('_', 1)[1]) if k.split('_', 1)[1].isdigit() else 999,
            )
            base_order = product.images.count()
            for order_idx, key in enumerate(gallery_keys):
                ProductImage.objects.create(
                    product=product,
                    image=files[key],
                    display_order=base_order + order_idx,
                )

        product.refresh_from_db()
        return JsonResponse(_product_dict(product))

    except Product.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['DELETE'])
def delete_product(request, pk):
    try:
        Product.objects.get(pk=pk).delete()
        return JsonResponse({'success': True})
    except Product.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)


@login_required
@require_http_methods(['POST'])
def add_gallery_image(request, pk):
    try:
        product    = Product.objects.get(pk=pk)
        image_file = request.FILES.get('image')
        image_url  = request.POST.get('image_url', '')

        if not image_file and not image_url:
            return JsonResponse({'error': 'No image provided'}, status=400)

        img = ProductImage(
            product=product,
            image_url=image_url,
            display_order=product.images.count(),
        )
        if image_file:
            img.image = image_file
        img.save()

        return JsonResponse(img.to_dict(), status=201)
    except Product.DoesNotExist:
        return JsonResponse({'error': 'Product not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['DELETE'])
def delete_gallery_image(request, pk, img_pk):
    try:
        ProductImage.objects.get(pk=img_pk, product_id=pk).delete()
        return JsonResponse({'success': True})
    except ProductImage.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)


# ── Staff — Orders ─────────────────────────────────────────────────────────────

@login_required
@require_http_methods(['GET'])
def list_orders(request):
    qs     = Order.objects.select_related('product').all()
    status = request.GET.get('status')
    if status:
        qs = qs.filter(status=status)
    return JsonResponse({'orders': [o.to_dict() for o in qs]})


@login_required
@require_http_methods(['PATCH'])
def update_order(request, pk):
    try:
        order = Order.objects.get(pk=pk)
        data  = json.loads(request.body)
        if 'status' in data:
            order.status = data['status']
        if 'notes' in data:
            order.notes = data['notes']
        order.save()
        return JsonResponse(order.to_dict())
    except Order.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['DELETE'])
def delete_order(request, pk):
    try:
        Order.objects.get(pk=pk).delete()
        return JsonResponse({'success': True})
    except Order.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)


# ── Staff — Coupons ────────────────────────────────────────────────────────────

@login_required
@require_http_methods(['GET'])
def list_coupons(request):
    coupons = Coupon.objects.all()
    return JsonResponse({'coupons': [c.to_dict() for c in coupons]})


@login_required
@require_http_methods(['POST'])
def create_coupon(request):
    try:
        data = json.loads(request.body)

        expiration_date = data.get('expiration_date') or None
        if isinstance(expiration_date, str) and expiration_date:
            expiration_date = date.fromisoformat(expiration_date)

        coupon = Coupon.objects.create(
            code=data['code'].strip().upper(),
            discount_type=data['discount_type'],
            value=data['value'],
            allowed_products=data.get('allowed_products', []),
            minimum_order_amount=data.get('minimum_order_amount', 0),
            expiration_date=expiration_date,
            is_active=data.get('is_active', True),
        )
        return JsonResponse(coupon.to_dict(), status=201)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['PATCH'])
def update_coupon(request, pk):
    try:
        coupon = Coupon.objects.get(pk=pk)
        data   = json.loads(request.body)
        if 'code' in data:
            coupon.code = data['code'].strip().upper()
        if 'discount_type' in data:
            coupon.discount_type = data['discount_type']
        if 'value' in data:
            coupon.value = data['value']
        if 'allowed_products' in data:
            coupon.allowed_products = data['allowed_products']
        if 'minimum_order_amount' in data:
            coupon.minimum_order_amount = data['minimum_order_amount']
        if 'expiration_date' in data:
            raw = data['expiration_date'] or None
            if isinstance(raw, str) and raw:
                raw = date.fromisoformat(raw)
            coupon.expiration_date = raw
        if 'is_active' in data:
            coupon.is_active = bool(data['is_active'])
        coupon.save()
        return JsonResponse(coupon.to_dict())
    except Coupon.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(['DELETE'])
def delete_coupon(request, pk):
    try:
        Coupon.objects.get(pk=pk).delete()
        return JsonResponse({'success': True})
    except Coupon.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)