const searchInput = document.getElementById('searchGlobal');
const favoritesButton = document.getElementById('globalFavoritesToggle');
const menuToggle = document.getElementById('mobileMenuToggle');
const navigation = document.getElementById('storeNavigation');

searchInput?.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const term = searchInput.value.trim();
    window.location.href = `index.html${term ? `?q=${encodeURIComponent(term)}` : ''}`;
});

favoritesButton?.addEventListener('click', () => {
    window.location.href = 'index.html?favorites=1';
});

menuToggle?.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!expanded));
    navigation?.classList.toggle('is-open', !expanded);
});

navigation?.addEventListener('click', event => {
    if (!event.target.closest('a')) return;
    navigation.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
});

function updateCartCount() {
    let cart = [];
    try {
        const stored = JSON.parse(localStorage.getItem('dmexpress-cart') || '[]');
        if (Array.isArray(stored)) cart = stored;
    } catch { /* El contador permanece en cero si el almacenamiento está dañado. */ }
    const count = cart.reduce((sum, item) => sum + (Number(item.cantidad ?? item.quantity) || 0), 0);
    document.querySelectorAll('[data-cart-count], #cartCount').forEach(badge => { badge.textContent = String(count); });
}

updateCartCount();
window.addEventListener('storage', event => {
    if (event.key === 'dmexpress-cart') updateCartCount();
});
