import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, ChevronDown, MapPin, Clock, Loader2 } from "lucide-react";
import type { TravelPlan, Highlight } from "../types";

interface MessageContentProps {
  content: string;
  plan?: TravelPlan;
  isUser: boolean;
  onReplaceHighlight?: (day: string, currentTitle: string, replaceWith: Highlight) => void;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

function groupByDay(highlights: Highlight[]): Map<string, Highlight[]> {
  return highlights.reduce((map, h) => {
    const existing = map.get(h.date) ?? [];
    map.set(h.date, [...existing, h]);
    return map;
  }, new Map<string, Highlight[]>());
}

// Rotate through accent colors per day for visual variety
const dayPalettes = [
  {
    dot: "bg-primary text-primary-foreground",
    ring: "ring-primary/20",
    badge: "bg-primary/10 text-primary",
    cardBorder: "border-l-primary/60",
  },
  {
    dot: "bg-violet-500 text-white",
    ring: "ring-violet-500/20",
    badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    cardBorder: "border-l-violet-500/60",
  },
  {
    dot: "bg-amber-500 text-white",
    ring: "ring-amber-500/20",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    cardBorder: "border-l-amber-500/60",
  },
  {
    dot: "bg-teal-500 text-white",
    ring: "ring-teal-500/20",
    badge: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
    cardBorder: "border-l-teal-500/60",
  },
  {
    dot: "bg-rose-500 text-white",
    ring: "ring-rose-500/20",
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    cardBorder: "border-l-rose-500/60",
  },
];

export default function MessageContent({ content, plan, isUser, onReplaceHighlight }: MessageContentProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [replacingKey, setReplacingKey] = useState<string | null>(null);

  async function handleReplace(day: string, currentTitle: string, cardKey: string) {
    if (!onReplaceHighlight || !plan) return;

    console.log("plan.destination:", plan.destination); // ← add this

    setReplacingKey(cardKey);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT || "http://localhost:8787"}/api/replace-highlight`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: plan.destination,
            day,
            currentTitle,
            allHighlights: plan.highlights.map((h) => ({ title: h.title, date: h.date })),
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to replace highlight");
      const data = await res.json() as { highlight: Highlight };
      onReplaceHighlight(day, currentTitle, data.highlight);
    } catch (err) {
      console.error("Replace failed:", err);
    } finally {
      setReplacingKey(null);
    }
  }

  if (isUser) {
    return <p className="leading-relaxed text-sm">{content}</p>;
  }

  if (plan) {
    const grouped = groupByDay(plan.highlights);
    const days = Array.from(grouped.entries());

    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
        <motion.p variants={itemVariants} className="text-2xl font-bold font-display text-muted-foreground mb-2">
          {plan.destination}
        </motion.p>
        <motion.p variants={itemVariants} className="text-sm text-muted-foreground leading-relaxed">
          {plan.destinationOverview}
        </motion.p>

        {/* Timeline */}
        {days.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-0">
            <h2 className="font-display text-sm font-semibold text-foreground uppercase tracking-widest mb-4">
              Highlights
            </h2>

            <div className="relative">
              {/* Gradient vertical spine */}
              <div className="absolute left-[11px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary/40 via-border to-transparent rounded-full" />

              <div className="space-y-0">
                {days.map(([day, items], dayIdx) => {
                  const palette = dayPalettes[dayIdx % dayPalettes.length];
                  const isLastDay = dayIdx === days.length - 1;

                  return (
                    <motion.div key={day} variants={itemVariants} className="relative">
                      {/* Day header */}
                      <div className="flex items-center gap-3 mb-3 relative">
                        {/* Pulsing day dot */}
                        <div className="relative z-10 flex-shrink-0">
                          <div className={`w-6 h-6 rounded-full ${palette.dot} flex items-center justify-center ring-4 ${palette.ring} ring-offset-2 ring-offset-background shadow-sm`}>
                            <MapPin className="w-3 h-3 text-primary-foreground" />
                          </div>
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${palette.badge}`}>
                          {day}
                        </span>
                      </div>

