const CART_KEY = 'dmexpress-cart';
const FAVORITES_KEY = 'dmexpress-favorites';
const read = key => { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
const readCart = () => read(CART_KEY).map(item => ({
    ...item,
    id: String(item.id ?? ''),
    nombre: item.nombre ?? item.name ?? 'Producto DMExpress',
    precio: Number(item.precio ?? item.price) || 0,
    cantidad: Number(item.cantidad ?? item.quantity) || 1,
    talla: item.talla ?? item.size ?? 'Única',
    color: item.color ?? '',
    imagen: item.imagen ?? item.image ?? '',
    stock: Number(item.stock) || 0
}));
export function createStore() {
    let cart = readCart();
    let favorites = read(FAVORITES_KEY).map(String);
    const persistCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (error) { console.warn('No se pudo guardar el carrito.', error); } };
    const persistFavorites = () => { try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); } catch (error) { console.warn('No se pudieron guardar favoritos.', error); } };
    return {
        get cart() { return cart; }, get favorites() { return favorites; },
        add(product, { quantity = 1, size = 'Única', color = '' } = {}) {
            const id = String(product?.id ?? '');
            const stock = Number(product?.stock) || 0;
            if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > stock) return false;
            const found = cart.find(item => String(item.id) === id && String(item.talla || 'Única') === size && String(item.color || '') === color);
            if (found && Number(found.cantidad) + quantity > stock) return false;
            if (found) found.cantidad = Number(found.cantidad) + quantity;
            else cart.push({ id, nombre: product.name, precio: Number(product.price) || 0, cantidad: quantity, talla: size, color, imagen: product.image, stock });
            persistCart(); return true;
        },
        change(index, delta) {
            const item = cart[index]; if (!item) return false;
            const next = Number(item.cantidad) + delta;
            if (next <= 0) cart.splice(index, 1);
            else if (next > Number(item.stock || 0)) return false;
            else item.cantidad = next;
            persistCart(); return true;
        },
        remove(index) { cart.splice(index, 1); persistCart(); },
        clearCart() { cart = []; persistCart(); },
        refresh() { cart = readCart(); favorites = read(FAVORITES_KEY).map(String); },
        toggleFavorite(id) { const key = String(id); favorites = favorites.includes(key) ? favorites.filter(value => value !== key) : [...favorites, key]; persistFavorites(); return favorites.includes(key); },
        get count() { return cart.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0); },
        get total() { return cart.reduce((sum, item) => sum + Number(item.precio) * Number(item.cantidad), 0); }
    };
}
export const cartStorageKey = CART_KEY;
