export function DeskIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 7h12M19 7v14M16 21h6" />
      <path d="M3.5 9.5 2.8 3.8a1.6 1.6 0 0 1 3.2-.4l.7 5.5a1.6 1.6 0 0 1-3.2.6Z" />
      <path d="M3.5 9.5v4a2 2 0 0 0 2 2H10a1.7 1.7 0 0 0 0-3.4H5.5M7 15.5V19m-3 1v-1h6v1M7 19v2" />
      <circle cx="4" cy="21.5" r=".65" />
      <circle cx="10" cy="21.5" r=".65" />
    </svg>
  );
}
