import { cartCount, cartSubtotal, getCart } from '../utils/cart.js';

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 });
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function formatPrice(value) { return money.format(value); }

export function renderProducts(products, container) {
  if (!container) return;
  if (!products.length) {
    container.innerHTML = '<div class="col-12"><div class="empty-state"><span>⌕</span><h3>No encontramos ese objeto.</h3><p>Prueba con otra búsqueda o categoría.</p></div></div>';
    return;
  }
  container.innerHTML = products.map((product) => `
    <article class="col-12 col-sm-6 col-lg-4">
      <div class="product-card">
        <a class="product-image" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="Ver ${escapeHtml(product.name)}">
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />
          ${product.tag ? `<span class="product-tag">${escapeHtml(product.tag)}</span>` : ''}
          <span class="product-arrow" aria-hidden="true">↗</span>
        </a>
        <div class="product-info"><div><p class="product-category">${escapeHtml(product.category)}</p><h3><a href="product.html?id=${encodeURIComponent(product.id)}">${escapeHtml(product.name)}</a></h3></div>
          <div class="product-price">${product.oldPrice ? `<del>${formatPrice(product.oldPrice)}</del>` : ''}<strong>${formatPrice(product.price)}</strong></div></div>
        ${product.sizes.length ? `<a class="add-button" href="product.html?id=${encodeURIComponent(product.id)}">Ver tallas y comprar <span aria-hidden="true">↗</span></a>` : `<button class="add-button" type="button" data-add-product="${escapeHtml(product.id)}">Agregar al carrito <span aria-hidden="true">+</span></button>`}
      </div>
    </article>`).join('');
}

export function setCatalogMessage(message = '') {
  const target = document.querySelector('[data-catalog-message]');
  if (target) target.textContent = message;
}

export function renderCategoryFilters(categories, container, activeCategory = 'Todos') {
  if (!container) return;
  const total = categories.reduce((sum, category) => sum + category.totalItems, 0);
  const allLabel = categories.length && total ? `Todo (${total})` : 'Todo';
  container.innerHTML = `<button class="filter-chip ${activeCategory === 'Todos' ? 'active' : ''}" type="button" data-category="Todos">${allLabel}</button>${categories.map((category) => `
    <button class="filter-chip ${activeCategory === category.name ? 'active' : ''}" type="button" data-category="${escapeHtml(category.name)}">${escapeHtml(category.name)}${category.totalItems ? ` (${category.totalItems})` : ''}</button>
  `).join('')}`;
}

export function updateCartBadge(cart = getCart()) {
  document.querySelectorAll('[data-cart-count]').forEach((badge) => { badge.textContent = cartCount(cart); });
}

export function showToast(message) {
  const toast = document.querySelector('[data-toast]');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

export function renderProductDetail(product, container) {
  if (!container) return;
  if (!product) {
    container.innerHTML = '<div class="empty-state"><h2>No encontramos este producto.</h2><a class="button-dark" href="index.html">Volver a la tienda</a></div>';
    return;
  }
  container.innerHTML = `<div class="product-detail row g-5 align-items-center"><div class="col-lg-6"><div class="detail-image"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" /></div></div><div class="col-lg-6"><p class="eyebrow">${escapeHtml(product.category)}${product.tag ? ` · ${escapeHtml(product.tag)}` : ''}</p><h1>${escapeHtml(product.name)}<em>.</em></h1><p class="detail-price">${formatPrice(product.price)}</p><p class="detail-description">${escapeHtml(product.description)}</p><div class="detail-specs">${product.material ? `<div><span>Material</span><strong>${escapeHtml(product.material)}</strong></div>` : ''}${product.color ? `<div><span>Color</span><strong>${escapeHtml(product.color)}</strong></div>` : ''}</div>${product.sizes.length ? `<fieldset class="size-picker"><legend>Selecciona tu talla</legend><div>${product.sizes.map((size, index) => `<label><input type="radio" name="product-size" value="${escapeHtml(size)}" ${index === 0 ? 'checked' : ''}><span>${escapeHtml(size)}</span></label>`).join('')}</div></fieldset>` : ''}<button class="button-dark" type="button" data-add-product="${escapeHtml(product.id)}">Agregar al carrito <span aria-hidden="true">+</span></button><p class="shipping-note">✳&nbsp; Envíos a todo el Perú</p></div></div>`;
}

export function renderCart(container, cart, handlers) {
  if (!container) return;
  if (!cart.length) {
    container.innerHTML = '<div class="empty-state cart-empty"><span>♡</span><h2>Tu carrito está esperando.</h2><p>Hay objetos que pueden hacer tu día un poco más bonito.</p><a class="button-dark" href="index.html#productos">Descubrir la colección <span aria-hidden="true">→</span></a></div>';
    return;
  }
  const rows = cart.map((item) => `<article class="cart-item"><a class="cart-item-image" href="product.html?id=${encodeURIComponent(item.id)}"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" /></a><div class="cart-item-info"><p class="product-category">${escapeHtml(item.category)}</p><h2>${escapeHtml(item.name)}</h2>${item.size ? `<p class="cart-size">Talla: ${escapeHtml(item.size)}</p>` : ''}<p>${formatPrice(item.price)}</p><button class="remove-link" type="button" data-remove-item="${escapeHtml(item.id)}" data-item-size="${escapeHtml(item.size ?? '')}">Quitar</button></div><div class="quantity-control" aria-label="Cantidad de ${escapeHtml(item.name)}"><button type="button" data-change-quantity="-1" data-product-id="${escapeHtml(item.id)}" data-item-size="${escapeHtml(item.size ?? '')}" aria-label="Disminuir cantidad">−</button><span>${item.quantity}</span><button type="button" data-change-quantity="1" data-product-id="${escapeHtml(item.id)}" data-item-size="${escapeHtml(item.size ?? '')}" aria-label="Aumentar cantidad">+</button></div><strong class="cart-line-total">${formatPrice(item.price * item.quantity)}</strong></article>`).join('');
  container.innerHTML = `<div class="cart-layout"><div class="cart-items">${rows}</div><aside class="order-summary"><p class="eyebrow">RESUMEN</p><h2>Tu pedido</h2><div class="summary-row"><span>Subtotal</span><strong>${formatPrice(cartSubtotal(cart))}</strong></div><div class="summary-row"><span>Envío</span><span>Se calcula al finalizar</span></div><div class="summary-total"><span>Total</span><strong>${formatPrice(cartSubtotal(cart))}</strong></div><button class="button-dark checkout-button" type="button" data-checkout>Continuar compra <span aria-hidden="true">→</span></button><p class="secure-note">⌁&nbsp; Compra segura · Cambios fáciles</p></aside></div>`;
  container.querySelectorAll('[data-remove-item]').forEach((button) => button.addEventListener('click', () => handlers.onRemove(button.dataset.removeItem, button.dataset.itemSize)));
  container.querySelectorAll('[data-change-quantity]').forEach((button) => button.addEventListener('click', () => handlers.onQuantity(button.dataset.productId, Number(button.dataset.changeQuantity), button.dataset.itemSize)));
  container.querySelector('[data-checkout]')?.addEventListener('click', handlers.onCheckout);
}
