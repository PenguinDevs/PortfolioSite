import { Game } from '@/game/Game';
import { getAwards } from '@/data/portfolio';

export default function Home() {
  const awards = getAwards();
  return <Game awards={awards} />;
}
