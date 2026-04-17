import { useEffect, useMemo, useState } from "react";
import { useDatpaqRequest } from "./hooks/useDatpaqRequest";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { getApiBaseUrl, sampleConfig } from "./sample.config";

const API_BASE_URL = getApiBaseUrl();

function createDefaultFormState() {
    return {
        sourceTime: new Date().toISOString(),
        sourceMode: "zone",
        sourceZone: "America/New_York",
        sourceLocation: "",
        targetMode: "zone",
        targetZone: "Asia/Tokyo",
        targetLocation: "",
    };
}

function buildRequestUrl(baseUrl, path, query) {
    const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
    const normalizedPath = String(path || "").startsWith("/") ? path : `/${String(path || "")}`;
    const url = new URL(`${normalizedBaseUrl}${normalizedPath}`);

    Object.entries(query || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
            return;
        }
        url.searchParams.set(key, String(value));
    });

    return url.toString();
}

function buildQuery(values) {
    const query = {
        sourceTime: values.sourceTime.trim(),
    };

    if (values.sourceMode === "zone") {
        query.sourceZone = values.sourceZone.trim();
    } else {
        query.sourceLocation = values.sourceLocation.trim();
    }

    if (values.targetMode === "zone") {
        query.targetZone = values.targetZone.trim();
    } else {
        query.targetLocation = values.targetLocation.trim();
    }

    return query;
}

function validate(values, apiKey) {
    if (!apiKey.trim()) {
        return "API key is required.";
    }

    if (!values.sourceTime.trim()) {
        return "Source time is required. Use ISO 8601 or epoch format.";
    }

    if (values.sourceMode === "zone" && !values.sourceZone.trim()) {
        return "A source IANA timezone is required when source mode is set to timezone.";
    }

    if (values.sourceMode === "location" && !values.sourceLocation.trim()) {
        return "A source location is required when source mode is set to location.";
    }

    if (values.targetMode === "zone" && !values.targetZone.trim()) {
        return "A target IANA timezone is required when target mode is set to timezone.";
    }

    if (values.targetMode === "location" && !values.targetLocation.trim()) {
        return "A target location is required when target mode is set to location.";
    }

    return "";
}

