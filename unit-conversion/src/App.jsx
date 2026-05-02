import { useEffect, useMemo, useState } from "react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Select } from "./components/ui/select";
import { useDatpaqRequest } from "./hooks/useDatpaqRequest";
import {
    buildConversionBody,
    buildRequestUrl,
    createDefaultFormState,
    formatCategoryLabel,
    formatNumericValue,
    getPreferredCategory,
    getPreferredUnits,
    validateConversion,
} from "./lib/unit-conversion";
import { getApiBaseUrl, getPublicApiBaseUrl, sampleConfig } from "./sample.config";

const API_BASE_URL = getApiBaseUrl();
const PUBLIC_API_BASE_URL = getPublicApiBaseUrl();
const CATEGORIES_PATH = "/v1/unit-conversion/categories";

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
    const [lastRequest, setLastRequest] = useState({ url: "", body: "" });
    const [copied, setCopied] = useState({ url: false, json: false });

    const year = new Date().getFullYear();
    const isDark = theme === "dark";
    const apiKey = apiKeyInput.trim();

    const {
        data: categoriesData,
        error: categoriesError,
        errorMessage: categoriesErrorMessage,
        isLoading: isLoadingCategories,
        run: runCategories,
        retry: retryCategories,
        reset: resetCategories,
    } = useDatpaqRequest({
        baseUrl: API_BASE_URL,
        apiKey,
        token: import.meta.env.VITE_DATPAQ_API_TOKEN,
    });
    const {
        data: unitsData,
        error: unitsError,
        errorMessage: unitsErrorMessage,
        isLoading: isLoadingUnits,
        run: runUnits,
        retry: retryUnits,
        reset: resetUnits,
    } = useDatpaqRequest({
        baseUrl: API_BASE_URL,
        apiKey,
        token: import.meta.env.VITE_DATPAQ_API_TOKEN,
    });
    const {
        data: conversionData,
        error: conversionError,
        errorMessage: conversionErrorMessage,
        isLoading: isLoadingConversion,
        run: runConversion,
        retry: retryConversion,
        reset: resetConversion,
    } = useDatpaqRequest({
        baseUrl: API_BASE_URL,
        apiKey,
        token: import.meta.env.VITE_DATPAQ_API_TOKEN,
    });

    const categories = useMemo(() => categoriesData?.data?.categories ?? [], [categoriesData]);
    const effectiveCategory = useMemo(() => {
        if (!categories.length) {
            return "";
        }

        return categories.includes(formValues.category) ? formValues.category : getPreferredCategory(categories);
    }, [categories, formValues.category]);
    const loadedUnitsCategory = unitsData?.data?.category ?? "";
    const availableUnits = useMemo(() => {
        return loadedUnitsCategory === effectiveCategory ? unitsData?.data?.units ?? [] : [];
    }, [effectiveCategory, loadedUnitsCategory, unitsData]);
    const effectiveUnits = useMemo(() => {
        return getPreferredUnits({
            category: effectiveCategory,
            units: availableUnits,
            currentFrom: formValues.from,
            currentTo: formValues.to,
        });
    }, [availableUnits, effectiveCategory, formValues.from, formValues.to]);
    const effectiveFrom = effectiveUnits.from;
    const effectiveTo = effectiveUnits.to;

    const responsePayload = useMemo(() => {
        if (conversionData) {
            return conversionData;
        }

        if (conversionError?.details) {
            return typeof conversionError.details === "object"
                ? conversionError.details
                : { success: false, error: conversionError.details };
        }

        return null;
    }, [conversionData, conversionError]);

    const responseJson = useMemo(
        () => (responsePayload ? JSON.stringify(responsePayload, null, 2) : ""),
        [responsePayload],
    );

    const hasSuccessData = Boolean(
        conversionData?.success &&
            conversionData?.data &&
            typeof conversionData.data === "object" &&
            conversionData.data.result !== undefined,
    );

    useEffect(() => {
        window.localStorage.setItem("theme", theme);

        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            themeColorMeta.setAttribute("content", isDark ? "#0d0d0d" : "#f8fafc");
        }
    }, [theme, isDark]);

    useEffect(() => {
        if (!apiKey) {
            resetCategories();
            resetUnits();
            return;
        }

        const timeoutId = window.setTimeout(() => {
            runCategories({
                path: CATEGORIES_PATH,
                method: "GET",
            }).catch(() => {});
        }, 250);

        return () => window.clearTimeout(timeoutId);
    }, [apiKey, resetCategories, resetUnits, runCategories]);

    useEffect(() => {
        if (!apiKey || !effectiveCategory) {
            resetUnits();
            return;
        }

        const timeoutId = window.setTimeout(() => {
            runUnits({
                path: `/v1/unit-conversion/units/${encodeURIComponent(effectiveCategory)}`,
                method: "GET",
            }).catch(() => {});
        }, 200);

        return () => window.clearTimeout(timeoutId);
    }, [apiKey, effectiveCategory, resetUnits, runUnits]);

    const handleValueChange = (key) => (event) => {
        const nextValue = event.target.type === "checkbox" ? event.target.checked : event.target.value;

        setFormValues((current) => ({
            ...current,
            [key]: nextValue,
        }));
    };

    const handleSwapUnits = () => {
        setFormValues((current) => ({
            ...current,
            from: effectiveTo,
            to: effectiveFrom,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const requestValues = {
            ...formValues,
            category: effectiveCategory,
            from: effectiveFrom,
            to: effectiveTo,
        };
        const formError = validateConversion(requestValues, apiKey, availableUnits);
        if (formError) {
            setValidationError(formError);
            return;
        }

        const requestBody = buildConversionBody(requestValues);
        setValidationError("");
        setLastRequest({
            url: buildRequestUrl(PUBLIC_API_BASE_URL, sampleConfig.endpoint),
            body: JSON.stringify(requestBody, null, 2),
        });

        try {
            await runConversion({
                path: sampleConfig.endpoint,
                method: sampleConfig.method,
                body: requestBody,
            });
        } catch {
            // Request state is surfaced through useDatpaqRequest.
        }
    };

    const handleReset = () => {
        setFormValues(createDefaultFormState());
        setApiKeyInput(import.meta.env.VITE_DATPAQ_API_KEY || "");
        setValidationError("");
        setLastRequest({ url: "", body: "" });
        setCopied({ url: false, json: false });
        resetConversion();
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
        ? "border-zinc-700/70 bg-zinc-900/85 text-zinc-100"
        : "border-slate-200 bg-white/95 text-slate-900";
    const subtleSurfaceClass = isDark
        ? "border-zinc-700/70 bg-zinc-950/50 text-zinc-100"
        : "border-slate-200 bg-slate-50 text-slate-900";
    const inputClass = isDark
        ? "border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-zinc-400 focus-visible:ring-zinc-500/30"
        : "";
    const sectionLabelClass = isDark ? "text-zinc-400" : "text-slate-600";
    const requiredLabelClass = isDark ? "text-red-300" : "text-red-600";
    const outlineButtonClass = isDark ? "border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" : "";
    const secondaryButtonClass = isDark
        ? "border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-white"
        : "";

    const emptyStateMessage = !apiKey
        ? "Paste your DATPAQ API key to load live categories and units."
        : isLoadingCategories
          ? "Loading categories from the API."
          : categoriesError
            ? "Categories could not be loaded. Retry after confirming the API key."
            : isLoadingUnits
              ? "Loading units for the selected category."
              : "Configure the request and run a conversion to inspect the live response.";

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
                                <span>Unit Conversion</span>
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
                    <div className="mx-auto grid h-full min-h-0 w-full max-w-[1180px] items-start gap-8 lg:grid-cols-[minmax(420px,600px)_minmax(0,1fr)]">
                        <Card className={`${surfaceClass} h-fit`}>
                            <CardHeader className="pb-4">
                                <div className={`rounded-2xl border p-5 ${subtleSurfaceClass}`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-3">
                                            <p
                                                className={`text-xs font-semibold uppercase tracking-[0.24em] ${
                                                    isDark ? "text-zinc-500" : "text-slate-500"
                                                }`}
                                            >
                                                Production-ready sample
                                            </p>
                                            <div className="space-y-2">
                                                <CardTitle className="text-3xl leading-tight">
                                                    {sampleConfig.appName}
                                                </CardTitle>
                                                <CardDescription
                                                    className={`max-w-xl text-base ${
                                                        isDark ? "text-zinc-400" : "text-slate-600"
                                                    }`}
                                                >
                                                    {sampleConfig.description}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <span
                                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
                                                isDark
                                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                                    : "border-emerald-600/30 bg-emerald-600/10 text-emerald-700"
                                            }`}
                                        >
                                            {sampleConfig.method}
                                        </span>
                                    </div>

                                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                        <div className={`rounded-xl border p-3 ${surfaceClass}`}>
                                            <p className={`text-xs uppercase tracking-wide ${sectionLabelClass}`}>
                                                Categories
                                            </p>
                                            <p className="mt-2 text-lg font-semibold">
                                                {apiKey ? (isLoadingCategories ? "..." : categories.length || 0) : "-"}
                                            </p>
                                        </div>
                                        <div className={`rounded-xl border p-3 ${surfaceClass}`}>
                                            <p className={`text-xs uppercase tracking-wide ${sectionLabelClass}`}>
                                                Units
                                            </p>
                                            <p className="mt-2 text-lg font-semibold">
                                                {formValues.category && apiKey
                                                    ? isLoadingUnits
                                                        ? "..."
                                                        : availableUnits.length || 0
                                                    : "-"}
                                            </p>
                                        </div>
                                        <div className={`rounded-xl border p-3 ${surfaceClass}`}>
                                            <p className={`text-xs uppercase tracking-wide ${sectionLabelClass}`}>
                                                Precision
                                            </p>
                                            <p className="mt-2 text-lg font-semibold">0-15 dp</p>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between gap-3">
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
                                            className={`${inputClass} font-mono`}
                                            autoComplete="off"
                                            spellCheck="false"
                                        />
                                    </div>

                                    {categoriesError ? (
                                        <div
                                            className={`space-y-3 rounded-lg border p-4 text-sm ${
                                                isDark
                                                    ? "border-red-500/40 bg-red-500/10 text-red-200"
                                                    : "border-red-200 bg-red-50 text-red-700"
                                            }`}
                                        >
                                            <p>{categoriesErrorMessage}</p>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className={outlineButtonClass}
                                                onClick={() => {
                                                    retryCategories().catch(() => {});
                                                }}
                                            >
                                                Retry categories
                                            </Button>
                                        </div>
                                    ) : null}

                                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between gap-3">
                                                <Label htmlFor="category" className={sectionLabelClass}>
                                                    Category
                                                </Label>
                                                <span
                                                    className={`text-[11px] font-semibold uppercase tracking-wide ${requiredLabelClass}`}
                                                >
                                                    Required
                                                </span>
                                            </div>
                                            <Select
                                                id="category"
                                                value={effectiveCategory}
                                                onChange={handleValueChange("category")}
                                                className={inputClass}
                                                disabled={!apiKey || !categories.length || isLoadingCategories}
                                            >
                                                {!categories.length ? (
                                                    <option value="">
                                                        {apiKey ? "Loading categories..." : "Add API key first"}
                                                    </option>
                                                ) : null}
                                                {categories.map((category) => (
                                                    <option key={category} value={category}>
                                                        {formatCategoryLabel(category)}
                                                    </option>
                                                ))}
                                            </Select>
                                        </div>

                                        <div className="flex items-end">
                                            <div
                                                className={`inline-flex h-10 items-center rounded-md border px-3 text-xs font-semibold uppercase tracking-wide ${subtleSurfaceClass}`}
                                            >
                                                /units/{effectiveCategory || ":category"}
                                            </div>
                                        </div>
                                    </div>

                                    {unitsError ? (
                                        <div
                                            className={`space-y-3 rounded-lg border p-4 text-sm ${
                                                isDark
                                                    ? "border-red-500/40 bg-red-500/10 text-red-200"
                                                    : "border-red-200 bg-red-50 text-red-700"
                                            }`}
                                        >
                                            <p>{unitsErrorMessage}</p>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className={outlineButtonClass}
                                                onClick={() => {
                                                    retryUnits().catch(() => {});
                                                }}
                                            >
                                                Retry units
                                            </Button>
                                        </div>
                                    ) : null}

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between gap-3">
                                                <Label htmlFor="from" className={sectionLabelClass}>
                                                    From
                                                </Label>
                                                <span
                                                    className={`text-[11px] font-semibold uppercase tracking-wide ${requiredLabelClass}`}
                                                >
                                                    Required
                                                </span>
                                            </div>
                                            <Select
                                                id="from"
                                                value={effectiveFrom}
                                                onChange={handleValueChange("from")}
                                                className={inputClass}
                                                disabled={!availableUnits.length || isLoadingUnits}
                                            >
                                                {!availableUnits.length ? (
                                                    <option value="">
                                                        {isLoadingUnits ? "Loading units..." : "Select a category"}
                                                    </option>
                                                ) : null}
                                                {availableUnits.map((unit) => (
                                                    <option key={unit} value={unit}>
                                                        {unit}
                                                    </option>
                                                ))}
                                            </Select>
                                        </div>

                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between gap-3">
                                                <Label htmlFor="to" className={sectionLabelClass}>
                                                    To
                                                </Label>
                                                <span
                                                    className={`text-[11px] font-semibold uppercase tracking-wide ${requiredLabelClass}`}
                                                >
                                                    Required
                                                </span>
                                            </div>
                                            <Select
                                                id="to"
                                                value={effectiveTo}
                                                onChange={handleValueChange("to")}
                                                className={inputClass}
                                                disabled={!availableUnits.length || isLoadingUnits}
                                            >
                                                {!availableUnits.length ? (
                                                    <option value="">
                                                        {isLoadingUnits ? "Loading units..." : "Select a category"}
                                                    </option>
                                                ) : null}
                                                {availableUnits.map((unit) => (
                                                    <option key={unit} value={unit}>
                                                        {unit}
                                                    </option>
                                                ))}
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className={outlineButtonClass}
                                            onClick={handleSwapUnits}
                                            disabled={!effectiveFrom || !effectiveTo}
                                        >
                                            Swap units
                                        </Button>
                                        <p className={`text-sm ${sectionLabelClass}`}>
                                                {availableUnits.length
                                                ? `${availableUnits.length} live units available in ${formatCategoryLabel(effectiveCategory)}.`
                                                : "Units will populate from the API after the category loads."}
                                        </p>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_170px]">
                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between gap-3">
                                                <Label htmlFor="value" className={sectionLabelClass}>
                                                    Value
                                                </Label>
                                                <span
                                                    className={`text-[11px] font-semibold uppercase tracking-wide ${requiredLabelClass}`}
                                                >
                                                    Required
                                                </span>
                                            </div>
                                            <Input
                                                id="value"
                                                value={formValues.value}
                                                onChange={handleValueChange("value")}
                                                placeholder="5.5"
                                                className={inputClass}
                                                inputMode="decimal"
                                            />
                                        </div>

                                        <div className="space-y-2.5">
                                            <Label htmlFor="precision" className={sectionLabelClass}>
                                                Precision
                                            </Label>
                                            <Input
                                                id="precision"
                                                type="number"
                                                min="0"
                                                max="15"
                                                value={formValues.precision}
                                                onChange={handleValueChange("precision")}
                                                placeholder="2"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>

                                    <div className={`rounded-xl border p-4 ${subtleSurfaceClass}`}>
                                        <div className="flex items-start gap-3">
                                            <input
                                                id="reverse"
                                                type="checkbox"
                                                checked={formValues.reverse}
                                                onChange={handleValueChange("reverse")}
                                                className="mt-0.5 h-4 w-4 rounded border-slate-300"
                                            />
                                            <div className="space-y-1">
                                                <Label htmlFor="reverse" className={sectionLabelClass}>
                                                    Reverse conversion
                                                </Label>
                                                <p className={`text-sm ${sectionLabelClass}`}>
                                                    Sends `reverse: true`, allowing the API to swap the direction before
                                                    calculating the result.
                                                </p>
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
                                            disabled={isLoadingConversion || isLoadingCategories || isLoadingUnits}
                                            className={isDark ? "bg-zinc-100 text-zinc-900 hover:bg-white" : ""}
                                        >
                                            {isLoadingConversion ? "Converting..." : "Run conversion"}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={outlineButtonClass}
                                            onClick={handleReset}
                                        >
                                            Reset
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            className={secondaryButtonClass}
                                            onClick={() =>
                                                setFormValues((current) => ({
                                                    ...current,
                                                    value: sampleConfig.defaultBody.value.toString(),
                                                    precision: sampleConfig.defaultBody.precision.toString(),
                                                }))
                                            }
                                        >
                                            Use example values
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className={`${surfaceClass} flex min-h-0 flex-col overflow-hidden lg:h-full`}>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl">Response</CardTitle>
                                <CardDescription className={isDark ? "text-zinc-400" : "text-slate-600"}>
                                    Live conversion output, last submitted request, and full JSON response payload.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
                                {isLoadingConversion ? (
                                    <div className={`rounded-lg border p-4 ${subtleSurfaceClass}`}>
                                        <div className="mb-2 h-2 w-28 animate-pulse rounded bg-current/30" />
                                        <div className="h-2 w-full animate-pulse rounded bg-current/15" />
                                        <p className={`mt-4 text-sm ${sectionLabelClass}`}>
                                            Running request against <code>{sampleConfig.endpoint}</code>
                                        </p>
                                    </div>
                                ) : null}

                                {!isLoadingConversion && conversionError ? (
                                    <div
                                        className={`space-y-3 rounded-lg border p-4 ${
                                            isDark
                                                ? "border-red-500/40 bg-red-500/10 text-red-200"
                                                : "border-red-200 bg-red-50 text-red-700"
                                        }`}
                                    >
                                        <p className="text-sm font-medium">{conversionErrorMessage}</p>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className={outlineButtonClass}
                                            onClick={() => {
                                                retryConversion().catch(() => {});
                                            }}
                                        >
                                            Retry request
                                        </Button>
                                    </div>
                                ) : null}

                                {!isLoadingConversion && !conversionError && !hasSuccessData ? (
                                    <div
                                        className={`rounded-2xl border border-dashed p-6 text-sm leading-6 ${subtleSurfaceClass}`}
                                    >
                                        {emptyStateMessage}
                                    </div>
                                ) : null}

                                {!isLoadingConversion && !conversionError && hasSuccessData ? (
                                    <div className="space-y-4">
                                        <div className={`rounded-2xl border p-5 ${subtleSurfaceClass}`}>
                                            <p className={`text-xs font-semibold uppercase tracking-wide ${sectionLabelClass}`}>
                                                Conversion result
                                            </p>
                                            <div className="mt-3 flex flex-wrap items-end gap-3">
                                                <div>
                                                    <p className="text-3xl font-semibold tracking-tight">
                                                        {formatNumericValue(conversionData.data.result)}
                                                    </p>
                                                    <p className={`mt-1 text-sm ${sectionLabelClass}`}>
                                                        {conversionData.data.to} in {formatCategoryLabel(effectiveCategory)}
                                                    </p>
                                                </div>
                                                <div className={`text-sm ${sectionLabelClass}`}>
                                                    from {formatNumericValue(conversionData.data.value)}{" "}
                                                    {conversionData.data.from}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div className={`rounded-lg border p-4 ${subtleSurfaceClass}`}>
                                                <p className={`text-xs font-semibold uppercase tracking-wide ${sectionLabelClass}`}>
                                                    Request summary
                                                </p>
                                                <p className="mt-2 text-sm">
                                                    {conversionData.data.from} to {conversionData.data.to}
                                                </p>
                                                <p className={`mt-1 text-sm ${sectionLabelClass}`}>
                                                    Value: {formatNumericValue(conversionData.data.value)}
                                                </p>
                                                <p className={`mt-1 text-sm ${sectionLabelClass}`}>
                                                    Reverse: {formValues.reverse ? "enabled" : "disabled"}
                                                </p>
                                            </div>

                                            <div className={`rounded-lg border p-4 ${subtleSurfaceClass}`}>
                                                <p className={`text-xs font-semibold uppercase tracking-wide ${sectionLabelClass}`}>
                                                    Service metadata
                                                </p>
                                                <p className="mt-2 text-sm">
                                                    {conversionData.meta?.processingTimeMs ?? "-"} ms processing
                                                </p>
                                                <p className={`mt-1 text-sm break-all ${sectionLabelClass}`}>
                                                    Correlation ID: {conversionData.correlationId || "-"}
                                                </p>
                                                <p className={`mt-1 text-sm ${sectionLabelClass}`}>
                                                    Timestamp: {conversionData.meta?.timestamp || "-"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {lastRequest.url ? (
                                    <div className={`shrink-0 rounded-lg border p-3 ${subtleSurfaceClass}`}>
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <Label className={sectionLabelClass}>Request URL</Label>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className={outlineButtonClass}
                                                onClick={() => handleCopy("url", lastRequest.url)}
                                            >
                                                {copied.url ? "Copied" : "Copy"}
                                            </Button>
                                        </div>
                                        <pre className="overflow-x-auto text-xs leading-relaxed break-all whitespace-pre-wrap">
                                            {lastRequest.url}
                                        </pre>
                                    </div>
                                ) : null}

                                {lastRequest.body ? (
                                    <div className={`shrink-0 rounded-lg border p-3 ${subtleSurfaceClass}`}>
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <Label className={sectionLabelClass}>Request Body</Label>
                                            <span className={`text-xs ${sectionLabelClass}`}>application/json</span>
                                        </div>
                                        <pre className="overflow-x-auto text-xs leading-relaxed whitespace-pre-wrap">
                                            {lastRequest.body}
                                        </pre>
                                    </div>
                                ) : null}

                                {responseJson ? (
                                    <div
                                        className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border p-3 ${subtleSurfaceClass}`}
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
