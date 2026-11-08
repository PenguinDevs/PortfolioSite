import { Game } from '@/game/Game';
import { getAwards, getExperience, getFriends, getInternshipOffers, getProjects, getSocialLinks } from '@/data/portfolio';

export default function Home() {
  const awards = getAwards();
  const socialLinks = getSocialLinks();
  const projects = getProjects();
  const experience = getExperience();
  const internshipOffers = getInternshipOffers();
  const friends = getFriends();
  return (
    <Game
      awards={awards}
      socialLinks={socialLinks}
      projects={projects}
      experience={experience}
      internshipOffers={internshipOffers}
      friends={friends}
    />
  );
}
