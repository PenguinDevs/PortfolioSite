'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LottieAnimation from '@/components/LottieAnimation';

// Common HTTP status codes and their messages
const HTTP_STATUS_MESSAGES: Record<
  number,
  { title: string; message: string; canRetry: boolean }
> = {
  400: {
    title: 'Bad Request',
    message: 'The request could not be understood by the server.',
    canRetry: false,
  },
  401: {
    title: 'Unauthorized',
    message: 'You need to authenticate to access this resource.',
    canRetry: false,
  },
  403: {
    title: 'Forbidden',
    message: "You don't have permission to access this resource.",
    canRetry: false,
  },
  404: {
    title: 'Not Found',
    message: "The page you're looking for doesn't exist.",
    canRetry: false,
  },
  405: {
    title: 'Method Not Allowed',
    message: 'The request method is not supported for this resource.',
    canRetry: false,
  },
  408: {
    title: 'Request Timeout',
    message: 'The server timed out waiting for the request.',
    canRetry: true,
  },
  409: {
    title: 'Conflict',
    message: 'The request conflicts with the current state of the resource.',
    canRetry: false,
  },
  410: {
    title: 'Gone',
    message: 'The requested resource is no longer available.',
    canRetry: false,
  },
  422: {
    title: 'Unprocessable Entity',
    message: 'The request was well-formed but contains semantic errors.',
    canRetry: false,
  },
  429: {
    title: 'Too Many Requests',
    message: "You're making too many requests. Please slow down.",
    canRetry: true,
  },
  500: {
    title: 'Internal Server Error',
    message: 'Something went wrong on my end.',
    canRetry: true,
  },
  501: {
    title: 'Not Implemented',
    message: "The server doesn't support this functionality.",
    canRetry: false,
  },
  502: {
    title: 'Bad Gateway',
    message: 'The server received an invalid response from upstream.',
    canRetry: true,
  },
  503: {
    title: 'Service Unavailable',
    message: 'The service is temporarily unavailable.',
    canRetry: true,
  },
  504: {
    title: 'Gateway Timeout',
    message: "The server didn't respond in time.",
    canRetry: true,
  },
};

// Color schemes for different error types
const getColorScheme = (statusCode: number) => {
  if (statusCode >= 400 && statusCode < 500) {
    // Client errors - blue to purple
    return {
      gradient: 'from-blue-400 via-purple-400 to-pink-400',
      border: 'border-blue-500/20',
      button:
        'from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-blue-500/25',
      dots: 'bg-blue-400',
    };
  } else if (statusCode >= 500) {
    // Server errors - red to orange
    return {
      gradient: 'from-red-400 via-orange-400 to-yellow-400',
      border: 'border-red-500/20',
      button:
        'from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-red-500/25',
      dots: 'bg-red-400',
    };
  } else {
    // Default - neutral
    return {
      gradient: 'from-gray-400 via-gray-500 to-gray-600',
      border: 'border-gray-500/20',
      button:
        'from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 shadow-gray-500/25',
      dots: 'bg-gray-400',
    };
  }
};

