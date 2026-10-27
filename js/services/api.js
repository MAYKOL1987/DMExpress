/** API de DMExpress. La lista de categorías ya apunta al POST publicado en IIS. */
const API_BASE_URL = 'https://10446394229sanchezapi.spk.com.pe/';
const CATEGORY_LIST_ENDPOINT = 'api/Category/ListaTotalItem';
// Actualiza este objeto si el método documenta parámetros obligatorios.
const CATEGORY_LIST_REQUEST = {};
// El enlace de categoría no es un endpoint de productos; se mantiene catálogo demo
// hasta conectar una ruta que devuelva los productos y sus imágenes/precios/tallas.
const USE_MOCK_PRODUCTS = true;

const mockProducts = [
  { id: 'polo-urbano', name: 'Polo Urbano Essential', category: 'Ropa', price: 59, oldPrice: null, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', description: 'Polo de algodón suave con corte clásico y acabado resistente. Una prenda versátil para combinar todos los días.', tag: 'Más vendido', color: 'Blanco', material: 'Algodón', sizes: ['S', 'M', 'L', 'XL'] },
  { id: 'casaca-denim', name: 'Casaca Denim Street', category: 'Ropa', price: 159, oldPrice: 189, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85', description: 'Casaca denim de estilo urbano, con bolsillos funcionales y un corte cómodo para llevar en capas.', tag: 'Nuevo', color: 'Azul denim', material: 'Denim', sizes: ['S', 'M', 'L', 'XL'] },
  { id: 'zapatillas-motion', name: 'Zapatillas Motion', category: 'Calzado', price: 189, oldPrice: null, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85', description: 'Zapatillas ligeras de inspiración deportiva, con suela cómoda para acompañarte durante todo el día.', tag: 'Edición urbana', color: 'Rojo y blanco', material: 'Textil y sintético', sizes: ['36', '37', '38', '39', '40', '41', '42'] },
  { id: 'pantalon-cargo', name: 'Pantalón Cargo Move', category: 'Ropa', price: 139, oldPrice: null, image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=85', description: 'Pantalón cargo de calce relajado con bolsillos amplios y cintura cómoda. Listo para salir y moverte.', tag: 'Favorito', color: 'Oliva', material: 'Algodón', sizes: ['28', '30', '32', '34', '36'] },
  { id: 'gorra-daily', name: 'Gorra Daily', category: 'Accesorios', price: 49, oldPrice: null, image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85', description: 'Gorra de seis paneles con correa ajustable. El toque final para completar un look casual.', tag: '', color: 'Negro', material: 'Algodón', sizes: ['Única'] },
  { id: 'mochila-city', name: 'Mochila City', category: 'Accesorios', price: 119, oldPrice: null, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85', description: 'Mochila urbana con compartimento principal amplio y bolsillos para llevar lo esencial de tu día.', tag: 'Nuevo', color: 'Negro', material: 'Poliéster', sizes: ['Única'] },
];

function normalizeProduct(item, index = 0) {
  return {
    id: String(item.id ?? item._id ?? index),
    name: item.name ?? item.nombre ?? 'Producto sin nombre',
    category: item.category ?? item.categoria ?? 'Ropa',
    price: Number(item.price ?? item.precio ?? 0),
    oldPrice: item.oldPrice == null ? null : Number(item.oldPrice),
    image: item.image ?? item.imagen ?? '',
    description: item.description ?? item.descripcion ?? '',
    tag: item.tag ?? item.etiqueta ?? '',
    color: item.color ?? '',
    material: item.material ?? '',
    sizes: Array.isArray(item.sizes ?? item.tallas) ? (item.sizes ?? item.tallas) : [],
  };
}

function getCategoryRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const listKeys = ['data', 'Data', 'items', 'Items', 'results', 'Results', 'result', 'Result', 'lista', 'Lista', 'listaTotalItem', 'ListaTotalItem', 'listTotalItem', 'ListTotalItem', 'categories', 'Categories', 'categorias', 'Categorias', 'categoria', 'Categoria'];
  for (const key of listKeys) {
    if (Array.isArray(payload[key])) return payload[key];
    if (payload[key] && typeof payload[key] === 'object') {
      const nested = getCategoryRows(payload[key]);
      if (nested.length) return nested;
    }
  }

  const categoryName = payload.categoryName ?? payload.CategoryName ?? payload.nombreCategoria ?? payload.NombreCategoria ?? payload.nombre ?? payload.Nombre ?? payload.descripcion ?? payload.Descripcion;
  return categoryName ? [payload] : [];
}

function normalizeCategory(item, index = 0) {
  return {
    id: String(item.id ?? item.Id ?? item.categoryId ?? item.CategoryId ?? index),
    name: String(item.categoryName ?? item.CategoryName ?? item.nombreCategoria ?? item.NombreCategoria ?? item.descripcionCategoria ?? item.DescripcionCategoria ?? item.name ?? item.Name ?? item.nombre ?? item.Nombre ?? item.category ?? item.Category ?? item.categoria ?? item.Categoria ?? item.descripcion ?? item.Descripcion ?? ''),
    totalItems: Number(item.totalItems ?? item.TotalItems ?? item.totalItem ?? item.TotalItem ?? item.itemCount ?? item.ItemCount ?? item.cantidad ?? item.Cantidad ?? item.count ?? item.Count ?? 0),
  };
}

export async function fetchCategories() {
  const url = new URL(CATEGORY_LIST_ENDPOINT, API_BASE_URL);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(CATEGORY_LIST_REQUEST),
    });
    if (!response.ok) throw new Error(`La API respondió ${response.status}`);
    const payload = await response.json();
    const categories = getCategoryRows(payload).map(normalizeCategory).filter((category) => category.name);
    if (!categories.length) throw new Error('La API respondió, pero no se reconoció la lista de categorías.');
    return categories;
  } catch (error) {
    console.error('No se pudieron cargar las categorías de DMExpress:', error);
    throw new Error('No pudimos leer las categorías de la API. Revisa CORS en IIS y el cuerpo esperado por ListaTotalItem.', { cause: error });
  }
}

export async function fetchProducts() {
  if (USE_MOCK_PRODUCTS) return mockProducts.map(normalizeProduct);
  throw new Error('Configura aquí el endpoint de productos de DMExpress.');
}

export async function fetchProductById(id) {
  const products = await fetchProducts();
  return products.find((product) => product.id === String(id)) ?? null;
}

export { API_BASE_URL };
