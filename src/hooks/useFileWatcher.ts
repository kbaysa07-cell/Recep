import { useEffect } from 'react';
import io from 'socket.io-client';
import { WorkspaceFiles } from '../types/workspace.types';
import { cloneWorkspace, ensureDirectory } from '../lib/workspaceUtils';
import { normalizePath } from '../lib/pathUtils';

const socket = io(window.location.origin);

export function useFileWatcher(
  setWsFiles: React.Dispatch<React.SetStateAction<WorkspaceFiles>>,
  setActivity: React.Dispatch<React.SetStateAction<any>>
) {
  useEffect(() => {
    // Initial fetch of the file tree
    const fetchTree = async () => {
      try {
        const response = await fetch('/api/files/tree');
        if (response.ok) {
          const tree = await response.json();
          setWsFiles(tree);
        }
      } catch (err) {
        console.error("Failed to fetch initial file tree:", err);
      }
    };

    fetchTree();

    socket.on('fs:change', (data: { event: string; path: string; content: string | null; type: 'file' | 'folder' | null }) => {
      const { event, path, content, type } = data;
      const normalizedPath = normalizePath(path);
      
      setWsFiles(prev => {
        const newFiles = cloneWorkspace(prev);
        const parts = normalizedPath.split('/').filter(Boolean);
        const fileName = parts.pop();
        
        if (!fileName) return prev;
        
        const parentDir = ensureDirectory(newFiles, parts.join('/'));

        if (event === 'add' || event === 'addDir' || event === 'change') {
          if (type === 'file') {
            parentDir[fileName] = { type: 'file', name: fileName, content: content || '' };
          } else if (type === 'folder') {
            if (!parentDir[fileName]) {
              parentDir[fileName] = { type: 'folder', name: fileName, children: {} };
            }
          }
        } else if (event === 'unlink' || event === 'unlinkDir') {
          delete parentDir[fileName];
        }

        return newFiles;
      });

      setActivity((prev: any) => [
        ...prev,
        { 
          type: 'file', 
          message: `FS Event: ${event} on ${normalizedPath}`, 
          timestamp: Date.now() 
        }
      ]);
    });

    return () => {
      socket.off('fs:change');
    };
  }, [setWsFiles, setActivity]);
}
