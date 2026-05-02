import { cn } from "../../lib/utils";

function Label({ className, ...props }) {
    return <label className={cn("text-xs font-semibold uppercase tracking-wide", className)} {...props} />;
}

export { Label };
