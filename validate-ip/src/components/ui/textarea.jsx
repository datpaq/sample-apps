import { cn } from "../../lib/utils";

function Textarea({ className, ...props }) {
    return (
        <textarea
            className={cn(
                "min-h-36 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition-colors outline-none placeholder:text-slate-400 focus-visible:border-slate-500 focus-visible:ring-2 focus-visible:ring-slate-500/40 disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            {...props}
        />
    );
}

export { Textarea };
