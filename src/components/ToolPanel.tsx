import React from 'react';
import { GitBranch, Zap, RefreshCw } from 'lucide-react';

interface ToolPanelProps {
  onGitStatus: () => void;
  onSelfHeal: () => Promise<any> | void;
  onOpenGitHub: () => void;
}

export function ToolPanel({ onGitStatus, onSelfHeal, onOpenGitHub }: ToolPanelProps) {
  return (
    <div className="flex gap-2 p-2 border-t border-gray-200 dark:border-[#262626]">
      <button onClick={onOpenGitHub} className="p-2 bg-gray-100 dark:bg-[#1a1a1a] rounded hover:bg-gray-200 dark:hover:bg-[#262626]" title="GitHub Yönetimi">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
      </button>
      <button onClick={onGitStatus} className="p-2 bg-gray-100 dark:bg-[#1a1a1a] rounded hover:bg-gray-200 dark:hover:bg-[#262626]" title="Git Durumu">
        <GitBranch className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>
      <button onClick={onSelfHeal} className="p-2 bg-gray-100 dark:bg-[#1a1a1a] rounded hover:bg-gray-200 dark:hover:bg-[#262626]" title="Otomatik İyileştirme">
        <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
      </button>
    </div>
  );
}
