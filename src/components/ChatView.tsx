import React, { useRef, useEffect, useState } from 'react';
import { Message } from '../types/chat.types';
import { WorkspaceFiles } from '../types/workspace.types';
import { AIModel } from '../types/ai.types';

import { MessageBubble } from './MessageBubble';
import { Send } from 'lucide-react';
import { useChatTools } from '../hooks/useChatTools';
import { Activity } from '../hooks/useActivity';
import { SemanticSearchBar } from './SemanticSearchBar';
import { chatService } from '../services/chatService';

interface ChatViewProps {
  chatHistory: Message[];
  setChatHistory: React.Dispatch<React.SetStateAction<Message[]>>;
  wsFiles: WorkspaceFiles;
  limit: number;
  onOpenWorkspace: (files: WorkspaceFiles) => void;
  pendingPrompt: string | null;
  setPendingPrompt: (prompt: string | null) => void;
  models: AIModel[];
  activeModelId: string;
  setActiveModelId: (id: string) => void;
  providerKeys: Record<string, string>;
  isTaskMode: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  activity: Activity[];
  setActivity: React.Dispatch<React.SetStateAction<Activity[]>>;
  setWsFiles: React.Dispatch<React.SetStateAction<WorkspaceFiles>>;
  searchContext: (query: string) => Promise<string[]>;
  aiContextFiles: Set<string>;
}

export function ChatView({
  chatHistory,
  setChatHistory,
  wsFiles,
  limit,
  onOpenWorkspace,
  pendingPrompt,
  setPendingPrompt,
  models,
  activeModelId,
  setActiveModelId,
  providerKeys,
  isTaskMode,
  iframeRef,
  activity,
  setActivity,
  setWsFiles,
  searchContext,
  aiContextFiles
}: ChatViewProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const activeModel = models.find(m => m.id === activeModelId) || models[0];
  const tools = useChatTools(wsFiles, setWsFiles, setActivity);

  const scrollToBottom = () => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading]);

  useEffect(() => {
    if (pendingPrompt && !isLoading) {
      setInput(pendingPrompt);
      setPendingPrompt(null);
      // Wait for state to update, then send
      setTimeout(() => {
        handleSend(pendingPrompt);
      }, 0);
    }
  }, [pendingPrompt, isLoading]);

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input.trim();
    if (!textToSend || isLoading) return;

    setInput('');
    
    await chatService.handleSend({
      textToSend,
      chatHistory,
      wsFiles,
      limit,
      activeModel,
      providerKeys,
      isTaskMode,
      setChatHistory,
      setActivity,
      setIsLoading,
      searchContext,
      tools
    });
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative bg-gray-50 dark:bg-[#18191a] transition-colors duration-200">
      <SemanticSearchBar onSearch={tools.semanticSearch} />
      <div ref={chatBoxRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth pb-20 md:pb-4">
        {chatHistory.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-10 text-sm">
            Selam! <strong>Recep AI</strong> devrede.<br /><br />
            {isTaskMode && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400 text-xs transition-colors duration-200">
                <strong>Görev Modu Aktif:</strong> Yapay zeka verdiğin istekleri parçalara ayırarak adım adım bir plan oluşturacak ve bunu <code>gorev_plani.md</code> dosyasına kaydederek Görev Panosunda gösterecek.
              </div>
            )}
          </div>
        )}
        {chatHistory.map(msg => (
          <MessageBubble key={msg.id} message={msg} isLoading={isLoading} />
        ))}
      </div>

      <div className="flex-none p-2 bg-white dark:bg-[#0a0a0a] border-t border-gray-200 dark:border-[#262626] flex items-center gap-2 transition-colors duration-200 z-10 w-full">
        <select 
          value={activeModelId}
          onChange={e => setActiveModelId(e.target.value)}
          className="p-2 border border-gray-200 dark:border-[#262626] rounded-lg bg-gray-50 dark:bg-[#141414] text-gray-900 dark:text-[#ededed] outline-none text-[10px] md:text-[11px] max-w-[80px] md:max-w-[120px] transition-colors duration-200"
        >
          {models.map(m => <option key={m.id} value={m.id}>{m.name.split(' ').pop()}</option>)}
        </select>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Mesaj yaz..."
          className="flex-1 p-2.5 md:p-3 border border-gray-200 dark:border-[#262626] rounded-full outline-none text-sm bg-gray-50 dark:bg-[#141414] text-gray-900 dark:text-[#ededed] transition-colors duration-200"
          autoComplete="off"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 text-white border-none w-11 h-11 rounded-full cursor-pointer flex justify-center items-center flex-shrink-0 disabled:opacity-50 transition-opacity"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
