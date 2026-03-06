import { useState, useEffect, useCallback } from 'react';
import { Message, Project, ArchivedSession, WorkspaceFiles, AIModel } from '../types';
import { generateId } from './utils';

const DEFAULT_MODELS: AIModel[] = [
  { id: 'auto', name: 'Auto (Akıllı Seçim)', provider: 'auto', isDefault: true },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'google', isDefault: true },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'google', isDefault: true },
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite', provider: 'google', isDefault: true },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', isDefault: true },
  { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', provider: 'custom', baseUrl: 'https://api.anthropic.com/v1/messages', isDefault: true },
  { id: 'grok-beta', name: 'Grok Beta', provider: 'xai', baseUrl: 'https://api.x.ai/v1/chat/completions', isDefault: true }
];

export function useAppState() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => 
    (localStorage.getItem('appTheme') as 'light' | 'dark') || 'dark'
  );
  const [contextMode, setContextMode] = useState<'auto' | 'custom'>(() => 
    (localStorage.getItem('contextMode') as 'auto' | 'custom') || 'auto'
  );
  const [customContextLimit, setCustomContextLimit] = useState<number>(() => 
    parseInt(localStorage.getItem('customContextLimit') || '20', 10)
  );

  // Models state
  const [models, setModels] = useState<AIModel[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('aiModels') || '[]');
      if (saved.length > 0) return saved;
      return DEFAULT_MODELS;
    } catch {
      return DEFAULT_MODELS;
    }
  });
  
  const [activeModelId, setActiveModelId] = useState<string>(() => {
    return localStorage.getItem('activeModelId') || 'gemini-3.1-pro-preview';
  });

  const activeModel = models.find(m => m.id === activeModelId) || models[0];
  
  const [chatHistory, setChatHistory] = useState<Message[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('chatHistory') || '[]');
    } catch {
      return [];
    }
  });
  
  const [savedProjects, setSavedProjects] = useState<Project[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('wsProjects') || '[]');
    } catch {
      return [];
    }
  });
  
  const [archivedSessions, setArchivedSessions] = useState<ArchivedSession[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('archivedSessions') || '[]');
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'code' | 'preview' | 'projects'>('chat');
  
  // Workspace State
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [wsFiles, setWsFiles] = useState<WorkspaceFiles>({});
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [wsProjectName, setWsProjectName] = useState('Aktif Proje');
  const [aiContextFiles, setAiContextFiles] = useState<Set<string>>(new Set());
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('appTheme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('contextMode', contextMode);
    localStorage.setItem('customContextLimit', customContextLimit.toString());
  }, [contextMode, customContextLimit]);

  useEffect(() => {
    localStorage.setItem('aiModels', JSON.stringify(models));
  }, [models]);

  useEffect(() => {
    localStorage.setItem('activeModelId', activeModelId);
  }, [activeModelId]);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem('wsProjects', JSON.stringify(savedProjects));
  }, [savedProjects]);

  useEffect(() => {
    localStorage.setItem('archivedSessions', JSON.stringify(archivedSessions));
  }, [archivedSessions]);

  const getActiveContextLimit = useCallback(() => {
    return contextMode === 'auto' ? 20 : customContextLimit;
  }, [contextMode, customContextLimit]);

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
    console.log("clearChat called");
    if (window.confirm("Ekran temizlensin mi? (Arşive alınır)")) {
      archiveCurrentChat();
      setChatHistory([]);
    }
  }, [archiveCurrentChat]);

  const startNewChat = useCallback(() => {
    setChatHistory([]);
  }, []);

  const openWorkspaceFromChat = useCallback((filesObj: WorkspaceFiles) => {
    setWsFiles(prev => {
      const newFiles = { ...prev, ...filesObj };
      return newFiles;
    });
    
    setAiContextFiles(prev => {
      const newSet = new Set(prev);
      Object.keys(filesObj).forEach(f => newSet.add(f));
      return newSet;
    });

    setWsProjectName("Aktif Proje");
    const firstFile = Object.keys(filesObj)[0] || Object.keys(wsFiles)[0];
    if (firstFile) setCurrentFileName(firstFile);
    setIsWorkspaceOpen(true);
  }, [wsFiles]);

  const openProjectFromList = useCallback((id: string) => {
    const project = savedProjects.find(p => p.id === id);
    if (project) {
      setWsFiles(project.files);
      setAiContextFiles(new Set(Object.keys(project.files)));
      setWsProjectName(project.title);
      setCurrentWorkspaceId(project.id);
      const firstFile = Object.keys(project.files)[0];
      if (firstFile) setCurrentFileName(firstFile);
      setIsWorkspaceOpen(true);
    }
  }, [savedProjects]);

  return {
    theme, setTheme,
    contextMode, setContextMode,
    customContextLimit, setCustomContextLimit,
    chatHistory, setChatHistory,
    savedProjects, setSavedProjects,
    archivedSessions, setArchivedSessions,
    activeTab, setActiveTab,
    isWorkspaceOpen, setIsWorkspaceOpen,
    wsFiles, setWsFiles,
    currentFileName, setCurrentFileName,
    currentWorkspaceId, setCurrentWorkspaceId,
    wsProjectName, setWsProjectName,
    aiContextFiles, setAiContextFiles,
    pendingPrompt, setPendingPrompt,
    models, setModels,
    activeModelId, setActiveModelId,
    activeModel,
    getActiveContextLimit,
    clearChat,
    startNewChat,
    openWorkspaceFromChat,
    openProjectFromList,
    deleteProject: (id: string) => setSavedProjects(prev => prev.filter(p => p.id !== id)),
    deleteArchivedSession: (id: string) => setArchivedSessions(prev => prev.filter(s => s.id !== id))
  };
}