                      {/* Highlights for this day */}
                      <div className={`ml-[11px] pl-6 space-y-2 ${isLastDay ? "pb-2" : "pb-6"} border-l-0`}>
                        {items.map((highlight, itemIdx) => {
                          const key = `${dayIdx}-${itemIdx}`;
                          const isOpen = openKey === key;

                          return (
                            <motion.div
                              key={itemIdx}
                              variants={itemVariants}
                              whileHover={{ x: 2 }}
                              transition={{ duration: 0.15 }}
                              className="group relative"
                            >
                              {/* Horizontal connector line */}
                              <div className="absolute left-[-24px] top-[18px] w-5 h-px bg-border" />
                              {/* Connector dot */}
                              <div className="absolute left-[-27px] top-[15px] w-[7px] h-[7px] rounded-full bg-border group-hover:bg-primary transition-colors duration-200" />

                              <div className="rounded-xl border border-border bg-muted/30 overflow-hidden hover:border-primary/30 hover:bg-muted/50 hover:shadow-sm transition-all duration-200">
                                {/* Accordion trigger */}
                                <button
                                  onClick={() => setOpenKey(isOpen ? null : key)}
                                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                                >
                                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <Clock className="w-3.5 h-3.5 text-primary/50 flex-shrink-0" />
                                    <span className="text-sm font-medium text-foreground leading-snug truncate">
                                      {highlight.title}
                                    </span>
                                  </div>
                                  <motion.div
                                    animate={{ rotate: isOpen ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                  </motion.div>
                                </button>

                                {/* Accordion body */}
                                <AnimatePresence initial={false}>
                                  {isOpen && (
                                    <motion.div
                                      key="body"
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-4 pb-3.5 pt-1 border-t border-border/60 space-y-2.5">
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                          {highlight.description}
                                        </p>
                                        <button
                                          onClick={() => handleReplace(highlight.date, highlight.title, key)}
                                          disabled={replacingKey === key}
                                          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {replacingKey === key
                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                            : <RefreshCw className="w-3 h-3" />
                                          }
                                          {replacingKey === key ? "Finding alternative…" : "Replace this activity"}
                                        </button>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Optional Add-ons */}
        {plan.optionalAddOns && (
          <motion.div variants={itemVariants} className="space-y-1.5">
            <h2 className="font-display text-sm font-semibold text-foreground uppercase tracking-widest">
              Optional Add-ons
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {plan.optionalAddOns}
            </p>
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Fallback: plain markdown renderer
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-0.5">
      {content.split("\n").map((line, idx) => {
        if (line.startsWith("# "))
          return <motion.h1 key={idx} variants={itemVariants} className="font-display text-xl font-bold mt-4 mb-2 text-foreground tracking-tight">{line.replace("# ", "")}</motion.h1>;
        if (line.startsWith("## "))
          return <motion.h2 key={idx} variants={itemVariants} className="font-display text-lg font-semibold mt-4 mb-1.5 text-foreground">{line.replace("## ", "")}</motion.h2>;
        if (line.startsWith("### "))
          return <motion.h3 key={idx} variants={itemVariants} className="font-display text-base font-semibold mt-3 mb-1 text-foreground">{line.replace("### ", "")}</motion.h3>;
        if (line.startsWith("- ") || line.startsWith("* "))
          return <motion.li key={idx} variants={itemVariants} className="ml-4 text-muted-foreground leading-relaxed text-sm list-disc">{renderInlineBold(line.replace(/^[-*] /, ""))}</motion.li>;
        if (line.trim().match(/^\d+\./))
          return <motion.li key={idx} variants={itemVariants} className="ml-4 text-muted-foreground leading-relaxed list-decimal text-sm">{renderInlineBold(line.replace(/^\d+\.\s*/, ""))}</motion.li>;
        if (line.startsWith("**") && line.endsWith("**"))
          return <motion.p key={idx} variants={itemVariants} className="font-semibold text-foreground my-1.5 text-sm">{line.replace(/\*\*/g, "")}</motion.p>;
        if (line.trim() === "")
          return <div key={idx} className="h-2" />;
        return <motion.p key={idx} variants={itemVariants} className="text-muted-foreground leading-relaxed my-0.5 text-sm">{renderInlineBold(line)}</motion.p>;
      })}
    </motion.div>
  );
}

function renderInlineBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : part
  );
}
