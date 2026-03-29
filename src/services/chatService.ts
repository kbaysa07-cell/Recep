import { Message } from '../types/chat.types';
import { WorkspaceFiles } from '../types/workspace.types';
import { AIModel } from '../types/ai.types';

import { sendMessageToAI } from '../lib/gemini';
import { generateId } from '../lib/utils';
import { flattenWorkspace } from '../lib/workspaceUtils';
import { Activity } from '../hooks/useActivity';
import { toast } from 'sonner';

export const chatService = {
  async handleSend({
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
    tools,
  }: {
    textToSend: string;
    chatHistory: Message[];
    wsFiles: WorkspaceFiles;
    limit: number;
    activeModel: AIModel;
    providerKeys: Record<string, string>;
    isTaskMode: boolean;
    setChatHistory: React.Dispatch<React.SetStateAction<Message[]>>;
    setActivity: React.Dispatch<React.SetStateAction<Activity[]>>;
    setIsLoading: (loading: boolean) => void;
    searchContext: (query: string) => Promise<string[]>;
    tools: any;
  }) {
    if (!textToSend || !setIsLoading) return; // Simplified check

    const userMsg: Message = {
      id: generateId(),
      text: textToSend,
      sender: 'user',
      isRaw: false,
      isHidden: false,
    };

    setChatHistory(prev => [...prev, userMsg]);
    setIsLoading(true);

    const relevantFiles = await searchContext(textToSend);
    const newContextFiles = new Set<string>();
    relevantFiles.forEach(f => newContextFiles.add(f));

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
      await sendMessageToAI(
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
  }
};
