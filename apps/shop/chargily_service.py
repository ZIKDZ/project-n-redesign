# apps/shop/chargily_service.py
import hashlib
import hmac
import logging
from django.conf import settings
from chargily_pay import ChargilyClient
from chargily_pay.entity import Checkout

logger = logging.getLogger(__name__)

client = ChargilyClient(
    key=settings.CHARGILY_KEY,
    secret=settings.CHARGILY_SECRET,
    url=settings.CHARGILY_URL,
)


def create_chargily_checkout(order) -> dict:
    site = settings.SITE_URL.rstrip('/')

    if order.total_amount and float(order.total_amount) > 0:
        amount = int(float(order.total_amount))
    elif order.product:
        amount = int(float(order.product.price) * order.quantity)
    else:
        raise ValueError("Cannot determine order amount for Chargily checkout.")

    checkout = Checkout(
        amount=amount,
        currency='dzd',
        success_url=f"{site}/shop/payment/success?order={order.id}",
        failure_url=f"{site}/shop/payment/failed?order={order.id}",
        webhook_endpoint=f"{site}/api/shop/webhook/",
        description=f"Order #{order.id} — {order.product_name} × {order.quantity}",
        locale='ar',
        pass_fees_to_customer=False,
        metadata={'order_id': str(order.id)},
    )

    response = client.create_checkout(checkout)
    logger.info("Chargily checkout created: %s for order #%s", response.get('id'), order.id)
    return response


def validate_webhook(signature: str, payload: str) -> bool:
    """
    Validate the Chargily webhook signature using HMAC-SHA256.
    The signature header is computed as: HMAC(secret_key, raw_payload, sha256).hexdigest()
    """
    try:
        secret = settings.CHARGILY_SECRET.encode('utf-8')
        computed = hmac.new(
            secret,
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(computed, signature)
    except Exception as e:
        logger.error("Webhook signature validation error: %s", e)
        return False