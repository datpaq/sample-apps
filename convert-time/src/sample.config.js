export const sampleConfig = {
    appName: "Convert Time API",
    description:
        "Convert a source timestamp between timezones or locations with timezone metadata, offsets, and request diagnostics.",
    endpoint: "/v1/convert-time",
    method: "GET",
    docsUrl: "https://datpaq.com/api/v1/convert-time",
    defaultQuery: {
        sourceTime: "2026-03-07T20:00:00Z",
        sourceZone: "America/New_York",
        targetZone: "Asia/Tokyo",
    },
    defaultBody: null,
    responseHighlights: ["data.sourceTime", "data.targetTime", "meta.processingTimeMs"],
};

export function getApiBaseUrl() {
    return import.meta.env.VITE_DATPAQ_API_BASE_URL || "https://datpaq.com/api";
}
