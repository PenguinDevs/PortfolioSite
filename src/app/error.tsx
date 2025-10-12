'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  const statusCode = 500;
  const colorScheme = {
    gradient: 'from-red-400 via-orange-400 to-yellow-400',
    border: 'border-red-500/20 group-hover:border-red-500/50',
    button: 'from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-red-500/25',
    dots: 'bg-red-400'
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center relative overflow-hidden">
      {/* Decorative Error Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Glitch Effect Lines */}
        <div className="absolute top-1/4 left-0 w-full h-0.5 bg-red-500 opacity-30 animate-pulse"></div>
        <div className="absolute top-2/3 left-0 w-full h-0.5 bg-red-400 opacity-20 animate-ping"></div>
        
        {/* Floating Error Indicators */}
        <div className={`absolute top-20 left-16 w-3 h-3 ${colorScheme.dots} rounded-full animate-bounce`}></div>
        <div className={`absolute top-40 right-20 w-2 h-2 ${colorScheme.dots} rounded-full animate-pulse`}></div>
        <div className={`absolute bottom-32 left-32 w-4 h-4 ${colorScheme.dots} rounded-full animate-ping`}></div>
        <div className={`absolute bottom-20 right-16 w-2 h-2 ${colorScheme.dots} rounded-full animate-bounce`}></div>
        
        {/* Error Code Snippets */}
        <div className="absolute top-24 right-24 text-xs text-red-400 font-mono opacity-40 rotate-6">
          {'try { ... } catch(e)'}
        </div>
        <div className="absolute bottom-40 left-24 text-xs text-orange-400 font-mono opacity-40 -rotate-12">
          {'throw new Error()'}
        </div>
        <div className="absolute top-1/2 left-8 text-xs text-yellow-400 font-mono opacity-30 rotate-90">
          {'undefined'}
        </div>
        <div className="absolute top-16 left-1/2 text-xs text-red-500 font-mono opacity-30 -rotate-3">
          {'500: Internal Error'}
        </div>
        <div className="absolute bottom-24 right-1/3 text-xs text-orange-300 font-mono opacity-25 rotate-45">
          {'server.crashed()'}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
        {/* HTTP Cat 500 */}
        <div className="mb-8">
          <div className="mb-6 flex justify-center">
            <div className="relative group">
              <Image
                src={imageError ? 'https://http.cat/500' : 'https://http.cat/500'}
                alt="500 - Internal Server Error Cat"
                width={400}
                height={300}
                className={`rounded-lg shadow-2xl border-2 ${colorScheme.border}`}
                priority
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-red-500/20 to-transparent rounded-lg opacity-0"></div>
            </div>
          </div>
          
          <h1 className={`text-6xl md:text-7xl font-bold bg-gradient-to-r ${colorScheme.gradient} bg-clip-text text-transparent mb-4 animate-pulse`}>
            500
          </h1>
          <div className={`w-32 h-1 bg-gradient-to-r ${colorScheme.gradient} mx-auto mb-6 rounded-full`}></div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
            Something went wrong
          </h2>
          <p className="text-gray-400 text-lg mb-4">
            It looks like we've encountered an unexpected error. This shouldn't have happened!
          </p>
          
          {/* Error Details (in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-left">
              <p className="text-red-300 text-sm font-mono mb-2">Error Details:</p>
              <p className="text-red-200 text-xs font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-red-400 text-xs font-mono mt-2">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}
          
          <p className="text-gray-500 text-sm">
            silly goober
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <button
            onClick={reset}
            className={`px-8 py-3 bg-gradient-to-r ${colorScheme.button} text-white font-semibold rounded-lg`}
          >
            Try Again
          </button>
          
          <Link
            href="/"
            className="px-8 py-3 border border-gray-600 text-gray-300 font-semibold rounded-lg"
          >
            ← Back to Safety
          </Link>
        </div>

        {/* HTTP Cat Attribution */}
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 mb-6">
          <p className="text-sm text-gray-400 mb-2">
            <span className="text-red-400 font-mono">error_boundary()</span>
          </p>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-xs text-gray-500">Cat image provided by</span>
            <a 
              href="https://http.cat" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-red-300 hover:text-red-200 underline text-sm font-medium transition-colors"
            >
              <span>http.cat</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}