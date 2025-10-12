import Link from 'next/link';

const COMMON_HTTP_CODES = [
  { code: 400, name: 'Bad Request', description: 'Invalid request syntax' },
  { code: 401, name: 'Unauthorized', description: 'Authentication required' },
  { code: 403, name: 'Forbidden', description: 'Access denied' },
  { code: 404, name: 'Not Found', description: 'Resource not found' },
  { code: 408, name: 'Request Timeout', description: 'Server timeout' },
  { code: 429, name: 'Too Many Requests', description: 'Rate limit exceeded' },
  { code: 500, name: 'Internal Server Error', description: 'Server error' },
  { code: 502, name: 'Bad Gateway', description: 'Invalid upstream response' },
  { code: 503, name: 'Service Unavailable', description: 'Service down' },
  { code: 504, name: 'Gateway Timeout', description: 'Upstream timeout' },
];

export default function ErrorIndex() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            HTTP Status Cats 🐱
          </h1>
          <p className="text-gray-400 text-lg mb-2">
            Every HTTP status code explained by adorable cats!
          </p>
          <p className="text-gray-500 text-sm">
            Powered by{' '}
            <a 
              href="https://http.cat" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-blue-200 underline"
            >
              http.cat
            </a>
          </p>
        </div>

        {/* Common Status Codes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {COMMON_HTTP_CODES.map((status) => (
            <Link
              key={status.code}
              href={`/error/${status.code}`}
              className="group p-6 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-gray-500 transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2 group-hover:text-blue-300">
                  {status.code}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {status.name}
                </h3>
                <p className="text-gray-400 text-sm">
                  {status.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Custom Status Code Input */}
        <div className="text-center">
          <div className="p-6 bg-gray-800/50 border border-gray-700 rounded-lg max-w-md mx-auto">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Try Any Status Code
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Enter any HTTP status code (100-599) to see its cat!
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                min="100"
                max="599"
                placeholder="404"
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const code = (e.target as HTMLInputElement).value;
                    if (code && parseInt(code) >= 100 && parseInt(code) <= 599) {
                      window.location.href = `/error/${code}`;
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                  const code = input.value;
                  if (code && parseInt(code) >= 100 && parseInt(code) <= 599) {
                    window.location.href = `/error/${code}`;
                  }
                }}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors"
              >
                Go! 🐱
              </button>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 px-6 py-3 border border-gray-600 text-gray-300 font-semibold rounded-lg hover:border-gray-400 hover:text-white transition-all duration-200"
          >
            <span>←</span>
            <span>Back to Portfolio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}