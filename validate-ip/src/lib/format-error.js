import { DatpaqApiError } from "./datpaq-client";

function getMessageFromDetails(details) {
    if (!details) {
        return "";
    }

    if (typeof details === "string") {
        return details.trim();
    }

    if (typeof details === "object") {
        const knownKeys = ["message", "error", "detail", "description"];
        for (const key of knownKeys) {
            const value = details[key];
            if (typeof value === "string" && value.trim()) {
                return value.trim();
            }
        }
    }

    return "";
}

export function formatErrorMessage(error) {
    if (!error) {
        return "An unexpected error occurred.";
    }

    if (error instanceof DatpaqApiError) {
        const detailMessage = getMessageFromDetails(error.details);
        if (detailMessage) {
            return detailMessage;
        }

        if (error.status) {
            return `Request failed with status ${error.status}.`;
        }

        return error.message;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return "An unexpected error occurred.";
}
