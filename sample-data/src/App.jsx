import { useEffect, useMemo, useState } from "react";
import { useDatpaqRequest } from "./hooks/useDatpaqRequest";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { getApiBaseUrl, sampleConfig } from "./sample.config";

const API_BASE_URL = getApiBaseUrl();

const DATASET_TYPES = [
    "user",
    "employee",
    "customer",
    "account",
    "company",
    "startup",
    "vendor",
    "organization",
    "legalEntity",
    "transaction",
    "invoice",
    "creditCard",
    "payment",
    "financeSummary",
    "cryptoWallet",
    "product",
    "inventoryItem",
    "sku",
    "catalogItem",
    "subscriptionPlan",
    "address",
    "geoCoordinates",
    "cityProfile",
    "zipcode",
    "countryMetadata",
    "ipAddress",
    "deviceProfile",
    "browserSession",
    "loginAttempt",
    "networkActivity",
    "surveyResponse",
    "supportTicket",
    "eventLog",
    "feedback",
    "fileMetadata",
    "logEntry",
];

const QUICK_TYPES = ["company", "user", "product", "transaction", "supportTicket", "eventLog"];

function createDefaultFormState() {
    return {
        type: sampleConfig.defaultQuery.type,
        count: String(sampleConfig.defaultQuery.count),
        fields: sampleConfig.defaultQuery.fields,
        format: sampleConfig.defaultQuery.format,
    };
}

function buildRequestUrl(baseUrl, path, query) {
    const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
    const normalizedPath = String(path || "").startsWith("/") ? path : `/${String(path || "")}`;
    const origin = typeof window !== "undefined" ? window.location.origin : normalizedBaseUrl || "http://localhost";
    const url = new URL(`${normalizedBaseUrl}${normalizedPath}`, origin);

    Object.entries(query || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
            return;
        }

        url.searchParams.set(key, String(value));
    });

    return url.toString();
}

function normalizeFields(fieldsValue) {
    return String(fieldsValue || "")
        .split(",")
        .map((field) => field.trim())
        .filter(Boolean)
        .join(",");
}

function buildQuery(formValues) {
    const query = {
        type: formValues.type.trim(),
        format: formValues.format,
    };

    const normalizedFields = normalizeFields(formValues.fields);
    const parsedCount = Number.parseInt(formValues.count, 10);

    if (Number.isFinite(parsedCount)) {
        query.count = parsedCount;
    }

    if (normalizedFields) {
        query.fields = normalizedFields;
    }

    return query;
}

function validate(formValues, apiKeyValue) {
    if (!apiKeyValue.trim()) {
        return "API key is required.";
    }

    if (!formValues.type.trim()) {
        return "Dataset type is required.";
    }

    const parsedCount = Number.parseInt(formValues.count, 10);
    if (!Number.isFinite(parsedCount) || parsedCount < 1 || parsedCount > 10000) {
        return "Count must be a number between 1 and 10000.";
    }

    if (formValues.format !== "json" && formValues.format !== "csv") {
        return "Format must be json or csv.";
    }

    return "";
}

function buildResponsePayload(data, error) {
    if (data === null || data === undefined) {
        if (!error?.details) {
            return null;
        }

        return typeof error.details === "object" ? error.details : { success: false, error: error.details };
    }

    if (typeof data === "string") {
        return {
            success: true,
            format: "csv",
            csvData: data,
        };
    }

    return data;
}

function getRecords(data) {
    if (!data || typeof data === "string") {
        return [];
    }

    if (Array.isArray(data.data)) {
        return data.data;
    }

    if (Array.isArray(data.records)) {
        return data.records;
    }

    if (Array.isArray(data.results)) {
        return data.results.flatMap((result) => (Array.isArray(result?.data) ? result.data : []));
    }

    return [];
}

