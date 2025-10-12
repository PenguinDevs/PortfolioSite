// Types for the portfolio data structure

export interface TechItem {
  id: string;
  name: string;
  imageUrl: string;
  category: 'Language' | 'Framework' | 'Database' | 'Tool' | 'API';
}

export interface TechStack {
  languages: TechItem[];
  frameworks: TechItem[];
  databases: TechItem[];
  tools: TechItem[];
  apis: TechItem[];
  os: TechItem[];
  datafiles: TechItem[];
  protocols: TechItem[];
}

export interface Award {
  id: string;
  title: string;
  secondaryText: string;
  description: string;
  icon?: {
    type: 'emoji' | 'svg' | 'url';
    value: string; // emoji character, svg string, or image URL
  };
  href?: string; // optional link when clicked
  theme?: {
    borderColor: string;
    bgColor: string;
    textColor: string;
    secondaryTextColor: string;
    descriptionColor: string;
  };
}

export interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[]; // general tags like "Winner", "Production", etc.
  techStack: string[]; // technical tags like "Next.js", "Python", etc.
  buttons: {
    label: string;
    href: string;
    type: 'external' | 'internal';
  }[];
  link?: {
    type: 'external' | 'internal';
    value: string; // external URL or internal route like "/projects/valotracker"
  };
}

export interface Friend {
  id: string;
  name: string;
  profileImage: string;
  link?: string; // optional link to their profile/website
}

export interface PortfolioData {
  techStack: TechStack;
  awards: Award[];
  projects: Project[];
  friends: Friend[];
}
