import React, { useRef, useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import { Message, WorkspaceFiles, AIModel } from '../types';
import { MessageBubble } from './MessageBubble';
import { Send, AlertTriangle } from 'lucide-react';
import { sendMessageToAI } from '../lib/gemini';
import { generateId } from '../lib/utils';

interface ChatViewProps {
  chatHistory: Message[];
  setChatHistory: React.Dispatch<React.SetStateAction<Message[]>>;
  wsFiles: WorkspaceFiles;
  aiContextFiles: Set<string>;
  limit: number;
  onOpenWorkspace: (files: WorkspaceFiles) => void;
  pendingPrompt: string | null;
  setPendingPrompt: (prompt: string | null) => void;
  models: AIModel[];
  activeModelId: string;
  setActiveModelId: (id: string) => void;
  isTaskMode: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement>;
}

export function ChatView({
  chatHistory,
  setChatHistory,
  wsFiles,
  aiContextFiles,
  limit,
  onOpenWorkspace,
  pendingPrompt,
  setPendingPrompt,
  models,
  activeModelId,
  setActiveModelId,
  isTaskMode,
  iframeRef
}: ChatViewProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const activeModel = models.find(m => m.id === activeModelId) || models[0];

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

  const handleFunctionCall = async (functionCall: any) => {
    if (functionCall.name === 'takeScreenshot') {
      if (iframeRef.current && iframeRef.current.contentDocument) {
        const canvas = await html2canvas(iframeRef.current.contentDocument.body);
        const dataUrl = canvas.toDataURL('image/png');
        return dataUrl;
      }
    }
    if (functionCall.name === 'runVisualDiagnostic') {
      if (iframeRef.current && iframeRef.current.contentDocument) {
        const canvas = await html2canvas(iframeRef.current.contentDocument.body);
        const dataUrl = canvas.toDataURL('image/png');
        return dataUrl;
      }
    }
    return null;
  };

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input.trim();
    if (!textToSend || isLoading) return;

    const userMsg: Message = {
      id: generateId(),
      text: textToSend,
      sender: 'user',
      isRaw: false,
      isHidden: false,
    };

    setChatHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      let replyText = await sendMessageToAI(
        [...chatHistory, userMsg],
        userMsg.text,
        wsFiles,
        aiContextFiles,
        limit,
        activeModel,
        isTaskMode
      );
      
      // Handle function calls if any
      if (replyText.startsWith('{') && replyText.includes('functionCalls')) {
          const parsed = JSON.parse(replyText);
          for (const call of parsed.functionCalls) {
              const result = await handleFunctionCall(call);
              // For simplicity, we'll just append the result to the conversation
              replyText = `Tool sonucu (${call.name}): ${result}`;
          }
      }

      // Parse files and auto-apply to workspace
      const fileRegex = /\[DOSYA:([^\]]+)\]([\s\S]*?)\[\/DOSYA\]/g;
      let match;
      const filesFound: any = {};
      let hasFiles = false;

      while ((match = fileRegex.exec(replyText)) !== null) {
        hasFiles = true;
        filesFound[match[1].trim()] = match[2].trim();
      }

      if (hasFiles) {
        onOpenWorkspace(filesFound);
      }

      const botMsg: Message = {
        id: generateId(),
        text: replyText,
        sender: 'model',
        isRaw: true,
        isHidden: false,
      };

      setChatHistory(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: generateId(),
        text: "Bağlantı hatası veya API anahtarı geçersiz.",
        sender: 'model',
        isRaw: false,
        isHidden: false,
      };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const visibleMessagesCount = chatHistory.filter(m => !m.isHidden).length;
  const showWarning = visibleMessagesCount >= limit;

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative bg-[#f0f2f5] dark:bg-[#18191a]">
      <div ref={chatBoxRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth">
        {chatHistory.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-10 text-sm">
            Selam! **Recep AI** devrede.<br /><br />
            Çalışma ortamındaki dosyaların yanındaki **👁️ (Açık) / 🙈 (Kapalı)** ikonlarını kullanarak yapay zekanın hangi dosyaları okuyup hangilerini okumayacağını seçebilirsin.
          </div>
        )}
        {chatHistory.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="self-start bg-white dark:bg-[#242526] text-gray-900 dark:text-gray-100 p-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2">
            {Object.keys(wsFiles).length > 0 && (
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mr-2">🔍 Dosyalar analiz ediliyor...</span>
            )}
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
      </div>

      <div className="flex p-2 bg-[#0a0a0a] border-t border-[#262626] items-center gap-2">
        <select 
          value={activeModelId}
          onChange={e => setActiveModelId(e.target.value)}
          className="p-2 border border-[#262626] rounded-lg bg-[#141414] text-[#ededed] outline-none text-[11px] max-w-[120px]"
        >
          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Danışmana proje veya kod isteği yaz..."
          className="flex-1 p-3 border border-[#262626] rounded-full outline-none text-sm bg-[#141414] text-[#ededed]"
          autoComplete="off"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="bg-white text-black border-none w-11 h-11 rounded-full cursor-pointer flex justify-center items-center disabled:opacity-50 transition-opacity"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
