export default function Contact() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Get in Touch</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            Any and all inquiries are welcome!
          </p>
        </header>

        {/* Contact Methods */}
        <section className="mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 text-xl">
                  ✉️
                </span>
              </div>
              <div>
                <h3 className="font-medium">Email</h3>
                <a
                  href="mailto:contact@penguindevs.me"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  contact@penguindevs.me
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-gray-600 dark:text-gray-400 text-xl">
                  💼
                </span>
              </div>
              <div>
                <h3 className="font-medium">LinkedIn</h3>
                <a
                  href="https://www.linkedin.com/in/jason-yi-penguindevs/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  jason-yi-penguindevs
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-gray-600 dark:text-gray-400 text-xl">
                  🐱
                </span>
              </div>
              <div>
                <h3 className="font-medium">GitHub</h3>
                <a
                  href="https://github.com/PenguinDevs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  @PenguinDevs
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
