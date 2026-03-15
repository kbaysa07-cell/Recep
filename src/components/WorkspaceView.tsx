import React, { useState, useEffect, useRef } from 'react';
import { Save, Download, Play, Eye, EyeOff, FileText, FileJson, FileCode, MessageSquare, Plus, Trash2, Folder, Code, MonitorPlay, CheckSquare, Bug, PanelLeftClose, PanelLeftOpen, Undo, Redo } from 'lucide-react';
import JSZip from 'jszip';
import { FileTree } from './FileTree';
import { TaskBoard } from './TaskBoard';
import { Debugger } from './Debugger';
import { FileNode, WorkspaceFiles } from '../types';
import { cn } from '../lib/utils';
import * as Resizable from 'react-resizable-panels';
const { Panel, Group, Separator: PanelResizeHandle } = Resizable as any;
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { githubLight } from '@uiw/codemirror-theme-github';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { toast } from 'sonner';

// Helper to find a node by path
const findNode = (files: WorkspaceFiles, path: string): FileNode | null => {
  const parts = path.split('/').filter(Boolean);
  let current: any = files;
  for (const part of parts) {
    if (current[part]) {
      current = current[part];
    } else if (current.children && current.children[part]) {
      current = current.children[part];
    } else {
      return null;
    }
  }
  return current;
};

// Helper to delete a node
const deleteNode = (files: WorkspaceFiles, path: string): WorkspaceFiles => {
  const parts = path.split('/').filter(Boolean);
  const newFiles = { ...files };
  let current: any = newFiles;
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]].children;
  }
  delete current[parts[parts.length - 1]];
  return newFiles;
};

interface WorkspaceViewProps {
  activeTab: 'files' | 'code' | 'preview' | 'plan' | 'debugger';
  setActiveTab: (tab: 'files' | 'code' | 'preview' | 'plan' | 'debugger') => void;
  wsFiles: WorkspaceFiles;
  setWsFiles: React.Dispatch<React.SetStateAction<WorkspaceFiles>>;
  currentFileName: string;
  setCurrentFileName: (name: string) => void;
  wsProjectName: string;
  setWsProjectName: (name: string) => void;
  currentWorkspaceId: string | null;
  setCurrentWorkspaceId: (id: string | null) => void;
  savedProjects: any[];
  setSavedProjects: React.Dispatch<React.SetStateAction<any[]>>;
  aiContextFiles: Set<string>;
  setAiContextFiles: React.Dispatch<React.SetStateAction<Set<string>>>;
  onAskAIToFix: (errorMsg: string) => void;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  undoWs: () => void;
  redoWs: () => void;
  canUndoWs: boolean;
  canRedoWs: boolean;
}

