import { fetchCategories, fetchProductById, fetchProducts } from '../../../js/services/api.js';

function categoryNameFor(product, categoriesById) {
    const ids = String(product.categoryIds || '').split(/[|,;]/).map(id => id.trim()).filter(Boolean);
    const fromId = ids.map(id => categoriesById.get(id)).find(Boolean);
    return fromId || product.category || 'Colección';
}

function toStoreProduct(product, categoriesById = new Map()) {
    const category = categoryNameFor(product, categoriesById);
    const categoryPath = String(category).split(/[|,>/]/).map(value => value.trim()).filter(Boolean).slice(0, 2);
    if (!categoryPath.length) categoryPath.push('Colección');
    const image = product.image || './assets/images/notfoundimage.png';
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];

    return {
        ...product,
        id: String(product.id),
        codigodetalle: Number(product.id) || product.id,
        name: product.name,
        descripcionItem: product.name,
        price: Number(product.price) || 0,
        priceText: String(Number(product.price) || 0),
        defaultPrice: String(Number(product.price) || 0),
        getPriceDef: String(Number(product.price) || 0),
        precioVenta: Number(product.price) || 0,
        oldPrice: Number(product.oldPrice) || 0,
        stock: Number(product.stock) || 0,
        stockUnits: Number(product.stock) || 0,
        image,
        fotoUrl: image,
        productImage: [image],
        category: categoryPath[0],
        categoryPath,
        categoryIds: String(product.categoryIds || ''),
        hasVariants: Number(product.variantCount) > 0,
        talla: sizes.join(','),
        color: product.color || '',
        detailExplain: product.description || '',
        codigoInterno: product.code || '',
        codigo: product.code || '',
        customFields: []
    };
}

async function loadCategories(signal) {
    try {
        const categories = await fetchCategories({ signal });
        return new Map(categories.map(category => [category.id, category.name]));
    } catch (error) {
        console.warn('Se cargarán los productos sin nombres de categoría.', error);
        return new Map();
    }
}

export const productService = Object.freeze({
    async list({ signal } = {}) {
        const [products, categoriesById] = await Promise.all([
            fetchProducts({ signal }),
            loadCategories(signal)
        ]);
        return products.map(product => toStoreProduct(product, categoriesById)).filter(product => product.id);
    },

    async getById(id, { signal } = {}) {
        const product = await fetchProductById(id, { signal });
        if (!product) throw new Error('No se encontró el producto solicitado.');
        const categoriesById = await loadCategories(signal);
        return toStoreProduct(product, categoriesById);
    }
});
