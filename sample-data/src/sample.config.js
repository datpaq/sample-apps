export const sampleConfig = {
    appName: "Sample Data API",
    description:
        "Generate realistic mock datasets on demand with selectable schema type, field filters, row counts, and JSON or CSV output.",
    endpoint: "/v1/sample-data",
    method: "GET",
    docsUrl: "https://www.datpaq.com/docs/sample-data",
    defaultQuery: {
        type: "company",
        count: 10,
        fields: "name,industry,website",
        format: "json",
    },
    defaultBody: null,
    responseHighlights: ["success", "metadata.type", "metadata.count", "data[0]"],
};

export function getApiBaseUrl() {
    if (import.meta.env.DEV) {
        return "/api";
    }

    return import.meta.env.VITE_DATPAQ_API_BASE_URL || "https://datpaq.com/api";
}
