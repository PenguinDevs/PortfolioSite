import React from 'react';
import { Award } from '@/data/types';

interface AwardCardProps {
  award: Award;
  onClick?: () => void;
}

const IconRenderer: React.FC<{ icon: Award['icon'] }> = ({ icon }) => {
  switch (icon.type) {
    case 'emoji':
      return <span className="text-2xl">{icon.value}</span>;
    case 'svg':
      return (
        <div 
          className="w-6 h-6" 
          dangerouslySetInnerHTML={{ __html: icon.value }} 
        />
      );
    case 'url':
      return (
        <img 
          src={icon.value} 
          alt="Award icon" 
          className="w-6 h-6 object-contain"
        />
      );
    default:
      return <span className="text-2xl">🏆</span>;
  }
};

const AwardCard: React.FC<AwardCardProps> = ({ award, onClick }) => {
  const CardContent = () => (
    <div className={`h-full p-4 border-2 rounded-lg flex flex-col ${award.theme?.borderColor || 'border-gray-200 dark:border-gray-700'} ${award.theme?.bgColor || 'bg-gray-50 dark:bg-gray-900'}`}>
      <div className="flex items-center gap-3 mb-2">
        <IconRenderer icon={award.icon} />
        <div>
          <h4 className={`font-semibold ${award.theme?.textColor || 'text-gray-800 dark:text-gray-200'}`}>
            {award.title}
          </h4>
          <p className={`text-xs ${award.theme?.secondaryTextColor || 'text-gray-600 dark:text-gray-400'}`}>
            {award.secondaryText}
          </p>
        </div>
      </div>
      <p className={`text-sm flex-grow ${award.theme?.descriptionColor || 'text-gray-700 dark:text-gray-300'}`}>
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
      className={onClick ? "cursor-pointer award-card-hover" : ""}
      onClick={onClick}
    >
      <CardContent />
    </div>
  );
};

export default AwardCard;