import { useState, useEffect, useCallback, useMemo } from 'react';
import localforage from 'localforage';
import { Message, ArchivedSession } from '../types/chat.types';
import { Project, WorkspaceFiles, GithubState } from '../types/workspace.types';
import { AIModel, ProviderConfig } from '../types/ai.types';

import { generateId } from './utils';
import { DEFAULT_MODELS, GEMINI_MODELS, OPENAI_MODELS, ANTHROPIC_MODELS, XAI_MODELS } from '../constants/models';
import { useChatState } from '../hooks/useChatState';
import { useWorkspaceState } from '../hooks/useWorkspaceState';

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

  const [providerKeys, setProviderKeys] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('providerKeys') || '{}');
    } catch {
      return {};
    }
  });

  const [githubState, setGithubState] = useState<GithubState | null>(null);

  const setProviderKey = (provider: string, key: string) => {
    setProviderKeys(prev => ({ ...prev, [provider]: key }));
  };

  const models = useMemo(() => {
    let availableModels = [...DEFAULT_MODELS];
    if (providerKeys['google']) availableModels.push(...GEMINI_MODELS);
    if (providerKeys['openai']) availableModels.push(...OPENAI_MODELS);
    if (providerKeys['anthropic']) availableModels.push(...ANTHROPIC_MODELS);
    if (providerKeys['xai']) availableModels.push(...XAI_MODELS);
    return availableModels;
  }, [providerKeys]);
  
  const [activeModelId, setActiveModelId] = useState<string>(() => {
    return localStorage.getItem('activeModelId') || 'gemini-3.1-pro-preview';
  });

  const activeModel = models.find(m => m.id === activeModelId) || models[0];
  
  // Storage states
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const chatState = useChatState();
  const workspaceState = useWorkspaceState();
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);

  // Load data asynchronously from localforage
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedFiles = await localforage.getItem<WorkspaceFiles>('wsFiles');
        if (storedFiles) workspaceState.setWsFilesRaw(storedFiles);

        const storedChat = await localforage.getItem<Message[]>('chatHistory');
        if (storedChat) chatState.setChatHistory(storedChat);
        else {
          const oldChat = localStorage.getItem('chatHistory');
          if (oldChat) {
            chatState.setChatHistory(JSON.parse(oldChat));
            localStorage.removeItem('chatHistory');
          }
        }

        const storedProjects = await localforage.getItem<Project[]>('wsProjects');
        if (storedProjects) setSavedProjects(storedProjects);
        else {
          const oldProjects = localStorage.getItem('wsProjects');
          if (oldProjects) {
            setSavedProjects(JSON.parse(oldProjects));
            localStorage.removeItem('wsProjects');
          }
        }

        const storedArchived = await localforage.getItem<ArchivedSession[]>('archivedSessions');
        if (storedArchived) chatState.setArchivedSessions(storedArchived);
        else {
          const oldArchived = localStorage.getItem('archivedSessions');
          if (oldArchived) {
            chatState.setArchivedSessions(JSON.parse(oldArchived));
            localStorage.removeItem('archivedSessions');
          }
        }
      } catch (e) {
        console.error("Failed to load from localforage", e);
      } finally {
        setIsStorageLoaded(true);
      }
    };
    loadData();
  }, []);

  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'code' | 'preview' | 'projects' | 'plan' | 'debugger'>('chat');
  
  // Workspace State
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [wsProjectName, setWsProjectName] = useState('Aktif Proje');
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [aiContextFiles, setAiContextFiles] = useState<Set<string>>(new Set());

  // History State for Undo/Redo
  const [wsHistory, setWsHistory] = useState<WorkspaceFiles[]>([{}]);
  const [wsHistoryIndex, setWsHistoryIndex] = useState<number>(0);

  const setWsFiles = useCallback((newFilesOrUpdater: React.SetStateAction<WorkspaceFiles>) => {
    workspaceState.setWsFilesRaw(prev => {
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
  }, [wsHistoryIndex, workspaceState]);

  const undoWs = useCallback(() => {
    if (wsHistoryIndex > 0) {
      const newIndex = wsHistoryIndex - 1;
      setWsHistoryIndex(newIndex);
      workspaceState.setWsFilesRaw(wsHistory[newIndex]);
    }
  }, [wsHistory, wsHistoryIndex, workspaceState]);

  const redoWs = useCallback(() => {
    if (wsHistoryIndex < wsHistory.length - 1) {
      const newIndex = wsHistoryIndex + 1;
      setWsHistoryIndex(newIndex);
      workspaceState.setWsFilesRaw(wsHistory[newIndex]);
    }
  }, [wsHistory, wsHistoryIndex, workspaceState]);

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('providerKeys', JSON.stringify(providerKeys));
  }, [providerKeys]);

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
    if (isStorageLoaded) {
      localforage.setItem('chatHistory', chatState.chatHistory);
    }
  }, [chatState.chatHistory, isStorageLoaded]);

  useEffect(() => {
    if (isStorageLoaded) {
      localforage.setItem('wsProjects', savedProjects);
    }
  }, [savedProjects, isStorageLoaded]);

  useEffect(() => {
    if (isStorageLoaded) {
      localforage.setItem('archivedSessions', chatState.archivedSessions);
    }
  }, [chatState.archivedSessions, isStorageLoaded]);

  const getActiveContextLimit = useCallback(() => {
    return contextMode === 'auto' ? 20 : customContextLimit;
  }, [contextMode, customContextLimit]);

  const searchContext = useCallback(async (query: string): Promise<string[]> => {
    const results: string[] = [];
    const search = (files: WorkspaceFiles, path: string = "") => {
      for (const [name, node] of Object.entries<any>(files)) {
        const fullPath = path ? `${path}/${name}` : name;
        if (node.type === 'file') {
          if (name.toLowerCase().includes(query.toLowerCase()) || (node.content && node.content.toLowerCase().includes(query.toLowerCase()))) {
            results.push(fullPath);
          }
        } else if (node.children) {
          search(node.children, fullPath);
        }
      }
    };
    search(workspaceState.wsFiles);
    return results;
  }, [workspaceState.wsFiles]);

  const archiveCurrentChat = useCallback(() => {
    const visibleMessages = chatState.chatHistory.filter(m => !m.isHidden);
    if (visibleMessages.length === 0) return;
    
    const firstUserMsg = visibleMessages.find(m => m.sender === 'user');
    const previewText = firstUserMsg ? firstUserMsg.text : "Sohbet";
    
    const newArchive: ArchivedSession = {
      id: generateId(),
      date: new Date().toLocaleString(),
      preview: previewText.length > 40 ? previewText.substring(0, 40) + "..." : previewText,
      messages: visibleMessages
    };
    
    chatState.setArchivedSessions(prev => [...prev, newArchive]);
  }, [chatState.chatHistory]);

  const clearChat = useCallback(() => {
    console.log("clearChat called");
    if (window.confirm("Ekran temizlensin mi? (Arşive alınır)")) {
      archiveCurrentChat();
      chatState.setChatHistory([]);
    }
  }, [archiveCurrentChat]);

  const startNewChat = useCallback(() => {
    chatState.setChatHistory([]);
  }, []);

  const openWorkspaceFromChat = useCallback((filesObj: any) => {
    workspaceState.setWsFiles(prev => {
      const newFiles = JSON.parse(JSON.stringify(prev));
      
      // filesObj içindeki yolları ayrıştırıp ağaç yapısına ekle
      for (const [path, content] of Object.entries(filesObj)) {
        const parts = path.split('/').filter(Boolean);
        let current: any = newFiles;
        
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part]) {
            current[part] = { type: 'folder', name: part, children: {} };
          }
          if (!current[part].children) {
            current[part].children = {};
          }
          current = current[part].children;
        }
        
        const lastPart = parts[parts.length - 1];
        current[lastPart] = { type: 'file', name: lastPart, content };
      }
      
      return newFiles;
    });
    
    workspaceState.setAiContextFiles(prev => {
      const newSet = new Set(prev);
      Object.keys(filesObj).forEach(f => newSet.add(f));
      return newSet;
    });

    workspaceState.setWsProjectName("Aktif Proje");
    
    // Find first file
    let firstFile = "";
    
    // filesObj düz bir obje olduğu için ilk dosyayı doğrudan alabiliriz
    const keys = Object.keys(filesObj);
    if (keys.length > 0) {
      firstFile = keys[0];
    }
    
    if (firstFile) workspaceState.setCurrentFileName(firstFile);
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
  }, []);

  const openProjectFromList = useCallback((id: string) => {
    const project = savedProjects.find(p => p.id === id);
    if (project) {
      workspaceState.setWsFiles(project.files);
      
      // Flatten files for context
      const flatFiles: string[] = [];
      const flatten = (files: WorkspaceFiles) => {
        for (const [name, node] of Object.entries<any>(files)) {
          if (node.type === 'file') flatFiles.push(name);
          else if (node.children) flatten(node.children);
        }
      };
      flatten(project.files);
      
      workspaceState.setAiContextFiles(new Set(flatFiles));
      workspaceState.setWsProjectName(project.title);
      workspaceState.setCurrentWorkspaceId(project.id);
      
      // Find first file
      let firstFile = "";
      const findFirst = (files: WorkspaceFiles) => {
        for (const [name, node] of Object.entries<any>(files)) {
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
      
      if (firstFile) workspaceState.setCurrentFileName(firstFile);
      setActiveTab('code');
    }
  }, [savedProjects]);

  return {
    theme, setTheme,
    contextMode, setContextMode,
    customContextLimit, setCustomContextLimit,
    ...chatState,
    ...workspaceState,
    savedProjects, setSavedProjects,
    activeTab, setActiveTab,
    models,
    providerKeys, setProviderKey,
    activeModelId, setActiveModelId,
    activeModel,
    getActiveContextLimit,
    searchContext,
    openWorkspaceFromChat,
    openProjectFromList,
    deleteProject: (id: string) => setSavedProjects(prev => prev.filter(p => p.id !== id)),
    githubState, setGithubState
  };
}