export default function GenericErrorPage() {
  const params = useParams();
  const router = useRouter();
  const [statusCode, setStatusCode] = useState<number>(500);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Extract status code from URL or default to 500
    const code = Array.isArray(params?.code) ? params.code[0] : params?.code;
    const parsedCode = code ? parseInt(code, 10) : 500;

    // Validate it's a reasonable HTTP status code
    if (parsedCode >= 100 && parsedCode < 600) {
      setStatusCode(parsedCode);
    } else {
      setStatusCode(500);
    }
  }, [params]);

  const statusInfo = HTTP_STATUS_MESSAGES[statusCode] || {
    title: 'HTTP Error',
    message: 'An unexpected error occurred.',
    canRetry: true,
  };

  const colorScheme = getColorScheme(statusCode);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 opacity-15">
        <div className="absolute top-1/3 left-1/3 w-64 h-64">
          <LottieAnimation />
        </div>
      </div>

      {/* Enhanced Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Animated dots with varying sizes and positions */}
        <div
          className={`absolute top-20 left-20 w-3 h-3 ${colorScheme.dots} rounded-full animate-pulse`}
        ></div>
        <div
          className={`absolute top-32 right-24 w-2 h-2 ${colorScheme.dots} rounded-full animate-ping`}
        ></div>
        <div
          className={`absolute bottom-40 left-32 w-4 h-4 ${colorScheme.dots} rounded-full animate-bounce`}
        ></div>
        <div
          className={`absolute bottom-32 right-20 w-2 h-2 ${colorScheme.dots} rounded-full animate-pulse`}
        ></div>
        <div
          className={`absolute top-1/4 right-1/4 w-1 h-1 ${colorScheme.dots} rounded-full animate-ping`}
        ></div>
        <div
          className={`absolute bottom-1/4 left-1/4 w-3 h-3 ${colorScheme.dots} rounded-full animate-bounce`}
          style={{ animationDelay: '1s' }}
        ></div>
        <div
          className={`absolute top-3/4 right-1/3 w-2 h-2 ${colorScheme.dots} rounded-full animate-pulse`}
          style={{ animationDelay: '0.5s' }}
        ></div>

        {/* Glitch effect lines for server errors */}
        {statusCode >= 500 && (
          <>
            <div className="absolute top-1/4 left-0 w-full h-0.5 bg-red-500 opacity-30 animate-pulse"></div>
            <div className="absolute top-2/3 left-0 w-full h-0.5 bg-orange-400 opacity-20 animate-ping"></div>
          </>
        )}

        {/* Floating Code Snippets */}
        <div className="absolute top-16 right-16 text-xs text-gray-500 font-mono opacity-40 rotate-12">
          {`HTTP ${statusCode}`}
        </div>
        <div className="absolute bottom-24 left-16 text-xs text-gray-500 font-mono opacity-40 -rotate-6">
          {`status: ${statusCode}`}
        </div>

        {/* Status-specific code snippets */}
        {statusCode === 404 && (
          <>
            <div className="absolute top-1/3 right-8 text-xs text-blue-400 font-mono opacity-25 rotate-45">
              {'route.notFound()'}
            </div>
            <div className="absolute bottom-1/3 left-8 text-xs text-purple-400 font-mono opacity-25 -rotate-30">
              {'path: undefined'}
            </div>
          </>
        )}

        {statusCode >= 500 && (
          <>
            <div className="absolute top-24 right-32 text-xs text-red-400 font-mono opacity-35 rotate-6">
              {'try { ... } catch(e)'}
            </div>
            <div className="absolute bottom-40 left-24 text-xs text-orange-400 font-mono opacity-35 -rotate-12">
              {'server.error()'}
            </div>
            <div className="absolute top-1/2 left-8 text-xs text-yellow-400 font-mono opacity-25 rotate-90">
              {'500: crashed'}
            </div>
          </>
        )}

        {statusCode >= 400 && statusCode < 500 && (
          <>
            <div className="absolute top-28 left-1/2 text-xs text-blue-300 font-mono opacity-30 -rotate-15">
              {'client.error()'}
            </div>
            <div className="absolute bottom-28 right-1/3 text-xs text-purple-300 font-mono opacity-25 rotate-20">
              {'request.invalid()'}
            </div>
          </>
        )}

        {/* Additional decorative elements */}
        <div className="absolute top-1/2 right-1/4 text-lg opacity-10 animate-pulse">
          {statusCode >= 500 ? '💥' : statusCode === 404 ? '🔍' : '⚠️'}
        </div>
        <div
          className="absolute bottom-1/2 left-1/4 text-lg opacity-10 animate-bounce"
          style={{ animationDelay: '1.5s' }}
        >
          🐱
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
        {/* HTTP Cat Image */}
        <div className="mb-8">
          <div className="mb-6 flex justify-center">
            <div className="relative group">
              <Image
                src={
                  imageError
                    ? 'https://http.cat/500'
                    : `https://http.cat/${statusCode}`
                }
                alt={`${statusCode} - ${statusInfo.title} Cat`}
                width={400}
                height={300}
                className={`rounded-lg shadow-2xl border-2 transition-all duration-300 transform group-hover:scale-105 ${colorScheme.border}`}
                priority
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-current/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </div>

          <h1
            className={`text-6xl md:text-7xl font-bold bg-gradient-to-r ${colorScheme.gradient} bg-clip-text text-transparent mb-4 animate-pulse`}
          >
            {statusCode}
          </h1>
          <div
            className={`w-32 h-1 bg-gradient-to-r ${colorScheme.gradient} mx-auto mb-6 rounded-full`}
          ></div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
            {statusInfo.title}
          </h2>
          <p className="text-gray-400 text-lg mb-4">{statusInfo.message}</p>
          <p className="text-gray-500 text-sm">silly goober</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          {statusInfo.canRetry && (
            <button
              onClick={handleRetry}
              className={`px-8 py-3 bg-gradient-to-r ${colorScheme.button} text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg`}
            >
              Try Again
            </button>
          )}

          <button
            onClick={handleGoBack}
            className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            ← Go Back
          </button>

          <Link
            href="/"
            className="px-8 py-3 border border-gray-600 text-gray-300 font-semibold rounded-lg hover:border-gray-400 hover:text-white transition-all duration-200 transform hover:scale-105"
          >
            Home
          </Link>
        </div>

        {/* HTTP Cat Attribution */}
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 mb-6">
          <p className="text-sm text-gray-400 mb-2">
            <span className="font-mono">http_status({statusCode})</span>
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

        {/* Status Badge */}
        <div className="flex justify-center">
          <span
            className={`px-4 py-2 text-sm bg-gray-800/50 text-gray-300 rounded-full border border-gray-600 font-mono`}
          >
            HTTP {statusCode} • {statusInfo.title}
          </span>
        </div>
      </div>
    </div>
  );
}
