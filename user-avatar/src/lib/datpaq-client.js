const DEFAULT_TIMEOUT_MS = 15000;

export class DatpaqApiError extends Error {
    constructor(
        message,
        { status = null, statusText = "", url = "", method = "GET", details = null, cause = null } = {},
    ) {
        super(message);
        this.name = "DatpaqApiError";
        this.status = status;
        this.statusText = statusText;
        this.url = url;
        this.method = method;
        this.details = details;
        this.cause = cause;
    }
}

function normalizeBaseUrl(baseUrl) {
    return String(baseUrl || "").replace(/\/+$/, "");
}

function buildUrl(baseUrl, path, query) {
    const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
    const normalizedPath = String(path || "").startsWith("/") ? path : `/${String(path || "")}`;
    const rawUrl = `${normalizedBaseUrl}${normalizedPath}`;
    const url = new URL(
        rawUrl,
        typeof window !== "undefined" ? window.location.origin : "http://localhost",
    );

    if (query && typeof query === "object") {
        Object.entries(query).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "") {
                return;
            }

            if (Array.isArray(value)) {
                value.forEach((item) => url.searchParams.append(key, String(item)));
                return;
            }

            url.searchParams.set(key, String(value));
        });
    }

    return url.toString();
}

function createAbortController(timeoutMs, externalSignal) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const onAbort = () => controller.abort();
    if (externalSignal) {
        if (externalSignal.aborted) {
            controller.abort();
        } else {
            externalSignal.addEventListener("abort", onAbort, { once: true });
        }
    }

    return {
        signal: controller.signal,
        cleanup: () => {
            clearTimeout(timeoutId);
            if (externalSignal) {
                externalSignal.removeEventListener("abort", onAbort);
            }
        },
    };
}

function normalizeResponseType(responseType = "auto") {
    return String(responseType || "auto").toLowerCase();
}

async function parseJson(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

async function parseResponseBody(response, responseType = "auto") {
    const normalizedType = normalizeResponseType(responseType);

    if (normalizedType === "json") {
        return parseJson(response);
    }

    if (normalizedType === "text") {
        const text = await response.text();
        return text || null;
    }

    if (normalizedType === "blob") {
        return response.blob();
    }

    if (normalizedType === "arraybuffer") {
        return response.arrayBuffer();
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        return parseJson(response);
    }

    const text = await response.text();
    return text || null;
}

function createRequestHeaders({ apiKey, token, defaultHeaders, headers }) {
    const requestHeaders = new Headers(defaultHeaders || {});

    if (apiKey) {
        requestHeaders.set("x-api-key", apiKey);
    }

    if (token) {
        requestHeaders.set("authorization", `Bearer ${token}`);
    }

    if (headers) {
        const overrideHeaders = new Headers(headers);
        overrideHeaders.forEach((value, key) => {
            requestHeaders.set(key, value);
        });
    }

    if (!requestHeaders.has("accept")) {
        requestHeaders.set("accept", "application/json");
    }

    return requestHeaders;
}

function getRequestBody(body, headers) {
    if (body === undefined || body === null) {
        return undefined;
    }

    if (
        body instanceof FormData ||
        body instanceof Blob ||
        body instanceof URLSearchParams ||
        typeof body === "string"
    ) {
        return body;
    }

    if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
    }

    return JSON.stringify(body);
}

function headersToObject(headers) {
    const result = {};
    headers.forEach((value, key) => {
        result[key] = value;
    });
    return result;
}

export function createDatpaqClient({
    baseUrl,
    apiKey = "",
    token = "",
    timeoutMs = DEFAULT_TIMEOUT_MS,
    defaultHeaders = {},
} = {}) {
    if (!baseUrl) {
        throw new Error("createDatpaqClient requires a baseUrl.");
    }

    return {
        async request({
            path,
            method = "GET",
            query,
            body,
            headers,
            signal,
            responseType = "auto",
            rawResponse = false,
        } = {}) {
            if (!path) {
                throw new Error("request requires a path.");
            }

            const requestMethod = method.toUpperCase();
            const url = buildUrl(baseUrl, path, query);
            const requestHeaders = createRequestHeaders({ apiKey, token, defaultHeaders, headers });
            const requestBody = getRequestBody(body, requestHeaders);
            const { signal: timeoutSignal, cleanup } = createAbortController(timeoutMs, signal);

            try {
                const response = await fetch(url, {
                    method: requestMethod,
                    headers: requestHeaders,
                    body: requestBody,
                    signal: timeoutSignal,
                });

                const responseBody = await parseResponseBody(response, responseType);
                if (!response.ok) {
                    throw new DatpaqApiError(`DATPAQ API request failed (${response.status}).`, {
                        status: response.status,
                        statusText: response.statusText,
                        url,
                        method: requestMethod,
                        details: responseBody,
                    });
                }

                if (!rawResponse) {
                    return responseBody;
                }

                return {
                    data: responseBody,
                    status: response.status,
                    statusText: response.statusText,
                    headers: headersToObject(response.headers),
                    url,
                    method: requestMethod,
                };
            } catch (error) {
                if (error instanceof DatpaqApiError) {
                    throw error;
                }

                if (error instanceof Error && error.name === "AbortError") {
                    throw new DatpaqApiError("DATPAQ API request was cancelled or timed out.", {
                        url,
                        method: requestMethod,
                        cause: error,
                    });
                }

                throw new DatpaqApiError("Unable to reach the DATPAQ API.", {
                    url,
                    method: requestMethod,
                    cause: error,
                });
            } finally {
                cleanup();
            }
        },
    };
}
