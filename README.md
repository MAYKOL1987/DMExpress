# DMExpress

Demo de tienda online de ropa hecha con HTML, CSS, Bootstrap 5.3 y JavaScript ES modules.

## Ejecutar

Abre esta carpeta con un servidor estático local y visita `index.html`. Los módulos ES no funcionan correctamente si se abre el HTML directamente con `file://`.

Para publicar y habilitar CORS en el servidor IIS de la API, sigue [docs/CONFIGURAR-CORS-IIS.md](docs/CONFIGURAR-CORS-IIS.md).

## Catálogo y API

La URL base y el contexto de empresa están en `js/services/api.js`. El catálogo consulta por POST los endpoints `api/Product/store-estab-tipoex` (productos, precios, imágenes y stock) y `api/Category/ListaTotalItem` (categorías). La consulta de productos pagina los resultados con 48 elementos por página.

El carrito se guarda en el navegador bajo la clave `dmexpress-cart` de `localStorage`. El botón de compra muestra un aviso porque todavía no hay un servicio de pagos conectado.
