import { useEffect, useRef, useMemo } from "react";
import { Loader2, User, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage } from "../types";
import MessageContent from "./MessageContent";
import PhotoGallery from "./PhotoGallery";

interface ChatWindowProps {
  messages: ChatMessage[];
  loading: boolean;
  isGalleryVisible: boolean;
}

export default function ChatWindow({
  messages,
  loading,
  isGalleryVisible,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const allPhotos = useMemo(
    () => messages.flatMap((msg) => msg.photos || []),
    [messages]
  );

  const hasPhotos = allPhotos.length > 0;
  const showGallery = hasPhotos && isGalleryVisible;

  return (
    <div className="flex w-full h-full overflow-hidden">
      {/* Chat Pane — flex-1 so it fills remaining space after the sidebar */}
      <motion.div
        layout
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="flex-1 overflow-y-auto bg-card"
        style={{ minWidth: 0 }}
      >
        <div className="max-w-3xl mx-auto px-6 pt-10 pb-28 space-y-6">
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted border border-[rgba(0,0,0,0.06)]"
                }`}
              >
                <MessageContent
                  content={msg.content}
                  isUser={msg.role === "user"}
                />
              </div>

              {msg.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center shadow-sm">
                  <User className="w-4 h-4 text-secondary-foreground" />
                </div>
              )}
            </motion.div>
          ))}

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-muted border border-[rgba(0,0,0,0.06)] rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                <span className="text-muted-foreground text-sm">
                  Crafting your travel plan…
                </span>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} className="h-4" />
        </div>
      </motion.div>

      {/* Gallery Sidebar — fixed width, animated in/out */}
      <AnimatePresence mode="popLayout">
        {showGallery && (
          <motion.aside
            key="gallery"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "25%", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="hidden lg:block border-l border-[rgba(0,0,0,0.06)] bg-background overflow-hidden flex-shrink-0"
          >
            <div className="w-full h-full overflow-y-auto">
              <PhotoGallery photos={allPhotos} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
