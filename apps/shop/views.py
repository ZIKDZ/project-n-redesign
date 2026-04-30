import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from .models import Product, ProductImage, Order, WILAYA_CHOICES


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
    """Public — submit an order."""
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

        variant_values     = data.get('variant_values', {})
        custom_field_values = data.get('custom_field_values', {})

        if not isinstance(variant_values, dict):
            variant_values = {}
        if not isinstance(custom_field_values, dict):
            custom_field_values = {}

        order = Order.objects.create(
            product=product,
            product_name=product_name,
            variant_values=variant_values,
            quantity=int(data.get('quantity', 1)),
            custom_field_values=custom_field_values,
            full_name=data['full_name'],
            email=data['email'],
            phone=data['phone'],
            wilaya=data.get('wilaya', ''),
            address=data.get('address', ''),
        )
        return JsonResponse({'success': True, 'id': order.id}, status=201)

    except KeyError as e:
        return JsonResponse({'error': f'Missing field: {e}'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# ── Staff ──────────────────────────────────────────────────────────────────────

@login_required
@require_http_methods(['GET'])
def list_products_all(request):
    """Staff — all products with gallery images."""
    qs = Product.objects.all().prefetch_related('images').order_by('display_order', 'id')
    return JsonResponse({'products': [_product_dict(p) for p in qs]})


@login_required
@require_http_methods(['POST'])
def create_product(request):
    """Staff only — create a product."""
    try:
        if request.content_type and 'multipart' in request.content_type:
            data        = request.POST
            banner_file = request.FILES.get('banner')
        else:
            data        = json.loads(request.body)
            banner_file = None

        # Parse variant_config
        variant_config_raw = data.get('variant_config', '{}')
        try:
            variant_config = json.loads(variant_config_raw)
        except (json.JSONDecodeError, TypeError):
            variant_config = {'attributes': [], 'variants': []}

        # Parse custom_fields
        custom_fields_raw = data.get('custom_fields', '[]')
        try:
            custom_fields = json.loads(custom_fields_raw)
        except (json.JSONDecodeError, TypeError):
            custom_fields = []

        product = Product(
            name=data['name'],
            description=data.get('description', ''),
            price=data['price'],
            category=data.get('category', 'jersey'),
            banner_url=data.get('banner_url', '') if not banner_file else '',
            variant_config=variant_config,
            custom_fields=custom_fields,
            track_stock=str(data.get('track_stock', 'true')).lower() != 'false',
            is_active=str(data.get('is_active', 'true')).lower() != 'false',
            is_featured=str(data.get('is_featured', 'false')).lower() == 'true',
            display_order=int(data.get('display_order', 0)),
        )
        if banner_file:
            product.banner = banner_file
        product.save()

        # Add gallery images
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
    """Staff only — update a product."""
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

        if 'variant_config' in data:
            try:
                product.variant_config = json.loads(data['variant_config'])
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


# ── Orders ─────────────────────────────────────────────────────────────────────

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