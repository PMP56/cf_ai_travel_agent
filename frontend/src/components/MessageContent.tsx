interface MessageContentProps {
  content: string;
  isUser: boolean;
}

export default function MessageContent({
  content,
  isUser,
}: MessageContentProps) {
  if (isUser) {
    return (
      <p className="text-primary-foreground leading-relaxed text-sm">
        {content}
      </p>
    );
  }

  const lines = content.split("\n");

  return (
    <div className="prose prose-sm max-w-none text-foreground">
      {lines.map((line, idx) => {
        if (line.startsWith("# ")) {
          return (
            <h1
              key={idx}
              className="text-xl font-semibold mt-4 mb-2 text-foreground tracking-tight"
            >
              {line.replace("# ", "")}
            </h1>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2
              key={idx}
              className="text-base font-semibold mt-3 mb-1.5 text-foreground"
            >
              {line.replace("## ", "")}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3
              key={idx}
              className="text-sm font-semibold mt-2 mb-1 text-foreground"
            >
              {line.replace("### ", "")}
            </h3>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <li
              key={idx}
              className="ml-4 text-muted-foreground leading-relaxed text-sm"
            >
              {line.replace(/^[-*] /, "")}
            </li>
          );
        }
        if (line.trim().match(/^\d+\./)) {
          return (
            <li
              key={idx}
              className="ml-4 text-muted-foreground leading-relaxed list-decimal text-sm"
            >
              {line.replace(/^\d+\.\s*/, "")}
            </li>
          );
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={idx} className="font-semibold text-foreground my-1.5 text-sm">
              {line.replace(/\*\*/g, "")}
            </p>
          );
        }
        if (line.trim() === "") {
          return <div key={idx} className="h-2" />;
        }

        const boldRegex = /\*\*(.*?)\*\*/g;
        const parts = line.split(boldRegex);

        return (
          <p
            key={idx}
            className="text-muted-foreground leading-relaxed my-0.5 text-sm"
          >
            {parts.map((part, i) =>
              i % 2 === 1 ? (
                <strong key={i} className="font-semibold text-foreground">
                  {part}
                </strong>
              ) : (
                part
              )
            )}
          </p>
        );
      })}
    </div>
  );
}
