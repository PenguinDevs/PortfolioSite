import { Game } from '@/game/Game';
import { getAwards, getSocialLinks } from '@/data/portfolio';

export default function Home() {
  const awards = getAwards();
  const socialLinks = getSocialLinks();
  return <Game awards={awards} socialLinks={socialLinks} />;
}
