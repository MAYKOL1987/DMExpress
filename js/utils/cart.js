const CART_KEY = 'dmexpress-cart';

export function getCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
}

export function addToCart(product, quantity = 1, size = '') {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id && item.size === size);
  if (existing) existing.quantity += quantity;
  else cart.push({ ...product, quantity, size });
  saveCart(cart);
  return cart;
}

export function updateCartQuantity(productId, quantity, size = '') {
  const cart = getCart().map((item) => item.id === productId && (item.size ?? '') === size ? { ...item, quantity: Math.max(1, quantity) } : item);
  saveCart(cart);
  return cart;
}

export function removeFromCart(productId, size = '') {
  const cart = getCart().filter((item) => !(item.id === productId && (item.size ?? '') === size));
  saveCart(cart);
  return cart;
}

export function cartCount(cart = getCart()) {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartSubtotal(cart = getCart()) {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
