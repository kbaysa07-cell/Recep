import React, { useRef, useEffect, useState } from 'react';
import { Message, WorkspaceFiles, AIModel } from '../types';
import { MessageBubble } from './MessageBubble';
import { Send, AlertTriangle } from 'lucide-react';
import { sendMessageToAI } from '../lib/gemini';
import { generateId } from '../lib/utils';
import { useChatTools } from '../hooks/useChatTools';
import { flattenWorkspace } from '../lib/workspaceUtils';
import { Activity } from '../hooks/useActivity';
import { SemanticSearchBar } from './SemanticSearchBar';
import { toast } from 'sonner';

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

  const handleFunctionCall = async (functionCall: any) => {
    if (functionCall.name === 'readMultipleFiles') {
      return await tools.readMultipleFiles(functionCall.args.paths);
    }
    if (functionCall.name === 'grepSearch') {
      return await tools.grepSearch(functionCall.args.pattern);
    }
    if (functionCall.name === 'searchFiles') {
      return await tools.searchFiles(functionCall.args.pattern);
    }
    if (functionCall.name === 'readFileChunk') {
      return await tools.readFileChunk(functionCall.args.path, functionCall.args.startLine, functionCall.args.endLine);
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
    if (functionCall.name === 'runDiagnostic') {
      return await tools.runDiagnostic();
    }
    if (functionCall.name === 'fetchGithubRepo') {
      return await tools.fetchGithubRepo(functionCall.args.repoUrl, providerKeys['github']);
    }
    if (functionCall.name === 'readGithubFile') {
      return await tools.readGithubFile(functionCall.args.url, providerKeys['github']);
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
    const newContextFiles = new Set<string>();
    relevantFiles.forEach(f => newContextFiles.add(f));

    // Ayrıca kullanıcının mesajında doğrudan adı geçen dosyaları da ekle
    const allFiles = flattenWorkspace(wsFiles);
    allFiles.forEach(({ path }) => {
      const fileName = path.split('/').pop() || path;
      if (textToSend.includes(fileName) || textToSend.includes(path)) {
        newContextFiles.add(path);
      }
    });

    const aiMsgId = generateId();
    setChatHistory(prev => [...prev, {
      id: aiMsgId,
      text: '',
      sender: 'model',
      isRaw: true,
      isHidden: false,
      activity: []
    }]);

    setActivity([]);

    try {
      const replyText = await sendMessageToAI(
        [...chatHistory, userMsg],
        userMsg.text,
        wsFiles,
        newContextFiles,
        limit,
        activeModel,
        providerKeys,
        isTaskMode,
        (chunk) => {
          setChatHistory(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: m.text + chunk } : m));
        },
        (newActivity) => {
          setActivity(prev => [...prev, newActivity]);
          setChatHistory(prev => prev.map(m => m.id === aiMsgId ? { ...m, activity: [...(m.activity || []), newActivity] } : m));
        },
        tools
      );
      
      // Tool calls are handled inside sendMessageToAI
      
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message || "Bağlantı hatası veya API anahtarı geçersiz.";
      toast.error(errorMsg);
      const errorActivity: Activity = { type: 'thought', message: 'Hata oluştu!', timestamp: Date.now() };
      setActivity(prev => [...prev, errorActivity]);
      setChatHistory(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: errorMsg, activity: [...(m.activity || []), errorActivity] } : m));
    } finally {
      setIsLoading(false);
    }
  };

  const visibleMessagesCount = chatHistory.filter(m => !m.isHidden).length;
  const showWarning = visibleMessagesCount >= limit;

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
