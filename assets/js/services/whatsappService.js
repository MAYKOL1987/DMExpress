const money = value => `S/ ${Number(value || 0).toFixed(2)}`;

export function formatOrderMessage(items) {
    if (!Array.isArray(items) || items.length === 0) throw new Error('Añade al menos un producto al pedido.');
    const lines = items.map(item => {
        const quantity = Number(item.cantidad);
        const price = Number(item.precio);
        if (!Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(price) || price < 0) {
            throw new Error('El pedido contiene una cantidad o precio inválido.');
        }
        const options = [item.color && `Color: ${item.color}`, item.talla && `Talla: ${item.talla}`].filter(Boolean).join(' · ');
        return `- ${quantity}x ${item.nombre}${options ? ` (${options})` : ''} — ${money(quantity * price)}`;
    });
    const total = items.reduce((sum, item) => sum + Number(item.precio) * Number(item.cantidad), 0);
    return ['¡Hola! Quiero consultar y confirmar este pedido:', '', ...lines, '', `Total estimado: ${money(total)}`, '', '¿Me ayudan a coordinar disponibilidad y envío?'].join('\n');
}

function dataUrlToFile(source, index) {
    const match = /^data:(image\/[\w.+-]+);base64,([\s\S]+)$/i.exec(source);
    if (!match) return null;
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const extension = match[1].split('/')[1].replace('jpeg', 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
    return new File([bytes], `producto-${index + 1}.${extension}`, { type: match[1] });
}

async function imageToFile(source, index) {
    const inlineFile = dataUrlToFile(source, index);
    if (inlineFile) return inlineFile;
    const response = await fetch(new URL(source, window.location.href).href, { credentials: 'same-origin' });
    if (!response.ok) throw new Error('No se pudo leer la imagen del producto.');
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('El archivo seleccionado no es una imagen.');
    const extension = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
    return new File([blob], `producto-${index + 1}.${extension}`, { type: blob.type });
}

export async function sendWhatsAppOrder({ phone, message, imageSources = [], title = 'Pedido DMExpress' }) {
    const normalizedPhone = String(phone || '').replace(/\D/g, '');
    if (!/^\d{8,15}$/.test(normalizedPhone)) throw new Error('El número de WhatsApp no está configurado correctamente.');

    const sources = [...new Set(imageSources.filter(source => typeof source === 'string' && source))].slice(0, 5);
    if (sources.length && typeof navigator.share === 'function' && typeof File !== 'undefined') {
        try {
            const files = await Promise.all(sources.map(imageToFile));
            const shareData = { title, text: `${message}\n\nEnviar al vendedor: +${normalizedPhone}`, files };
            if (typeof navigator.canShare === 'function' && navigator.canShare({ files })) {
                await navigator.share(shareData);
                return 'shared';
            }
        } catch (error) {
            if (error?.name === 'AbortError') return 'cancelled';
            console.warn('No fue posible adjuntar la imagen al pedido.', error);
        }
    }

    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
    const whatsappWindow = window.open(url, '_blank');
    if (whatsappWindow) whatsappWindow.opener = null;
    else window.location.assign(url);
    return 'text-only';
}
