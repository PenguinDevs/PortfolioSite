import React from 'react';
import Image from 'next/image';
import { Award } from '@/data/types';

interface AwardCardProps {
  award: Award;
  onClick?: () => void;
}

const IconRenderer: React.FC<{ icon?: Award['icon'] }> = ({ icon }) => {
  if (!icon) return null;
  
  switch (icon.type) {
    case 'emoji':
      return <span className="text-2xl">{icon.value}</span>;
    case 'svg':
      return (
        <div
          className="w-7 h-7"
          dangerouslySetInnerHTML={{ __html: icon.value }}
        />
      );
    case 'url':
      return (
        <Image
          src={icon.value}
          alt="Award icon"
          width={28}
          height={28}
          className="w-7 h-7 object-contain"
        />
      );
    default:
      return null;
  }
};

const AwardCard: React.FC<AwardCardProps> = ({ award, onClick }) => {
  const CardContent = () => (
    <div
      className={`h-full p-6 rounded-xl flex flex-col shadow-sm hover:shadow-md transition-shadow duration-200 ${award.theme?.borderColor || 'border border-gray-200 dark:border-gray-700'} ${award.theme?.bgColor || 'bg-white dark:bg-gray-900'}`}
    >
      <div className="mb-4">
        <h4
          className={`font-semibold text-lg leading-tight mb-2 ${award.theme?.textColor || 'text-gray-900 dark:text-gray-100'}`}
        >
          {award.title}
        </h4>
        <p
          className={`text-sm font-medium ${award.theme?.secondaryTextColor || 'text-gray-600 dark:text-gray-400'}`}
        >
          {award.secondaryText}
        </p>
      </div>
      <p
        className={`text-sm leading-relaxed ${award.theme?.descriptionColor || 'text-gray-700 dark:text-gray-300'}`}
      >
        {award.description}
      </p>
    </div>
  );

  if (award.href) {
    return (
      <a
        href={award.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block cursor-pointer award-card-hover"
        onClick={onClick}
      >
        <CardContent />
      </a>
    );
  }

  return (
    <div
      className={onClick ? 'cursor-pointer award-card-hover' : ''}
      onClick={onClick}
    >
      <CardContent />
    </div>
  );
};

export default AwardCard;
