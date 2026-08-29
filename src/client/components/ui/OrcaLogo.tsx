// Ocean animated SVG logo for ORCA
export default function OrcaLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Body */}
      <path
        d="M8 28 C10 20, 20 10, 32 14 C40 17, 44 24, 40 30 C36 36, 28 38, 22 34 C18 31, 14 26, 16 22 C18 18, 24 16, 28 18"
        stroke="url(#orca-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Dorsal fin */}
      <path
        d="M28 14 C30 8, 36 6, 38 12"
        stroke="url(#orca-grad)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Tail fluke */}
      <path
        d="M8 28 C4 24, 2 20, 6 18 M8 28 C4 32, 2 36, 6 36"
        stroke="url(#orca-grad)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Eye */}
      <circle cx="34" cy="20" r="1.5" fill="#7ec8e3" />
      {/* Wave */}
      <path
        d="M4 38 Q12 34, 20 38 Q28 42, 36 38 Q42 35, 46 38"
        stroke="rgba(126,200,227,0.4)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <defs>
        <linearGradient id="orca-grad" x1="4" y1="8" x2="44" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7ec8e3" />
          <stop offset="50%" stopColor="#2d8bba" />
          <stop offset="100%" stopColor="#1e5fa8" />
        </linearGradient>
      </defs>
    </svg>
  )
}
