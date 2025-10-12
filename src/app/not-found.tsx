import Image from 'next/image';
import Link from 'next/link';

export default function NotFound() {
  const colorScheme = {
    gradient: 'from-blue-400 via-purple-400 to-pink-400',
    border: 'border-blue-500/20 group-hover:border-blue-500/50',
    button:
      'from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-blue-500/25',
    dots: 'bg-blue-400',
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={`absolute top-20 left-10 w-2 h-2 ${colorScheme.dots} rounded-full animate-pulse`}
        ></div>
        <div
          className={`absolute top-32 right-20 w-1 h-1 ${colorScheme.dots} rounded-full animate-ping`}
        ></div>
        <div
          className={`absolute bottom-40 left-20 w-3 h-3 ${colorScheme.dots} rounded-full animate-bounce`}
        ></div>
        <div
          className={`absolute bottom-20 right-32 w-2 h-2 ${colorScheme.dots} rounded-full animate-pulse`}
        ></div>

        {/* Floating Code Snippets */}
        <div className="absolute top-16 right-16 text-xs text-gray-500 font-mono opacity-30 rotate-12">
          {'{ error: 404 }'}
        </div>
        <div className="absolute bottom-32 left-16 text-xs text-gray-500 font-mono opacity-30 -rotate-6">
          {'console.log("lost?")'}
        </div>
        <div className="absolute top-1/3 right-8 text-xs text-blue-400 font-mono opacity-25 rotate-45">
          {'page.notFound()'}
        </div>
        <div className="absolute bottom-1/3 left-8 text-xs text-purple-400 font-mono opacity-25 -rotate-30">
          {'route: undefined'}
        </div>
        <div className="absolute top-1/2 right-1/4 text-xs text-pink-400 font-mono opacity-20 rotate-12">
          {'404: Not Found'}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
        {/* HTTP Cat 404 */}
        <div className="mb-8">
          <div className="mb-6 flex justify-center">
            <div className="relative group">
              <Image
                src="https://http.cat/404"
                alt="404 - Not Found Cat"
                width={400}
                height={300}
                className={`rounded-lg shadow-2xl border-2 transition-all duration-300 transform group-hover:scale-105 ${colorScheme.border}`}
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </div>
          <h1
            className={`text-6xl md:text-7xl font-bold bg-gradient-to-r ${colorScheme.gradient} bg-clip-text text-transparent mb-4 animate-pulse`}
          >
            404
          </h1>
          <div
            className={`w-32 h-1 bg-gradient-to-r ${colorScheme.gradient} mx-auto mb-6 rounded-full`}
          ></div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
            Page Not Found
          </h2>
          <p className="text-gray-400 text-lg mb-2">
            Oops! The page you&apos;re looking for seems to have wandered off
            into the digital void.
          </p>
          <p className="text-gray-500 text-sm">silly goober</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/"
            className={`px-8 py-3 bg-gradient-to-r ${colorScheme.button} text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg`}
          >
            ← Back to Home
          </Link>

          <Link
            href="/projects"
            className="px-8 py-3 border border-gray-600 text-gray-300 font-semibold rounded-lg hover:border-gray-400 hover:text-white transition-all duration-200 transform hover:scale-105"
          >
            View Projects
          </Link>
        </div>

        {/* HTTP Cat Attribution */}
        <div className="mt-12 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <p className="text-sm text-gray-400 mb-2">
            <span className="text-blue-400 font-mono">page_not_found()</span>
          </p>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-xs text-gray-500">Cat image provided by</span>
            <a
              href="https://http.cat"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-blue-300 hover:text-blue-200 underline text-sm font-medium transition-colors"
            >
              <span>http.cat</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
