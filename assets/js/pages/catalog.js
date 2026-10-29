import { productService } from '../services/productService.js';
import { createStore, cartStorageKey } from '../core/store.js';
import { environment } from '../config/environment.js';
import { formatOrderMessage, sendWhatsAppOrder } from '../services/whatsappService.js';

const store = createStore();
const $ = selector => document.querySelector(selector);
const money = value => `S/ ${Number(value || 0).toFixed(2)}`;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const state = { products: [], categories: [], search: '', category: 'all', expandedCategories: new Set(), maxPrice: 0, onlyStock: false, sort: 'default', favoritesOnly: false, page: 1 };
let backdrop;
const categoryKey = value => String(value ?? '').trim().toLocaleLowerCase('es');

function setLoading() {
    $('#productsGrid').setAttribute('aria-busy', 'true');
    $('#productsGrid').innerHTML = Array.from({ length: 4 }, () => '<div class="dm-skeleton" aria-hidden="true"><span></span><i></i><i></i></div>').join('');
    $('#productsPagination').hidden = true;
    $('#resultCount').textContent = 'Cargando catálogo…';
}
function showError(message) {
    $('#productsGrid').setAttribute('aria-busy', 'false');
    $('#resultCount').textContent = 'Catálogo no disponible';
    $('#productsPagination').hidden = true;
    $('#productsGrid').innerHTML = `<div class="dm-feedback dm-error" role="alert"><strong>No pudimos cargar los productos</strong><p>${escapeHtml(message)}</p><button class="dm-retry" id="retryLoad" type="button">Reintentar</button></div>`;
    $('#retryLoad').addEventListener('click', loadCatalog);
}
function setupPrice() {
    const max = Math.max(500, Math.ceil(Math.max(0, ...state.products.map(item => item.price)) / 50) * 50);
    const range = $('#priceRange'); range.max = String(max); range.value = String(max); state.maxPrice = max;
    $('#maxPriceVal').textContent = String(max); $('#priceRangeMax').textContent = money(max);
}
function renderCategories() {
    if (state.categories.length) {
        const categoryButtons = state.categories.map(category => {
            const count = state.products.filter(product => {
                const hasId = String(product.categoryIds || '').split(/[|,;]/).map(id => id.trim()).includes(category.id);
                const hasName = (product.categoryPath || [product.category]).some(name => categoryKey(name) === categoryKey(category.name));
                return hasId || hasName;
            }).length;
            const selected = state.category === category.name;
            return `<button type="button" class="dm-category-parent ${selected ? 'active' : ''}" data-category="${escapeHtml(category.name)}" aria-pressed="${selected}"><span>${escapeHtml(category.name)}</span><small>${count || Number(category.totalItems) || 0}</small></button>`;
        }).join('');
        $('#categoryFilters').innerHTML = `<button type="button" class="dm-category-parent dm-category-all ${state.category === 'all' ? 'active' : ''}" data-category="all" aria-pressed="${state.category === 'all'}"><span>Todas las categorías</span><small>${state.products.length}</small></button>${categoryButtons}`;
        return;
    }

    const tree = new Map();
    state.products.forEach(product => {
        const path = product.categoryPath?.length ? product.categoryPath : [product.category || 'Colección'];
        const rootName = path[0];
        if (!tree.has(rootName)) tree.set(rootName, { name: rootName, count: 0, children: new Map() });
        const root = tree.get(rootName);
        root.count += 1;
        if (path[1]) {
            if (!root.children.has(path[1])) root.children.set(path[1], { name: path[1], count: 0 });
            root.children.get(path[1]).count += 1;
        }
    });
    const rootButtons = [...tree.values()].map(root => {
        const expanded = state.expandedCategories.has(root.name);
        const selected = state.category === root.name;
        const children = [...root.children.values()].map(child => {
            const category = `${root.name} > ${child.name}`;
            const childSelected = state.category === category;
            return `<button type="button" class="dm-category-child ${childSelected ? 'active' : ''}" data-category="${escapeHtml(category)}" aria-pressed="${childSelected}"><span>${escapeHtml(child.name)}</span><small>${child.count}</small></button>`;
        }).join('');
        return `<div class="dm-category-group"><div class="dm-category-parent-row"><button type="button" class="dm-category-parent ${selected ? 'active' : ''}" data-category="${escapeHtml(root.name)}" aria-pressed="${selected}"><span>${escapeHtml(root.name)}</span><small>${root.count}</small></button>${children ? `<button type="button" class="dm-category-expand" data-expand-category="${escapeHtml(root.name)}" aria-label="${expanded ? 'Ocultar' : 'Mostrar'} subcategorías de ${escapeHtml(root.name)}" aria-expanded="${expanded}"><i class="fas fa-chevron-${expanded ? 'up' : 'down'}" aria-hidden="true"></i></button>` : ''}</div>${children ? `<div class="dm-category-children" ${expanded ? '' : 'hidden'}>${children}</div>` : ''}</div>`;
    }).join('');
    $('#categoryFilters').innerHTML = `<button type="button" class="dm-category-parent dm-category-all ${state.category === 'all' ? 'active' : ''}" data-category="all" aria-pressed="${state.category === 'all'}"><span>Todas las categorías</span><small>${state.products.length}</small></button>${rootButtons}`;
}
function visibleProducts() {
    return state.products.filter(product => {
        const categoryPath = product.categoryPath?.length ? product.categoryPath : [product.category || 'Colección'];
        const selectedPath = state.category === 'all' ? [] : state.category.split(' > ');
        const categoryMatch = !selectedPath.length || (state.categories.length
            ? categoryPath.some(name => categoryKey(name) === categoryKey(state.category))
            : categoryPath.slice(0, selectedPath.length).join(' > ') === state.category);
        return (!state.search || product.name.toLocaleLowerCase().includes(state.search)) && categoryMatch && product.price <= state.maxPrice && (!state.onlyStock || product.stock > 0) && (!state.favoritesOnly || store.favorites.includes(product.id));
    })
        .sort((a, b) => state.sort === 'price-asc' ? a.price - b.price : state.sort === 'price-desc' ? b.price - a.price : 0);
}
function renderProducts() {
    const products = visibleProducts(), grid = $('#productsGrid');
    grid.setAttribute('aria-busy', 'false'); $('#resultCount').textContent = `${products.length} ${products.length === 1 ? 'producto' : 'productos'}`;
    const pageCount = Math.ceil(products.length / 21);
    state.page = Math.min(state.page, Math.max(pageCount, 1));
    if (!products.length) { grid.innerHTML = '<div class="dm-feedback"><strong>No encontramos productos</strong><p>Prueba con otra búsqueda o limpia los filtros.</p></div>'; $('#productsPagination').hidden = true; return; }
    const pageProducts = products.slice((state.page - 1) * 21, state.page * 21);
    grid.innerHTML = pageProducts.map(product => {
        const discount = product.oldPrice > product.price ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
        const images = product.images?.length ? product.images : [product.image];
        const id = escapeHtml(product.id);
        const imageControls = images.length > 1
            ? `<button type="button" class="dm-card-image-arrow dm-card-image-prev" data-image-step="-1" data-image-id="${id}" aria-label="Imagen anterior de ${escapeHtml(product.name)}"><i class="fas fa-chevron-left" aria-hidden="true"></i></button><span class="dm-card-image-count" data-image-count="${id}" aria-live="polite">1 / ${images.length}</span><button type="button" class="dm-card-image-arrow dm-card-image-next" data-image-step="1" data-image-id="${id}" aria-label="Siguiente imagen de ${escapeHtml(product.name)}"><i class="fas fa-chevron-right" aria-hidden="true"></i></button>`
            : '';
        return `<article class="product-card" data-product-id="${id}"><div class="dm-product-visual">${discount ? `<span class="badge-discount">-${discount}%</span>` : ''}<button type="button" class="dm-favorite-button ${store.favorites.includes(product.id) ? 'active' : ''}" data-favorite="${id}" aria-label="${store.favorites.includes(product.id) ? 'Quitar de' : 'Añadir a'} favoritos" aria-pressed="${store.favorites.includes(product.id)}"><i class="${store.favorites.includes(product.id) ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i></button><img src="${escapeHtml(images[0])}" class="product-img" data-product-image="${id}" data-image-index="0" alt="${escapeHtml(product.name)}" loading="lazy">${imageControls}</div><div class="product-info"><div class="product-brand">${escapeHtml((product.categoryPath || [product.category]).join(' · '))}</div><h3 class="product-title">${escapeHtml(product.name)}</h3><div class="dm-price-row"><span class="product-price">${product.priceText.includes('-') ? 'Desde ' : ''}${money(product.price)}</span>${discount ? `<del class="old-price">${money(product.oldPrice)}</del>` : ''}</div><span class="dm-stock ${product.stock > 0 ? 'in-stock' : ''}">${product.stock > 0 ? `${product.stock} disponibles` : 'Consultar disponibilidad'}</span><button type="button" class="dm-card-add" data-add-id="${id}" ${product.stock <= 0 ? 'disabled' : ''}><i class="fas fa-bag-shopping" aria-hidden="true"></i> ${product.stock <= 0 ? 'Sin stock' : product.hasVariants ? 'Elegir opciones' : 'Añadir al carrito'}</button></div></article>`;
    }).join('');
    renderPagination(pageCount);
}
function renderPagination(pageCount) {
    const nav = $('#productsPagination');
    nav.hidden = pageCount <= 1;
    if (nav.hidden) { nav.innerHTML = ''; return; }
    const pages = new Set([1, pageCount]);
    for (let page = Math.max(1, state.page - 2); page <= Math.min(pageCount, state.page + 2); page += 1) pages.add(page);
    const pageButtons = [...pages].sort((a, b) => a - b).map((page, index, visiblePages) => {
        const gap = index > 0 && page - visiblePages[index - 1] > 1 ? '<span class="dm-pagination-gap" aria-hidden="true">…</span>' : '';
        return `${gap}<button type="button" data-page="${page}" aria-label="Página ${page}" ${page === state.page ? 'aria-current="page"' : ''}>${page}</button>`;
    }).join('');
    nav.innerHTML = `<button type="button" data-page="${state.page - 1}" aria-label="Página anterior" ${state.page === 1 ? 'disabled' : ''}>Anterior</button>${pageButtons}<button type="button" data-page="${state.page + 1}" aria-label="Página siguiente" ${state.page === pageCount ? 'disabled' : ''}>Siguiente</button>`;
}
function updateCounter() { $('#cartCount').textContent = String(store.count); }
function toast(message) { const node = document.createElement('div'); node.className = 'toast-custom'; node.setAttribute('role', 'status'); node.textContent = message; document.body.append(node); setTimeout(() => node.remove(), 2400); }
function renderCart() {
    const container = $('#cartItemsContainer'), button = $('#whatsappBtn'); updateCounter();
    if (!store.cart.length) { container.innerHTML = '<div class="dm-cart-empty"><span><i class="fas fa-bag-shopping"></i></span><strong>Tu carrito está esperando</strong><p>Añade tus favoritos y aquí verás el resumen.</p></div>'; button.disabled = true; $('#clearCartBtn').disabled = true; return; }
    $('#clearCartBtn').disabled = false; button.disabled = false;
    container.innerHTML = store.cart.map((item, index) => `<article class="dm-cart-row"><img src="${escapeHtml(item.imagen || './assets/images/notfoundimage.png')}" alt="${escapeHtml(item.nombre)}"><div class="dm-cart-info"><strong>${escapeHtml(item.nombre)}</strong><small>${item.color ? `Color: ${escapeHtml(item.color)} · ` : ''}Talla: ${escapeHtml(item.talla || 'Única')}</small><small>${money(item.precio)} c/u</small><div class="dm-cart-controls"><button type="button" data-change="-1" data-index="${index}" aria-label="Reducir cantidad">−</button><span>${Number(item.cantidad)}</span><button type="button" data-change="1" data-index="${index}" aria-label="Aumentar cantidad">+</button><button type="button" data-remove="${index}">Quitar</button></div></div><b>${money(Number(item.precio) * Number(item.cantidad))}</b></article>`).join('') + `<div class="dm-cart-total"><span>Total estimado</span><strong>${money(store.total)}</strong></div><p class="dm-cart-disclaimer">El pedido se confirma con el vendedor por WhatsApp. El envío se coordina por separado.</p>`;
}
function openCart() { $('#cartOffcanvas').classList.add('is-open'); $('#cartOffcanvas').setAttribute('aria-modal', 'true'); $('#cartOffcanvas').setAttribute('role', 'dialog'); $('#btnCart').setAttribute('aria-expanded', 'true'); if (!backdrop) { backdrop = document.createElement('button'); backdrop.className = 'dm-cart-backdrop'; backdrop.type = 'button'; backdrop.setAttribute('aria-label', 'Cerrar carrito'); backdrop.addEventListener('click', closeCart); document.body.append(backdrop); } document.body.classList.add('dm-cart-open'); }
function closeCart() { $('#cartOffcanvas').classList.remove('is-open'); $('#btnCart').setAttribute('aria-expanded', 'false'); document.body.classList.remove('dm-cart-open'); backdrop?.remove(); backdrop = null; }
function productDetail(id) { const product = state.products.find(item => item.id === id); if (product) window.location.href = `product.html?codigodetalle=${encodeURIComponent(id)}&stock=${encodeURIComponent(product.stock)}`; }
async function checkout() {
    if (!store.cart.length) return;
    try {
        const message = formatOrderMessage(store.cart);
        await sendWhatsAppOrder({ phone: environment.whatsappNumber, message, imageSources: store.cart.map(item => item.imagen) });
    } catch (error) {
        toast(error.message || 'No se pudo preparar el pedido para WhatsApp.');
    }
}
async function loadCatalog() {
    setLoading();
    try {
        const catalog = await productService.catalog();
        state.products = catalog.products;
        state.categories = catalog.categories;
        setupPrice(); renderCategories(); renderProducts(); renderCart();
    }
    catch (error) { console.error('Error cargando catálogo:', error); showError(error.message || 'Intenta de nuevo en unos momentos.'); }
}
function setupEvents() {
    const heroCarousel = $('#heroCarousel');
    if (heroCarousel) {
        const slides = [...heroCarousel.querySelectorAll('[data-hero-slide]')];
        const indicators = [...heroCarousel.querySelectorAll('[data-hero-to]')];
        let activeSlide = 0;
        heroCarousel.addEventListener('click', event => {
            const direction = event.target.closest('[data-hero-direction]');
            const target = event.target.closest('[data-hero-to]');
            if (!direction && !target) return;
            activeSlide = target ? Number(target.dataset.heroTo) : (activeSlide + Number(direction.dataset.heroDirection) + slides.length) % slides.length;
            slides.forEach((slide, index) => {
                const active = index === activeSlide;
                slide.hidden = !active;
                slide.classList.toggle('is-active', active);
                slide.setAttribute('aria-hidden', String(!active));
            });
            indicators.forEach((indicator, index) => indicator.setAttribute('aria-current', String(index === activeSlide)));
        });
    }
    ['searchInput', 'mobileSearch'].forEach(id => { const input = document.getElementById(id); input?.addEventListener('input', () => { state.search = input.value.trim().toLocaleLowerCase(); state.page = 1; ['searchInput', 'mobileSearch'].forEach(other => { const el = document.getElementById(other); if (el && el !== input) el.value = input.value; }); renderProducts(); }); });
    $('#priceRange').addEventListener('input', event => { state.maxPrice = Number(event.target.value); state.page = 1; $('#maxPriceVal').textContent = String(state.maxPrice); renderProducts(); });
    $('#onlyStock').addEventListener('change', event => { state.onlyStock = event.target.checked; state.page = 1; renderProducts(); });
    $('#sortSelect').addEventListener('change', event => { state.sort = event.target.value; state.page = 1; renderProducts(); });
    $('#productsPagination').addEventListener('click', event => {
        const button = event.target.closest('[data-page]');
        if (!button || button.disabled) return;
        state.page = Number(button.dataset.page);
        renderProducts();
        $('#productsGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('#categoryFilters').addEventListener('click', event => {
        const toggle = event.target.closest('[data-expand-category]');
        if (toggle) {
            const category = toggle.dataset.expandCategory;
            if (state.expandedCategories.has(category)) state.expandedCategories.delete(category);
            else state.expandedCategories.add(category);
            renderCategories();
            return;
        }
        const button = event.target.closest('[data-category]');
        if (button) {
            state.category = button.dataset.category;
            state.page = 1;
            renderCategories();
            renderProducts();
            if (window.matchMedia('(max-width: 767px)').matches) {
                $('#catalogFilters').classList.remove('is-open');
                $('#filterToggle').setAttribute('aria-expanded', 'false');
            }
        }
    });
    $('#favoritesToggle').addEventListener('click', event => { state.favoritesOnly = !state.favoritesOnly; state.page = 1; event.currentTarget.setAttribute('aria-pressed', String(state.favoritesOnly)); event.currentTarget.classList.toggle('active', state.favoritesOnly); renderProducts(); });
    $('#productsGrid').addEventListener('click', event => {
        const imageStep = event.target.closest('[data-image-step]');
        if (imageStep) {
            event.preventDefault(); event.stopPropagation();
            const product = state.products.find(item => item.id === imageStep.dataset.imageId);
            const images = product?.images?.length ? product.images : product ? [product.image] : [];
            const image = $(`[data-product-image="${CSS.escape(imageStep.dataset.imageId)}"]`);
            if (images.length > 1 && image) {
                const index = (Number(image.dataset.imageIndex || 0) + Number(imageStep.dataset.imageStep) + images.length) % images.length;
                image.dataset.imageIndex = String(index);
                image.src = images[index];
                const counter = $(`[data-image-count="${CSS.escape(imageStep.dataset.imageId)}"]`);
                if (counter) counter.textContent = `${index + 1} / ${images.length}`;
            }
            return;
        }
        const fav = event.target.closest('[data-favorite]'); if (fav) { event.stopPropagation(); store.toggleFavorite(fav.dataset.favorite); state.page = 1; renderProducts(); return; }
        const add = event.target.closest('[data-add-id]'); if (add) { event.stopPropagation(); const product = state.products.find(item => item.id === add.dataset.addId); if (product?.hasVariants) productDetail(product.id); else if (store.add(product)) { renderCart(); toast(`${product.name} añadido al carrito`); } else toast(`Stock máximo disponible: ${product?.stock ?? 0}.`); return; }
        const card = event.target.closest('[data-product-id]'); if (card) productDetail(card.dataset.productId);
    });
    $('#productsGrid').addEventListener('error', event => { if (event.target.matches('img.product-img') && !event.target.dataset.fallback) { event.target.dataset.fallback = 'true'; event.target.src = './assets/images/notfoundimage.png'; } }, true);
    $('#productsGrid').addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-product-id]')) productDetail(event.target.dataset.productId); });
    $('#clearFiltersBtn').addEventListener('click', () => { state.search = ''; state.category = 'all'; state.expandedCategories.clear(); state.onlyStock = false; state.favoritesOnly = false; state.maxPrice = Number($('#priceRange').max); state.sort = 'default'; state.page = 1; ['searchInput', 'mobileSearch'].forEach(id => { const input = document.getElementById(id); if (input) input.value = ''; }); $('#priceRange').value = String(state.maxPrice); $('#maxPriceVal').textContent = String(state.maxPrice); $('#onlyStock').checked = false; $('#sortSelect').value = 'default'; $('#favoritesToggle').classList.remove('active'); $('#favoritesToggle').setAttribute('aria-pressed', 'false'); renderCategories(); renderProducts(); });
    $('#filterToggle').addEventListener('click', event => {
        const expanded = event.currentTarget.getAttribute('aria-expanded') === 'true';
        event.currentTarget.setAttribute('aria-expanded', String(!expanded));
        $('#catalogFilters').classList.toggle('is-open', !expanded);
    });
    $('#btnCart').addEventListener('click', () => { renderCart(); openCart(); }); $('#cartOffcanvas .dm-cart-close').addEventListener('click', closeCart);
    $('#cartItemsContainer').addEventListener('click', event => { const change = event.target.closest('[data-change]'), remove = event.target.closest('[data-remove]'); if (change) { if (!store.change(Number(change.dataset.index), Number(change.dataset.change))) toast('No hay más unidades disponibles.'); renderCart(); } else if (remove) { store.remove(Number(remove.dataset.remove)); renderCart(); } });
    $('#clearCartBtn').addEventListener('click', () => { if (store.cart.length && window.confirm('¿Quieres vaciar el carrito?')) { store.clearCart(); renderCart(); } });
    $('#whatsappBtn').addEventListener('click', checkout);
    $('#mobileMenuToggle').addEventListener('click', event => { const expanded = event.currentTarget.getAttribute('aria-expanded') === 'true'; event.currentTarget.setAttribute('aria-expanded', String(!expanded)); $('#storeNavigation').classList.toggle('is-open', !expanded); });
    $('#storeNavigation').addEventListener('click', event => { if (event.target.closest('a')) { $('#storeNavigation').classList.remove('is-open'); $('#mobileMenuToggle').setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeCart(); });
    window.addEventListener('storage', event => { if (event.key === cartStorageKey) renderCart(); });
}
function initializeCatalog() {
    const query = new URLSearchParams(location.search).get('q') || '';
    state.search = query.toLocaleLowerCase();
    ['searchInput', 'mobileSearch'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = query;
    });
    setupEvents();
    renderCart();
    loadCatalog();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeCatalog, { once: true });
else initializeCatalog();

