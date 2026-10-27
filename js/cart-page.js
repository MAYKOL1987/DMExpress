import { getCart, removeFromCart, updateCartQuantity } from './utils/cart.js';
import { renderCart, updateCartBadge } from './ui/ui.js';

const container = document.querySelector('[data-cart-content]');

function drawCart() {
  const cart = getCart();
  updateCartBadge(cart);
  renderCart(container, cart, {
    onRemove: (id, size) => { removeFromCart(id, size); drawCart(); },
    onQuantity: (id, delta, size) => {
      const item = getCart().find((product) => product.id === id && (product.size ?? '') === size);
      if (!item) return;
      if (item.quantity + delta <= 0) removeFromCart(id, size);
      else updateCartQuantity(id, item.quantity + delta, size);
      drawCart();
    },
    onCheckout: () => window.alert('El checkout se conectará cuando esté disponible la API de pagos.'),
  });
}

drawCart();
