export function Button({ children, className = "", variant = "default", size = "default", ...props }) {
    const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
    const variantClasses = variant === "icon" ? "h-10 w-10" : "h-10 px-4 py-2";
    return (<button className={`${baseClasses} ${variantClasses} ${className}`} {...props}>
      {children}
    </button>);
}
