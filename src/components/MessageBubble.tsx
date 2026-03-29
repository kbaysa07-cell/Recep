import React, { useState } from 'react';
import { Message } from '../types/chat.types';
import { WorkspaceFiles } from '../types/workspace.types';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Code, FileCode2, Bot, FileText, Terminal, Search, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Activity } from '../hooks/useActivity';

interface MessageBubbleProps {
  message: Message;
  isLoading?: boolean;
}

export function MessageBubble({ message, isLoading }: MessageBubbleProps) {
  const [isActivityExpanded, setIsActivityExpanded] = useState(false);

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

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  const hasActivity = message.activity && message.activity.length > 0;
  const isGenerating = !isUser && !message.text && hasActivity && (isLoading ?? true);

  return (
    <div className={cn(
      "max-w-[95%] p-3 rounded-2xl text-[14px] leading-relaxed shadow-sm break-words relative transition-colors duration-200",
      isUser 
        ? "self-end bg-blue-600 text-white rounded-br-sm" 
        : "self-start bg-white dark:bg-[#242526] text-gray-900 dark:text-gray-100 rounded-bl-sm w-full border border-gray-100 dark:border-[#333]"
    )}>
      {!isUser && hasActivity && (
        <div className="mb-3 border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden bg-gray-50 dark:bg-[#1a1a1a]">
          <button 
            onClick={() => setIsActivityExpanded(!isActivityExpanded)}
            className="w-full flex items-center justify-between p-2 text-[12px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors"
          >
            <div className="flex items-center gap-2">
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /> : <Bot className="w-3.5 h-3.5 text-gray-500" />}
              <span>{isGenerating ? 'Düşünüyor...' : 'Düşünce Süreci'}</span>
              <span className="text-[10px] bg-gray-200 dark:bg-[#333] px-1.5 py-0.5 rounded-full ml-1">
                {message.activity!.length}
              </span>
            </div>
            {isActivityExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          {isActivityExpanded && (
            <div className="p-2 border-t border-gray-200 dark:border-[#333] max-h-[250px] overflow-y-auto font-mono text-[11px]">
              <div className="relative pl-3 border-l border-gray-300 dark:border-[#444] ml-2 space-y-3 py-1">
                {message.activity!.map((item, index) => (
                  <div key={index} className="relative group flex items-start gap-2">
                    <div className={cn(
                      "absolute -left-[17px] top-1 w-2 h-2 rounded-full border border-white dark:border-[#1a1a1a]",
                      item.type === 'thought' ? "bg-purple-500" :
                      item.type === 'file' ? "bg-orange-500" :
                      item.type === 'terminal' ? "bg-green-500" : "bg-blue-500"
                    )}></div>
                    <div className="mt-0.5 opacity-70">
                      {item.type === 'thought' && <Bot className="w-3 h-3 text-purple-500" />}
                      {item.type === 'file' && <FileText className="w-3 h-3 text-orange-500" />}
                      {item.type === 'terminal' && <Terminal className="w-3 h-3 text-green-500" />}
                      {item.type === 'web' && <Search className="w-3 h-3 text-blue-500" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-600 dark:text-gray-400">{item.message}</span>
                      {item.timestamp && (
                        <span className="text-[9px] text-gray-400 dark:text-gray-600">{formatTime(item.timestamp)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {message.thinking && !hasActivity && (
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
    </div>
  );
}
