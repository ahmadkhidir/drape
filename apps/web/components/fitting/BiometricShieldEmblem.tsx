/**
 * Biometric Shield Emblem
 * Spec Anchors: Screen 04, ASSETS.md, FEAT-005, NFR-040
 */

import React from 'react';

interface BiometricShieldEmblemProps {
  className?: string;
  size?: number;
}

export const BiometricShieldEmblem: React.FC<BiometricShieldEmblemProps> = ({
  className = '',
  size = 40,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
      aria-hidden="true"
    >
      {/* Outer Shield Geometry */}
      <path
        d="M24 4L7 11V23.5C7 34.2 14.3 43.1 24 46C33.7 43.1 41 34.2 41 23.5V11L24 4Z"
        className="stroke-gold"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Inner Concentric Contour */}
      <path
        d="M24 8.5L11 14V23.5C11 31.8 16.6 39.2 24 41.5C31.4 39.2 37 31.8 37 23.5V14L24 8.5Z"
        className="stroke-grey-400 dark:stroke-grey-600"
        strokeWidth="1"
        strokeDasharray="2 2"
      />

      {/* Padlock Body */}
      <rect
        x="18"
        y="22"
        width="12"
        height="10"
        rx="2"
        className="fill-ink dark:fill-alabaster stroke-gold"
        strokeWidth="1.2"
      />

      {/* Padlock Shackle */}
      <path
        d="M20 22V18C20 15.8 21.8 14 24 14C26.2 14 28 15.8 28 18V22"
        className="stroke-gold"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Keyhole */}
      <circle cx="24" cy="26" r="1.2" className="fill-gold" />
      <path d="M24 27.2V29" className="stroke-gold" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
};
