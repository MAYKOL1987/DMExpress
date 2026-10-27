const page = document.body.dataset.page;

const pageModules = {
    catalog: './pages/catalog.js',
    product: './pages/product-detail.js',
    tracking: './pages/tracking.js'
};

if (pageModules[page]) {
    import(pageModules[page]).catch(error => {
        console.error('No se pudo iniciar la página.', error);
        const feedback = document.querySelector('[data-app-error]');
        if (feedback) {
            feedback.hidden = false;
            feedback.textContent = 'No se pudo cargar esta sección. Recarga la página o vuelve a la tienda.';
        }
    });
}
