interface MessageContentProps {
  content: string;
  isUser: boolean;
}

export default function MessageContent({ content, isUser }: MessageContentProps) {
  if (isUser) {
    return <p className="text-white leading-relaxed text-sm sm:text-base">{content}</p>;
  }

  const lines = content.split('\n');

  return (
    <div className="prose prose-sm max-w-none text-gray-800">
      {lines.map((line, idx) => {
        if (line.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-lg sm:text-2xl font-bold mt-3 sm:mt-4 mb-2 text-gray-900">
              {line.replace('# ', '')}
            </h1>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-base sm:text-xl font-semibold mt-2 sm:mt-3 mb-1 sm:mb-2 text-gray-800">
              {line.replace('## ', '')}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-sm sm:text-lg font-semibold mt-2 mb-1 text-gray-800">
              {line.replace('### ', '')}
            </h3>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <li key={idx} className="ml-3 sm:ml-4 text-gray-700 leading-relaxed text-sm sm:text-base">
              {line.replace('- ', '')}
            </li>
          );
        }
        if (line.startsWith('* ')) {
          return (
            <li key={idx} className="ml-3 sm:ml-4 text-gray-700 leading-relaxed text-sm sm:text-base">
              {line.replace('* ', '')}
            </li>
          );
        }
        if (line.trim().match(/^\d+\./)) {
          return (
            <li key={idx} className="ml-3 sm:ml-4 text-gray-700 leading-relaxed list-decimal text-sm sm:text-base">
              {line.replace(/^\d+\.\s*/, '')}
            </li>
          );
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <p key={idx} className="font-bold text-gray-900 my-1 sm:my-2 text-sm sm:text-base">
              {line.replace(/\*\*/g, '')}
            </p>
          );
        }
        if (line.trim() === '') {
          return <div key={idx} className="h-1 sm:h-2" />;
        }

        const boldRegex = /\*\*(.*?)\*\*/g;
        const parts = line.split(boldRegex);

        return (
          <p key={idx} className="text-gray-700 leading-relaxed my-0.5 sm:my-1 text-sm sm:text-base">
            {parts.map((part, i) =>
              i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900">{part}</strong> : part
            )}
          </p>
        );
      })}
    </div>
  );
}
