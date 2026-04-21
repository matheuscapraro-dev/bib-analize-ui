import { cn } from "@/lib/utils";

const SIZES = { sm: 20, md: 32, lg: 64 } as const;

interface BrandLogoProps {
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * Reusable Huginn & Muninn logo — inline SVG so it inherits `currentColor`.
 * Renders two facing ravens with runic accents.
 */
export function BrandLogo({ size = "md", className }: BrandLogoProps) {
  const px = SIZES[size];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="currentColor"
      width={px}
      height={px}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {/* Ansuz rune background */}
      <g opacity="0.12">
        <path
          d="M256 60 L256 452 M256 160 L296 120 M256 240 L296 200"
          stroke="currentColor"
          strokeWidth="18"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* Huginn — left raven facing right */}
      <g transform="translate(80, 130)">
        <path
          d="M140 200 C140 260, 100 300, 60 310 C40 316, 20 310, 10 300
             C-4 286, 4 260, 20 240 L60 190 C70 176, 60 160, 50 150
             C36 134, 30 110, 40 90 C50 70, 70 56, 90 54
             C110 52, 126 60, 136 76 C146 92, 148 114, 140 130
             L130 160 C126 170, 130 182, 140 200 Z"
        />
        <ellipse cx="100" cy="68" rx="40" ry="32" />
        <circle cx="112" cy="62" r="6" className="fill-background" />
        <circle cx="114" cy="61" r="2.5" />
        <path d="M138 64 L172 58 L164 68 L138 72 Z" />
        <path
          d="M60 180 C40 200, 20 230, 10 260"
          className="stroke-background"
          strokeWidth="2"
          fill="none"
          opacity="0.3"
        />
        <path
          d="M20 290 L-10 330 L0 290 L-20 340 L10 300 L-6 350 L20 306"
          opacity="0.85"
        />
      </g>

      {/* Muninn — right raven facing left */}
      <g transform="translate(432, 130) scale(-1,1)">
        <path
          d="M140 200 C140 260, 100 300, 60 310 C40 316, 20 310, 10 300
             C-4 286, 4 260, 20 240 L60 190 C70 176, 60 160, 50 150
             C36 134, 30 110, 40 90 C50 70, 70 56, 90 54
             C110 52, 126 60, 136 76 C146 92, 148 114, 140 130
             L130 160 C126 170, 130 182, 140 200 Z"
        />
        <ellipse cx="100" cy="68" rx="40" ry="32" />
        <circle cx="112" cy="62" r="6" className="fill-background" />
        <circle cx="114" cy="61" r="2.5" />
        <path d="M138 64 L172 58 L164 68 L138 72 Z" />
        <path
          d="M60 180 C40 200, 20 230, 10 260"
          className="stroke-background"
          strokeWidth="2"
          fill="none"
          opacity="0.3"
        />
        <path
          d="M20 290 L-10 330 L0 290 L-20 340 L10 300 L-6 350 L20 306"
          opacity="0.85"
        />
      </g>

      {/* Runic accents */}
      <g opacity="0.18" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round">
        <line x1="130" y1="440" x2="130" y2="470" />
        <line x1="130" y1="448" x2="142" y2="440" />
        <line x1="382" y1="440" x2="382" y2="470" />
        <line x1="382" y1="448" x2="370" y2="440" />
      </g>

      {/* Midgard flight arc */}
      <path
        d="M160 180 Q256 100 352 180"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.15"
        strokeDasharray="6 4"
      />
    </svg>
  );
}
