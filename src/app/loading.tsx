import LottieAnimation from '@/components/LottieAnimation';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/3 left-1/3 w-64 h-64">
          <LottieAnimation />
        </div>
      </div>
      
      {/* Decorative Loading Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
        <div className="absolute top-32 right-24 w-1 h-1 bg-purple-400 rounded-full animate-pulse"></div>
        <div className="absolute bottom-40 left-32 w-3 h-3 bg-green-400 rounded-full animate-bounce"></div>
        <div className="absolute bottom-32 right-20 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
        
        {/* Loading Code Snippets */}
        <div className="absolute top-16 right-16 text-xs text-gray-500 font-mono opacity-30 animate-pulse">
          {'await fetch()...'}
        </div>
        <div className="absolute bottom-24 left-16 text-xs text-gray-500 font-mono opacity-30 animate-pulse">
          {'loading...'}
        </div>
      </div>

      {/* Main Loading Content */}
      <div className="text-center relative z-10">
        {/* Loading Spinner */}
        <div className="mb-8">
          <div className="relative">
            {/* Outer spinning ring */}
            <div className="w-16 h-16 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            {/* Inner pulsing dot */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
          </div>
          
          {/* Animated dots */}
          <div className="flex justify-center space-x-2 mb-6">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
            <div 
              className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
              style={{ animationDelay: '0.1s' }}
            ></div>
            <div 
              className="w-3 h-3 bg-pink-500 rounded-full animate-bounce"
              style={{ animationDelay: '0.2s' }}
            ></div>
          </div>
        </div>

        {/* Loading Text */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2 animate-pulse">
            Loading...
          </h2>
          <p className="text-gray-400 text-sm">
            Preparing something awesome for you
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mt-8 w-64 mx-auto">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>

        {/* Tech Stack Hint */}
        <div className="mt-8 flex justify-center space-x-2 opacity-50">
          <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30 animate-pulse">
            Next.js
          </span>
          <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30 animate-pulse">
            React
          </span>
        </div>
      </div>
    </div>
  );
}
