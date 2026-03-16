import { useEffect, useRef } from "react";
import { Loader2, User, Sparkles } from "lucide-react";
import type { ChatMessage } from "../types";
import MessageContent from "./MessageContent";
import PhotoStrip from "./PhotoStrip";  // add this

interface ChatWindowProps {
  messages: ChatMessage[];
  loading: boolean;
}

export default function ChatWindow({ messages, loading }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
   <div
      className="overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 scroll-smooth"
      style={{ height: "60vh", maxHeight: "550px", minHeight: "400px" }}
    >
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex gap-2 sm:gap-4 animate-fade-in ${
            msg.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          {msg.role === "assistant" && (
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
            </div>
          )}

          <div
            className={`max-w-[80%] sm:max-w-[75%] rounded-xl sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-3 shadow-md text-sm sm:text-base ${
              msg.role === "user"
                ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white"
                : "bg-white border border-gray-200"
            }`}
          >
            <MessageContent content={msg.content} isUser={msg.role === "user"} />
            {msg.role === "assistant" && msg.photos && (  // add this
              <PhotoStrip photos={msg.photos} />
            )}
          </div>

          {msg.role === "user" && (
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center shadow-lg">
              <User className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
            </div>
          )}
        </div>
      ))}

      {loading && (
        <div className="flex gap-2 sm:gap-4 animate-fade-in">
          <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-3 shadow-md flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
            <span className="text-gray-600 text-sm sm:text-base">Crafting your travel plan...</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}