import { useState } from "react";
import { Plane, MapPin, Compass } from "lucide-react";
import ChatWindow from "./components/ChatWindow";
import InputBox from "./components/InputBox";
import type { ChatMessage, TravelAPIResponse } from "./types";

const API_ENDPOINT =
  import.meta.env.VITE_API_ENDPOINT || "http://localhost:8787";

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI Travel Concierge. Tell me about your dream trip and I'll help you plan it!",
    },
  ]);

  const [loading, setLoading] = useState<boolean>(false);
  const [userId] = useState(() => {
    const saved = localStorage.getItem("userId");
    if (saved) return saved;

    const newId = `user_${crypto.randomUUID()}`;
    localStorage.setItem("userId", newId);
    return newId;
  });

  const handleSendMessage = async (message: string) => {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);

    try {
      const response = await fetch(`${API_ENDPOINT}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message }),
      });

      if (!response.ok) throw new Error("Failed to generate travel plan");

      const data: TravelAPIResponse = await response.json();

      const aiMarkdown = data.plan.response;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiMarkdown,
        },
      ]);
    } catch (err) {
      console.error("Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const isEmpty = messages.length === 1;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 px-2 sm:px-4 py-4 sm:py-8 gap-4 sm:gap-6">
      <div className="w-full max-w-4xl flex flex-col h-screen sm:h-auto">
        <header className="text-center mb-4 sm:mb-8 flex-0">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="relative">
              <Plane className="w-8 sm:w-12 text-blue-600 animate-pulse" />
              <MapPin className="w-4 sm:w-5 text-teal-500 absolute -bottom-1 -right-1" />
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-700 to-teal-600 bg-clip-text text-transparent leading-tight">
              AI Travel Concierge
            </h1>
          </div>
          <p className="text-gray-600 text-sm sm:text-base lg:text-lg font-medium px-2">
            Plan smarter, travel better
          </p>
        </header>

        <div className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-200 flex flex-col flex-1 sm:flex-none sm:max-h-none">
          {isEmpty ? (
            <div className="flex-1 sm:h-[550px] flex flex-col items-center justify-center text-center px-4 sm:px-8 py-6 sm:py-8">
              <div className="mb-4 sm:mb-6 relative flex-0">
                <Compass className="w-16 sm:w-20 text-blue-500 animate-spin-slow" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
                Where would you like to go?
              </h2>
              <p className="text-gray-600 max-w-md text-sm sm:text-base lg:text-lg mb-6 sm:mb-8">
                Tell me your dream destination, trip style, or budget and I'll create a personalized travel plan just for you.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-2xl px-2 sm:px-0">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-blue-200">
                  <MapPin className="w-5 sm:w-6 text-blue-600 mb-1 sm:mb-2" />
                  <h3 className="font-semibold text-gray-800 mb-0.5 sm:mb-1 text-sm sm:text-base">Destinations</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Explore cities and countries</p>
                </div>
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-teal-200">
                  <Compass className="w-5 sm:w-6 text-teal-600 mb-1 sm:mb-2" />
                  <h3 className="font-semibold text-gray-800 mb-0.5 sm:mb-1 text-sm sm:text-base">Activities</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Find things to do</p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-slate-200">
                  <Plane className="w-5 sm:w-6 text-slate-600 mb-1 sm:mb-2" />
                  <h3 className="font-semibold text-gray-800 mb-0.5 sm:mb-1 text-sm sm:text-base">Itineraries</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Day-by-day planning</p>
                </div>
              </div>
            </div>
          ) : (
            <ChatWindow messages={messages} loading={loading} />
          )}

          <InputBox onSend={handleSendMessage} disabled={loading} />
        </div>

        <footer className="text-center text-xs sm:text-sm text-gray-500 mt-4 sm:mt-6 flex-0">
          Built with Cloudflare Workers & Llama 3.3
        </footer>
      </div>
    </div>
  );
}