function getCsvValue(data) {
    if (!data) {
        return "";
    }

    if (typeof data === "string") {
        return data;
    }

    if (typeof data.csvData === "string") {
        return data.csvData;
    }

    return "";
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
    const [hasRequested, setHasRequested] = useState(false);

    const year = new Date().getFullYear();
    const isDark = theme === "dark";

    const { data, error, errorMessage, isLoading, run, retry, reset } = useDatpaqRequest({
        baseUrl: API_BASE_URL,
        apiKey: apiKeyInput.trim(),
        token: import.meta.env.VITE_DATPAQ_API_TOKEN,
    });

    const responsePayload = useMemo(() => buildResponsePayload(data, error), [data, error]);

    const responseJson = useMemo(
        () => (responsePayload ? JSON.stringify(responsePayload, null, 2) : ""),
        [responsePayload],
    );

    const records = useMemo(() => getRecords(data), [data]);
    const csvData = useMemo(() => getCsvValue(data), [data]);

    const responseMeta = useMemo(() => {
        if (!data || typeof data === "string") {
            return {};
        }

        return data.metadata || data.meta || {};
    }, [data]);

    const responseType = useMemo(() => {
        if (!data || typeof data === "string") {
            return formValues.type.trim();
        }

        return data.type || responseMeta.type || formValues.type.trim();
    }, [data, formValues.type, responseMeta.type]);

    const responseFormat = useMemo(() => {
        if (csvData) {
            return "csv";
        }

        if (data && typeof data === "object") {
            return data.format || responseMeta.format || formValues.format;
        }

        return formValues.format;
    }, [csvData, data, formValues.format, responseMeta.format]);

    const responseCount = useMemo(() => {
        if (records.length > 0) {
            return records.length;
        }

        if (data && typeof data === "object") {
            const countValue = data.count ?? responseMeta.count;
            if (Number.isFinite(Number(countValue))) {
                return Number(countValue);
            }
        }

        return 0;
    }, [records.length, data, responseMeta.count]);

    const responseCorrelationId = useMemo(() => {
        if (!data || typeof data === "string") {
            return "";
        }

        return data.correlationId || responseMeta.correlationId || "";
    }, [data, responseMeta.correlationId]);

    const generatedAt = useMemo(() => {
        if (!data || typeof data === "string") {
            return "";
        }

        return responseMeta.generatedAt || responseMeta.timestamp || "";
    }, [data, responseMeta.generatedAt, responseMeta.timestamp]);

    const isResponseSuccessful = useMemo(() => {
        if (!data) {
            return false;
        }

        if (typeof data === "object" && data.success === false) {
            return false;
        }

        return true;
    }, [data]);

    const hasSuccessOutput = isResponseSuccessful && (records.length > 0 || Boolean(csvData));
    const showEmptyState = hasRequested && !isLoading && !error && isResponseSuccessful && !hasSuccessOutput;

    useEffect(() => {
        window.localStorage.setItem("theme", theme);
    }, [theme]);

    const handleFieldChange = (key) => (event) => {
        setFormValues((current) => ({
            ...current,
            [key]: event.target.value,
        }));
    };

    const handleFormatChange = (value) => {
        setFormValues((current) => ({
            ...current,
            format: value,
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
        setHasRequested(true);

        try {
            await run({
                path: sampleConfig.endpoint,
                method: sampleConfig.method,
                query,
            });
        } catch {
            // Errors are surfaced through useDatpaqRequest state.
        }
    };

    const handleReset = () => {
        setFormValues(createDefaultFormState());
        setApiKeyInput(import.meta.env.VITE_DATPAQ_API_KEY || "");
        setValidationError("");
        setRequestUrl("");
        setCopied({ url: false, json: false });
        setHasRequested(false);
        reset();
    };

    const handleCopy = async (key, value) => {
        if (!value || !navigator?.clipboard?.writeText) {
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

    const outlineButtonClass = isDark ? "border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" : "";

    const sectionLabelClass = isDark ? "text-zinc-400" : "text-slate-600";
    const requiredLabelClass = isDark ? "text-red-800" : "text-red-400";
    const tabsTriggerClass = isDark
        ? ""
        : "text-slate-700 data-[state=active]:bg-white data-[state=active]:text-zinc-800";

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
                                <span>Sample Data</span>
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
                                    <span
                                        className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold tracking-wide ${
                                            isDark
                                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                                : "border-emerald-600/30 bg-emerald-600/10 text-emerald-700"
                                        }`}
                                    >
                                        {sampleConfig.method}
                                    </span>
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
                                            <Label htmlFor="datasetType" className={sectionLabelClass}>
                                                type
                                            </Label>
                                            <span
                                                className={`text-[11px] font-semibold uppercase tracking-wide ${requiredLabelClass}`}
                                            >
                                                Required
                                            </span>
                                        </div>
                                        <Input
                                            id="datasetType"
                                            value={formValues.type}
                                            onChange={handleFieldChange("type")}
                                            placeholder="company"
                                            list="dataset-type-options"
                                            className={inputClass}
                                        />
                                        <datalist id="dataset-type-options">
                                            {DATASET_TYPES.map((typeName) => (
                                                <option key={typeName} value={typeName} />
                                            ))}
                                        </datalist>
                                        <div className="flex flex-wrap gap-2">
                                            {QUICK_TYPES.map((typeName) => (
                                                <Button
                                                    key={typeName}
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className={outlineButtonClass}
                                                    onClick={() =>
                                                        setFormValues((current) => ({ ...current, type: typeName }))
                                                    }
                                                >
                                                    {typeName}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2.5">
                                            <Label htmlFor="recordCount" className={sectionLabelClass}>
                                                count
                                            </Label>
                                            <Input
                                                id="recordCount"
                                                type="number"
                                                min="1"
                                                max="10000"
                                                value={formValues.count}
                                                onChange={handleFieldChange("count")}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-2.5">
                                            <Label htmlFor="fieldsInput" className={sectionLabelClass}>
                                                fields
                                            </Label>
                                            <Input
                                                id="fieldsInput"
                                                value={formValues.fields}
                                                onChange={handleFieldChange("fields")}
                                                placeholder="name,industry,website"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label className={sectionLabelClass}>format</Label>
                                        <Tabs
                                            value={formValues.format}
                                            onValueChange={handleFormatChange}
                                            className="gap-3"
                                        >
                                            <TabsList
                                                className={`w-full ${
                                                    isDark ? "bg-zinc-800 text-zinc-300" : "bg-slate-200 text-slate-700"
                                                }`}
                                            >
                                                <TabsTrigger value="json" className={tabsTriggerClass}>
                                                    JSON
                                                </TabsTrigger>
                                                <TabsTrigger value="csv" className={tabsTriggerClass}>
                                                    CSV
                                                </TabsTrigger>
                                            </TabsList>
                                        </Tabs>
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
                                            {isLoading ? "Generating..." : "Generate Sample Data"}
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
                                <CardDescription className={isDark ? "text-zinc-500" : "text-slate-500"}>
                                    Live output from the DATPAQ Sample Data API including copyable request and payload.
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

                                {!isLoading && !error && !hasRequested ? (
                                    <div className={`rounded-lg border p-4 text-sm ${subtleSurfaceClass}`}>
                                        Submit a request to generate records from <code>{sampleConfig.endpoint}</code>.
                                    </div>
                                ) : null}

                                {showEmptyState ? (
                                    <div className={`rounded-lg border p-4 text-sm ${subtleSurfaceClass}`}>
                                        Request completed successfully, but no rows were returned for this query.
                                    </div>
                                ) : null}

                                {!isLoading && !error && hasSuccessOutput ? (
                                    <div className="space-y-4">
                                        <div className={`rounded-lg border p-4 ${subtleSurfaceClass}`}>
                                            <p
                                                className={`text-xs font-semibold uppercase tracking-wide ${sectionLabelClass}`}
                                            >
                                                Response summary
                                            </p>
                                            <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                                                <p>
                                                    <span className={isDark ? "text-zinc-400" : "text-slate-600"}>
                                                        type:
                                                    </span>{" "}
                                                    <code>{responseType || "-"}</code>
                                                </p>
                                                <p>
                                                    <span className={isDark ? "text-zinc-400" : "text-slate-600"}>
                                                        format:
                                                    </span>{" "}
                                                    <code>{responseFormat || "-"}</code>
                                                </p>
                                                <p>
                                                    <span className={isDark ? "text-zinc-400" : "text-slate-600"}>
                                                        count:
                                                    </span>{" "}
                                                    <code>{responseCount}</code>
                                                </p>
                                                <p>
                                                    <span className={isDark ? "text-zinc-400" : "text-slate-600"}>
                                                        correlationId:
                                                    </span>{" "}
                                                    <code>{responseCorrelationId || "-"}</code>
                                                </p>
                                            </div>
                                            {generatedAt ? (
                                                <p
                                                    className={`mt-2 text-xs ${isDark ? "text-zinc-400" : "text-slate-600"}`}
                                                >
                                                    generatedAt: <code>{generatedAt}</code>
                                                </p>
                                            ) : null}
                                        </div>

                                        {records.length > 0 ? (
                                            <div className={`rounded-lg border p-3 ${subtleSurfaceClass}`}>
                                                <div className="mb-2 flex items-center justify-between gap-2">
                                                    <Label className={sectionLabelClass}>
                                                        Data preview (first record)
                                                    </Label>
                                                </div>
                                                <pre className="overflow-x-auto text-xs leading-relaxed">
                                                    {JSON.stringify(records[0], null, 2)}
                                                </pre>
                                            </div>
                                        ) : null}

                                        {csvData ? (
                                            <div className={`rounded-lg border p-3 ${subtleSurfaceClass}`}>
                                                <div className="mb-2 flex items-center justify-between gap-2">
                                                    <Label className={sectionLabelClass}>CSV output</Label>
                                                </div>
                                                <pre className="max-h-64 overflow-auto text-xs leading-relaxed">
                                                    {csvData}
                                                </pre>
                                            </div>
                                        ) : null}
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
                                        <pre className="break-all whitespace-pre-wrap text-xs leading-relaxed overflow-x-auto">
                                            {requestUrl}
                                        </pre>
                                    </div>
                                ) : null}

                                {responseJson ? (
                                    <div
                                        className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border p-3 md:max-h-[28rem] ${subtleSurfaceClass}`}
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
