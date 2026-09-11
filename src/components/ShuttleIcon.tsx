import React from "react";

interface ShuttleIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export function ShuttleIcon({ className = "w-6 h-6", size, ...props }: ShuttleIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      {/* Feather cone */}
      <path d="M5 4l4 10h6l4-10" />
      <path d="M5 4c2.5 1 5 1.5 7 1.5s4.5-.5 7-1.5" />
      <path d="M6.5 8c2 .8 3.5 1 5.5 1s3.5-.2 5.5-1" />
      <path d="M8 12c1.3.5 2.5.7 4 .7s2.7-.2 4-.7" />
      {/* Rib lines */}
      <line x1="12" y1="5.5" x2="12" y2="14" />
      <line x1="8.5" y1="4.8" x2="10" y2="14" />
      <line x1="15.5" y1="4.8" x2="14" y2="14" />
      {/* Cork base */}
      <path d="M9 14h6v2.5a3 3 0 0 1-6 0V14z" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}
