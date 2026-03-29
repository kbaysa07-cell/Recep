import { useState, useCallback } from 'react';
import { Message, ArchivedSession } from '../types/chat.types';

import { generateId } from '../lib/utils';
import localforage from 'localforage';

export function useChatState() {
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [archivedSessions, setArchivedSessions] = useState<ArchivedSession[]>([]);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const archiveCurrentChat = useCallback(() => {
    const visibleMessages = chatHistory.filter(m => !m.isHidden);
    if (visibleMessages.length === 0) return;
    
    const firstUserMsg = visibleMessages.find(m => m.sender === 'user');
    const previewText = firstUserMsg ? firstUserMsg.text : "Sohbet";
    
    const newArchive: ArchivedSession = {
      id: generateId(),
      date: new Date().toLocaleString(),
      preview: previewText.length > 40 ? previewText.substring(0, 40) + "..." : previewText,
      messages: visibleMessages
    };
    
    setArchivedSessions(prev => [...prev, newArchive]);
  }, [chatHistory]);
  
  const clearChat = useCallback(() => {
    if (window.confirm("Ekran temizlensin mi? (Arşive alınır)")) {
      archiveCurrentChat();
      setChatHistory([]);
    }
  }, [archiveCurrentChat]);

  const startNewChat = useCallback(() => {
    setChatHistory([]);
  }, []);

  const deleteArchivedSession = useCallback((id: string) => {
    setArchivedSessions(prev => prev.filter(s => s.id !== id));
  }, []);

  return {
    chatHistory, setChatHistory,
    archivedSessions, setArchivedSessions,
    pendingPrompt, setPendingPrompt,
    clearChat,
    startNewChat,
    archiveCurrentChat,
    deleteArchivedSession
  };
}
