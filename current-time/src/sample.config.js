export const sampleConfig = {
    appName: "Current Time API",
    description:
        "Fetch real-time timezone-aware current time for any IANA timezone or comma-separated location target.",
    endpoint: "/v1/current-time",
    method: "GET",
    docsUrl: "https://datpaq.com/api/v1/current-time",
    defaultQuery: {
        target: "America/New_York",
    },
    defaultBody: null,
    responseHighlights: [
        "requested_location",
        "datetime",
        "timezone_name",
        "timezone_abbreviation",
        "gmt_offset",
        "is_dst",
    ],
};

export function getApiBaseUrl() {
    if (import.meta.env.DEV) {
        return "/api";
    }

    return import.meta.env.VITE_DATPAQ_API_BASE_URL || "https://datpaq.com/api";
}
