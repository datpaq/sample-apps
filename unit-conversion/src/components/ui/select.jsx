import { cn } from "../../lib/utils";

function Select({ className, children, ...props }) {
    return (
        <select
            className={cn(
                "flex h-10 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-900 transition-colors outline-none focus-visible:border-slate-500 focus-visible:ring-2 focus-visible:ring-slate-500/40 disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            {...props}
        >
            {children}
        </select>
    );
}

export { Select };
