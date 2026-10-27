import { fetchCategories, fetchProducts } from './services/api.js';
import { addToCart, getCart } from './utils/cart.js';
import { renderCategoryFilters, renderProducts, setCatalogMessage, showToast, updateCartBadge } from './ui/ui.js';

const grid = document.querySelector('[data-product-grid]');
let allProducts = [];
let activeCategory = 'Todos';
let searchTerm = '';

const normalizeText = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

function applyFilters() {
  const filtered = allProducts.filter((product) => {
    const matchesCategory = activeCategory === 'Todos' || normalizeText(product.category) === normalizeText(activeCategory);
    const matchesSearch = `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  renderProducts(filtered, grid);
}

async function init() {
  updateCartBadge();
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-add-product]');
    if (!button) return;
    const product = allProducts.find((item) => item.id === button.dataset.addProduct);
    if (product) {
      addToCart(product);
      showToast(`${product.name} se agregó a tu carrito`);
    }
  });
  window.addEventListener('cart:updated', (event) => updateCartBadge(event.detail.cart));
  document.querySelector('[data-category-filters]')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    activeCategory = button.dataset.category;
    document.querySelectorAll('[data-category]').forEach((chip) => chip.classList.toggle('active', chip === button));
    applyFilters();
  });
  document.querySelector('[data-product-search]')?.addEventListener('input', (event) => { searchTerm = event.target.value.trim(); applyFilters(); });
  document.querySelector('[data-newsletter-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = document.querySelector('[data-newsletter-message]');
    if (message) message.textContent = '¡Listo! Te avisaremos cuando haya novedades.';
    event.currentTarget.reset();
  });
  try {
    setCatalogMessage('Cargando catálogo…');
    allProducts = await fetchProducts();
    applyFilters();
    try {
      const categories = await fetchCategories();
      const categoriesById = new Map(categories.map((category) => [category.id, category.name]));
      allProducts = allProducts.map((product) => {
        const categoryName = product.categoryIds
          .split(/[|,;]/)
          .map((id) => categoriesById.get(id.trim()))
          .find(Boolean);
        return categoryName ? { ...product, category: categoryName } : product;
      });
      renderCategoryFilters(categories, document.querySelector('[data-category-filters]'), activeCategory);
      applyFilters();
      setCatalogMessage(`${allProducts.length} productos cargados desde DMExpress · ${categories.length} categorías`);
    } catch (error) {
      console.warn(error.message);
      setCatalogMessage(`${allProducts.length} productos cargados desde DMExpress · filtros locales`);
    }
  } catch (error) {
    setCatalogMessage(error.message);
    renderProducts([], grid);
  }
}

init();