export function WorkspaceView({
  activeTab,
  setActiveTab,
  wsFiles,
  setWsFiles,
  currentFileName,
  setCurrentFileName,
  wsProjectName,
  setWsProjectName,
  currentWorkspaceId,
  setCurrentWorkspaceId,
  savedProjects,
  setSavedProjects,
  aiContextFiles,
  setAiContextFiles,
  onAskAIToFix,
  iframeRef,
  undoWs,
  redoWs,
  canUndoWs,
  canRedoWs
}: WorkspaceViewProps) {
  const [consoleLogs, setConsoleLogs] = useState<{level: string, msg: string}[]>([]);
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent workspace undo if user is typing in an input, textarea, or contenteditable (like CodeMirror)
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('.cm-editor')
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedoWs) redoWs();
        } else {
          if (canUndoWs) undoWs();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoWs, redoWs, canUndoWs, canRedoWs]);

  useEffect(() => {
    if (activeTab === 'preview') {
      runPreview();
    }
  }, [activeTab, wsFiles]);

  useEffect(() => {
    if (activeTab === 'files' && !isMobile) {
      setIsFileExplorerOpen(true);
    }
  }, [activeTab, isMobile]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'console') {
        setConsoleLogs(prev => [...prev, { level: e.data.level, msg: e.data.msg }]);
      } else if (e.data && e.data.type === 'error') {
        setConsoleLogs(prev => [...prev, { 
          level: 'error', 
          msg: `${e.data.msg} (Satır: ${e.data.line}, Sütun: ${e.data.col})\nStack: ${e.data.stack || 'Yok'}` 
        }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const saveWorkspace = () => {
    const newName = window.prompt("Proje ismi:", wsProjectName);
    if (!newName) return;

    if (currentWorkspaceId) {
      setSavedProjects(prev => prev.map(p => 
        p.id === currentWorkspaceId 
          ? { ...p, title: newName, files: { ...wsFiles }, date: new Date().toLocaleDateString() }
          : p
      ));
    } else {
      const newProject = {
        id: Date.now().toString(),
        title: newName,
        files: { ...wsFiles },
        date: new Date().toLocaleDateString()
      };
      setSavedProjects(prev => [...prev, newProject]);
      setCurrentWorkspaceId(newProject.id);
    }
    setWsProjectName(newName);
    toast.success("Proje başarıyla kaydedildi!");
  };

  const exportZip = async () => {
    const zip = new JSZip();
    
    // Helper to add files to zip
    const addFilesToZip = (files: WorkspaceFiles, path: string = "") => {
      for (const [name, node] of Object.entries(files)) {
        const fullPath = path ? `${path}/${name}` : name;
        if (node.type === 'file') {
          zip.file(fullPath, node.content || '');
        } else if (node.children) {
          addFilesToZip(node.children, fullPath);
        }
      }
    };

    addFilesToZip(wsFiles);
    
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = wsProjectName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_projesi.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const createNewFile = () => {
    const path = prompt("Dosya veya klasör yolu (örn: index.js veya folder/):");
    if (!path) return;

    const parts = path.split('/').filter(Boolean);
    const isFolder = path.endsWith('/');
    
    setWsFiles(prev => {
      const newFiles = { ...prev };
      let current: any = newFiles;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = { type: 'folder', name: part, children: {} };
        }
        current = current[part].children;
      }
      
      const lastPart = parts[parts.length - 1];
      if (isFolder) {
        if (!current[lastPart]) {
          current[lastPart] = { type: 'folder', name: lastPart, children: {} };
        }
      } else {
        if (!current[lastPart]) {
          current[lastPart] = { type: 'file', name: lastPart, content: '' };
        }
      }
      return newFiles;
    });
    
    if (!isFolder) {
      setCurrentFileName(path);
      setActiveTab('code');
      toast.success(`Dosya oluşturuldu: ${path}`);
    } else {
      toast.success(`Klasör oluşturuldu: ${path}`);
    }
  };

  const runPreview = () => {
    setConsoleLogs([]);
    
    // Helper to flatten files
    const flattenFiles = (files: WorkspaceFiles, path: string = "", result: { [name: string]: string } = {}) => {
      for (const [key, node] of Object.entries(files)) {
        const fullPath = path ? `${path}/${key}` : key;
        if (node.type === 'file') {
          result[fullPath] = node.content || '';
        } else if (node.children) {
          flattenFiles(node.children, fullPath, result);
        }
      }
      return result;
    };

    const flatFiles = flattenFiles(wsFiles);
    
    // Find html file in flatFiles
    let htmlKey = Object.keys(flatFiles).find(k => k.endsWith('.html')) || 'index.html';
    let finalHtml = flatFiles[htmlKey] || '<!DOCTYPE html>\n<html>\n<head></head>\n<body>\n<div id="app"></div>\n</body>\n</html>';

    let allCss = "";
    let allJs = "";
    for (let [key, content] of Object.entries(flatFiles)) {
      if (key.endsWith('.css')) allCss += content + "\n";
      if (key.endsWith('.js') && key !== htmlKey) allJs += content + "\n";
    }

    const mobileFixScript = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        html, body { overscroll-behavior: none; margin: 0; padding: 0; width: 100%; height: 100%; } 
        canvas { max-width: 100vw; max-height: 100vh; display: block; margin: auto; outline: none; -webkit-tap-highlight-color: transparent; object-fit: contain; }
    </style>
    <script>
        function safePostMessage(data) {
            try {
                window.parent.postMessage(data, '*');
            } catch (e) {
                try {
                    window.parent.postMessage(JSON.parse(JSON.stringify(data)), '*');
                } catch (e2) {
                    console.error('postMessage failed', e);
                }
            }
        }
        document.addEventListener('touchmove', function(e) { if(e.target.tagName === 'CANVAS') e.preventDefault(); }, {passive: false});
        window.onerror = function(msg, url, line, col, error) { safePostMessage({type: 'error', msg: String(msg), url: String(url), line: line, col: col, stack: error ? String(error.stack) : null}); return true; };
        const oldLog = console.log; console.log = function(...args) { safePostMessage({type: 'console', level: 'info', msg: args.map(a => String(a)).join(' ')}); oldLog.apply(console, args); };
        const oldError = console.error; console.error = function(...args) { const stack = new Error().stack; safePostMessage({type: 'error', msg: args.map(a => String(a)).join(' '), stack: stack ? String(stack) : null}); oldError.apply(console, args); };
    </script>`;

    // Check if we need React/Babel (if there's JSX or React imports)
    const needsReact = allJs.includes('React') || allJs.includes('useState') || allJs.includes('</') || allJs.includes('/>');
    
    // Check if we need Tailwind CSS
    const needsTailwind = allJs.includes('className=') || finalHtml.includes('class=');
    
    let reactScripts = '';
    if (needsReact) {
      reactScripts = `
        <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      `;
      // Replace import React statements with destructuring from global React/ReactDOM
      allJs = allJs.replace(/import\s+React\s*,\s*\{\s*(.*?)\s*\}\s*from\s+['"]react['"];?/g, 'const { $1 } = React;');
      allJs = allJs.replace(/import\s+\{\s*(.*?)\s*\}\s*from\s+['"]react['"];?/g, 'const { $1 } = React;');
      allJs = allJs.replace(/import\s+React\s+from\s+['"]react['"];?/g, '');
      
      allJs = allJs.replace(/import\s+ReactDOM\s+from\s+['"]react-dom\/?client['"];?/g, '');
      allJs = allJs.replace(/import\s+\{\s*(.*?)\s*\}\s*from\s+['"]react-dom\/?client['"];?/g, 'const { $1 } = ReactDOM;');
    }
    
    let tailwindScript = '';
    if (needsTailwind) {
      tailwindScript = '<script src="https://cdn.tailwindcss.com"></script>';
    }

    if (!finalHtml.includes('<head>') && !finalHtml.includes('<body>')) {
      finalHtml = `<!DOCTYPE html>\n<html>\n<head></head>\n<body>\n${finalHtml}\n</body>\n</html>`;
    }
    if (finalHtml.includes('</head>')) {
      finalHtml = finalHtml.replace('</head>', `${mobileFixScript}${tailwindScript}${reactScripts}<style>${allCss}</style></head>`);
    } else {
      finalHtml = `${mobileFixScript}${tailwindScript}${reactScripts}<style>${allCss}</style>` + finalHtml;
    }
    
    if (allJs.trim() !== '') {
      const safeJs = allJs.replace(/<\/script>/gi, '<\\/script>');
      const scriptTag = needsReact ? '<script type="text/babel" data-type="module">' : '<script type="module">';
      
      if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${scriptTag}\n${safeJs}\n<\/script></body>`);
      } else {
        finalHtml += `${scriptTag}\n${safeJs}\n<\/script>`;
      }
    }
    
    if (iframeRef.current) {
      iframeRef.current.srcdoc = finalHtml;
    }
  };

  const sendPreviewToChat = () => {
    onAskAIToFix(`Şu anki önizleme durumu:\n\n${JSON.stringify(wsFiles, null, 2)}\n\nLütfen bu durumu incele ve gerekli düzeltmeleri yap.`);
  };

  const getFileIcon = (name: string) => {
    if (name.endsWith('.html')) return <FileCode className="w-4 h-4 text-orange-500" />;
    if (name.endsWith('.css')) return <FileCode className="w-4 h-4 text-blue-400" />;
    if (name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.jsx') || name.endsWith('.tsx')) return <FileJson className="w-4 h-4 text-yellow-400" />;
    return <FileText className="w-4 h-4 text-gray-400" />;
  };

  const getLanguageExtension = (name: string) => {
    if (name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.ts') || name.endsWith('.tsx')) return [javascript({ jsx: true, typescript: name.endsWith('.ts') || name.endsWith('.tsx') })];
    if (name.endsWith('.html') || name.endsWith('.htm')) return [html()];
    if (name.endsWith('.css')) return [css()];
    return [];
  };

  const errorCount = consoleLogs.filter(l => l.level === 'error').length;

  const renderFileExplorer = () => (
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
          <button onClick={() => setIsFileExplorerOpen(false)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#262626] rounded text-gray-500 dark:text-[#888] hover:text-gray-900 dark:hover:text-white transition-colors md:hidden" title="Kapat">
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(wsFiles).map(([fileName, node]) => (
          <FileTree 
            key={fileName} 
            node={node} 
            path={fileName} 
            onSelect={(path) => {
              setCurrentFileName(path);
              if (isMobile) setActiveTab('code');
            }}
            onDelete={(path) => {
              if (confirm(`'${path}' dosyasını silmek istediğinize emin misiniz?`)) {
                setWsFiles(prev => deleteNode(prev, path));
                if (currentFileName === path) {
                  setCurrentFileName(Object.keys(wsFiles)[0]);
                }
                toast.info(`Dosya silindi: ${path}`);
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

  const renderMainContent = () => (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#1e1e1e] relative transition-colors duration-200">
      {/* Desktop Tabs (Hidden on Mobile) */}
      <div className="hidden md:flex bg-gray-50 dark:bg-[#0f0f0f] border-b border-gray-200 dark:border-[#262626] items-center transition-colors duration-200">
        {!isFileExplorerOpen && (
          <button onClick={() => setIsFileExplorerOpen(true)} className="p-2 text-gray-500 dark:text-[#888] hover:text-gray-900 dark:hover:text-white transition-colors border-r border-gray-200 dark:border-[#262626]" title="Dosya Gezginini Aç">
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}
        <div className="flex flex-1 overflow-x-auto">
          <button onClick={() => setActiveTab('code')} className={cn("px-4 py-2.5 text-[13px] border-none cursor-pointer flex items-center gap-2 transition-colors", (activeTab === 'code' || activeTab === 'files') ? "bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-white border-t-2 border-t-blue-500" : "bg-transparent text-gray-500 dark:text-[#888] hover:text-gray-700 dark:hover:text-[#ccc] hover:bg-gray-200 dark:hover:bg-[#1a1a1a]")}>
            <Code className="w-4 h-4" /> Kod
          </button>
          <button onClick={() => setActiveTab('preview')} className={cn("px-4 py-2.5 text-[13px] border-none cursor-pointer flex items-center gap-2 transition-colors", activeTab === 'preview' ? "bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-white border-t-2 border-t-blue-500" : "bg-transparent text-gray-500 dark:text-[#888] hover:text-gray-700 dark:hover:text-[#ccc] hover:bg-gray-200 dark:hover:bg-[#1a1a1a]")}>
            <MonitorPlay className="w-4 h-4" /> Önizleme
          </button>
          {wsFiles['gorev_plani.md'] && (
            <button onClick={() => setActiveTab('plan')} className={cn("px-4 py-2.5 text-[13px] border-none cursor-pointer flex items-center gap-2 transition-colors", activeTab === 'plan' ? "bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-white border-t-2 border-t-blue-500" : "bg-transparent text-gray-500 dark:text-[#888] hover:text-gray-700 dark:hover:text-[#ccc] hover:bg-gray-200 dark:hover:bg-[#1a1a1a]")}>
              <CheckSquare className="w-4 h-4" /> Plan
            </button>
          )}
          <button onClick={() => setActiveTab('debugger')} className={cn("px-4 py-2.5 text-[13px] border-none cursor-pointer flex items-center gap-2 transition-colors", activeTab === 'debugger' ? "bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-white border-t-2 border-t-blue-500" : "bg-transparent text-gray-500 dark:text-[#888] hover:text-gray-700 dark:hover:text-[#ccc] hover:bg-gray-200 dark:hover:bg-[#1a1a1a]")}>
            <Bug className="w-4 h-4" /> Debug
          </button>
        </div>
      </div>

      {/* Mobile Tab Header */}
      <div className="md:hidden bg-gray-50 dark:bg-[#0f0f0f] border-b border-gray-200 dark:border-[#262626] p-2.5 flex justify-between items-center transition-colors duration-200">
        <div className="text-[14px] text-gray-700 dark:text-[#ccc] flex items-center gap-2 font-mono">
          {activeTab === 'code' ? (
            <>{getFileIcon(currentFileName)} <span className="truncate max-w-[200px]">{currentFileName}</span></>
          ) : activeTab === 'plan' ? (
            <><CheckSquare className="w-4 h-4 text-blue-400" /> Görev Panosu</>
          ) : activeTab === 'debugger' ? (
            <><Bug className="w-4 h-4 text-purple-400" /> Hata Ayıklama</>
          ) : (
            <><MonitorPlay className="w-4 h-4 text-green-400" /> Canlı Önizleme</>
          )}
        </div>
        {activeTab === 'preview' && (
          <button onClick={runPreview} className="bg-gray-800 dark:bg-[#262626] text-white px-3 py-1.5 rounded-md text-[13px] flex items-center gap-1 shadow-sm">
            <Play className="w-3.5 h-3.5" /> Yenile
          </button>
        )}
      </div>

      {/* Content */}
      {activeTab === 'plan' && wsFiles['gorev_plani.md'] ? (
        <div className="flex-1 overflow-hidden">
          <TaskBoard 
            content={wsFiles['gorev_plani.md'].content || ''} 
            onChange={(newContent) => {
              setWsFiles(prev => ({
                ...prev,
                'gorev_plani.md': { ...prev['gorev_plani.md'], content: newContent }
              }));
            }} 
          />
        </div>
      ) : activeTab === 'debugger' ? (
        <div className="flex-1 overflow-hidden">
          <Debugger wsFiles={wsFiles} />
        </div>
      ) : activeTab === 'code' || (activeTab === 'files' && !isMobile) ? (
        <div className="flex-1 overflow-auto relative">
          {(() => {
            const node = findNode(wsFiles, currentFileName);
            if (node?.isBinary) {
              if (currentFileName.match(/\.(png|jpe?g|gif|webp|svg)$/i)) {
                return (
                  <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-[#1e1e1e] p-4 transition-colors duration-200">
                    <img src={node.content} alt={currentFileName} className="max-w-full max-h-full object-contain shadow-lg rounded" />
                  </div>
                );
              } else if (currentFileName.match(/\.(mp3|wav|ogg)$/i)) {
                return (
                  <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-[#1e1e1e] p-4 transition-colors duration-200">
                    <audio controls src={node.content} className="w-full max-w-md" />
                  </div>
                );
              } else {
                return (
                  <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-[#1e1e1e] text-gray-500 dark:text-[#888] transition-colors duration-200">
                    Bu dosya formatı önizlenemiyor ({currentFileName})
                  </div>
                );
              }
            }
            return (
              <div className="h-full w-full [&_.cm-editor]:h-full [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-[14px] md:[&_.cm-scroller]:text-[15px] dark:[&_.cm-editor]:bg-[#1e1e1e] [&_.cm-editor]:bg-white dark:[&_.cm-gutters]:bg-[#1e1e1e] [&_.cm-gutters]:bg-gray-50 dark:[&_.cm-gutters]:border-r-[#333] [&_.cm-gutters]:border-r-gray-200 dark:[&_.cm-activeLineGutter]:bg-[#2a2a2a] [&_.cm-activeLineGutter]:bg-gray-200 dark:[&_.cm-activeLine]:bg-[#2a2a2a] [&_.cm-activeLine]:bg-gray-100">
                <CodeMirror
                  value={node?.content || ''}
                  height="100%"
                  theme={document.documentElement.classList.contains('dark') ? vscodeDark : githubLight}
                  extensions={getLanguageExtension(currentFileName)}
                  onChange={(value) => {
                    const parts = currentFileName.split('/').filter(Boolean);
                    setWsFiles(prev => {
                      const newFiles = { ...prev };
                      let current: any = newFiles;
                      for (let i = 0; i < parts.length - 1; i++) {
                        current = current[parts[i]].children;
                      }
                      current[parts[parts.length - 1]].content = value;
                      return newFiles;
                    });
                  }}
                  className="h-full"
                  basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  dropCursor: true,
                  allowMultipleSelections: true,
                  indentOnInput: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: true,
                  rectangularSelection: true,
                  crosshairCursor: true,
                  highlightActiveLine: true,
                  highlightSelectionMatches: true,
                  closeBracketsKeymap: true,
                  defaultKeymap: true,
                  searchKeymap: true,
                  historyKeymap: true,
                  foldKeymap: true,
                  completionKeymap: true,
                  lintKeymap: true,
                }}
              />
            </div>
            );
          })()}
        </div>
      ) : activeTab === 'preview' ? (
        <div className="flex-1 flex flex-col bg-white dark:bg-[#0a0a0a] transition-colors duration-200">
          {/* Desktop Preview Toolbar */}
          <div className="hidden md:flex justify-end gap-2 p-2 bg-gray-100 dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-[#262626] transition-colors duration-200">
            <button onClick={sendPreviewToChat} className="bg-blue-600/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600/30 px-3 py-1.5 rounded-md text-[12px] flex items-center gap-1.5 transition-colors font-medium">
              <MessageSquare className="w-3.5 h-3.5" /> Chat'e Gönder
            </button>
            <button onClick={runPreview} className="bg-gray-800 dark:bg-[#262626] hover:bg-gray-700 dark:hover:bg-[#333] text-white px-3 py-1.5 rounded-md text-[12px] flex items-center gap-1.5 transition-colors font-medium shadow-sm">
              <Play className="w-3.5 h-3.5" /> Yenile
            </button>
          </div>
          
          <iframe ref={iframeRef} className="flex-1 w-full border-none bg-white dark:bg-white transition-colors duration-200" sandbox="allow-scripts allow-modals allow-same-origin" />
          
          {/* Terminal */}
          <div className={cn("bg-gray-50 dark:bg-[#0a0a0a] border-t border-gray-200 dark:border-[#262626] flex flex-col transition-all duration-300", isTerminalCollapsed ? "h-[34px]" : "h-[150px] md:h-[200px]")}>
            <div className="px-3 py-2 text-[11px] font-bold text-gray-500 dark:text-[#888] bg-gray-100 dark:bg-[#151515] flex justify-between items-center cursor-pointer hover:bg-gray-200 dark:hover:bg-[#1a1a1a] transition-colors" onClick={() => setIsTerminalCollapsed(!isTerminalCollapsed)}>
              <div className="flex items-center gap-2">
                <span>TERMINAL</span>
                {errorCount > 0 && <span className="bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded text-[10px]">{errorCount} Hata</span>}
              </div>
              <button className="text-gray-500 dark:text-[#888] hover:text-gray-900 dark:hover:text-white transition-colors">
                {isTerminalCollapsed ? '▲' : '▼'}
              </button>
            </div>
            {!isTerminalCollapsed && (
              <div className="flex-1 overflow-y-auto p-2 font-mono text-[12px] md:text-[13px] bg-white dark:bg-[#0a0a0a]">
                {consoleLogs.map((log, i) => (
                  <div key={i} className={cn("py-1.5 border-b border-gray-100 dark:border-[#262626] break-words", log.level === 'error' ? 'text-red-600 dark:text-red-400' : log.level === 'warn' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400')}>
                    <div className="flex justify-between items-start">
                      <span className="opacity-50 mr-2 mt-0.5">{'>'}</span>
                      <pre className="whitespace-pre-wrap flex-1 font-mono">{log.msg}</pre>
                      {log.level === 'error' && (
                        <button 
                          onClick={() => onAskAIToFix(log.msg)}
                          className="ml-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-1 rounded text-[10px] flex-shrink-0 transition-colors border border-red-500/20"
                        >
                          AI'ya Gönder
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col text-gray-900 dark:text-[#e0e0e0] font-sans overflow-hidden bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-[#0a0a0a] p-2.5 md:p-3 border-b border-gray-200 dark:border-[#262626] flex justify-between items-center z-10 transition-colors duration-200">
        <div className="font-semibold text-[14px] md:text-[15px] text-gray-900 dark:text-white flex items-center gap-2 truncate pr-2">
          <span className="text-blue-500 flex-shrink-0">◆</span> 
          <span className="truncate">{wsProjectName}</span>
        </div>
        <div className="flex gap-1.5 md:gap-2 flex-shrink-0">
          <button onClick={exportZip} className="p-2 md:px-3 md:py-1.5 rounded-md bg-gray-100 dark:bg-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-[#262626] text-[12px] flex gap-1.5 items-center border border-gray-300 dark:border-[#333] transition-colors font-medium text-gray-700 dark:text-white" title="ZIP İndir">
            <Download className="w-4 h-4 md:w-3.5 md:h-3.5" /> <span className="hidden md:inline">ZIP</span>
          </button>
          <button onClick={saveWorkspace} className="p-2 md:px-3 md:py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-[12px] flex gap-1.5 items-center border-none text-white transition-colors font-medium shadow-sm shadow-blue-600/20" title="Kaydet">
            <Save className="w-4 h-4 md:w-3.5 md:h-3.5" /> <span className="hidden md:inline">Kaydet</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {isMobile ? (
          // Mobile Layout
          <>
            {activeTab === 'files' ? renderFileExplorer() : renderMainContent()}
          </>
        ) : (
          // Desktop Layout with Resizable Panels
          <Group direction="horizontal" className="w-full h-full">
            {isFileExplorerOpen && (
              <>
                <Panel defaultSize={20} minSize={15} maxSize={40} className="h-full">
                  {renderFileExplorer()}
                </Panel>
                <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-[#262626] hover:bg-blue-500/50 active:bg-blue-500 transition-colors cursor-col-resize" />
              </>
            )}
            <Panel className="h-full">
              {renderMainContent()}
            </Panel>
          </Group>
        )}
      </div>
    </div>
  );
}
