import { environment } from '../config/environment.js';
import { productService } from '../services/productService.js';
import { formatOrderMessage, sendWhatsAppOrder } from '../services/whatsappService.js';
import { cartStorageKey, createStore } from '../core/store.js';

(() => {
    const store = createStore();
    const placeholder = './assets/images/notfoundimage.png';
    let product = {};
    let selectedSize = '';
    let selectedColor = '';
    let quantity = 1;
    let maxStock = 0;
    let stockFromCatalog = 0;
    let cartBackdrop;
    let galleryImages = [];
    let activeImageIndex = 0;
    const money = value => `S/ ${Number(value || 0).toFixed(2)}`;
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function readStock() {
        const fromTotals = Array.isArray(product.totalesAlmacen)
            ? product.totalesAlmacen.reduce((sum, row) => sum + (Number(row.cantidad) || 0), 0)
            : 0;
        return Number(stockFromCatalog || product.stockUnits || product.stock) || fromTotals || 0;
    }

    function productPrice() {
        const raw = product.defaultPrice ?? product.getPriceDef ?? product.precioVenta ?? 0;
        const firstPrice = String(raw).split('-')[0].replace(',', '.');
        return Number(firstPrice) || 0;
    }

    function imageSource(image) {
        if (!image) return placeholder;
        if (typeof image === 'string') return image.startsWith('data:') || image.startsWith('/') || image.startsWith('./') || image.startsWith('http') ? image : `data:image/jpeg;base64,${image}`;
        if (image.image) return `data:image/jpeg;base64,${image.image}`;
        return placeholder;
    }

    function images() {
        const productImages = (Array.isArray(product.productImage) ? product.productImage : [])
            .map(image => imageSource(image.image || image))
            .filter(Boolean);
        const uniqueImages = [...new Set(productImages)];
        if (!uniqueImages.length) uniqueImages.push(imageSource(product.fotoUrl));
        return uniqueImages;
    }

    function setActiveImage(index) {
        if (!galleryImages.length) return;
        activeImageIndex = (index + galleryImages.length) % galleryImages.length;
        const source = galleryImages[activeImageIndex];
        document.getElementById('mainImg').src = source;
        document.getElementById('modalBigImg').src = source;
        document.querySelectorAll('#thumbnails .thumbnail-button').forEach((button, buttonIndex) => {
            const active = buttonIndex === activeImageIndex;
            button.classList.toggle('active', active);
            button.setAttribute('aria-current', active ? 'true' : 'false');
        });
        const position = `${activeImageIndex + 1} / ${galleryImages.length}`;
        document.getElementById('galleryCount').textContent = position;
        document.getElementById('modalCount').textContent = position;
    }

    function moveImage(direction) {
        setActiveImage(activeImageIndex + direction);
    }

    function sizeOptions() {
        const sizes = new Set();
        if (product.talla) String(product.talla).split(',').map(value => value.trim()).filter(Boolean).forEach(value => sizes.add(value));
        (Array.isArray(product.customFields) ? product.customFields : []).forEach(field => {
            if (/talla|size/i.test(field.nombreCampo || '') && field.valorCampo) {
                String(field.valorCampo).split(',').map(value => value.trim()).filter(Boolean).forEach(value => sizes.add(value));
            }
        });
        if (!sizes.size) sizes.add('Única');
        return [...sizes];
    }

    function colorOptions() {
        const colors = new Set();
        if (product.color) String(product.color).split(',').map(value => value.trim()).filter(Boolean).forEach(value => colors.add(value));
        (Array.isArray(product.customFields) ? product.customFields : []).forEach(field => {
            if (/color/i.test(field.nombreCampo || '') && field.valorCampo) {
                String(field.valorCampo).split(',').map(value => value.trim()).filter(Boolean).forEach(value => colors.add(value));
            }
        });
        return [...colors];
    }

    function renderProduct() {
        const name = product.descripcionItem || 'Producto DMExpress';
        document.title = `${name} | DMExpress`;
        document.getElementById('nombre-producto').textContent = name;
        document.getElementById('precioProducto').textContent = money(productPrice());
        document.getElementById('productDescription').textContent = product.detailExplain || 'Diseñado para acompañarte con estilo y comodidad. Contáctanos por WhatsApp para resolver tus dudas.';
        const priceLabel = document.getElementById('precioEtiqueta');
        const discount = document.getElementById('Descuento');
        const savings = document.getElementById('ProductoAhorro');
        if (priceLabel) priceLabel.hidden = true;
        if (discount) discount.hidden = true;
        if (savings) savings.hidden = true;

        galleryImages = images();
        const mainImage = document.getElementById('mainImg');
        mainImage.alt = name;
        const thumbs = document.getElementById('thumbnails');
        thumbs.innerHTML = '';
        galleryImages.forEach((src, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `thumbnail-button${index === 0 ? ' active' : ''}`;
            button.setAttribute('aria-label', `Ver imagen ${index + 1}`);
            button.setAttribute('aria-current', index === 0 ? 'true' : 'false');
            button.innerHTML = `<img src="${escapeHtml(src)}" alt="${escapeHtml(name)} ${index + 1}">`;
            button.addEventListener('click', () => setActiveImage(index));
            thumbs.appendChild(button);
        });
        document.getElementById('galleryPrev').hidden = galleryImages.length < 2;
        document.getElementById('galleryNext').hidden = galleryImages.length < 2;
        document.getElementById('galleryCount').hidden = galleryImages.length < 2;
        document.getElementById('modalPrev').hidden = galleryImages.length < 2;
        document.getElementById('modalNext').hidden = galleryImages.length < 2;
        document.getElementById('modalCount').hidden = galleryImages.length < 2;
        setActiveImage(0);

        const sizeContainer = document.getElementById('sizeOptions');
        sizeContainer.innerHTML = sizeOptions().map(size => `<button type="button" class="size-btn" data-size="${escapeHtml(size)}">${escapeHtml(size)}</button>`).join('');
        sizeContainer.querySelectorAll('.size-btn').forEach(button => button.addEventListener('click', () => {
            sizeContainer.querySelectorAll('.size-btn').forEach(item => item.classList.remove('selected'));
            button.classList.add('selected');
            selectedSize = button.dataset.size;
        }));
        if (sizeContainer.querySelectorAll('.size-btn').length === 1) {
            const onlySize = sizeContainer.querySelector('.size-btn');
            onlySize.classList.add('selected');
            selectedSize = onlySize.dataset.size;
        }

        const colorContainer = document.getElementById('colorOptions');
        const colors = colorOptions();
        colorContainer.closest('.dm-choice-block').hidden = colors.length === 0;
        colorContainer.innerHTML = colors.map((color, index) => `<button type="button" class="size-btn${index === 0 ? ' selected' : ''}" data-color="${escapeHtml(color)}">${escapeHtml(color)}</button>`).join('');
        selectedColor = colors[0] || '';
        colorContainer.querySelectorAll('[data-color]').forEach(button => button.addEventListener('click', () => {
            colorContainer.querySelectorAll('[data-color]').forEach(item => item.classList.remove('selected'));
            button.classList.add('selected');
            selectedColor = button.dataset.color;
        }));

        const description = document.querySelector('#descripcion p');
        if (description) description.textContent = product.detailExplain || 'Consulta con nuestro equipo si necesitas más información sobre este producto.';
        const specs = document.querySelector('#especificaciones ul');
        if (specs) specs.innerHTML = [
            ['Marca', product.marcaRef], ['Color', product.color], ['Talla', product.talla], ['Código', product.codigoInterno || product.codigo]
        ].filter(([, value]) => value).map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`).join('') || '<li>Consulta los detalles por WhatsApp.</li>';
        if (maxStock <= 0) {
            document.getElementById('addToCartBtn').disabled = true;
            document.getElementById('whatsappBuyBtn').disabled = true;
            document.getElementById('addToCartBtn').textContent = 'Sin stock disponible';
            document.getElementById('stockNote').textContent = 'Sin disponibilidad reportada. Consulta al vendedor.';
        } else {
            document.getElementById('stockNote').textContent = `${maxStock} unidades disponibles · sujeto a confirmación del vendedor`;
        }
    }

    function updateCart() {
        const cart = store.cart;
        document.getElementById('cartCount').textContent = store.count;
        const container = document.getElementById('cartItemsList');
        if (!cart.length) {
            container.innerHTML = '<p class="text-center text-muted py-5">Tu carrito está vacío.</p>';
            document.getElementById('checkoutWhatsapp').disabled = true;
            document.getElementById('emptyCartBtn').disabled = true;
            return;
        }
        document.getElementById('emptyCartBtn').disabled = false;
        container.innerHTML = cart.map((item, index) => {
            const subtotal = Number(item.precio) * Number(item.cantidad);
            return `<div class="dm-cart-row"><img src="${escapeHtml(item.imagen || placeholder)}" alt=""><div class="dm-cart-info"><strong>${escapeHtml(item.nombre)}</strong><small>${item.color ? `Color: ${escapeHtml(item.color)} · ` : ''}Talla: ${escapeHtml(item.talla || 'Única')}</small><small>${money(item.precio)} c/u</small><div class="dm-cart-controls"><button type="button" data-cart-change="-1" data-cart-index="${index}" aria-label="Reducir">−</button><span>${Number(item.cantidad)}</span><button type="button" data-cart-change="1" data-cart-index="${index}" aria-label="Aumentar">+</button><button type="button" data-cart-remove="${index}" aria-label="Quitar">Quitar</button></div></div><b>${money(subtotal)}</b></div>`;
        }).join('') + `<div class="dm-cart-total">Total <strong>${money(store.total)}</strong></div>`;
        document.getElementById('checkoutWhatsapp').disabled = false;
        container.querySelectorAll('[data-cart-change]').forEach(button => button.addEventListener('click', () => {
            const index = Number(button.dataset.cartIndex);
            if (!store.change(index, Number(button.dataset.cartChange))) { alert('No hay más unidades disponibles.'); return; }
            updateCart();
        }));
        container.querySelectorAll('[data-cart-remove]').forEach(button => button.addEventListener('click', () => {
            store.remove(Number(button.dataset.cartRemove));
            updateCart();
        }));
    }

    function addCurrentProduct() {
        if (!selectedSize) { alert('Selecciona una talla para continuar.'); return false; }
        if (maxStock <= 0) { alert('Este producto no tiene stock disponible.'); return false; }
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > maxStock) { alert(`Cantidad no válida. Disponible: ${maxStock}.`); return false; }
        const added = store.add({
            id: String(product.codigodetalle),
            name: product.descripcionItem || 'Producto DMExpress',
            price: productPrice(),
            image: galleryImages[activeImageIndex] || imageSource(product.fotoUrl),
            stock: maxStock
        }, { quantity, size: selectedSize, color: selectedColor });
        if (!added) { alert(`Stock máximo disponible: ${maxStock}.`); return false; }
        updateCart();
        return true;
    }

    async function sendWhatsApp(items, imageSources = []) {
        const phone = environment.whatsappNumber;
        if (!phone || !/^\d{8,15}$/.test(phone)) { alert('El número de WhatsApp del vendedor no está configurado correctamente.'); return; }
        try {
            const message = formatOrderMessage(items);
            await sendWhatsAppOrder({ phone, message, imageSources });
        } catch (error) {
            alert(error.message || 'No se pudo preparar el pedido para WhatsApp.');
        }
    }

    async function initializeProductDetail() {
        const params = new URLSearchParams(location.search);
        const productId = params.get('codigodetalle');
        stockFromCatalog = Number(params.get('stock')) || 0;
        try {
            product = await productService.getById(productId);
            maxStock = readStock();
        } catch (error) {
            const feedback = document.getElementById('productLoadError');
            feedback.hidden = false;
            feedback.textContent = error.message || 'No se pudo cargar este producto.';
            document.getElementById('addToCartBtn').disabled = true;
            document.getElementById('whatsappBuyBtn').disabled = true;
            return;
        }
        renderProduct();
        updateCart();
        const modal = document.getElementById('imageModal');
        const showImage = () => {
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            setActiveImage(activeImageIndex);
        };
        const hideImage = () => { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); };
        document.querySelector('.main-image').addEventListener('click', showImage);
        document.querySelector('.main-image').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showImage(); } });
        document.getElementById('galleryPrev').addEventListener('click', () => moveImage(-1));
        document.getElementById('galleryNext').addEventListener('click', () => moveImage(1));
        document.getElementById('modalPrev').addEventListener('click', () => moveImage(-1));
        document.getElementById('modalNext').addEventListener('click', () => moveImage(1));
        document.querySelector('.dm-image-close').addEventListener('click', hideImage);
        modal?.addEventListener('click', event => { if (event.target === modal) hideImage(); });
        const bindSwipe = element => {
            let touchStartX = null;
            let swiped = false;
            element.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0]?.clientX ?? null; }, { passive: true });
            element.addEventListener('touchend', event => {
                if (touchStartX === null) return;
                const delta = event.changedTouches[0].clientX - touchStartX;
                if (Math.abs(delta) > 45) { moveImage(delta < 0 ? 1 : -1); swiped = true; }
                touchStartX = null;
                if (swiped) window.setTimeout(() => { swiped = false; }, 0);
            }, { passive: true });
            element.addEventListener('click', event => { if (swiped) { event.preventDefault(); event.stopPropagation(); swiped = false; } }, true);
        };
        bindSwipe(document.querySelector('.main-image'));
        bindSwipe(document.querySelector('#imageModal .modal-content'));
        document.getElementById('qtyMinus').addEventListener('click', () => { quantity = Math.max(1, quantity - 1); document.getElementById('qtyValue').textContent = quantity; });
        document.getElementById('qtyPlus').addEventListener('click', () => { quantity = Math.min(maxStock || 1, quantity + 1); document.getElementById('qtyValue').textContent = quantity; });
        document.getElementById('addToCartBtn').addEventListener('click', () => { if (addCurrentProduct()) alert('Producto agregado al carrito.'); });
        document.getElementById('whatsappBuyBtn').addEventListener('click', () => {
            if (!selectedSize) { alert('Selecciona una talla para continuar.'); return; }
            sendWhatsApp([{ id: product.codigodetalle, nombre: product.descripcionItem || 'Producto DMExpress', precio: productPrice(), cantidad: quantity, talla: selectedSize, color: selectedColor }], [galleryImages[activeImageIndex]]);
        });
        document.getElementById('cartIcon').addEventListener('click', () => {
            updateCart();
            openCart();
        });
        document.querySelector('#cartOffcanvas .dm-cart-close')?.addEventListener('click', closeCart);
        const search = document.getElementById('searchGlobal');
        const searchButton = search?.nextElementSibling;
        const goToSearch = () => {
            const term = search.value.trim();
            window.location.href = `index.html${term ? `?q=${encodeURIComponent(term)}` : ''}`;
        };
        search?.addEventListener('keydown', event => { if (event.key === 'Enter') goToSearch(); });
        searchButton?.addEventListener('click', goToSearch);
        document.getElementById('emptyCartBtn').addEventListener('click', () => { store.clearCart(); updateCart(); });
        document.getElementById('checkoutWhatsapp').addEventListener('click', () => { if (store.cart.length) sendWhatsApp(store.cart, store.cart.map(item => item.imagen)); });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') { closeCart(); hideImage(); }
            if (modal?.classList.contains('is-open') && event.key === 'ArrowRight') moveImage(1);
            if (modal?.classList.contains('is-open') && event.key === 'ArrowLeft') moveImage(-1);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeProductDetail, { once: true });
    else initializeProductDetail();

    function openCart() {
        const panel = document.getElementById('cartOffcanvas');
        panel.classList.add('is-open');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('role', 'dialog');
        if (!cartBackdrop) {
            cartBackdrop = document.createElement('button');
            cartBackdrop.type = 'button';
            cartBackdrop.className = 'dm-cart-backdrop';
            cartBackdrop.setAttribute('aria-label', 'Cerrar carrito');
            cartBackdrop.addEventListener('click', closeCart);
            document.body.appendChild(cartBackdrop);
        }
        document.body.classList.add('dm-cart-open');
    }

    function closeCart() {
        document.getElementById('cartOffcanvas').classList.remove('is-open');
        document.body.classList.remove('dm-cart-open');
        cartBackdrop?.remove();
        cartBackdrop = null;
    }

    window.addEventListener('pageshow', () => { store.refresh(); updateCart(); });
    window.addEventListener('storage', event => { if (event.key === cartStorageKey) { store.refresh(); updateCart(); } });
})();
