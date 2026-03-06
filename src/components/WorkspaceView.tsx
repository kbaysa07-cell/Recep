import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceFiles } from '../types';
import { Save, Download, Play, Eye, EyeOff, FileText, FileJson, FileCode, MessageSquare, Plus, Trash2, Folder, Code, MonitorPlay } from 'lucide-react';
import JSZip from 'jszip';
import { cn } from '../lib/utils';

import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';

interface WorkspaceViewProps {
  activeTab: 'files' | 'code' | 'preview';
  setActiveTab: (tab: 'files' | 'code' | 'preview') => void;
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
  iframeRef
}: WorkspaceViewProps) {
  const [consoleLogs, setConsoleLogs] = useState<{level: string, msg: string}[]>([]);

  useEffect(() => {
    if (activeTab === 'preview') {
      runPreview();
    }
  }, [activeTab, wsFiles]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'console') {
        setConsoleLogs(prev => [...prev, { level: e.data.level, msg: e.data.msg }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const toggleAiContext = (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation();
    setAiContextFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileName)) {
        newSet.delete(fileName);
      } else {
        newSet.add(fileName);
      }
      return newSet;
    });
  };

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
    alert("💾 Kaydedildi!");
  };

  const exportZip = async () => {
    const zip = new JSZip();
    for (const [fileName, content] of Object.entries(wsFiles)) {
      zip.file(fileName, content);
    }
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = wsProjectName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_projesi.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const createNewFile = () => {
    const name = prompt("Yeni dosya adı (örn: style.css, script.js):");
    if (!name) return;
    if (wsFiles[name] !== undefined) {
      alert("Bu isimde bir dosya zaten var!");
      return;
    }
    setWsFiles(prev => ({ ...prev, [name]: '' }));
    setCurrentFileName(name);
    setActiveTab('code');
  };

  const deleteFile = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (Object.keys(wsFiles).length <= 1) {
      alert("En az bir dosya kalmalı!");
      return;
    }
    if (confirm(`'${name}' dosyasını silmek istediğinize emin misiniz?`)) {
      const newFiles = { ...wsFiles };
      delete newFiles[name];
      setWsFiles(newFiles);
      if (currentFileName === name) {
        setCurrentFileName(Object.keys(newFiles)[0]);
      }
    }
  };

  const runPreview = () => {
    setConsoleLogs([]);
    let htmlKey = Object.keys(wsFiles).find(k => k.endsWith('.html')) || 'index.html';
    let finalHtml = wsFiles[htmlKey] || '<!DOCTYPE html>\n<html>\n<head></head>\n<body>\n<div id="app"></div>\n</body>\n</html>';

    let allCss = "";
    let allJs = "";
    for (let key in wsFiles) {
      if (key.endsWith('.css')) allCss += wsFiles[key] + "\n";
      if (key.endsWith('.js') && key !== htmlKey) allJs += wsFiles[key] + "\n";
    }

    const mobileFixScript = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        html, body { overscroll-behavior: none; margin: 0; padding: 0; width: 100%; height: 100%; } 
        canvas { max-width: 100vw; max-height: 100vh; display: block; margin: auto; outline: none; -webkit-tap-highlight-color: transparent; object-fit: contain; }
    </style>
    <script>
        document.addEventListener('touchmove', function(e) { if(e.target.tagName === 'CANVAS') e.preventDefault(); }, {passive: false});
        window.onerror = function(msg, url, line, col, error) { window.parent.postMessage({type: 'console', level: 'error', msg: msg + ' (Satır: ' + line + ')'}, '*'); return true; };
        const oldLog = console.log; console.log = function(...args) { window.parent.postMessage({type: 'console', level: 'info', msg: args.join(' ')}, '*'); oldLog.apply(console, args); };
        const oldError = console.error; console.error = function(...args) { window.parent.postMessage({type: 'console', level: 'error', msg: args.join(' ')}, '*'); oldError.apply(console, args); };
    </script>`;

    if (!finalHtml.includes('<head>') && !finalHtml.includes('<body>')) {
      finalHtml = `<!DOCTYPE html>\n<html>\n<head></head>\n<body>\n${finalHtml}\n</body>\n</html>`;
    }
    if (finalHtml.includes('</head>')) {
      finalHtml = finalHtml.replace('</head>', `${mobileFixScript}<style>${allCss}</style></head>`);
    } else {
      finalHtml = `${mobileFixScript}<style>${allCss}</style>` + finalHtml;
    }
    if (allJs.trim() !== '') {
      const safeJs = allJs.replace(/<\/script>/gi, '<\\/script>');
      if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `<script>${safeJs}<\/script></body>`);
      } else {
        finalHtml += `<script>${safeJs}<\/script>`;
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

  return (
    <div className="flex-1 flex flex-col text-[#e0e0e0] font-sans overflow-hidden bg-[#0f0f0f]">
      {/* Header */}
      <div className="bg-[#151515] p-2 md:p-3 border-b border-[#2a2a2a] flex justify-between items-center">
        <div className="font-bold text-[14px] md:text-[15px] text-white flex items-center gap-2 truncate pr-2">
          <span className="text-blue-500 flex-shrink-0">◆</span> 
          <span className="truncate">{wsProjectName}</span>
        </div>
        <div className="flex gap-1 md:gap-2 flex-shrink-0">
          <button onClick={exportZip} className="p-2 md:px-3 md:py-1.5 rounded bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[12px] flex gap-1 items-center border border-[#3a3a3a]" title="ZIP İndir">
            <Download className="w-4 h-4 md:w-3.5 md:h-3.5" /> <span className="hidden md:inline">ZIP</span>
          </button>
          <button onClick={saveWorkspace} className="p-2 md:px-3 md:py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-[12px] flex gap-1 items-center border-none text-white" title="Kaydet">
            <Save className="w-4 h-4 md:w-3.5 md:h-3.5" /> <span className="hidden md:inline">Kaydet</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Sidebar (Files) - Hidden on mobile unless activeTab is 'files' */}
        <div className={cn(
          "bg-[#151515] border-r border-[#2a2a2a] flex-col w-full md:w-[220px] md:flex",
          activeTab === 'files' ? "flex flex-1" : "hidden"
        )}>
          <div className="p-3 flex justify-between items-center border-b border-[#2a2a2a]">
            <span className="text-[11px] font-bold text-[#888] uppercase tracking-wider">Dosyalar</span>
            <button onClick={createNewFile} className="p-1.5 hover:bg-[#2a2a2a] rounded text-[#888] hover:text-white transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-1">
            {Object.keys(wsFiles).map(fileName => {
              const isIncluded = aiContextFiles.has(fileName);
              const isActive = fileName === currentFileName;
              return (
                <div
                  key={fileName}
                  onClick={() => {
                    setCurrentFileName(fileName);
                    if (window.innerWidth < 768) setActiveTab('code'); // Auto-switch on mobile
                  }}
                  className={cn(
                    "group flex items-center justify-between cursor-pointer px-2 py-2.5 md:py-2 rounded-md mb-0.5 text-[14px] md:text-[13px] transition-colors",
                    isActive ? "bg-[#2a2a2a] text-white" : "text-[#888] hover:text-white hover:bg-[#1e1e1e]"
                  )}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    {getFileIcon(fileName)}
                    <span className="truncate">{fileName}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => toggleAiContext(e, fileName)} 
                      className={cn("p-2 md:p-1.5 rounded hover:bg-[#3a3a3a]", isIncluded ? "text-blue-400" : "text-[#555]")}
                      title={isIncluded ? 'AI Görebilir' : 'AI Göremez'}
                    >
                      {isIncluded ? <Eye className="w-4 h-4 md:w-3.5 md:h-3.5" /> : <EyeOff className="w-4 h-4 md:w-3.5 md:h-3.5" />}
                    </button>
                    <button 
                      onClick={(e) => deleteFile(e, fileName)} 
                      className="p-2 md:p-1.5 rounded hover:bg-red-500/20 text-[#555] hover:text-red-400"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor / Preview Area */}
        <div className={cn(
          "flex-1 flex-col bg-[#1e1e1e] relative",
          activeTab === 'files' ? "hidden md:flex" : "flex"
        )}>
          {/* Desktop Tabs (Hidden on Mobile) */}
          <div className="hidden md:flex bg-[#151515] border-b border-[#2a2a2a]">
            <button onClick={() => setActiveTab('code')} className={cn("px-4 py-2 text-[13px] border-none cursor-pointer flex items-center gap-2", activeTab === 'code' ? "bg-[#1e1e1e] text-white border-t-2 border-t-blue-500" : "bg-transparent text-[#888] hover:text-[#ccc]")}>
              <Code className="w-4 h-4" /> Kod
            </button>
            <button onClick={() => setActiveTab('preview')} className={cn("px-4 py-2 text-[13px] border-none cursor-pointer flex items-center gap-2", activeTab === 'preview' ? "bg-[#1e1e1e] text-white border-t-2 border-t-blue-500" : "bg-transparent text-[#888] hover:text-[#ccc]")}>
              <MonitorPlay className="w-4 h-4" /> Önizleme
            </button>
          </div>

          {/* Mobile Tab Header (Shows current file or preview title) */}
          <div className="md:hidden bg-[#151515] border-b border-[#2a2a2a] p-2 flex justify-between items-center">
            <div className="text-[14px] text-[#ccc] flex items-center gap-2 font-mono">
              {activeTab === 'code' ? (
                <>{getFileIcon(currentFileName)} {currentFileName}</>
              ) : (
                <><MonitorPlay className="w-4 h-4 text-green-400" /> Canlı Önizleme</>
              )}
            </div>
            {activeTab === 'preview' && (
              <button onClick={runPreview} className="bg-[#2a2a2a] text-white px-3 py-1.5 rounded text-[13px] flex items-center gap-1">
                <Play className="w-3.5 h-3.5" /> Yenile
              </button>
            )}
          </div>

          {/* Content */}
          {activeTab === 'code' ? (
            <div className="flex-1 overflow-auto relative">
              <CodeMirror
                value={wsFiles[currentFileName] || ''}
                height="100%"
                theme={vscodeDark}
                extensions={getLanguageExtension(currentFileName)}
                onChange={(value) => setWsFiles(prev => ({ ...prev, [currentFileName]: value }))}
                className="h-full text-[14px] md:text-[15px]"
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
          ) : activeTab === 'preview' ? (
            <div className="flex-1 flex flex-col bg-white">
              {/* Desktop Preview Toolbar */}
              <div className="hidden md:flex justify-end gap-2 p-2 bg-[#1e1e1e] border-b border-[#2a2a2a]">
                <button onClick={sendPreviewToChat} className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 px-3 py-1 rounded text-[12px] flex items-center gap-1 transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" /> Chat'e Gönder
                </button>
                <button onClick={runPreview} className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white px-3 py-1 rounded text-[12px] flex items-center gap-1 transition-colors">
                  <Play className="w-3.5 h-3.5" /> Yenile
                </button>
              </div>
              
              <iframe ref={iframeRef} className="flex-1 w-full border-none bg-white" sandbox="allow-scripts allow-modals allow-same-origin" />
              
              {/* Terminal */}
              <div className="h-[150px] md:h-[200px] bg-[#0a0a0a] border-t border-[#2a2a2a] flex flex-col">
                <div className="px-3 py-1.5 text-[11px] font-bold text-[#888] bg-[#151515] flex justify-between items-center">
                  <span>TERMINAL</span>
                  {errorCount > 0 && <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px]">{errorCount} Hata</span>}
                </div>
                <div className="flex-1 overflow-y-auto p-2 font-mono text-[12px] md:text-[13px]">
                  {consoleLogs.map((log, i) => (
                    <div key={i} className={cn("py-0.5 break-words", log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-green-400')}>
                      <span className="opacity-50 mr-2">{'>'}</span>{log.msg}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
