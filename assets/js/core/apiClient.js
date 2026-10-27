import { environment } from '../config/environment.js';

export class ApiError extends Error {
    constructor(message, status, details = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }
}

const statusMessages = new Map([
    [400, 'La solicitud no es válida.'],
    [401, 'La sesión no está autorizada.'],
    [403, 'No tienes permiso para realizar esta acción.'],
    [404, 'No se encontró el recurso solicitado.'],
    [409, 'El recurso cambió. Actualiza la página e inténtalo de nuevo.'],
    [422, 'No se pudieron validar los datos enviados.'],
    [500, 'El servidor encontró un problema.']
]);

function resolveUrl(path, params) {
    const base = environment.backendBaseUrl.replace(/\/$/, '');
    const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`, window.location.origin);
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    });
    return url;
}

async function request(method, path, { params, body, signal, headers = {} } = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(new DOMException('La solicitud excedió el tiempo límite.', 'TimeoutError')), environment.requestTimeoutMs);
    const abortRequest = () => controller.abort(signal.reason);
    signal?.addEventListener('abort', abortRequest, { once: true });

    try {
        const response = await fetch(resolveUrl(path, params), {
            method,
            credentials: 'same-origin',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
                ...headers
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) })
        });

        const contentType = response.headers.get('content-type') || '';
        const payload = response.status === 204 ? null : contentType.includes('json')
            ? await response.json()
            : await response.text();

        if (!response.ok) {
            const message = payload?.message || statusMessages.get(response.status) || `La solicitud falló (${response.status}).`;
            throw new ApiError(message, response.status, payload);
        }
        return payload;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        if (error?.name === 'AbortError' || error?.name === 'TimeoutError') throw error;
        throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.', 0, error);
    } finally {
        window.clearTimeout(timeout);
        signal?.removeEventListener('abort', abortRequest);
    }
}

export const apiClient = Object.freeze({
    get: (path, options) => request('GET', path, options),
    post: (path, body, options = {}) => request('POST', path, { ...options, body }),
    put: (path, body, options = {}) => request('PUT', path, { ...options, body }),
    patch: (path, body, options = {}) => request('PATCH', path, { ...options, body }),
    delete: (path, options) => request('DELETE', path, options)
});
