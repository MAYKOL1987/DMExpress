# DMExpress

Demo de tienda online de ropa hecha con HTML, CSS, Bootstrap 5.3 y JavaScript ES modules.

## Ejecutar

Abre esta carpeta con un servidor estático local y visita `index.html`. Los módulos ES no funcionan correctamente si se abre el HTML directamente con `file://`.

Para publicar y habilitar CORS en el servidor IIS de la API, sigue [docs/CONFIGURAR-CORS-IIS.md](docs/CONFIGURAR-CORS-IIS.md).

## Catálogo y API

La URL base está en `js/services/api.js`. El frontend ya consulta por POST `api/Category/ListaTotalItem` y utiliza las categorías devueltas para construir los filtros. La llamada envía `{}` como JSON; si el método exige parámetros, completa `CATEGORY_LIST_REQUEST` con los nombres y valores que pide el endpoint.

El catálogo todavía usa productos de demostración: `ListaTotalItem` es el endpoint de categorías y no se ha confirmado que devuelva prendas con precio, imagen y tallas. Para mostrar el inventario real hace falta conectar el endpoint de productos.

Cuando tengas la documentación real:

1. Configura el endpoint real de productos en `fetchProducts()`.
2. Ajusta `normalizeProduct()` si la API usa nombres de propiedades distintos.
3. Habilita CORS en IIS para el dominio de la tienda y permite `POST`, `OPTIONS`, `Content-Type` y `Accept`.

El catálogo de ejemplo incluye ropa, calzado y accesorios; las tallas se pueden seleccionar en el detalle del producto. El carrito se guarda en el navegador bajo la clave `dmexpress-cart` de `localStorage`. El botón de compra muestra un aviso porque todavía no hay un servicio de pagos conectado.
