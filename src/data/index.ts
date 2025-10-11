import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import {
  PortfolioData,
  Award,
  Project,
  TechStack,
  TechItem,
  Friend,
} from './types';

// Read and parse YAML file
const yamlPath = join(process.cwd(), 'src', 'data', 'portfolio.yaml');
const yamlContent = readFileSync(yamlPath, 'utf8');
const data: PortfolioData = yaml.load(yamlContent) as PortfolioData;

export const getAwards = (): Award[] => {
  return data.awards;
};

export const getProjects = (): Project[] => {
  return data.projects;
};

export const getTechStack = (): TechStack => {
  return data.techStack;
};

export const getAllTechItems = (): TechItem[] => {
  const {
    languages,
    frameworks,
    databases,
    tools,
    apis,
    os,
    datafiles,
    protocols,
  } = data.techStack;
  return [
    ...languages,
    ...frameworks,
    ...databases,
    ...tools,
    ...apis,
    ...os,
    ...datafiles,
    ...protocols,
  ];
};

export const getTechItemById = (id: string): TechItem | undefined => {
  const allTech = getAllTechItems();
  return allTech.find(tech => tech.id === id);
};

export const getTechItemsByCategory = (
  category: TechItem['category']
): TechItem[] => {
  const allTech = getAllTechItems();
  return allTech.filter(tech => tech.category === category);
};

export const getTechItemsByName = (names: string[]): TechItem[] => {
  const allTech = getAllTechItems();
  return names
    .map(name =>
      allTech.find(
        tech =>
          tech.name.toLowerCase() === name.toLowerCase() ||
          tech.id.toLowerCase() === name.toLowerCase().replace(/[^a-z0-9]/g, '')
      )
    )
    .filter(Boolean) as TechItem[];
};

export const getProjectById = (id: string): Project | undefined => {
  return data.projects.find(project => project.id === id);
};

export const getAwardById = (id: string): Award | undefined => {
  return data.awards.find(award => award.id === id);
};

export const getFeaturedProjects = (limit: number = 2): Project[] => {
  // You can customize this logic to determine which projects are "featured"
  return data.projects.slice(0, limit);
};

export const getFriends = (): Friend[] => {
  return data.friends || [];
};

export default data;
