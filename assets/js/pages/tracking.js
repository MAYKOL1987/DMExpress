import { environment } from '../config/environment.js';

(() => {
    const form = document.getElementById('trackingRequestForm');
    if (!form) return;

    const orderInput = document.getElementById('trackingOrderReference');
    const phoneInput = document.getElementById('trackingCustomerPhone');
    const feedback = document.getElementById('trackingFeedback');

    form.addEventListener('submit', event => {
        event.preventDefault();
        const orderReference = orderInput.value.trim();
        const customerPhone = phoneInput.value.replace(/[\s()+.-]/g, '');
        const orderError = document.getElementById('trackingOrderError');
        const phoneError = document.getElementById('trackingPhoneError');
        const sellerPhone = environment.whatsappNumber;

        orderError.textContent = orderReference.length >= 3 ? '' : 'Ingresa una referencia de al menos 3 caracteres.';
        phoneError.textContent = /^\d{7,15}$/.test(customerPhone) ? '' : 'Ingresa un teléfono válido de 7 a 15 dígitos.';
        orderInput.setAttribute('aria-invalid', String(Boolean(orderError.textContent)));
        phoneInput.setAttribute('aria-invalid', String(Boolean(phoneError.textContent)));
        feedback.textContent = '';
        if (orderError.textContent || phoneError.textContent) return;
        if (!sellerPhone || !/^\d{8,15}$/.test(sellerPhone)) {
            feedback.textContent = 'No se pudo iniciar la consulta. Inténtalo más tarde o contáctanos desde la tienda.';
            return;
        }

        const message = [
            'Hola, quisiera consultar el seguimiento de mi pedido.',
            '',
            `Referencia del pedido: ${orderReference}`,
            `Teléfono asociado: ${customerPhone}`,
            '',
            '¿Podrían confirmarme el estado del despacho y la fecha estimada de entrega?'
        ].join('\n');
        const whatsappUrl = `https://wa.me/${sellerPhone}?text=${encodeURIComponent(message)}`;
        const whatsappWindow = window.open(whatsappUrl, '_blank');
        if (whatsappWindow) whatsappWindow.opener = null;
        else window.location.href = whatsappUrl;
        feedback.textContent = 'Se abrió WhatsApp con los datos de tu consulta. Envíale el mensaje al vendedor para recibir la actualización.';
    });
})();
