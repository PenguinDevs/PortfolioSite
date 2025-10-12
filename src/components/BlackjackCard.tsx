'use client';

import { useState } from 'react';

interface BlackjackCardProps {
  className?: string;
}

export default function BlackjackCard({ className = '' }: BlackjackCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href="https://blackjack.penguindevs.me"
      rel="noopener noreferrer"
      className={`group block transition-all duration-300 ease-in-out ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="blackjack"
    >
      <div
        className={`
          relative w-12 h-16 bg-white dark:bg-gray-100 rounded-lg border border-gray-300 dark:border-gray-400
          shadow-sm transition-all duration-300 ease-in-out cursor-pointer
          ${isHovered ? 'scale-110 shadow-lg rotate-3' : 'opacity-0 hover:opacity-80'}
          group-hover:shadow-xl
        `}
      >
        {/* Card face */}
        <div className="absolute inset-1 flex flex-col justify-between text-black">
          {/* Top left suit and rank */}
          <div className="flex flex-col items-start text-xs font-bold leading-none">
            <span className="text-red-500">A</span>
          </div>

          {/* Center suit - large */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <span className="text-red-500 text-2xl">♠</span>
          </div>

          {/* Bottom right suit and rank (rotated) */}
          <div className="flex flex-col items-end text-xs font-bold leading-none self-end transform rotate-180">
            <span className="text-red-500">A</span>
          </div>
        </div>

        {/* Subtle glow effect on hover */}
        <div
          className={`
            absolute inset-0 rounded-lg transition-opacity duration-300
            ${isHovered ? 'opacity-20' : 'opacity-0'}
            bg-gradient-to-br from-blue-400 to-purple-500
          `}
        />
      </div>
    </a>
  );
}
