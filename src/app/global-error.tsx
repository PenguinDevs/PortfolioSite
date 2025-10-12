'use client';

import { useEffect } from 'react';
import Image from 'next/image';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Error:', error);
  }, [error]);

  return (
    <html>
      <body className="bg-gray-900 text-white min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Decorative Critical Error Elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Critical error indicators */}
          <div className="absolute top-20 left-16 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
          <div className="absolute top-32 right-20 w-3 h-3 bg-red-600 rounded-full animate-ping"></div>
          <div className="absolute bottom-40 left-24 w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
          <div className="absolute bottom-24 right-32 w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>

          {/* Critical error lines */}
          <div className="absolute top-1/4 left-0 w-full h-1 bg-red-500 opacity-20 animate-pulse"></div>
          <div className="absolute bottom-1/4 left-0 w-full h-0.5 bg-red-600 opacity-30 animate-ping"></div>

          {/* Error code snippets */}
          <div className="absolute top-16 right-24 text-xs text-red-400 font-mono opacity-40 rotate-12">
            {'CRITICAL ERROR'}
          </div>
          <div className="absolute bottom-32 left-16 text-xs text-orange-400 font-mono opacity-40 -rotate-6">
            {'app.crashed()'}
          </div>
          <div className="absolute top-1/2 right-8 text-xs text-red-300 font-mono opacity-30 rotate-90">
            {'global.error'}
          </div>
        </div>

        <div className="text-center relative z-10 max-w-2xl mx-auto px-6">
          {/* HTTP Cat Critical Error */}
          <div className="mb-8">
            <div className="mb-6 flex justify-center">
              <div className="relative group">
                <Image
                  src="https://http.cat/500"
                  alt="500 - Critical Error Cat"
                  width={300}
                  height={225}
                  className="rounded-lg shadow-2xl border-2 border-red-500/20"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-red-500/30 to-transparent rounded-lg opacity-0"></div>
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent mb-4 animate-pulse">
              Critical Error
            </h1>
            <div className="w-32 h-1 bg-red-500 mx-auto mb-6 rounded-full animate-pulse"></div>
          </div>

          {/* Error Message */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Application Error</h2>
            <p className="text-gray-400 text-lg mb-4">
              A critical error has occurred that prevented the application from
              loading properly.
            </p>

            {/* Show error in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-left">
                <p className="text-red-300 text-sm font-bold mb-2">
                  Error Details:
                </p>
                <p className="text-red-200 text-xs font-mono break-all mb-2">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-red-400 text-xs font-mono">
                    Digest: {error.digest}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button
              onClick={reset}
              className="px-8 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Reload
            </button>

            <button
              onClick={() => (window.location.href = '/')}
              className="px-8 py-3 border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Go Home
            </button>
          </div>

          {/* HTTP Cat Attribution */}
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 text-sm mb-6">
            <p className="text-gray-300 mb-2">
              <span className="text-red-400 font-mono">critical_error()</span>
            </p>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xs text-gray-500">
                Emergency cat provided by
              </span>
              <a
                href="https://http.cat"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-300 hover:text-red-200 underline font-medium"
              >
                http.cat
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
