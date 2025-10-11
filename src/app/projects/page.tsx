import ProjectCard from '@/components/ProjectCard';
import { getProjects } from '@/data';

export default function Projects() {
  const projects = getProjects();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <header className="mb-16">
          <h1 className="text-4xl font-bold mb-4">My Projects</h1>
        </header>

        <div className="grid gap-8 md:grid-cols-2 items-stretch">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} variant="full" />
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
