export const sampleConfig = {
    appName: "Unit Conversion API",
    description:
        "Convert values across live DATPAQ measurement categories with category discovery, unit lookup, precision control, and full request diagnostics.",
    endpoint: "/v1/unit-conversion/convert",
    method: "POST",
    docsUrl: "https://www.datpaq.com/docs/unit-conversion",
    defaultQuery: null,
    defaultBody: {
        from: "kg",
        to: "lb",
        value: 5.5,
        precision: 2,
    },
    responseHighlights: ["data.result", "meta.processingTimeMs", "correlationId"],
    supportingEndpoints: ["/v1/unit-conversion/categories", "/v1/unit-conversion/units/:category"],
};

export function getApiBaseUrl() {
    if (import.meta.env.DEV) {
        return "/api";
    }

    return import.meta.env.VITE_DATPAQ_API_BASE_URL || "https://datpaq.com/api";
}

export function getPublicApiBaseUrl() {
    return import.meta.env.VITE_DATPAQ_PUBLIC_API_BASE_URL || "https://datpaq.com/api";
}
