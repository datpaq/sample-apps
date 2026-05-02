export const sampleConfig = {
    appName: "Validate IP API",
    description:
        "Validate IPv4, IPv6, and CIDR input with classification flags for private, reserved, loopback, multicast, link-local, and bogon ranges.",
    endpoint: "/v1/validate-ip/validate",
    method: "POST",
    docsUrl: "https://www.datpaq.com/docs/validate-ip",
    defaultQuery: null,
    defaultBody: {
        ip: "8.8.8.8",
    },
    responseHighlights: ["ip", "valid", "type", "private", "bogon", "message"],
};

export function getApiBaseUrl() {
    if (import.meta.env.DEV) {
        return "/api";
    }

    return import.meta.env.VITE_DATPAQ_API_BASE_URL || "https://datpaq.com/api";
}

export function getPublicApiBaseUrl() {
    return (
        import.meta.env.VITE_DATPAQ_PUBLIC_API_BASE_URL ||
        import.meta.env.VITE_DATPAQ_API_BASE_URL ||
        "https://datpaq.com/api"
    );
}
