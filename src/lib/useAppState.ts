import { useState, useEffect, useCallback } from 'react';
import { Message, Project, ArchivedSession, WorkspaceFiles, AIModel } from '../types';
import { generateId } from './utils';
import { VectorStore } from '../services/vectorStore';

const vectorStore = new VectorStore();

const DEFAULT_MODELS: AIModel[] = [
  { id: 'auto', name: 'Auto (Akıllı Seçim)', provider: 'auto', isDefault: true },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'google', isDefault: true },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'google', isDefault: true },
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite', provider: 'google', isDefault: true },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', isDefault: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', isDefault: true },
  { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', provider: 'custom', baseUrl: 'https://api.anthropic.com/v1/messages', isDefault: true },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'custom', baseUrl: 'https://api.anthropic.com/v1/messages', isDefault: true },
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

  const indexFile = useCallback(async (path: string, content: string) => {
    await vectorStore.indexFile(path, content);
  }, []);

  const searchContext = useCallback(async (query: string) => {
    return await vectorStore.search(query);
  }, []);
  
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

  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'code' | 'preview' | 'projects' | 'plan' | 'debugger'>('chat');
  
  // Workspace State
  const [wsFiles, setWsFilesRaw] = useState<WorkspaceFiles>({});
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [wsProjectName, setWsProjectName] = useState('Aktif Proje');
  const [aiContextFiles, setAiContextFiles] = useState<Set<string>>(new Set());
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  // History State for Undo/Redo
  const [wsHistory, setWsHistory] = useState<WorkspaceFiles[]>([{}]);
  const [wsHistoryIndex, setWsHistoryIndex] = useState<number>(0);

  const setWsFiles = useCallback((newFilesOrUpdater: React.SetStateAction<WorkspaceFiles>) => {
    setWsFilesRaw(prev => {
      const nextFiles = typeof newFilesOrUpdater === 'function' ? newFilesOrUpdater(prev) : newFilesOrUpdater;
      
      // If nothing changed, don't add to history
      if (JSON.stringify(prev) === JSON.stringify(nextFiles)) {
        return prev;
      }

      setWsHistory(prevHistory => {
        const newHistory = prevHistory.slice(0, wsHistoryIndex + 1);
        newHistory.push(nextFiles);
        // Keep last 30 states
        if (newHistory.length > 30) {
          newHistory.shift();
        }
        return newHistory;
      });
      
      setWsHistoryIndex(prevIndex => Math.min(prevIndex + 1, 29));
      
      return nextFiles;
    });
  }, [wsHistoryIndex]);

  const undoWs = useCallback(() => {
    if (wsHistoryIndex > 0) {
      const newIndex = wsHistoryIndex - 1;
      setWsHistoryIndex(newIndex);
      setWsFilesRaw(wsHistory[newIndex]);
    }
  }, [wsHistory, wsHistoryIndex]);

  const redoWs = useCallback(() => {
    if (wsHistoryIndex < wsHistory.length - 1) {
      const newIndex = wsHistoryIndex + 1;
      setWsHistoryIndex(newIndex);
      setWsFilesRaw(wsHistory[newIndex]);
    }
  }, [wsHistory, wsHistoryIndex]);

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
    setWsFiles(prev => ({ ...prev, ...filesObj }));
    
    setAiContextFiles(prev => {
      const newSet = new Set(prev);
      Object.keys(filesObj).forEach(f => newSet.add(f));
      return newSet;
    });

    setWsProjectName("Aktif Proje");
    
    // Find first file
    let firstFile = "";
    const findFirst = (files: WorkspaceFiles) => {
      for (const [name, node] of Object.entries(files)) {
        if (node.type === 'file') {
          firstFile = name;
          return true;
        } else if (node.children && findFirst(node.children)) {
          return true;
        }
      }
      return false;
    };
    findFirst(filesObj);
    
    if (firstFile) setCurrentFileName(firstFile);
    if (window.innerWidth < 768) {
      if (filesObj['gorev_plani.md']) {
        setActiveTab('plan');
      } else {
        setActiveTab('code');
      }
    } else {
      if (filesObj['gorev_plani.md']) {
        setActiveTab('plan');
      }
    }
  }, [wsFiles]);

  const openProjectFromList = useCallback((id: string) => {
    const project = savedProjects.find(p => p.id === id);
    if (project) {
      setWsFiles(project.files);
      
      // Flatten files for context
      const flatFiles: string[] = [];
      const flatten = (files: WorkspaceFiles) => {
        for (const [name, node] of Object.entries(files)) {
          if (node.type === 'file') flatFiles.push(name);
          else if (node.children) flatten(node.children);
        }
      };
      flatten(project.files);
      
      setAiContextFiles(new Set(flatFiles));
      setWsProjectName(project.title);
      setCurrentWorkspaceId(project.id);
      
      // Find first file
      let firstFile = "";
      const findFirst = (files: WorkspaceFiles) => {
        for (const [name, node] of Object.entries(files)) {
          if (node.type === 'file') {
            firstFile = name;
            return true;
          } else if (node.children && findFirst(node.children)) {
            return true;
          }
        }
        return false;
      };
      findFirst(project.files);
      
      if (firstFile) setCurrentFileName(firstFile);
      setActiveTab('code');
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
    deleteArchivedSession: (id: string) => setArchivedSessions(prev => prev.filter(s => s.id !== id)),
    undoWs,
    redoWs,
    canUndoWs: wsHistoryIndex > 0,
    canRedoWs: wsHistoryIndex < wsHistory.length - 1,
    indexFile,
    searchContext
  };
}
