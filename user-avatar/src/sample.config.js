export const sampleConfig = {
    appName: "User Avatar API",
    description:
        "Generate polished user avatars from names with configurable shape, colors, size, and output format.",
    endpoint: "/v1/user-avatar",
    method: "GET",
    docsUrl: "https://www.datpaq.com/docs/user-avatar",
    defaultQuery: {
        name: "Jerod Huseman",
        size: 60,
        shape: "circle",
        format: "png",
    },
    defaultBody: null,
    responseHighlights: ["response.contentType", "response.bytes", "response.status"],
};

export function getApiBaseUrl() {
    if (import.meta.env.DEV) {
        return "/api";
    }

    return import.meta.env.VITE_DATPAQ_API_BASE_URL || "https://datpaq.com/api";
}
