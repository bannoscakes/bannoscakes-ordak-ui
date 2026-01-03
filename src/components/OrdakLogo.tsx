import { useId } from 'react';

interface OrdakLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export function OrdakLogo({ className = "h-10 w-10", variant = 'light' }: OrdakLogoProps) {
  const id = useId();
  const gradientLightId = `ordak-gradient-light-${id}`;
  const gradientDarkId = `ordak-gradient-dark-${id}`;

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Gradient for light variant - light orange tones */}
        <linearGradient id={gradientLightId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#FFE5CC', stopOpacity: 1 }} />
        </linearGradient>

        {/* Gradient for dark variant - orange to match Ordak brand */}
        <linearGradient id={gradientDarkId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#FF6B00', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#FF8533', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#FFA366', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Modern geometric "O" with layered manufacturing theme */}
      <g>
        {/* Outer ring */}
        <path
          d="M50 10 C71.67 10 90 28.33 90 50 C90 71.67 71.67 90 50 90 C28.33 90 10 71.67 10 50 C10 28.33 28.33 10 50 10 Z M50 20 C33.43 20 20 33.43 20 50 C20 66.57 33.43 80 50 80 C66.57 80 80 66.57 80 50 C80 33.43 66.57 20 50 20 Z"
          fill={variant === 'light' ? `url(#${gradientLightId})` : `url(#${gradientDarkId})`}
          opacity="0.9"
        />

        {/* Inner geometric layers - representing manufacturing/production layers */}
        <rect
          x="35"
          y="35"
          width="30"
          height="8"
          rx="2"
          fill={variant === 'light' ? '#ffffff' : '#FF8533'}
          opacity="0.8"
        />

        <rect
          x="35"
          y="46"
          width="30"
          height="8"
          rx="2"
          fill={variant === 'light' ? '#ffffff' : '#FF9F4D'}
          opacity="0.9"
        />

        <rect
          x="35"
          y="57"
          width="30"
          height="8"
          rx="2"
          fill={variant === 'light' ? '#ffffff' : '#FFB366'}
          opacity="1"
        />
      </g>
    </svg>
  );
}
