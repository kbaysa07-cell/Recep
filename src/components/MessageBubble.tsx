import React from 'react';
import { Message, WorkspaceFiles } from '../types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Code, FileCode2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.isHidden) return null;

  const isUser = message.sender === 'user';

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
      "max-w-[95%] p-3 rounded-2xl text-[14px] leading-relaxed shadow-sm break-words",
      isUser 
        ? "self-end bg-blue-600 text-white rounded-br-sm" 
        : "self-start bg-white dark:bg-[#242526] text-gray-900 dark:text-gray-100 rounded-bl-sm w-full"
    )}>
      {message.thinking && (
        <div className="mb-2 p-2 bg-[#141414] border border-[#262626] rounded-lg text-[11px] text-[#a3a3a3] font-mono">
          <div className="font-bold text-[#3b82f6] mb-1">Düşünce Süreci:</div>
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
        <div className="mt-3 bg-gray-50 dark:bg-[#18191a] border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col gap-2">
          <div className="font-semibold flex items-center gap-2 text-[13px] text-gray-900 dark:text-gray-100">
            <FileCode2 className="w-4 h-4 text-green-500" />
            <span>Dosyalar güncellendi: {Object.keys(filesFound).join(', ')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
