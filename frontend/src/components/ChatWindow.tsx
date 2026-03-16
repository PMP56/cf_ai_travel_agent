import { useEffect, useRef, useMemo } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage } from "../types";
import MessageContent from "./MessageContent";
import PhotoGallery from "./PhotoGallery";

interface ChatWindowProps {
  messages: ChatMessage[];
  loading: boolean;
  isGalleryVisible: boolean;
}

export default function ChatWindow({ messages, loading, isGalleryVisible }: ChatWindowProps) {
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
      {/* Chat Pane */}
      <motion.div
        layout
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="flex-1 overflow-y-auto"
        style={{ minWidth: 0 }}
      >
        <div className="max-w-[700px] mx-auto px-6 pt-10 pb-32 space-y-5">
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
                delay: idx === messages.length - 1 ? 0.1 : 0,
              }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm mt-1">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
              )}

              {msg.role === "user" ? (
                <div className="max-w-[75%] px-5 py-3 rounded-2xl rounded-br-md bg-accent text-accent-foreground shadow-sm">
                  <p className="leading-relaxed text-sm font-medium">{msg.content}</p>
                </div>
              ) : (
                <div className="flex-1 max-w-[90%] bg-background border border-border rounded-xl px-6 py-5 shadow-[0_1px_3px_0_hsl(var(--primary)/0.04),0_0_0_1px_hsl(var(--border))]">
                  <MessageContent content={msg.content} isUser={false} />
                </div>
              )}
            </motion.div>
          ))}

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-background border border-border rounded-xl px-6 py-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                  <span className="text-muted-foreground text-sm italic">
                    Crafting your travel plan…
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} className="h-4" />
        </div>
      </motion.div>

      {/* Gallery Sidebar */}
      <AnimatePresence mode="popLayout">
        {showGallery && (
          <motion.aside
            key="gallery"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "28%", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="hidden lg:block border-l border-border bg-muted/30 overflow-hidden flex-shrink-0"
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
