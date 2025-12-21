import React from 'react';
import { Award } from '@/data/types';

interface AwardCardProps {
  award: Award;
  onClick?: () => void;
}

const AwardCard: React.FC<AwardCardProps> = ({ award, onClick }) => {
  const CardContent = () => (
    <div
      className={`group relative h-full p-6 rounded-lg flex flex-col transition-all duration-300 border overflow-hidden ${award.theme?.borderColor || 'border-gray-200 dark:border-gray-700'} ${award.theme?.bgColor || 'bg-white dark:bg-gray-900'}`}
    >
      {/* Accent bar on left */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${award.theme?.accentBar || 'bg-blue-500'} group-hover:w-1.5 transition-all duration-300`}
      />

      {/* Corner decoration */}
      <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden opacity-20">
        <div
          className={`absolute -top-10 -right-10 w-24 h-24 rounded-full ${award.theme?.gradientOverlay || 'bg-gradient-to-br from-blue-400 to-purple-600'}`}
        />
      </div>

      {/* Decorative pattern overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id={`pattern-${award.id}`}
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill={`url(#pattern-${award.id})`}
            className={award.theme?.textColor || 'text-gray-900'}
          />
        </svg>
      </div>

      {/* Badge section */}
      <div className="relative flex items-start justify-between mb-4">
        <div className="flex-1">
          {award.badge && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded ${award.badge.bgColor || 'bg-blue-100 dark:bg-blue-900'} ${award.badge.textColor || 'text-blue-700 dark:text-blue-200'}`}
            >
              {award.badge.icon && (
                <span className="text-sm">{award.badge.icon}</span>
              )}
              {award.badge.text}
            </span>
          )}
        </div>
        {award.year && (
          <span
            className={`text-2xl font-black opacity-20 ${award.theme?.textColor || 'text-gray-900 dark:text-gray-100'}`}
          >
            {award.year}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col">
        <h4
          className={`font-bold text-lg leading-tight mb-2 group-hover:translate-x-1 transition-transform duration-300 ${award.theme?.textColor || 'text-gray-900 dark:text-gray-100'}`}
        >
          {award.title}
        </h4>
        <p
          className={`text-sm font-semibold mb-3 uppercase tracking-wide ${award.theme?.secondaryTextColor || 'text-gray-600 dark:text-gray-400'}`}
        >
          {award.secondaryText}
        </p>
        <p
          className={`text-sm leading-relaxed ${award.theme?.descriptionColor || 'text-gray-700 dark:text-gray-300'}`}
        >
          {award.description}
        </p>

        {/* Stats or highlights */}
        {award.stats && (
          <div className="mt-4 flex flex-wrap gap-3">
            {award.stats.map((stat, index) => (
              <div
                key={index}
                className={`flex items-baseline gap-1 ${award.theme?.secondaryTextColor || 'text-gray-600 dark:text-gray-400'}`}
              >
                <span className="text-lg font-bold">{stat.value}</span>
                <span className="text-xs">{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Hover indicator */}
        {award.href && (
          <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div
              className={`h-px flex-1 ${award.theme?.accentBar || 'bg-blue-500'}`}
            />
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${award.theme?.secondaryTextColor || 'text-gray-600 dark:text-gray-400'}`}
            >
              View Details
            </span>
            <svg
              className={`w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300 ${award.theme?.secondaryTextColor || 'text-gray-600 dark:text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );

  if (award.href) {
    return (
      <a
        href={award.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block cursor-pointer"
        onClick={onClick}
      >
        <CardContent />
      </a>
    );
  }

  return (
    <div className={onClick ? 'cursor-pointer' : ''} onClick={onClick}>
      <CardContent />
    </div>
  );
};

export default AwardCard;
