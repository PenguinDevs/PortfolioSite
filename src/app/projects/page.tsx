export default function Projects() {
  const projects = [
    {
      title: 'ValoTracker 🏆',
      description:
        "Discord bot providing Valorant statistics and insights. Featured on Discord's website and became their #1 trending bot in July 2024. Serves 40,000+ servers with millions of match records processed weekly.",
      tech: [
        'Python',
        'JavaScript',
        'Next.js',
        'MySQL',
        'MongoDB',
        'Redis',
        'Discord API',
        'Riot API',
      ],
      link: 'https://valotracker.com',
      github: 'https://github.com/PenguinDevs/ValoTracker',
      status: '🏆 Discord #1 Trending Bot',
    },
    {
      title: 'Catch N Go 🥇',
      description:
        'MACATHON 2025 first place winner ($1800 prize). Social mobile app inspired by Pokémon Go built in 48 hours. Gamifies meeting new people on campus through location-based activities and challenges.',
      tech: ['Kotlin', 'Java', 'Python', 'FastAPI', 'MongoDB', 'OpenAI API'],
      link: 'https://devpost.com/software/catch-n-go',
      github: 'https://github.com/Swofty-Developments/MacathonBackend',
      status: '🥇 1st Place Winner',
    },
    {
      title: 'Ceebs - Food Ordering Platform',
      description:
        'Lead developer for merchant website integration alongside Discord bot for food ordering on Monash Clayton campus. Built scalable platform serving students with Next.js and PostgreSQL backend.',
      tech: ['Next.js', 'PostgreSQL', 'Discord.py', 'Python'],
      link: 'https://merchant.ceebs.site',
      github: '#',
      status: '🚀 Production',
    },
    {
      title: 'AllocateUs',
      description:
        'UniHack 2025 hackathon project. Web app helping university students coordinate group activities based on shared free time from timetables. AI suggests campus activities based on user preferences.',
      tech: [
        'TypeScript',
        'Next.js',
        'Python',
        'FastAPI',
        'DataStax',
        'OpenAI API',
      ],
      link: 'https://devpost.com/software/allocateus',
      github: 'https://github.com/BillyHri/unihack2025',
      status: '🎯 Hackathon Project',
    },
    {
      title: 'Roblox Games Portfolio',
      description:
        'Created multiple front-page Roblox games with 13+ million total plays. Specialized in Lua scripting, UI/UX design, 3D modeling and animation. Featured by YouTubers with millions of subscribers.',
      tech: ['Lua', 'Blender', 'Roblox Studio', 'Photoshop'],
      link: 'https://www.roblox.com/games/9278437733/Pet-Battles',
      github: 'https://github.com/PenguinDevs/PetBattles',
      status: '📈 13M+ Plays',
    },
    {
      title: 'Nissan Silvia S15 3D Model',
      description:
        'First car modeling project using Blender and Adobe Substance 3D Painter. Photogrammetry-assisted modeling with game-optimized topology and detailed texturing for realistic results.',
      tech: ['Blender', 'Adobe Substance 3D Painter', 'Photogrammetry'],
      link: 'https://www.artstation.com/artwork/kNdArK',
      github: '#',
      status: '🎨 3D Art',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <header className="mb-16">
          <h1 className="text-4xl font-bold mb-4">My Projects</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            From Discord bots with 40,000+ servers to hackathon winners and 13M+
            play Roblox games. Each project taught me something new and pushed
            my limits!
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          {projects.map((project, index) => (
            <div
              key={index}
              className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold">{project.title}</h3>
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                  {project.status}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                {project.description}
              </p>

              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {project.tech.map((tech, techIndex) => (
                    <span
                      key={techIndex}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-md"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  {project.link.includes('github')
                    ? 'View project'
                    : 'Live demo'}{' '}
                  →
                </a>
                {project.github !== '#' && (
                  <a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    View code →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <a
            href="mailto:contact@penguindevs.me"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get in touch
          </a>
        </div>
      </div>
    </div>
  );
}
