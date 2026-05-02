const CATEGORY_DEFAULTS = {
    area: { from: "m2", to: "ft2" },
    digital: { from: "MB", to: "GB" },
    energy: { from: "J", to: "kJ" },
    length: { from: "m", to: "ft" },
    mass: { from: "kg", to: "lb" },
    power: { from: "W", to: "kW" },
    pressure: { from: "Pa", to: "psi" },
    speed: { from: "km/h", to: "mph" },
    temperature: { from: "c", to: "f" },
    time: { from: "h", to: "min" },
    volume: { from: "l", to: "gal" },
};

export function createDefaultFormState() {
    return {
        category: "mass",
        from: "kg",
        to: "lb",
        value: "5.5",
        precision: "2",
        reverse: false,
    };
}

export function buildRequestUrl(baseUrl, path) {
    const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
    const normalizedPath = String(path || "").startsWith("/") ? path : `/${String(path || "")}`;

    return new URL(`${normalizedBaseUrl}${normalizedPath}`).toString();
}

export function buildConversionBody(values) {
    const body = {
        from: values.from.trim(),
        to: values.to.trim(),
        value: Number(values.value),
    };

    if (values.precision !== "") {
        body.precision = Number(values.precision);
    }

    if (values.reverse) {
        body.reverse = true;
    }

    return body;
}

export function validateConversion(values, apiKey, units) {
    if (!apiKey.trim()) {
        return "API key is required before requests can be sent.";
    }

    if (!values.category.trim()) {
        return "Select a measurement category.";
    }

    if (!units.length) {
        return "Units are still loading for the selected category.";
    }

    if (!values.from.trim() || !values.to.trim()) {
        return "Choose both the source and target units.";
    }

    if (values.value.trim() === "") {
        return "Value is required.";
    }

    if (Number.isNaN(Number(values.value))) {
        return "Value must be numeric.";
    }

    if (values.precision !== "") {
        const precision = Number(values.precision);
        if (!Number.isInteger(precision) || precision < 0 || precision > 15) {
            return "Precision must be an integer between 0 and 15.";
        }
    }

    return "";
}

export function getPreferredCategory(categories) {
    if (!categories.length) {
        return "";
    }

    return categories.includes("mass") ? "mass" : categories[0];
}

export function getPreferredUnits({ category, units, currentFrom, currentTo }) {
    if (!units.length) {
        return { from: "", to: "" };
    }

    const preference = CATEGORY_DEFAULTS[category] || {};
    const nextFrom = units.includes(currentFrom)
        ? currentFrom
        : units.includes(preference.from)
          ? preference.from
          : units[0];

    const nextTo = units.includes(currentTo) && currentTo !== nextFrom
        ? currentTo
        : units.includes(preference.to) && preference.to !== nextFrom
          ? preference.to
          : units.find((unit) => unit !== nextFrom) || units[0];

    return {
        from: nextFrom,
        to: nextTo,
    };
}

export function formatCategoryLabel(category) {
    return String(category || "")
        .split(/[-_]/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
}

export function formatNumericValue(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return String(value ?? "-");
    }

    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 12,
    }).format(value);
}
