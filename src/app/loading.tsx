export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex space-x-2">
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
        <div
          className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"
          style={{ animationDelay: '0.2s' }}
        ></div>
        <div
          className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"
          style={{ animationDelay: '0.4s' }}
        ></div>
      </div>
    </div>
  );
}
