import { Game } from '@/game/Game';
import { getAwards, getProjects, getSocialLinks } from '@/data/portfolio';

export default function Home() {
  const awards = getAwards();
  const socialLinks = getSocialLinks();
  const projects = getProjects();
  return <Game awards={awards} socialLinks={socialLinks} projects={projects} />;
}
