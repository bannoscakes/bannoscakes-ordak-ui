import { LucideProps } from "lucide-react";

export function TallCakeIcon(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Base layer */}
      <path d="M3 20h18v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2z" />
      
      {/* Second layer */}
      <path d="M5 16h14v-2a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2z" />
      
      {/* Third layer */}
      <path d="M7 12h10v-2a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2z" />
      
      {/* Top layer */}
      <path d="M9 8h6v-2a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2z" />
      
      {/* Decorative elements (no candles) */}
      <circle cx="8" cy="18" r="0.5" fill="currentColor" />
      <circle cx="12" cy="18" r="0.5" fill="currentColor" />
      <circle cx="16" cy="18" r="0.5" fill="currentColor" />
      
      <circle cx="10" cy="14" r="0.5" fill="currentColor" />
      <circle cx="14" cy="14" r="0.5" fill="currentColor" />
      
      <circle cx="12" cy="10" r="0.5" fill="currentColor" />
    </svg>
  );
}