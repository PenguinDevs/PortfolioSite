import React from 'react';
import { Project } from '@/data/types';
import { getTechItemsByName } from '@/data';
import TechBadge from './TechBadge';
import Link from 'next/link';

interface ProjectCardProps {
  project: Project;
  variant?: 'compact' | 'full'; // compact for homepage, full for projects page
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, variant = 'full' }) => {
  const isCompact = variant === 'compact';
  const techItems = getTechItemsByName(project.techStack);
  
  const CardContent = () => (
    <div className="h-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-lg">{project.title}</h4>
        {!isCompact && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex-grow">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
          {project.description}
        </p>

        {!isCompact && techItems && techItems.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {techItems.map((tech, index) => (
                <TechBadge 
                  key={index}
                  tech={tech}
                  variant="compact"
                  showIcon={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 mt-auto">
        {project.buttons.map((button, index) => {
          if (button.type === 'internal') {
            return (
              <Link
                key={index}
                href={button.href}
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                {button.label} →
              </Link>
            );
          }

          return (
            <a
              key={index}
              href={button.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              {button.label} →
            </a>
          );
        })}
      </div>

      {isCompact && project.tags.length > 0 && (
        <div className="mt-3">
          <span className="text-xs text-blue-600 dark:text-blue-400">
            {project.tags[0]}
          </span>
        </div>
      )}
    </div>
  );

  if (project.link?.type === 'internal') {
    return (
      <Link href={project.link.value} className="block">
        <CardContent />
      </Link>
    );
  }

  if (project.link?.type === 'external') {
    return (
      <a
        href={project.link.value}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <CardContent />
      </a>
    );
  }

  return <CardContent />;
};

export default ProjectCard;