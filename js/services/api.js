/** API de DMExpress: productos y categorías publicados en IIS. */
const API_BASE_URL = 'https://10446394229sanchezapi.spk.com.pe/';
const CATEGORY_LIST_ENDPOINT = 'api/Category/ListaTotalItem';
const PRODUCTS_LIST_ENDPOINT = 'api/Product/store-estab-tipoex';
const STORE_CONTEXT = Object.freeze({
  idEmpresa: '10446394229',
  idEstablecimiento: 1,
  tipoExistencia: '01',
});
// Enum detalleitems.TypeConsut de Helios. All_Product se serializa como 24
// y el backend lo convierte al estado SQL "MPRODUCTO".
const PRODUCT_QUERY_TYPE = 24;
const CATEGORY_LIST_REQUEST = Object.freeze({
  idEmpresa: STORE_CONTEXT.idEmpresa,
  idEstablecimiento: STORE_CONTEXT.idEstablecimiento,
});
// Replica el filtro que usa EcommerceDM/DMExpressProductos en el servidor.
const PRODUCTS_PER_PAGE = 50;

function normalizeProduct(item, index = 0) {
  const id = item.codigodetalle ?? item.id ?? item._id ?? index;
  const generalPrice = Number(item.minPriceGeneral ?? item.MinPriceGeneral ?? 0);
  const variantPrice = Number(item.minPriceVariant ?? item.MinPriceVariant ?? 0);
  const minPrice = generalPrice > 0 ? generalPrice : variantPrice > 0 ? variantPrice : item.precioVenta ?? item.price ?? item.precio ?? 0;
  const category = item.CategoriesList ?? item.categoriesList ?? item.category ?? item.categoria ?? item.tipoExistencia ?? 'General';
  return {
    id: String(id),
    name: item.descripcionItem ?? item.name ?? item.nombre ?? 'Producto sin nombre',
    category: Array.isArray(category) ? category[0] ?? 'General' : String(category).split(/[|,;]/)[0].trim(),
    price: Number(minPrice) || 0,
    oldPrice: item.oldPrice == null ? null : Number(item.oldPrice),
    image: normalizeProductImage(item.imgdef ?? item.image ?? item.imagen ?? ''),
    description: item.description ?? item.descripcion ?? item.descripcionItem ?? '',
    tag: item.tag ?? item.etiqueta ?? (item.IsFeatured ?? item.isFeatured ? 'Destacado' : ''),
    color: item.color ?? '',
    material: item.material ?? '',
    sizes: Array.isArray(item.sizes ?? item.tallas) ? (item.sizes ?? item.tallas) : [],
    stock: Number(item.stockUnits ?? item.StockUnits ?? item.Stock ?? item.stock ?? 0),
    variantCount: Number(item.countVariants ?? item.CountVariants ?? 0),
    code: String(item.codigoTributario ?? item.codigodetalle ?? ''),
    unit: item.UM ?? item.um ?? '',
    categoryIds: String(item.CategoriesListId ?? item.categoriesListId ?? item.categoryId ?? ''),
  };
}

function normalizeProductImage(image) {
  if (typeof image === 'string') {
    if (!image || image.startsWith('data:') || /^https?:\/\//i.test(image)) return image;
    return `data:image/jpeg;base64,${image}`;
  }
  if (Array.isArray(image) && image.length) {
    const bytes = Uint8Array.from(image);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return `data:image/jpeg;base64,${btoa(binary)}`;
  }
  return '';
}

function getProductRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  for (const key of ['data', 'Data', 'items', 'Items', 'results', 'Results', 'result', 'Result', 'products', 'Products', 'lista', 'Lista']) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
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
    id: String(item.idItem ?? item.IdItem ?? item.id ?? item.Id ?? item.categoryId ?? item.CategoryId ?? index),
    name: String(item.categoryName ?? item.CategoryName ?? item.nombreCategoria ?? item.NombreCategoria ?? item.descripcionCategoria ?? item.DescripcionCategoria ?? item.name ?? item.Name ?? item.nombre ?? item.Nombre ?? item.category ?? item.Category ?? item.categoria ?? item.Categoria ?? item.descripcion ?? item.Descripcion ?? ''),
    totalItems: Number(item.totalItems ?? item.TotalItems ?? item.totalItem ?? item.TotalItem ?? item.itemCount ?? item.ItemCount ?? item.cantidad ?? item.Cantidad ?? item.count ?? item.Count ?? 0),
  };
}

export async function fetchCategories({ signal } = {}) {
  const url = new URL(CATEGORY_LIST_ENDPOINT, API_BASE_URL);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      signal,
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

export async function fetchProducts({ signal } = {}) {
  const fetchPage = async (page, totalRows = 0) => {
    const response = await fetch(new URL(PRODUCTS_LIST_ENDPOINT, API_BASE_URL), {
      method: 'POST',
      signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Skip: (page - 1) * PRODUCTS_PER_PAGE,
        Limit: PRODUCTS_PER_PAGE,
        idEmpresa: STORE_CONTEXT.idEmpresa,
        idEstablecimiento: STORE_CONTEXT.idEstablecimiento,
        tipoExistencia: STORE_CONTEXT.tipoExistencia,
        ActivarConteo: page === 1,
        UltimoConteo: totalRows,
        QueryType: PRODUCT_QUERY_TYPE,
      }),
    });
    if (!response.ok) throw new Error(`La API de productos respondió ${response.status}`);
    return getProductRows(await response.json());
  };

  try {
    const firstPage = await fetchPage(1);
    const totalRows = Number(firstPage[0]?.TotalRows ?? firstPage[0]?.totalRows ?? firstPage.length);
    const pageCount = Math.ceil(totalRows / PRODUCTS_PER_PAGE);
    const remainingPages = [];
    for (let startPage = 2; startPage <= pageCount; startPage += 4) {
      const pages = Array.from(
        { length: Math.min(4, pageCount - startPage + 1) },
        (_, index) => fetchPage(startPage + index, totalRows),
      );
      remainingPages.push(...await Promise.all(pages));
    }
    const products = [firstPage, ...remainingPages].flat().map(normalizeProduct);
    if (!products.length) {
      throw new Error('La API respondió correctamente, pero no encontró productos para esta empresa, establecimiento y tipo de existencia.');
    }
    return products;
  } catch (error) {
    console.error('No se pudieron cargar los productos de DMExpress:', error);
    if (error instanceof Error && error.message.startsWith('La API respondió correctamente')) throw error;
    throw new Error('No pudimos leer el catálogo de productos. Revisa la respuesta de store-estab-tipoex y CORS en IIS.', { cause: error });
  }
}

export async function fetchProductById(id, options) {
  const products = await fetchProducts(options);
  return products.find((product) => product.id === String(id)) ?? null;
}

export { API_BASE_URL };
