import TechStackGraph from '@/components/TechStackGraph';
import LottieAnimation from '@/components/LottieAnimation';
import ValorantIcon from '@/components/icons/ValorantIcon';
import RobloxIcon from '@/components/icons/RobloxIcon';
import DiscordIcon from '@/components/icons/DiscordIcon';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <TechStackGraph />
      <div className="max-w-2xl mx-auto px-6 py-8 relative z-0">
        {/* Header */}
        <header className="mb-4">
          <h1 className="text-4xl font-bold mb-4">hi!</h1>
          <h2 className="text-2xl font-medium mb-2">I'm Jason :)</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            or PenguinDevs
          </p>
          <p className="text-base text-gray-500 dark:text-gray-400 mt-2">
            full-stack developer • studying somputer science w/ maths minor •
            gamer
          </p>
        </header>

        {/* Social Links */}
        <section className="mb-12">
          <div className="flex flex-wrap gap-3">
            <a
              href="https://github.com/PenguinDevs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-800 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">GitHub</span>
            </a>
            <a
              href="https://www.linkedin.com/in/jason-yi-penguindevs/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">LinkedIn</span>
            </a>
            <a
              href="https://x.com/penguindevs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-gray-900 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="font-medium">X</span>
            </a>
            <a
              href="https://discord.com/invite/xq25Exwf3X"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <DiscordIcon className="w-4 h-4" />
              <span className="font-medium">Discord</span>
            </a>
          </div>
        </section>

        {/* Projects */}
        <section className="mb-12">
          <h3 className="text-xl font-semibold mb-6">My Projects!!</h3>
          <div className="space-y-4 mb-6">
            <a
              href="https://valotracker.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 relative mr-4 ml-4">
                  <ValorantIcon className="w-24 h-24 text-red-500 opacity-70 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  <LottieAnimation width={60} height="100%" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-2">ValoTracker</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Founded and maintained Discord's #1 trending bot with 40,000+
                    servers. Valorant statistics and insights.
                  </p>
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    Featured on discord.com/build
                  </span>
                </div>
              </div>
            </a>
            <a
              href="https://create.roblox.com/talent/creators/204152663"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 relative mr-4 ml-4">
                  <RobloxIcon className="w-16 h-16 text-gray-300" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-2">Roblox</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Amassed tens of millions of players across multiple games,
                    adopting various skill sets; not just programming.
                  </p>
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    Since 11 years old
                  </span>
                </div>
              </div>
            </a>
          </div>
          <a
            href="/projects"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            See all projects →
          </a>
        </section>

        {/* Achievements */}
        <section className="mb-12">
          <h3 className="text-xl font-semibold mb-6">Recent Achievements</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🥇</span>
                <div>
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                    MACATHON 2025 Winner
                  </h4>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    First Place
                  </p>
                </div>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Won $1800 with team for "Catch N Go" - a gamified social mobile
                app built in 48 hours
              </p>
            </div>

            <div className="p-4 border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <h4 className="font-semibold text-purple-800 dark:text-purple-200">
                    ValoTracker #1 Trending
                  </h4>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    July 2024
                  </p>
                </div>
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                ValoTracker reached #1 on Discord's trending bots with 40,000+
                servers
              </p>
            </div>

            <div className="p-4 border-2 border-silver-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🥈</span>
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                    Competitive Programming
                  </h4>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    MAPS Advanced Division
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                2nd Place in Monash University's collegiate competitive
                programming competition
              </p>
            </div>

            <div className="p-4 border-2 border-silver-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🥈</span>
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                    Competitive Programming
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    MAPS Beginner Competition
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                2nd Place in Monash University's beginner competitive
                programming competition
              </p>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="mb-12">
          <h3 className="text-xl font-semibold mb-6">More About Me</h3>
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="leading-relaxed mb-4">
              I'm a Computer Science student at Monash University from
              Melbourne, Australia. Started programming at age 11 with Roblox
              games that reached 13+ million players, then built ValoTracker
              which became Discord's #1 trending bot in July 2024 with 40,000+
              servers.
            </p>
            <p className="leading-relaxed mb-4">
              I love gaming and building things that scale. Probably working on
              a project right now while studying Computer Science.
            </p>
            <a
              href="/contact"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get in touch
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            nothing more than that really
          </p>
        </footer>
      </div>
    </div>
  );
}
