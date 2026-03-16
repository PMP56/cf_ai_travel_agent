import { useState } from "react";
import { Plane, PanelRight } from "lucide-react";
import ChatWindow from "./components/ChatWindow";
import InputBox from "./components/InputBox";
import WelcomeScreen from "./components/WelcomeScreen";
import type { ChatMessage, TravelAPIResponse } from "./types";

const API_ENDPOINT =
  import.meta.env.VITE_API_ENDPOINT || "http://localhost:8787";

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI Travel Guide. Tell me about your dream trip and I'll help you plan it!",
    },
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isGalleryVisible, setIsGalleryVisible] = useState(true);
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
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.plan.response,
          photos: data.photos ?? [],
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
  const hasPhotos = messages.some((m) => m.photos && m.photos.length > 0);

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between bg-card shadow-[0_1px_0_0_rgba(0,0,0,0.06)] z-50 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
            <Plane className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight text-foreground">
            Travel Agent
          </span>
        </div>

        {!isEmpty && hasPhotos && (
          <button
            onClick={() => setIsGalleryVisible(!isGalleryVisible)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <PanelRight
              className={`w-4 h-4 transition-colors ${
                isGalleryVisible ? "text-primary" : ""
              }`}
            />
            {isGalleryVisible ? "Hide Gallery" : "Show Gallery"}
          </button>
        )}
      </header>

      {/* Main area */}
      <main className="flex-1 flex overflow-hidden relative">
        {isEmpty ? (
          <WelcomeScreen />
        ) : (
          <ChatWindow
            messages={messages}
            loading={loading}
            isGalleryVisible={isGalleryVisible}
          />
        )}
      </main>

      <InputBox onSend={handleSendMessage} disabled={loading} />
    </div>
  );
}
