import React, { useState } from 'react';
import { Message, WorkspaceFiles } from '../types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Code, FileCode2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  if (message.isHidden) return null;

  const isUser = message.sender === 'user';

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(type);
    console.log(`Feedback for message ${message.id}: ${type}`);
    // Burada istersen bir backend'e gönderebilirsin.
  };

  const formatText = (text: string) => {
    if (!message.isRaw || isUser) return { cleanText: text, filesFound: null };

    const fileRegex = /\[DOSYA:([^\]]+)\]([\s\S]*?)\[\/DOSYA\]/g;
    let match;
    const filesFound: WorkspaceFiles = {};
    let hasFiles = false;

    while ((match = fileRegex.exec(text)) !== null) {
      hasFiles = true;
      filesFound[match[1].trim()] = match[2].trim();
    }

    if (hasFiles) {
      const cleanText = text.replace(/\[DOSYA:([^\]]+)\]([\s\S]*?)\[\/DOSYA\]/g, '').trim();
      return { cleanText, filesFound };
    }

    return { cleanText: text, filesFound: null };
  };

  const { cleanText, filesFound } = formatText(message.text);

  return (
    <div className={cn(
      "max-w-[95%] p-3 rounded-2xl text-[14px] leading-relaxed shadow-sm break-words relative transition-colors duration-200",
      isUser 
        ? "self-end bg-blue-600 text-white rounded-br-sm" 
        : "self-start bg-white dark:bg-[#242526] text-gray-900 dark:text-gray-100 rounded-bl-sm w-full border border-gray-100 dark:border-[#333]"
    )}>
      {message.thinking && (
        <div className="mb-2 p-2 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#262626] rounded-lg text-[11px] text-gray-500 dark:text-[#a3a3a3] font-mono transition-colors duration-200">
          <div className="font-bold text-blue-600 dark:text-[#3b82f6] mb-1">Düşünce Süreci:</div>
          {message.thinking}
        </div>
      )}
      {isUser ? (
        <div className="whitespace-pre-wrap">{cleanText}</div>
      ) : (
        <div className="markdown-body prose dark:prose-invert max-w-none text-sm">
          <Markdown remarkPlugins={[remarkGfm]}>{cleanText}</Markdown>
        </div>
      )}

      {filesFound && (
        <div className="mt-3 bg-gray-50 dark:bg-[#18191a] border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col gap-2 transition-colors duration-200">
          <div className="font-semibold flex items-center gap-2 text-[13px] text-gray-900 dark:text-gray-100">
            <FileCode2 className="w-4 h-4 text-green-500" />
            <span>Dosyalar güncellendi: {Object.keys(filesFound).join(', ')}</span>
          </div>
        </div>
      )}

      {!isUser && (
        <div className="flex gap-2 mt-2 opacity-50 hover:opacity-100 transition-opacity">
          <button 
            onClick={() => handleFeedback('up')}
            className={cn("p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200", feedback === 'up' && "text-green-500")}
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleFeedback('down')}
            className={cn("p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200", feedback === 'down' && "text-red-500")}
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
