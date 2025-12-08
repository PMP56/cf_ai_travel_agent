function Loader() {
  return (
    <div className="flex justify-start">
      <div className="bg-white rounded-2xl px-6 py-4 shadow-md border border-gray-200">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          ></div>
          <span className="ml-2 text-gray-600">Planning your trip...</span>
        </div>
      </div>
    </div>
  );
}

export default Loader;
