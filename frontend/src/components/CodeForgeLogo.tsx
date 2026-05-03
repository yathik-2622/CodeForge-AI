interface Props {
  className?: string;
  size?: number;
}

/**
 * CodeForge AI logo — Lucide-style: transparent bg, stroke="currentColor".
 * Use like a Lucide icon: <CodeForgeLogo className="w-6 h-6 text-primary" />
 *
 * Design: hexagon (forge) with code brackets < > inside.
 */
export function CodeForgeLogo({ className = "w-6 h-6", size }: Props) {
  const dim = size ? `${size}px` : undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={dim}
      height={dim}
      aria-label="CodeForge AI"
    >
      {/* Hexagon body — the "forge" cell */}
      <path d="M12 2L20.5 7V17L12 22L3.5 17V7Z" />
      {/* Left code bracket  < */}
      <path d="M10 8.5L7.5 12L10 15.5" />
      {/* Right code bracket  > */}
      <path d="M14 8.5L16.5 12L14 15.5" />
    </svg>
  );
}

export default CodeForgeLogo;
