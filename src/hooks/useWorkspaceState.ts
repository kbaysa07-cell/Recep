import { useState, useCallback } from 'react';
import { Project, WorkspaceFiles } from '../types/workspace.types';

import { generateId } from '../lib/utils';
import localforage from 'localforage';

export function useWorkspaceState() {
  const [wsFiles, setWsFilesRaw] = useState<WorkspaceFiles>({});
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [wsProjectName, setWsProjectName] = useState('Aktif Proje');
  const [aiContextFiles, setAiContextFiles] = useState<Set<string>>(new Set());
  const [wsHistory, setWsHistory] = useState<WorkspaceFiles[]>([{}]);
  const [wsHistoryIndex, setWsHistoryIndex] = useState<number>(0);

  const setWsFiles = useCallback((newFilesOrUpdater: React.SetStateAction<WorkspaceFiles>) => {
    setWsFilesRaw(prev => {
      const nextFiles = typeof newFilesOrUpdater === 'function' ? newFilesOrUpdater(prev) : newFilesOrUpdater;
      
      if (JSON.stringify(prev) === JSON.stringify(nextFiles)) {
        return prev;
      }

      setWsHistory(prevHistory => {
        const newHistory = prevHistory.slice(0, wsHistoryIndex + 1);
        newHistory.push(nextFiles);
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

  return {
    wsFiles, setWsFiles,
    currentFileName, setCurrentFileName,
    currentWorkspaceId, setCurrentWorkspaceId,
    wsProjectName, setWsProjectName,
    aiContextFiles, setAiContextFiles,
    undoWs,
    redoWs,
    canUndoWs: wsHistoryIndex > 0,
    canRedoWs: wsHistoryIndex < wsHistory.length - 1,
    setWsFilesRaw
  };
}
