import React, { useState } from 'react';
import { FileText, FileJson, FileCode, Folder, FolderOpen, ChevronRight, ChevronDown, Trash2, Plus, Bot } from 'lucide-react';
import { FileNode } from '../types';
import { cn } from '../lib/utils';

interface FileTreeProps {
  node: FileNode;
  path: string;
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
  currentPath: string;
  onToggleAi: (path: string) => void;
  aiContextFiles: Set<string>;
}

export function FileTree({ node, path, onSelect, onDelete, currentPath, onToggleAi, aiContextFiles }: FileTreeProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (node.type === 'file') {
    const isActive = currentPath === path;
    return (
      <div
        onClick={() => onSelect(path)}
        className={cn(
          "group flex items-center justify-between cursor-pointer px-2 py-2 md:py-1.5 rounded-md mb-0.5 text-[14px] md:text-[13px] transition-colors",
          isActive ? "bg-gray-200 dark:bg-[#2a2a2a] text-gray-900 dark:text-white" : "text-gray-600 dark:text-[#888] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1e1e1e]"
        )}
      >
        <div className="flex items-center gap-2.5 md:gap-2 overflow-hidden flex-1">
          {node.name.endsWith('.html') ? <FileCode className="w-4.5 h-4.5 md:w-4 md:h-4 text-orange-500" /> :
           node.name.endsWith('.css') ? <FileCode className="w-4.5 h-4.5 md:w-4 md:h-4 text-blue-500 dark:text-blue-400" /> :
           (node.name.endsWith('.js') || node.name.endsWith('.ts') || node.name.endsWith('.jsx') || node.name.endsWith('.tsx')) ? <FileJson className="w-4.5 h-4.5 md:w-4 md:h-4 text-yellow-500 dark:text-yellow-400" /> :
           <FileText className="w-4.5 h-4.5 md:w-4 md:h-4 text-gray-400" />}
          <span className="truncate">{node.name}</span>
        </div>
        <div className="flex items-center gap-2 md:gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onToggleAi(path); }} className={cn("p-1.5 md:p-1 rounded transition-colors", aiContextFiles.has(path) ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/20" : "text-gray-400 dark:text-[#555] hover:text-blue-600 dark:hover:text-blue-400")}>
            <Bot className="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(path); }} className="p-1.5 md:p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/20 text-gray-400 dark:text-[#555] hover:text-red-600 dark:hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-0.5">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center justify-between cursor-pointer px-1 py-2 md:py-1.5 text-gray-600 dark:text-[#888] hover:text-gray-900 dark:hover:text-white text-[14px] md:text-[13px] rounded hover:bg-gray-100 dark:hover:bg-[#1e1e1e] transition-colors"
      >
        <div className="flex items-center gap-1.5 md:gap-1 overflow-hidden flex-1">
          {isOpen ? <ChevronDown className="w-4.5 h-4.5 md:w-4 md:h-4" /> : <ChevronRight className="w-4.5 h-4.5 md:w-4 md:h-4" />}
          {isOpen ? <FolderOpen className="w-4.5 h-4.5 md:w-4 md:h-4 text-blue-600 dark:text-blue-400" /> : <Folder className="w-4.5 h-4.5 md:w-4 md:h-4 text-blue-600 dark:text-blue-400" />}
          <span className="truncate">{node.name}</span>
        </div>
        <div className="flex items-center gap-2 md:gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onDelete(path); }} className="p-1.5 md:p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/20 text-gray-400 dark:text-[#555] hover:text-red-600 dark:hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="ml-4 pl-1 border-l border-gray-200 dark:border-[#2a2a2a] transition-colors duration-200">
          {Object.entries(node.children || {}).map(([key, child]) => (
            <FileTree 
              key={key} 
              node={child} 
              path={`${path}/${key}`} 
              onSelect={onSelect} 
              onDelete={onDelete} 
              currentPath={currentPath}
              onToggleAi={onToggleAi}
              aiContextFiles={aiContextFiles}
            />
          ))}
        </div>
      )}
    </div>
  );
}
