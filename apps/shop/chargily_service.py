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
    """
    Creates a Chargily checkout for the given Order.
    Returns the full Chargily response dict (has 'id' and 'checkout_url').
    """
    site = settings.SITE_URL.rstrip('/')

    # Amount: use recorded total_amount if set, otherwise product price × qty
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
    return client.validate_signature(signature, payload)
