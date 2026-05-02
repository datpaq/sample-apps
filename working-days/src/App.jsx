import { useEffect, useMemo, useState } from "react";
import { useDatpaqRequest } from "./hooks/useDatpaqRequest";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { getApiBaseUrl, sampleConfig } from "./sample.config";

const API_BASE_URL = getApiBaseUrl();
const SUPPORTED_REGIONS = [
    { value: "", label: "No regional holiday set" },
    { value: "US", label: "United States (US)" },
    { value: "DE", label: "Germany (DE)" },
    { value: "IN", label: "India (IN)" },
];

function createDefaultFormState() {
    return {
        calculationMode: "range",
        startDate: "2026-04-06",
        endDate: "2026-04-17",
        daysOffset: "7",
        direction: "forward",
        region: "US",
        includeStart: false,
        dateFormat: "",
        customHolidays: "",
    };
}

function buildRequestUrl(baseUrl, path) {
    const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
    const normalizedPath = String(path || "").startsWith("/") ? path : `/${String(path || "")}`;

    return new URL(
        `${normalizedBaseUrl}${normalizedPath}`,
        typeof window !== "undefined" ? window.location.origin : "http://localhost",
    ).toString();
}

function parseCustomHolidays(value) {
    return String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function buildRequestBody(values) {
    const payload = {
        start_date: values.startDate.trim(),
    };

    if (values.region) {
        payload.region = values.region;
    }

    if (values.dateFormat.trim()) {
        payload.date_format = values.dateFormat.trim();
    }

    const customHolidays = parseCustomHolidays(values.customHolidays);
    if (customHolidays.length > 0) {
        payload.custom_holidays = customHolidays;
    }

    if (values.calculationMode === "range") {
        payload.end_date = values.endDate.trim();
        payload.include_start = values.includeStart;
    } else {
        payload.days_offset = Number.parseInt(values.daysOffset, 10);
        payload.direction = values.direction;
    }

    return payload;
}

function validate(values, apiKey) {
    if (!apiKey.trim()) {
        return "API key is required.";
    }

    if (!values.startDate.trim()) {
        return "start_date is required.";
    }

    if (values.calculationMode === "range" && !values.endDate.trim()) {
        return "end_date is required for range calculations.";
    }

    if (values.calculationMode === "offset") {
        if (!values.daysOffset.trim()) {
            return "days_offset is required for offset calculations.";
        }

        if (!/^-?\d+$/.test(values.daysOffset.trim())) {
            return "days_offset must be a valid integer.";
        }
    }

    return "";
}

function formatNumber(value) {
    if (typeof value !== "number") {
        return "0";
    }

    return new Intl.NumberFormat("en-US").format(value);
}

function formatList(list) {
    if (!Array.isArray(list) || list.length === 0) {
        return "None";
    }

    return list.join(", ");
}

function getResultDate(result) {
    return result?.result_date || result?.end_date || "-";
}

function App() {
    const [theme, setTheme] = useState(() => {
        if (typeof window === "undefined") {
            return "light";
        }

        const savedTheme = window.localStorage.getItem("theme");
        if (savedTheme === "light" || savedTheme === "dark") {
            return savedTheme;
        }

        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    });
    const [formValues, setFormValues] = useState(() => createDefaultFormState());
    const [apiKeyInput, setApiKeyInput] = useState(() => import.meta.env.VITE_DATPAQ_API_KEY || "");
    const [validationError, setValidationError] = useState("");
    const [requestUrl, setRequestUrl] = useState("");
    const [requestBody, setRequestBody] = useState("");
    const [copied, setCopied] = useState({ url: false, request: false, json: false });

    const year = new Date().getFullYear();
    const isDark = theme === "dark";

    const { data, error, errorMessage, isLoading, run, retry, reset } = useDatpaqRequest({
        baseUrl: API_BASE_URL,
        apiKey: apiKeyInput.trim(),
        token: import.meta.env.VITE_DATPAQ_API_TOKEN,
    });

    const responsePayload = useMemo(() => {
        if (data) {
            return data;
        }

        if (error?.details) {
            return typeof error.details === "object" ? error.details : { success: false, error: error.details };
        }

        return null;
    }, [data, error]);

    const responseResult = useMemo(() => {
        if (!data?.success) {
            return null;
        }

        if (Array.isArray(data.data)) {
            return data.data[0] || null;
        }

        return data.data || null;
    }, [data]);

    const responseJson = useMemo(
        () => (responsePayload ? JSON.stringify(responsePayload, null, 2) : ""),
        [responsePayload],
    );

    const seoStructuredData = useMemo(
        () =>
            JSON.stringify(
                [
                    {
                        "@context": "https://schema.org",
                        "@type": "SoftwareApplication",
                        name: "DATPAQ Working Days API Sample",
                        applicationCategory: "BusinessApplication",
                        operatingSystem: "Any",
                        description: sampleConfig.description,
                        provider: {
                            "@type": "Organization",
                            name: "DATPAQ",
                            url: "https://www.datpaq.com/",
                        },
                        featureList: [
                            "Range-based working day calculations",
                            "Forward and backward business-day offsets",
                            "Region-aware holiday exclusions",
                            "Copyable request URL and JSON response",
                        ],
                    },
                    {
                        "@context": "https://schema.org",
                        "@type": "WebAPI",
                        name: "DATPAQ Working Days API",
                        documentation: sampleConfig.docsUrl,
                        provider: {
                            "@type": "Organization",
                            name: "DATPAQ",
                            url: "https://www.datpaq.com/",
                        },
                        url: `${API_BASE_URL}${sampleConfig.endpoint}`,
                    },
                ],
                null,
                2,
            ),
        [],
    );

    useEffect(() => {
        window.localStorage.setItem("theme", theme);
    }, [theme]);

    useEffect(() => {
        document.title = `${sampleConfig.appName} | DATPAQ`;
    }, []);

    const handleValueChange = (key) => (event) => {
        const nextValue = event.target.type === "checkbox" ? event.target.checked : event.target.value;

        setFormValues((current) => ({
            ...current,
            [key]: nextValue,
        }));
    };

    const handleCopy = async (key, value) => {
        if (!value || !navigator?.clipboard) {
            return;
        }

        try {
            await navigator.clipboard.writeText(value);
            setCopied((current) => ({ ...current, [key]: true }));
            window.setTimeout(() => {
                setCopied((current) => ({ ...current, [key]: false }));
            }, 1200);
        } catch {
            setCopied((current) => ({ ...current, [key]: false }));
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const formError = validate(formValues, apiKeyInput);
        if (formError) {
            setValidationError(formError);
            return;
        }

        const nextRequestBody = buildRequestBody(formValues);

        setValidationError("");
        setRequestUrl(buildRequestUrl(API_BASE_URL, sampleConfig.endpoint));
        setRequestBody(JSON.stringify(nextRequestBody, null, 2));

        try {
            await run({
                path: sampleConfig.endpoint,
                method: sampleConfig.method,
                body: nextRequestBody,
            });
        } catch {
            // Error state is handled by useDatpaqRequest.
        }
    };

    const handleReset = () => {
        setFormValues(createDefaultFormState());
        setApiKeyInput(import.meta.env.VITE_DATPAQ_API_KEY || "");
        setValidationError("");
        setRequestUrl("");
        setRequestBody("");
        setCopied({ url: false, request: false, json: false });
        reset();
    };

    const surfaceClass = isDark
        ? "border-zinc-700/70 bg-zinc-900/80 text-zinc-100"
        : "border-slate-200 bg-white/95 text-slate-900";

    const subtleSurfaceClass = isDark
        ? "border-zinc-700/70 bg-zinc-950/60 text-zinc-100"
        : "border-slate-200 bg-slate-50/90 text-slate-900";

    const inputClass = isDark
        ? "border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-zinc-400 focus-visible:ring-zinc-500/30"
        : "";

    const selectClass = isDark
        ? "h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus-visible:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-500/30"
        : "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus-visible:border-slate-500 focus-visible:ring-2 focus-visible:ring-slate-500/30";

    const secondaryButtonClass = isDark
        ? "border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-white"
        : "";

    const outlineButtonClass = isDark ? "border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" : "";
    const primaryButtonClass = isDark
        ? "bg-white text-zinc-950 hover:bg-zinc-200"
        : "bg-slate-950 text-white hover:bg-slate-800";
    const sectionLabelClass = isDark ? "text-zinc-400" : "text-slate-600";
    const mutedTextClass = isDark ? "text-zinc-400" : "text-slate-600";
    const requiredLabelClass = isDark ? "text-red-800" : "text-red-400";
    const tabsTriggerClass = isDark
        ? ""
        : "text-slate-700 data-[state=active]:bg-white data-[state=active]:text-zinc-800";

    const hasSubmitted = Boolean(requestUrl);
    const hasSuccessData = Boolean(data?.success && responseResult);
    const showEmptyState = !isLoading && !validationError && !errorMessage && !hasSuccessData;

    return (
        <div
            className={`relative min-h-screen overflow-hidden px-6 py-8 font-sans md:px-10 md:py-10 ${
                isDark
                    ? "bg-[radial-gradient(circle_at_15%_15%,#232323_0%,#141414_45%,#0d0d0d_100%)] text-zinc-100"
                    : "bg-[radial-gradient(circle_at_15%_15%,#dbeafe_0%,#f8fafc_40%,#f8fafc_100%)] text-slate-900"
            }`}
        >
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: seoStructuredData }} />

            <div className="pointer-events-none fixed -left-[20px] top-[0px] z-0">
                <div
                    className={`select-none font-['Inter'] text-[clamp(7rem,20vw,14rem)] leading-none font-black tracking-[-0.1em] [transform-origin:0_0] ${
                        isDark ? "text-zinc-700/70" : "text-black"
                    }`}
                    style={{ transform: "rotate(90deg) translateY(-100%)" }}
                >
                    DATPAQ
                </div>
            </div>

            <div
                className={`relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col rounded-xl p-6 backdrop-blur-sm md:p-10 ${
                    isDark
                        ? "border border-zinc-700/80 bg-[#141414]/90 shadow-2xl shadow-black/60"
                        : "border border-slate-200/80 bg-white/90 shadow-xl"
                }`}
            >
                <header
                    className={`flex items-center justify-between pb-5 ${
                        isDark ? "border-b border-zinc-700" : "border-b border-slate-200"
                    }`}
                >
                    <div className="cursor-default font-['Inter'] text-3xl font-black tracking-tight">DP.</div>
                    <div className="flex items-center gap-2">
                        <a
                            href={sampleConfig.docsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                                isDark
                                    ? "border-zinc-600 bg-zinc-900 text-zinc-100 hover:border-zinc-300 hover:text-white"
                                    : "border-slate-300 bg-white text-slate-800 hover:border-slate-900 hover:text-slate-900"
                            }`}
                        >
                            <svg
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                            >
                                <path d="M7 17 17 7" />
                                <path d="M8 7h9v9" />
                            </svg>
                            <span className="inline-flex items-center gap-1.5">
                                <span>API Docs</span>
                                <span className="h-4 w-4 opacity-60">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-4 w-4"
                                    >
                                        <path d="m6 4 4 4-4 4" />
                                    </svg>
                                </span>
                                <span>Working Days</span>
                            </span>
                        </a>

                        <button
                            type="button"
                            onClick={() => setTheme(isDark ? "light" : "dark")}
                            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                                isDark
                                    ? "border-zinc-600 bg-zinc-900 text-zinc-100 hover:border-zinc-300 hover:text-white"
                                    : "border-slate-300 bg-white text-slate-800 hover:border-slate-900 hover:text-slate-900"
                            }`}
                            aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
                        >
                            {isDark ? (
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M12 3.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V4.5a.75.75 0 0 1 .75-.75Zm0 14.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 12 18Zm8.25-6a.75.75 0 0 1-.75.75H18a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75Zm-14.25 0a.75.75 0 0 1-.75.75H3.75a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75Zm10.277 5.277a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0Zm-8.494-8.494a.75.75 0 0 1 0 1.06L6.723 10.91a.75.75 0 0 1-1.06-1.06l1.06-1.061a.75.75 0 0 1 1.06 0Zm8.494 0a.75.75 0 0 1 1.06 0l1.061 1.061a.75.75 0 1 1-1.06 1.06l-1.061-1.06a.75.75 0 0 1 0-1.06ZM6.723 17.277a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 1 1-1.06 1.061l-1.062-1.06a.75.75 0 0 1 0-1.061ZM12 8.25A3.75 3.75 0 1 1 8.25 12 3.75 3.75 0 0 1 12 8.25Z" />
                                </svg>
                            ) : (
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M21.64 13.02a1 1 0 0 0-1.22-.66 8 8 0 0 1-9.8-9.8 1 1 0 0 0-1.88-.78A10 10 0 1 0 22.42 14.9a1 1 0 0 0-.78-1.88Z" />
                                </svg>
                            )}
                            <span className="hidden lg:inline">{isDark ? "Light" : "Dark"}</span>
                        </button>
                    </div>
                </header>

                <main className="flex min-h-0 flex-1 py-8 md:py-10">
                    <div className="mx-auto grid h-full min-h-0 w-full max-w-[1180px] items-start gap-8 lg:grid-cols-[minmax(420px,560px)_minmax(0,1fr)]">
                        <Card className={`${surfaceClass} h-fit overflow-hidden`}>
                            <div
                                className={`border-b px-5 py-4 ${
                                    isDark
                                        ? "border-zinc-700 bg-gradient-to-r from-zinc-900 via-zinc-900 to-emerald-950/60"
                                        : "border-slate-200 bg-gradient-to-r from-white via-slate-50 to-emerald-50"
                                }`}
                            >
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedTextClass}`}>
                                            Business Calendar Sample
                                        </p>
                                        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                                            {sampleConfig.appName}
                                        </h1>
                                    </div>
                                    <span
                                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
                                            isDark
                                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                                : "border-emerald-600/30 bg-emerald-600/10 text-emerald-700"
                                        }`}
                                    >
                                        Live POST
                                    </span>
                                </div>
                                <p className={`max-w-xl text-sm leading-6 ${mutedTextClass}`}>{sampleConfig.description}</p>
                            </div>

                            <CardContent className="pt-5">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="apiKey" className={sectionLabelClass}>
                                                API Key
                                            </Label>
                                            <span
                                                className={`text-[11px] font-semibold uppercase tracking-wide ${requiredLabelClass}`}
                                            >
                                                Required
                                            </span>
                                        </div>
                                        <Input
                                            id="apiKey"
                                            value={apiKeyInput}
                                            onChange={(event) => setApiKeyInput(event.target.value)}
                                            placeholder="Paste DATPAQ API key"
                                            autoComplete="off"
                                            className={inputClass}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className={sectionLabelClass}>Calculation Mode</Label>
                                        <Tabs
                                            value={formValues.calculationMode}
                                            onValueChange={(value) =>
                                                setFormValues((current) => ({ ...current, calculationMode: value }))
                                            }
                                            className="gap-3"
                                        >
                                            <TabsList
                                                className={`w-full ${
                                                    isDark ? "bg-zinc-800 text-zinc-300" : "bg-slate-200 text-slate-700"
                                                }`}
                                            >
                                                <TabsTrigger value="range" className={tabsTriggerClass}>
                                                    Count Working Days
                                                </TabsTrigger>
                                                <TabsTrigger value="offset" className={tabsTriggerClass}>
                                                    Move a Date
                                                </TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="range" className="space-y-5">
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2.5">
                                                        <div className="flex items-center justify-between">
                                                            <Label htmlFor="startDateRange" className={sectionLabelClass}>
                                                                start_date
                                                            </Label>
                                                            <span
                                                                className={`text-[11px] font-semibold uppercase tracking-wide ${requiredLabelClass}`}
                                                            >
                                                                Required
                                                            </span>
                                                        </div>
                                                        <Input
                                                            id="startDateRange"
                                                            type="date"
                                                            value={formValues.startDate}
                                                            onChange={handleValueChange("startDate")}
                                                            className={inputClass}
                                                        />
                                                    </div>

                                                    <div className="space-y-2.5">
                                                        <div className="flex items-center justify-between">
                                                            <Label htmlFor="endDate" className={sectionLabelClass}>
                                                                end_date
                                                            </Label>
                                                            <span
                                                                className={`text-[11px] font-semibold uppercase tracking-wide ${requiredLabelClass}`}
                                                            >
                                                                Required
                                                            </span>
                                                        </div>
                                                        <Input
                                                            id="endDate"
                                                            type="date"
                                                            value={formValues.endDate}
                                                            onChange={handleValueChange("endDate")}
                                                            className={inputClass}
                                                        />
                                                    </div>
                                                </div>

                                                <div className={`rounded-lg border p-4 ${subtleSurfaceClass}`}>
                                                    <label className="flex items-start gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={formValues.includeStart}
                                                            onChange={handleValueChange("includeStart")}
                                                            className="mt-1 h-4 w-4 rounded border-slate-300 accent-slate-900"
                                                        />
                                                        <span className="space-y-1">
                                                            <span className="block text-sm font-medium">Include start date</span>
                                                            <span className={`block text-sm ${mutedTextClass}`}>
                                                                Count the starting day when it is a valid working day.
                                                            </span>
                                                        </span>
                                                    </label>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="offset" className="space-y-5">
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2.5">
                                                        <div className="flex items-center justify-between">
                                                            <Label htmlFor="startDateOffset" className={sectionLabelClass}>
                                                                start_date
                                                            </Label>
                                                            <span
                                                                className={`text-[11px] font-semibold uppercase tracking-wide ${requiredLabelClass}`}
                                                            >
                                                                Required
                                                            </span>
                                                        </div>
                                                        <Input
                                                            id="startDateOffset"
                                                            type="date"
                                                            value={formValues.startDate}
                                                            onChange={handleValueChange("startDate")}
                                                            className={inputClass}
                                                        />
                                                    </div>

                                                    <div className="space-y-2.5">
                                                        <div className="flex items-center justify-between">
                                                            <Label htmlFor="daysOffset" className={sectionLabelClass}>
                                                                days_offset
                                                            </Label>
                                                            <span
                                                                className={`text-[11px] font-semibold uppercase tracking-wide ${requiredLabelClass}`}
                                                            >
                                                                Required
                                                            </span>
                                                        </div>
                                                        <Input
                                                            id="daysOffset"
                                                            inputMode="numeric"
                                                            value={formValues.daysOffset}
                                                            onChange={handleValueChange("daysOffset")}
                                                            placeholder="7"
                                                            className={inputClass}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2.5">
                                                    <Label htmlFor="direction" className={sectionLabelClass}>
                                                        direction
                                                    </Label>
                                                    <select
                                                        id="direction"
                                                        value={formValues.direction}
                                                        onChange={handleValueChange("direction")}
                                                        className={selectClass}
                                                    >
                                                        <option value="forward">forward</option>
                                                        <option value="backward">backward</option>
                                                    </select>
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2.5">
                                            <Label htmlFor="region" className={sectionLabelClass}>
                                                region
                                            </Label>
                                            <select
                                                id="region"
                                                value={formValues.region}
                                                onChange={handleValueChange("region")}
                                                className={selectClass}
                                            >
                                                {SUPPORTED_REGIONS.map((option) => (
                                                    <option key={option.label} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2.5">
                                            <Label htmlFor="dateFormat" className={sectionLabelClass}>
                                                date_format
                                            </Label>
                                            <Input
                                                id="dateFormat"
                                                value={formValues.dateFormat}
                                                onChange={handleValueChange("dateFormat")}
                                                placeholder="YYYY-MM-DD or MM/DD/YYYY"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label htmlFor="customHolidays" className={sectionLabelClass}>
                                            custom_holidays
                                        </Label>
                                        <Input
                                            id="customHolidays"
                                            value={formValues.customHolidays}
                                            onChange={handleValueChange("customHolidays")}
                                            placeholder="2026-04-10, 2026-04-13"
                                            className={inputClass}
                                        />
                                        <p className={`text-sm ${mutedTextClass}`}>
                                            Comma-separate extra non-working dates. Supported region codes: US, DE, IN.
                                        </p>
                                    </div>

                                    {validationError ? (
                                        <div
                                            className={`rounded-md border px-3 py-2 text-sm ${
                                                isDark
                                                    ? "border-red-500/40 bg-red-500/10 text-red-200"
                                                    : "border-red-200 bg-red-50 text-red-700"
                                            }`}
                                        >
                                            {validationError}
                                        </div>
                                    ) : null}

                                    <div className="flex flex-wrap gap-3">
                                        <Button type="submit" disabled={isLoading} className={primaryButtonClass}>
                                            {isLoading ? "Calculating..." : "Run calculation"}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={handleReset}
                                            className={secondaryButtonClass}
                                        >
                                            Reset
                                        </Button>
                                        {errorMessage ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => retry()}
                                                className={outlineButtonClass}
                                            >
                                                Retry last request
                                            </Button>
                                        ) : null}
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <div className="grid min-h-0 gap-6">
                            <Card className={`${surfaceClass} overflow-hidden`}>
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-xl">Result</CardTitle>
                                    <CardDescription className={mutedTextClass}>
                                        Success, error, loading, and empty states all reflect the live DATPAQ response.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {isLoading ? (
                                        <div className={`rounded-xl border p-5 ${subtleSurfaceClass}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
                                                <p className="text-sm font-medium">Sending request to DATPAQ…</p>
                                            </div>
                                        </div>
                                    ) : null}

                                    {!isLoading && errorMessage ? (
                                        <div
                                            className={`rounded-xl border p-5 ${
                                                isDark
                                                    ? "border-red-500/30 bg-red-500/10 text-red-100"
                                                    : "border-red-200 bg-red-50 text-red-700"
                                            }`}
                                        >
                                            <p className="text-sm font-semibold uppercase tracking-wide">Request failed</p>
                                            <p className="mt-2 text-sm leading-6">{errorMessage}</p>
                                        </div>
                                    ) : null}

                                    {hasSuccessData ? (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div
                                                className={`rounded-2xl border p-5 ${
                                                    isDark
                                                        ? "border-emerald-500/25 bg-emerald-500/8"
                                                        : "border-emerald-200 bg-emerald-50"
                                                }`}
                                            >
                                                <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedTextClass}`}>
                                                    Working Days
                                                </p>
                                                <p className="mt-3 text-5xl font-semibold tracking-tight">
                                                    {formatNumber(responseResult.working_days)}
                                                </p>
                                                <p className={`mt-3 text-sm ${mutedTextClass}`}>
                                                    Calculation type: {responseResult.calculation_type || formValues.calculationMode}
                                                </p>
                                            </div>

                                            <div className={`rounded-2xl border p-5 ${subtleSurfaceClass}`}>
                                                <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedTextClass}`}>
                                                    Result Date
                                                </p>
                                                <p className="mt-3 text-2xl font-semibold tracking-tight">
                                                    {getResultDate(responseResult)}
                                                </p>
                                                <p className={`mt-3 text-sm ${mutedTextClass}`}>
                                                    Region: {responseResult.region || "None"}
                                                </p>
                                            </div>

                                            <div className={`rounded-xl border p-4 ${subtleSurfaceClass}`}>
                                                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${mutedTextClass}`}>
                                                    Weekends Excluded
                                                </p>
                                                <p className="mt-2 text-2xl font-semibold">
                                                    {formatNumber(responseResult.weekends_excluded)}
                                                </p>
                                            </div>

                                            <div className={`rounded-xl border p-4 ${subtleSurfaceClass}`}>
                                                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${mutedTextClass}`}>
                                                    Processing Time
                                                </p>
                                                <p className="mt-2 text-2xl font-semibold">
                                                    {formatNumber(data.meta?.processingTimeMs)} ms
                                                </p>
                                            </div>

                                            <div className={`rounded-xl border p-4 md:col-span-2 ${subtleSurfaceClass}`}>
                                                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${mutedTextClass}`}>
                                                    Holidays Used
                                                </p>
                                                <p className="mt-2 text-sm leading-6">{formatList(responseResult.holidays_used)}</p>
                                            </div>
                                        </div>
                                    ) : null}

                                    {showEmptyState ? (
                                        <div className={`rounded-xl border p-5 ${subtleSurfaceClass}`}>
                                            <p className="text-sm font-semibold uppercase tracking-wide">Empty state</p>
                                            <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                                                {hasSubmitted
                                                    ? "The request completed without a usable calculation payload."
                                                    : "Add an API key, choose a calculation mode, and submit a request to see live working-day results."}
                                            </p>
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>

                            <Card className={surfaceClass}>
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-xl">Request</CardTitle>
                                    <CardDescription className={mutedTextClass}>
                                        Copy the endpoint URL and exact JSON body used for the last request.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className={`rounded-xl border p-4 ${subtleSurfaceClass}`}>
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${mutedTextClass}`}>
                                                Request URL
                                            </p>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className={outlineButtonClass}
                                                onClick={() => handleCopy("url", requestUrl)}
                                                disabled={!requestUrl}
                                            >
                                                {copied.url ? "Copied" : "Copy URL"}
                                            </Button>
                                        </div>
                                        <pre className="overflow-x-auto text-sm leading-6 whitespace-pre-wrap break-all">
                                            <code>{requestUrl || `${API_BASE_URL}${sampleConfig.endpoint}`}</code>
                                        </pre>
                                    </div>

                                    <div className={`rounded-xl border p-4 ${subtleSurfaceClass}`}>
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${mutedTextClass}`}>
                                                Request Body
                                            </p>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className={outlineButtonClass}
                                                onClick={() => handleCopy("request", requestBody)}
                                                disabled={!requestBody}
                                            >
                                                {copied.request ? "Copied" : "Copy JSON"}
                                            </Button>
                                        </div>
                                        <pre className="overflow-x-auto text-sm leading-6 whitespace-pre-wrap">
                                            <code>{requestBody || JSON.stringify(sampleConfig.defaultBody, null, 2)}</code>
                                        </pre>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className={surfaceClass}>
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-xl">Response JSON</CardTitle>
                                    <CardDescription className={mutedTextClass}>
                                        Raw JSON output stays copyable for debugging, crawling, and agent inspection.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className={`rounded-xl border p-4 ${subtleSurfaceClass}`}>
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${mutedTextClass}`}>
                                                Payload
                                            </p>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className={outlineButtonClass}
                                                onClick={() => handleCopy("json", responseJson)}
                                                disabled={!responseJson}
                                            >
                                                {copied.json ? "Copied" : "Copy JSON"}
                                            </Button>
                                        </div>
                                        <pre className="max-h-[340px] overflow-auto text-sm leading-6 whitespace-pre-wrap">
                                            <code>{responseJson || "{\n  \"success\": true,\n  \"data\": { ... }\n}"}</code>
                                        </pre>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>

                <footer
                    className={`flex flex-col gap-3 pt-5 text-sm md:flex-row md:items-center md:justify-between ${
                        isDark ? "border-t border-zinc-700 text-zinc-300" : "border-t border-slate-200 text-slate-600"
                    }`}
                >
                    <p>
                        &copy; {year}{" "}
                        <a
                            href="https://www.datpaq.com/"
                            className={`transition ${isDark ? "hover:text-white" : "hover:text-sky-600"}`}
                        >
                            DATPAQ.COM
                        </a>
                    </p>
                    <nav className="flex flex-wrap items-center gap-4">
                        <a
                            href="https://www.datpaq.com/apis"
                            className={`transition ${isDark ? "hover:text-white" : "hover:text-sky-600"}`}
                        >
                            APIs
                        </a>
                        <a
                            href="https://www.datpaq.com/docs"
                            className={`transition ${isDark ? "hover:text-white" : "hover:text-sky-600"}`}
                        >
                            Documentation
                        </a>
                        <a
                            href="https://www.datpaq.com/contact"
                            className={`transition ${isDark ? "hover:text-white" : "hover:text-sky-600"}`}
                        >
                            Contact
                        </a>
                    </nav>
                </footer>
            </div>
        </div>
    );
}

export default App;