function timezoneOrDash(value) {
    return value ? String(value) : "-";
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
    const [copied, setCopied] = useState({ url: false, json: false });

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

    const responseJson = useMemo(
        () => (responsePayload ? JSON.stringify(responsePayload, null, 2) : ""),
        [responsePayload],
    );

    useEffect(() => {
        window.localStorage.setItem("theme", theme);
    }, [theme]);

    const handleValueChange = (key) => (event) => {
        setFormValues((current) => ({
            ...current,
            [key]: event.target.value,
        }));
    };

    const handleModeChange = (key, value) => {
        setFormValues((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const formError = validate(formValues, apiKeyInput);
        if (formError) {
            setValidationError(formError);
            return;
        }

        const query = buildQuery(formValues);
        const nextRequestUrl = buildRequestUrl(API_BASE_URL, sampleConfig.endpoint, query);

        setValidationError("");
        setRequestUrl(nextRequestUrl);

        try {
            await run({
                path: sampleConfig.endpoint,
                method: sampleConfig.method,
                query,
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
        setCopied({ url: false, json: false });
        reset();
    };

    const handleCopy = async (key, value) => {
        if (!value) {
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

    const surfaceClass = isDark
        ? "border-zinc-700/70 bg-zinc-900/80 text-zinc-100"
        : "border-slate-200 bg-white/95 text-slate-900";

    const subtleSurfaceClass = isDark
        ? "border-zinc-700/70 bg-zinc-950/50 text-zinc-100"
        : "border-slate-200 bg-slate-50 text-slate-900";

    const inputClass = isDark
        ? "border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-zinc-400 focus-visible:ring-zinc-500/30"
        : "";

    const secondaryButtonClass = isDark
        ? "border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-white"
        : "";

    const outlineButtonClass = isDark ? "border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" : "";

    const sectionLabelClass = isDark ? "text-zinc-400" : "text-slate-600";
    const requiredLabelClass = isDark ? "text-red-800" : "text-red-400";
    const tabsTriggerClass = isDark
        ? ""
        : "text-slate-700 data-[state=active]:bg-white data-[state=active]:text-zinc-800";

    const hasSuccessData = Boolean(data?.success && data?.data?.sourceTime && data?.data?.targetTime);

    return (
        <div
            className={`relative min-h-screen overflow-hidden px-6 py-8 font-sans md:px-10 md:py-10 ${
                isDark
                    ? "bg-[radial-gradient(circle_at_15%_15%,#232323_0%,#141414_45%,#0d0d0d_100%)] text-zinc-100"
                    : "bg-[radial-gradient(circle_at_15%_15%,#dbeafe_0%,#f8fafc_40%,#f8fafc_100%)] text-slate-900"
            }`}
        >
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
                    <div className="font-['Inter'] text-3xl font-black tracking-tight cursor-default">DP.</div>
                    <div className="flex items-center gap-2">
                        <a
                            href="https://datpaq.com/docs/convert-time"
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
                                        className="w-4 h-4 lucide lucide-chevron-right-icon lucide-chevron-right"
                                    >
                                        <path d="m6 4 4 4-4 4" />
                                    </svg>
                                </span>
                                <span>Convert Time</span>
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
                    <div className="mx-auto grid h-full min-h-0 w-full max-w-[1180px] items-start gap-8 lg:grid-cols-[minmax(400px,580px)_minmax(0,1fr)]">
                        <Card className={`${surfaceClass} h-fit`}>
                            <CardHeader className="pb-4">
                                <CardTitle className="mb-2 flex items-center justify-between gap-3">
                                    <h3 className="text-3xl leading-tight">{sampleConfig.appName}</h3>
                                    <div className="">
                                        <span
                                            className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold tracking-wide ${
                                                isDark
                                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                                    : "border-emerald-600/30 bg-emerald-600/10 text-emerald-700"
                                            }`}
                                        >
                                            {sampleConfig.method}
                                        </span>
                                    </div>
                                </CardTitle>
                                <CardDescription className={`${isDark ? "text-zinc-400" : "text-slate-600"} text-lg`}>
                                    {sampleConfig.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
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
                                            className={inputClass}
                                        />
                                    </div>

                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="sourceTime" className={sectionLabelClass}>
                                                sourceTime
                                            </Label>
                                            <span
                                                className={`text-[11px] font-semibold uppercase tracking-wide ${requiredLabelClass}`}
                                            >
                                                Required
                                            </span>
                                        </div>
                                        <Input
                                            id="sourceTime"
                                            value={formValues.sourceTime}
                                            onChange={handleValueChange("sourceTime")}
                                            placeholder="2026-03-07T20:00:00Z or 1762459200"
                                            className={inputClass}
                                        />
                                        <div className="flex flex-wrap gap-2.5">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                className={secondaryButtonClass}
                                                onClick={() =>
                                                    setFormValues((current) => ({
                                                        ...current,
                                                        sourceTime: new Date().toISOString(),
                                                    }))
                                                }
                                            >
                                                Use current ISO
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className={outlineButtonClass}
                                                onClick={() =>
                                                    setFormValues((current) => ({
                                                        ...current,
                                                        sourceTime: String(Math.floor(Date.now() / 1000)),
                                                    }))
                                                }
                                            >
                                                Use epoch (sec)
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label className={sectionLabelClass}>Source</Label>
                                            <div className={`rounded-lg border p-4 ${subtleSurfaceClass}`}>
                                                <Tabs
                                                    value={formValues.sourceMode}
                                                    onValueChange={(value) => handleModeChange("sourceMode", value)}
                                                    className="gap-3"
                                                >
                                                    <TabsList
                                                        className={`w-full ${
                                                            isDark
                                                                ? "bg-zinc-800 text-zinc-300"
                                                                : "bg-slate-200 text-slate-700"
                                                        }`}
                                                    >
                                                        <TabsTrigger value="zone" className={tabsTriggerClass}>
                                                            Timezone
                                                        </TabsTrigger>
                                                        <TabsTrigger value="location" className={tabsTriggerClass}>
                                                            Location
                                                        </TabsTrigger>
                                                    </TabsList>
                                                    <TabsContent value="zone">
                                                        <Input
                                                            value={formValues.sourceZone}
                                                            onChange={handleValueChange("sourceZone")}
                                                            placeholder="America/New_York"
                                                            className={inputClass}
                                                        />
                                                    </TabsContent>
                                                    <TabsContent value="location">
                                                        <Input
                                                            value={formValues.sourceLocation}
                                                            onChange={handleValueChange("sourceLocation")}
                                                            placeholder="New York, NY"
                                                            className={inputClass}
                                                        />
                                                    </TabsContent>
                                                </Tabs>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className={sectionLabelClass}>Target</Label>
                                            <div className={`rounded-lg border p-4 ${subtleSurfaceClass}`}>
                                                <Tabs
                                                    value={formValues.targetMode}
                                                    onValueChange={(value) => handleModeChange("targetMode", value)}
                                                    className="gap-3"
                                                >
                                                    <TabsList
                                                        className={`w-full ${
                                                            isDark
                                                                ? "bg-zinc-800 text-zinc-300"
                                                                : "bg-slate-200 text-slate-700"
                                                        }`}
                                                    >
                                                        <TabsTrigger value="zone" className={tabsTriggerClass}>
                                                            Timezone
                                                        </TabsTrigger>
                                                        <TabsTrigger value="location" className={tabsTriggerClass}>
                                                            Location
                                                        </TabsTrigger>
                                                    </TabsList>
                                                    <TabsContent value="zone">
                                                        <Input
                                                            value={formValues.targetZone}
                                                            onChange={handleValueChange("targetZone")}
                                                            placeholder="Asia/Tokyo"
                                                            className={inputClass}
                                                        />
                                                    </TabsContent>
                                                    <TabsContent value="location">
                                                        <Input
                                                            value={formValues.targetLocation}
                                                            onChange={handleValueChange("targetLocation")}
                                                            placeholder="Tokyo, Japan"
                                                            className={inputClass}
                                                        />
                                                    </TabsContent>
                                                </Tabs>
                                            </div>
                                        </div>
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

                                    <div className="flex flex-wrap gap-2.5">
                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                            className={isDark ? "bg-zinc-100 text-zinc-900 hover:bg-white" : ""}
                                        >
                                            {isLoading ? "Converting..." : "Convert Time"}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={outlineButtonClass}
                                            onClick={handleReset}
                                        >
                                            Reset
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className={`${surfaceClass} flex min-h-0 flex-col overflow-hidden lg:h-full`}>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl">Response</CardTitle>
                                <CardDescription className={isDark ? "text-zinc-400" : "text-slate-600"}>
                                    Converted time output, metadata, and raw response.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
                                {isLoading ? (
                                    <div className={`rounded-lg border p-4 ${subtleSurfaceClass}`}>
                                        <div className="mb-2 h-2 w-28 animate-pulse rounded bg-current/30" />
                                        <div className="h-2 w-full animate-pulse rounded bg-current/15" />
                                        <p className={`mt-4 text-sm ${isDark ? "text-zinc-400" : "text-slate-600"}`}>
                                            Running request against <code>{sampleConfig.endpoint}</code>
                                        </p>
                                    </div>
                                ) : null}

                                {!isLoading && error ? (
                                    <div
                                        className={`space-y-3 rounded-lg border p-4 ${
                                            isDark
                                                ? "border-red-500/40 bg-red-500/10 text-red-200"
                                                : "border-red-200 bg-red-50 text-red-700"
                                        }`}
                                    >
                                        <p className="text-sm font-medium">{errorMessage}</p>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className={isDark ? "border-red-300/30 hover:bg-red-500/20" : ""}
                                            onClick={() => {
                                                retry().catch(() => {});
                                            }}
                                        >
                                            Retry request
                                        </Button>
                                    </div>
                                ) : null}

                                {!isLoading && !error && hasSuccessData ? (
                                    <div className="space-y-4">
                                        <div className={`rounded-lg border p-4 ${subtleSurfaceClass}`}>
                                            <p
                                                className={`text-xs font-semibold uppercase tracking-wide ${sectionLabelClass}`}
                                            >
                                                Conversion
                                            </p>
                                            <p className="mt-2 text-sm">
                                                <span className={isDark ? "text-zinc-400" : "text-slate-600"}>
                                                    Source:
                                                </span>{" "}
                                                <code>{data.data.sourceTime}</code>
                                            </p>
                                            <p className="mt-1 text-sm">
                                                <span className={isDark ? "text-zinc-400" : "text-slate-600"}>
                                                    Target:
                                                </span>{" "}
                                                <code>{data.data.targetTime}</code>
                                            </p>
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div className={`rounded-lg border p-3 ${subtleSurfaceClass}`}>
                                                <p
                                                    className={`text-xs font-semibold uppercase tracking-wide ${sectionLabelClass}`}
                                                >
                                                    Source timezone
                                                </p>
                                                <p className="mt-2 text-sm">
                                                    {timezoneOrDash(data.data.sourceTimezone?.name)}
                                                </p>
                                                <p className="text-xs opacity-80">
                                                    {timezoneOrDash(data.data.sourceTimezone?.abbreviation)} •{" "}
                                                    {timezoneOrDash(data.data.sourceTimezone?.offset)}
                                                </p>
                                                <p className="mt-2 text-xs opacity-80">
                                                    {timezoneOrDash(data.data.sourceTimezone?.location)}
                                                </p>
                                            </div>
                                            <div className={`rounded-lg border p-3 ${subtleSurfaceClass}`}>
                                                <p
                                                    className={`text-xs font-semibold uppercase tracking-wide ${sectionLabelClass}`}
                                                >
                                                    Target timezone
                                                </p>
                                                <p className="mt-2 text-sm">
                                                    {timezoneOrDash(data.data.targetTimezone?.name)}
                                                </p>
                                                <p className="text-xs opacity-80">
                                                    {timezoneOrDash(data.data.targetTimezone?.abbreviation)} •{" "}
                                                    {timezoneOrDash(data.data.targetTimezone?.offset)}
                                                </p>
                                                <p className="mt-2 text-xs opacity-80">
                                                    {timezoneOrDash(data.data.targetTimezone?.location)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className={`rounded-lg border p-3 text-xs ${subtleSurfaceClass}`}>
                                            <p>
                                                Processing time: {timezoneOrDash(data.meta?.processingTimeMs)} ms
                                                {data.meta?.correlationId
                                                    ? ` • Correlation ID: ${data.meta.correlationId}`
                                                    : ""}
                                            </p>
                                        </div>
                                    </div>
                                ) : null}

                                {requestUrl ? (
                                    <div className={`shrink-0 rounded-lg border p-3 ${subtleSurfaceClass}`}>
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <Label className={sectionLabelClass}>Request URL</Label>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className={outlineButtonClass}
                                                onClick={() => handleCopy("url", requestUrl)}
                                            >
                                                {copied.url ? "Copied" : "Copy"}
                                            </Button>
                                        </div>
                                        <pre className="overflow-x-auto text-xs leading-relaxed break-all whitespace-pre-wrap">
                                            {requestUrl}
                                        </pre>
                                    </div>
                                ) : null}

                                {responseJson ? (
                                    <div
                                        className={`flex min-h-0 md:max-h-87 flex-1 flex-col overflow-hidden rounded-lg border p-3 ${subtleSurfaceClass}`}
                                    >
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <Label className={sectionLabelClass}>JSON Response</Label>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className={outlineButtonClass}
                                                onClick={() => handleCopy("json", responseJson)}
                                            >
                                                {copied.json ? "Copied" : "Copy"}
                                            </Button>
                                        </div>
                                        <pre className="min-h-0 flex-1 overflow-x-auto overflow-y-auto text-xs leading-relaxed">
                                            {responseJson}
                                        </pre>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
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
