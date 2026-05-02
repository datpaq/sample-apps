import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDatpaqClient } from "../lib/datpaq-client";
import { formatErrorMessage } from "../lib/format-error";

export function useDatpaqRequest({ baseUrl, apiKey, token, timeoutMs, defaultHeaders } = {}) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const abortControllerRef = useRef(null);
    const lastRequestRef = useRef(null);

    const client = useMemo(
        () =>
            createDatpaqClient({
                baseUrl,
                apiKey,
                token,
                timeoutMs,
                defaultHeaders,
            }),
        [baseUrl, apiKey, token, timeoutMs, defaultHeaders],
    );

    const cancel = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        setIsLoading(false);
    }, []);

    const reset = useCallback(() => {
        cancel();
        lastRequestRef.current = null;
        setData(null);
        setError(null);
        setErrorMessage("");
    }, [cancel]);

    const run = useCallback(
        async (requestOptions) => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            const currentAbortController = new AbortController();
            abortControllerRef.current = currentAbortController;
            lastRequestRef.current = requestOptions;

            setIsLoading(true);
            setError(null);
            setErrorMessage("");

            try {
                const responseData = await client.request({
                    ...requestOptions,
                    signal: currentAbortController.signal,
                });

                setData(responseData);
                return responseData;
            } catch (requestError) {
                if (currentAbortController.signal.aborted) {
                    return undefined;
                }

                setData(null);
                setError(requestError);
                setErrorMessage(formatErrorMessage(requestError));
                throw requestError;
            } finally {
                if (abortControllerRef.current === currentAbortController) {
                    abortControllerRef.current = null;
                }

                setIsLoading(false);
            }
        },
        [client],
    );

    const retry = useCallback(() => {
        if (!lastRequestRef.current) {
            return Promise.resolve(undefined);
        }

        return run(lastRequestRef.current);
    }, [run]);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return {
        data,
        error,
        errorMessage,
        isLoading,
        run,
        retry,
        cancel,
        reset,
        lastRequest: lastRequestRef.current,
    };
}
