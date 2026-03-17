import { MapPin, Compass, Plane, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const suggestions = [
  { label: "🗼 7 days in Japan", prompt: "Plan a 7-day trip to Japan for two people, mix of culture and nature" },
  { label: "🏖️ Bali on a budget", prompt: "Plan a budget trip to Bali for 10 days under $1500" },
  { label: "🍕 Weekend in Rome", prompt: "Plan a romantic weekend trip to Rome, Italy" },
  { label: "🏔️ Patagonia trek", prompt: "Plan a 2-week hiking adventure in Patagonia" },
  { label: "🎭 New York City", prompt: "Plan 5 days in New York City for first-time visitors" },
  { label: "🌅 Santorini escape", prompt: "Plan a luxury 5-day escape to Santorini, Greece" },
];

const features = [
  { icon: MapPin, title: "Destinations", desc: "Explore cities & countries" },
  { icon: Compass, title: "Activities", desc: "Find things to do" },
  { icon: Plane, title: "Itineraries", desc: "Day-by-day planning" },
];

interface WelcomeScreenProps {
  onSend: (message: string) => void;
}

export default function WelcomeScreen({ onSend }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pb-32 overflow-y-auto relative select-none">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/4 blur-3xl" />
      </div>

      {/* Hero icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.05 }}
        className="mb-6 relative z-10"
      >
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl scale-150" />
          <div className="relative w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-xl">
            <Compass className="w-10 h-10 text-primary-foreground" />
          </div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
            style={{ transformOrigin: "center" }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-secondary rounded-full shadow-md" />
          </motion.div>
        </div>
      </motion.div>

      {/* Heading */}
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
        className="font-display text-4xl font-bold tracking-tight text-foreground mb-3 relative z-10"
      >
        Where shall we go?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5, ease: "easeOut" }}
        className="text-muted-foreground max-w-sm text-base mb-8 leading-relaxed relative z-10"
      >
        Tell me your dream destination and I'll craft a personalized travel plan with visual inspiration.
      </motion.p>

      {/* Suggestion chips */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45, ease: "easeOut" }}
        className="flex flex-wrap justify-center gap-2 mb-10 max-w-xl relative z-10"
      >
        {suggestions.map((s, i) => (
          <motion.button
            key={s.label}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06, duration: 0.1, ease: "easeOut" }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSend(s.prompt)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-background border border-border text-sm font-medium text-foreground shadow-sm hover:shadow-md hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
            {s.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Feature cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.45, ease: "easeOut" }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl relative z-10"
      >
        {features.map(({ icon: Icon, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.08, duration: 0.35, ease: "easeOut" }}
            className="bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-border shadow-sm flex flex-col items-center text-center gap-2"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
