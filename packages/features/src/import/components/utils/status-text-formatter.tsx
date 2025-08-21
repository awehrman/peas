import React from "react";

export function formatStatusText(text: string): React.ReactNode {
  // Split the text by asterisks and convert to JSX
  const parts = text.split(/(\*[^*]+\*)/);
  
  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith('*') && part.endsWith('*')) {
          // Remove the asterisks and apply italic styling
          const content = part.slice(1, -1);
          return <span key={index} className="italic">{content}</span>;
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
