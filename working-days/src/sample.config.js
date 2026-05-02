export const sampleConfig = {
    appName: "Working Days API",
    description:
        "Business-day calculations for date ranges and forward or backward offsets with regional holidays, custom exceptions, and request diagnostics.",
    endpoint: "/v1/working-days/calculate",
    method: "POST",
    docsUrl: "https://www.datpaq.com/docs/working-days",
    defaultQuery: null,
    defaultBody: {
        start_date: "2026-04-06",
        end_date: "2026-04-17",
        region: "US",
        include_start: false,
    },
    responseHighlights: ["data.working_days", "data.end_date", "meta.processingTimeMs"],
};

export function getApiBaseUrl() {
    if (import.meta.env.DEV) {
        return "/api";
    }

    return import.meta.env.VITE_DATPAQ_API_BASE_URL || "https://datpaq.com/api";
}
