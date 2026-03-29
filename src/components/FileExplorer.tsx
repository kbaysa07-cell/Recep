import React from 'react';
import { Undo, Redo, Plus, PanelLeftClose } from 'lucide-react';
import { FileTree } from './FileTree';
import { ToolPanel } from './ToolPanel';
import { toast } from 'sonner';
import { cloneWorkspace, ensureDirectory, deleteNode } from '../lib/workspaceUtils';

interface FileExplorerProps {
  wsFiles: any;
  setWsFiles: React.Dispatch<React.SetStateAction<any>>;
  currentFileName: string;
  setCurrentFileName: (name: string) => void;
  undoWs: () => void;
  redoWs: () => void;
  canUndoWs: boolean;
  canRedoWs: boolean;
  tools: any;
  onOpenGitHub?: () => void;
  setAiContextFiles: React.Dispatch<React.SetStateAction<Set<string>>>;
  aiContextFiles: Set<string>;
  isMobile: boolean;
  setActiveTab: (tab: string) => void;
  setIsFileExplorerOpen?: (isOpen: boolean) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  wsFiles,
  setWsFiles,
  currentFileName,
  setCurrentFileName,
  undoWs,
  redoWs,
  canUndoWs,
  canRedoWs,
  tools,
  onOpenGitHub,
  setAiContextFiles,
  aiContextFiles,
  isMobile,
  setActiveTab,
  setIsFileExplorerOpen
}) => {
  const createNewFile = () => {
    const inputPath = prompt("Dosya veya klasör yolu (örn: index.js veya folder/):");
    if (!inputPath) return;

    let path = inputPath.trim();
    if (!path) return;

    const isFolder = path.endsWith('/');
    path = path.replace(/^\/+/, '');
    if (isFolder && !path.endsWith('/')) {
        path += '/';
    }

    const parts = path.split('/').filter(Boolean);
    
    setWsFiles(prev => {
      const newFiles = cloneWorkspace(prev);
      const parentPath = parts.slice(0, -1).join('/');
      const lastPart = parts[parts.length - 1];
      
      const parent = ensureDirectory(newFiles, parentPath);
      
      if (isFolder) {
        if (!parent[lastPart]) {
          parent[lastPart] = { type: 'folder', name: lastPart, children: {} };
        }
      } else {
        if (!parent[lastPart]) {
          parent[lastPart] = { type: 'file', name: lastPart, content: '' };
        }
      }
      return newFiles;
    });
    
    if (!isFolder) {
      const normalizedPath = parts.join('/');
      setCurrentFileName(normalizedPath);
      setActiveTab('code');
      toast.success(`Dosya oluşturuldu: ${normalizedPath}`);
    } else {
      toast.success(`Klasör oluşturuldu: ${path}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0f0f0f] border-r border-gray-200 dark:border-[#262626] transition-colors duration-200">
      <div className="p-3 flex justify-between items-center border-b border-gray-200 dark:border-[#262626] transition-colors duration-200">
        <span className="text-[11px] font-bold text-gray-500 dark:text-[#888] uppercase tracking-wider">Dosyalar</span>
        <div className="flex gap-1">
          <button onClick={undoWs} disabled={!canUndoWs} className={`p-1.5 rounded transition-colors ${canUndoWs ? 'text-gray-500 dark:text-[#888] hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#262626]' : 'text-gray-300 dark:text-[#444] cursor-not-allowed'}`} title="Geri Al (Undo)">
            <Undo className="w-4 h-4" />
          </button>
          <button onClick={redoWs} disabled={!canRedoWs} className={`p-1.5 rounded transition-colors ${canRedoWs ? 'text-gray-500 dark:text-[#888] hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#262626]' : 'text-gray-300 dark:text-[#444] cursor-not-allowed'}`} title="İleri Al (Redo)">
            <Redo className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-[#262626] mx-1 self-center transition-colors duration-200"></div>
          <button onClick={createNewFile} className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#262626] rounded text-gray-500 dark:text-[#888] hover:text-gray-900 dark:hover:text-white transition-colors" title="Yeni Dosya/Klasör">
            <Plus className="w-4 h-4" />
          </button>
          {setIsFileExplorerOpen && (
            <button onClick={() => setIsFileExplorerOpen(false)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#262626] rounded text-gray-500 dark:text-[#888] hover:text-gray-900 dark:hover:text-white transition-colors md:hidden" title="Kapat">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <ToolPanel 
        onGitStatus={tools.gitStatus} 
        onSelfHeal={async () => { await tools.selfHeal('test', 'src/App.tsx'); }} 
        onOpenGitHub={onOpenGitHub || (() => {})}
      />
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(wsFiles).map(([fileName, node]) => (
          <FileTree 
            key={fileName} 
            node={node as any} 
            path={fileName} 
            onSelect={(path) => {
              setCurrentFileName(path);
              if (isMobile) setActiveTab('code');
            }}
            onDelete={(path) => {
              if (confirm(`'${path}' dosyasını silmek istediğinize emin misiniz?`)) {
                setWsFiles(prev => {
                  const newFiles = deleteNode(prev, path);
                  
                  if (currentFileName.startsWith(path)) {
                    let firstFile = "";
                    const findFirst = (files: any, currentPath = "") => {
                      for (const [name, node] of Object.entries<any>(files)) {
                        const fullPath = currentPath ? `${currentPath}/${name}` : name;
                        if (node && (node as any).type === 'file') {
                          firstFile = fullPath;
                          return true;
                        } else if (node && (node as any).children && findFirst((node as any).children, fullPath)) {
                          return true;
                        }
                      }
                      return false;
                    };
                    findFirst(newFiles);
                    setCurrentFileName(firstFile);
                  }
                  
                  return newFiles;
                });
                toast.info(`Silindi: ${path}`);
              }
            }}
            onToggleAi={(path) => {
              setAiContextFiles(prev => {
                const newSet = new Set(prev);
                if (newSet.has(path)) newSet.delete(path);
                else newSet.add(path);
                return newSet;
              });
            }}
            aiContextFiles={aiContextFiles}
            currentPath={currentFileName}
          />
        ))}
      </div>
    </div>
  );
};
