import { fetchProducts } from './services/api.js';
import { addToCart } from './utils/cart.js';
import { renderProductDetail, showToast, updateCartBadge } from './ui/ui.js';

const container = document.querySelector('[data-product-detail]');
const productId = new URLSearchParams(window.location.search).get('id');
let currentProduct = null;

async function init() {
  updateCartBadge();
  window.addEventListener('cart:updated', (event) => updateCartBadge(event.detail.cart));
  try {
    const products = await fetchProducts();
    currentProduct = products.find((item) => item.id === productId) ?? null;
    const product = currentProduct;
    renderProductDetail(product, container);
    document.title = product ? `${product.name} — DMExpress` : 'Producto no encontrado — DMExpress';
    container?.addEventListener('click', (event) => {
      if (!event.target.closest('[data-add-product]') || !currentProduct) return;
      const selectedSize = container.querySelector('[name="product-size"]:checked')?.value ?? '';
      addToCart(currentProduct, 1, selectedSize);
      showToast(`${currentProduct.name} se agregó a tu carrito`);
    });
  } catch (error) {
    const message = document.querySelector('[data-product-message]');
    if (message) message.textContent = error.message;
    renderProductDetail(null, container);
  }
}

init();
