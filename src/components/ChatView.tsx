import React, { useRef, useEffect, useState } from 'react';
import { Message, WorkspaceFiles, AIModel } from '../types';
import { MessageBubble } from './MessageBubble';
import { Send, AlertTriangle } from 'lucide-react';
import { sendMessageToAI } from '../lib/gemini';
import { generateId } from '../lib/utils';
import { AgentActivityPanel } from './AgentActivityPanel';
import { useChatTools } from '../hooks/useChatTools';
import { toast } from 'sonner';

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
  activity: {type: 'thought' | 'file' | 'terminal' | 'web', message: string}[];
  setActivity: React.Dispatch<React.SetStateAction<{type: 'thought' | 'file' | 'terminal' | 'web', message: string}[]>>;
  setWsFiles: React.Dispatch<React.SetStateAction<WorkspaceFiles>>;
  searchContext: (query: string) => Promise<string[]>;
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
  iframeRef,
  activity,
  setActivity,
  setWsFiles,
  searchContext
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

  const handleFunctionCall = async (functionCall: any) => {
    if (functionCall.name === 'readMultipleFiles') {
      return await tools.readMultipleFiles(functionCall.args.paths);
    }
    if (functionCall.name === 'grepSearch') {
      return await tools.grepSearch(functionCall.args.pattern);
    }
    if (functionCall.name === 'dependencyCheck') {
      return await tools.dependencyCheck();
    }
    if (functionCall.name === 'testRunner') {
      return await tools.testRunner();
    }
    if (functionCall.name === 'runTerminalCommand') {
      const { command } = functionCall.args;
      return await tools.runCommand(command);
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

    const relevantFiles = await searchContext(textToSend);
    const newContextFiles = new Set(aiContextFiles);
    relevantFiles.forEach(f => newContextFiles.add(f));

    const aiMsgId = generateId();
    setChatHistory(prev => [...prev, {
      id: aiMsgId,
      text: '',
      sender: 'model',
      isRaw: true,
      isHidden: false,
    }]);

    setActivity([]);

    // Görsel geri bildirim: Bağlamdaki dosyaların analizi
    const filesFound = Object.keys(wsFiles).filter(f => newContextFiles.has(f));
    if (filesFound.length > 0) {
      let totalLines = 0;
      filesFound.forEach(f => {
        totalLines += wsFiles[f].content.split('\n').length;
      });
      toast.info(`Bağlamdaki ${filesFound.length} dosya (${totalLines} satır kod) yapay zekaya iletildi.`);
    }

    try {
      let replyText = await sendMessageToAI(
        [...chatHistory, userMsg],
        userMsg.text,
        wsFiles,
        newContextFiles,
        limit,
        activeModel,
        isTaskMode,
        (chunk) => {
          setChatHistory(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: m.text + chunk } : m));
        },
        (activity) => {
          setActivity(prev => [...prev, activity]);
        },
        tools
      );
      
      // Handle function calls if any
      if (replyText.startsWith('{') && replyText.includes('functionCalls')) {
          const parsed = JSON.parse(replyText);
          for (const call of parsed.functionCalls) {
              const result = await handleFunctionCall(call);
              replyText = `Tool sonucu (${call.name}): ${result}`;
          }
          setChatHistory(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: replyText } : m));
      }

      // Parse files and auto-apply to workspace
      const fileRegex = /\[DOSYA:([^\]]+)\]([\s\S]*?)\[\/DOSYA\]/g;
      let match;
      const filesFound: any = {};
      let hasFiles = false;

      while ((match = fileRegex.exec(replyText)) !== null) {
        hasFiles = true;
        filesFound[match[1].trim()] = match[2].trim();
        setActivity(prev => [...prev, { type: 'file', message: `Dosya oluşturuldu: ${match[1].trim()}` }]);
      }

      if (hasFiles) {
        onOpenWorkspace(filesFound);
      }
    } catch (error: any) {
      console.error(error);
      setActivity(prev => [...prev, { type: 'thought', message: 'Hata oluştu!' }]);
      setChatHistory(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: error.message || "Bağlantı hatası veya API anahtarı geçersiz." } : m));
    } finally {
      setIsLoading(false);
    }
  };

  const visibleMessagesCount = chatHistory.filter(m => !m.isHidden).length;
  const showWarning = visibleMessagesCount >= limit;

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative bg-gray-50 dark:bg-[#18191a] transition-colors duration-200">
      <div ref={chatBoxRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth">
        <AgentActivityPanel activity={activity} isLoading={isLoading} />
        {chatHistory.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-10 text-sm">
            Selam! <strong>Recep AI</strong> devrede.<br /><br />
            Çalışma ortamındaki dosyaların yanındaki <strong>👁️ (Açık) / 🙈 (Kapalı)</strong> ikonlarını kullanarak yapay zekanın hangi dosyaları okuyup hangilerini okumayacağını seçebilirsin.
            {isTaskMode && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400 text-xs transition-colors duration-200">
                <strong>Görev Modu Aktif:</strong> Yapay zeka verdiğin istekleri parçalara ayırarak adım adım bir plan oluşturacak ve bunu <code>gorev_plani.md</code> dosyasına kaydederek Görev Panosunda gösterecek.
              </div>
            )}
          </div>
        )}
        {chatHistory.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      <div className="flex p-2 bg-white dark:bg-[#0a0a0a] border-t border-gray-200 dark:border-[#262626] items-center gap-2 transition-colors duration-200">
        <select 
          value={activeModelId}
          onChange={e => setActiveModelId(e.target.value)}
          className="p-2 border border-gray-200 dark:border-[#262626] rounded-lg bg-gray-50 dark:bg-[#141414] text-gray-900 dark:text-[#ededed] outline-none text-[11px] max-w-[120px] transition-colors duration-200"
        >
          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Danışmana proje veya kod isteği yaz..."
          className="flex-1 p-3 border border-gray-200 dark:border-[#262626] rounded-full outline-none text-sm bg-gray-50 dark:bg-[#141414] text-gray-900 dark:text-[#ededed] transition-colors duration-200"
          autoComplete="off"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 text-white border-none w-11 h-11 rounded-full cursor-pointer flex justify-center items-center disabled:opacity-50 transition-opacity"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
