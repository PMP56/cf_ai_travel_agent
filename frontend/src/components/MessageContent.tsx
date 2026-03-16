import { motion } from "framer-motion";

interface MessageContentProps {
  content: string;
  isUser: boolean;
}

export default function MessageContent({ content, isUser }: MessageContentProps) {
  if (isUser) {
    return <p className="leading-relaxed text-sm">{content}</p>;
  }

  const lines = content.split("\n");

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.04 },
    },
  };

  const lineVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-0.5"
    >
      {lines.map((line, idx) => {
        if (line.startsWith("# ")) {
          return (
            <motion.h1
              key={idx}
              variants={lineVariants}
              className="font-display text-xl font-bold mt-4 mb-2 text-foreground tracking-tight"
            >
              {line.replace("# ", "")}
            </motion.h1>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <motion.h2
              key={idx}
              variants={lineVariants}
              className="font-display text-lg font-semibold mt-4 mb-1.5 text-foreground"
            >
              {line.replace("## ", "")}
            </motion.h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <motion.h3
              key={idx}
              variants={lineVariants}
              className="font-display text-base font-semibold mt-3 mb-1 text-foreground"
            >
              {line.replace("### ", "")}
            </motion.h3>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <motion.li
              key={idx}
              variants={lineVariants}
              className="ml-4 text-muted-foreground leading-relaxed text-sm list-disc"
            >
              {renderInlineBold(line.replace(/^[-*] /, ""))}
            </motion.li>
          );
        }
        if (line.trim().match(/^\d+\./)) {
          return (
            <motion.li
              key={idx}
              variants={lineVariants}
              className="ml-4 text-muted-foreground leading-relaxed list-decimal text-sm"
            >
              {renderInlineBold(line.replace(/^\d+\.\s*/, ""))}
            </motion.li>
          );
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <motion.p
              key={idx}
              variants={lineVariants}
              className="font-semibold text-foreground my-1.5 text-sm"
            >
              {line.replace(/\*\*/g, "")}
            </motion.p>
          );
        }
        if (line.trim() === "") {
          return <div key={idx} className="h-2" />;
        }

        return (
          <motion.p
            key={idx}
            variants={lineVariants}
            className="text-muted-foreground leading-relaxed my-0.5 text-sm"
          >
            {renderInlineBold(line)}
          </motion.p>
        );
      })}
    </motion.div>
  );
}

function renderInlineBold(text: string) {
  const boldRegex = /\*\*(.*?)\*\*/g;
  const parts = text.split(boldRegex);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {part}
      </strong>
    ) : (
      part
    )
  );
}
