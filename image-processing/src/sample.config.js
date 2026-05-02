export const sampleConfig = {
    appName: "Image Processing API",
    description:
        "Upload images to inspect metadata and run DATPAQ resize, compress, convert, and crop workflows.",
    endpoint: "/v1/image-processing/metadata",
    method: "POST",
    docsUrl: "https://www.datpaq.com/docs/image-processing",
    defaultQuery: null,
    defaultBody: null,
    responseHighlights: ["metadata", "basic", "file", "camera", "location"],
};

export function getApiBaseUrl() {
    if (import.meta.env.DEV) {
        return "/api";
    }

    return import.meta.env.VITE_DATPAQ_API_BASE_URL || "https://datpaq.com/api";
}
