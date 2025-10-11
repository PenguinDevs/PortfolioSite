'use client';

import React from 'react';
import Image from 'next/image';
import { TechItem } from '@/data/types';

interface TechBadgeProps {
  tech: TechItem;
  variant?: 'default' | 'compact' | 'large';
  showIcon?: boolean;
}

const TechBadge: React.FC<TechBadgeProps> = ({
  tech,
  variant = 'default',
  showIcon = true,
}) => {
  const sizeClasses = {
    compact: {
      container: 'px-2 py-1 text-xs',
      icon: 'w-3 h-3',
      text: 'text-xs',
    },
    default: {
      container: 'px-3 py-1.5 text-sm',
      icon: 'w-4 h-4',
      text: 'text-sm',
    },
    large: {
      container: 'px-4 py-2 text-base',
      icon: 'w-5 h-5',
      text: 'text-base',
    },
  };

  const { container, icon, text } = sizeClasses[variant];

  return (
    <span
      className={`inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-md ${container}`}
    >
      {showIcon && (
        <Image
          src={tech.imageUrl}
          alt={`${tech.name} logo`}
          width={variant === 'compact' ? 12 : variant === 'default' ? 16 : 20}
          height={variant === 'compact' ? 12 : variant === 'default' ? 16 : 20}
          className={`${icon} object-contain flex-shrink-0`}
          onError={e => {
            // Fallback to text if image fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <span className={`${text} text-gray-700 dark:text-gray-300`}>
        {tech.name}
      </span>
    </span>
  );
};

interface TechBadgeListProps {
  techNames: string[];
  variant?: 'default' | 'compact' | 'large';
  showIcons?: boolean;
  maxItems?: number;
}

export const TechBadgeList: React.FC<TechBadgeListProps> = ({
  techNames,
  variant = 'default',
  showIcons = true,
  maxItems,
}) => {
  const getTechItemByName = (name: string): TechItem => {
    // Fallback tech item for unknown technologies
    return {
      id: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      name,
      imageUrl: '', // No icon for unknown tech
      category: 'Tool' as const,
    };
  };

  const displayTechs = maxItems ? techNames.slice(0, maxItems) : techNames;
  const remainingCount =
    maxItems && techNames.length > maxItems ? techNames.length - maxItems : 0;

  return (
    <div className="flex flex-wrap gap-2">
      {displayTechs.map((techName, index) => {
        const tech = getTechItemByName(techName);
        return (
          <TechBadge
            key={index}
            tech={tech}
            variant={variant}
            showIcon={showIcons && !!tech.imageUrl}
          />
        );
      })}
      {remainingCount > 0 && (
        <span
          className={`inline-flex items-center px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-xs text-gray-600 dark:text-gray-400`}
        >
          +{remainingCount} more
        </span>
      )}
    </div>
  );
};

export default TechBadge;
