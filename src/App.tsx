import React, { useState, useRef } from 'react';
import { useAppState } from './lib/useAppState';
import { ChatView } from './components/ChatView';
import { ProjectsView } from './components/ProjectsView';
import { WorkspaceView } from './components/WorkspaceView';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { MessageSquare, Folder, History, Trash2, Settings as SettingsIcon, Bot, Plus, Code, MonitorPlay } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const state = useAppState();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTaskMode, setIsTaskMode] = useState(false);

  const handleAskAIToFix = (errorMsg: string) => {
    state.setActiveTab('chat');
    
    const prompt = `Şu hatayı aldım:\n\`${errorMsg}\`\n\nLütfen projeyi incele, mantık/sözdizimi hatasını bulup SADECE hatayı düzelttiğin dosyayı gönder. Tüm projeyi baştan yazma.`;
    state.setPendingPrompt(prompt);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#0a0a0a] text-[#ededed] overflow-hidden font-sans">
      {/* Minimalist Header */}
      <header className="px-4 py-3 flex justify-between items-center border-b border-[#262626] z-10">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-white text-black rounded-full flex justify-center items-center font-bold text-[12px]">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium text-[14px] tracking-tight">
            Recep AI Engine
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setIsTaskMode(!isTaskMode)} className={cn("text-[11px] px-2 py-1 rounded-md transition-colors", isTaskMode ? "bg-blue-600 text-white" : "text-[#a3a3a3] hover:text-white")}>
            {isTaskMode ? 'Görev Modu' : 'Sohbet Modu'}
          </button>
          <button onClick={state.startNewChat} className="text-[#a3a3a3] hover:text-white transition-colors">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={() => setIsHistoryOpen(true)} className="text-[#a3a3a3] hover:text-white transition-colors">
            <History className="w-4 h-4" />
          </button>
          <button onClick={state.clearChat} className="text-[#a3a3a3] hover:text-white transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="text-[#a3a3a3] hover:text-white transition-colors">
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {state.activeTab === 'projects' ? (
          <ProjectsView
            projects={state.savedProjects}
            onOpenProject={state.openProjectFromList}
            onDeleteProject={state.deleteProject}
          />
        ) : (
          <>
            {/* Chat View - Visible on desktop, or on mobile when activeTab is 'chat' */}
            <div className={cn(
              "flex-col border-r border-[#262626] w-full md:w-[350px] lg:w-[400px] flex-shrink-0",
              state.activeTab === 'chat' ? "flex" : "hidden md:flex"
            )}>
              <ChatView
                chatHistory={state.chatHistory}
                setChatHistory={state.setChatHistory}
                wsFiles={state.wsFiles}
                aiContextFiles={state.aiContextFiles}
                limit={state.getActiveContextLimit()}
                onOpenWorkspace={state.openWorkspaceFromChat}
                pendingPrompt={state.pendingPrompt}
                setPendingPrompt={state.setPendingPrompt}
                models={state.models}
                activeModelId={state.activeModelId}
                setActiveModelId={state.setActiveModelId}
                isTaskMode={isTaskMode}
                iframeRef={iframeRef}
              />
            </div>

            {/* Workspace View - Visible on desktop, or on mobile when activeTab is not 'chat' or 'projects' */}
            <div className={cn(
              "flex-1 flex-col overflow-hidden",
              (state.activeTab === 'files' || state.activeTab === 'code' || state.activeTab === 'preview') ? "flex" : "hidden md:flex"
            )}>
              <WorkspaceView
                activeTab={(state.activeTab === 'files' || state.activeTab === 'code' || state.activeTab === 'preview') ? state.activeTab : 'code'}
                setActiveTab={(tab) => state.setActiveTab(tab)}
                wsFiles={state.wsFiles}
                setWsFiles={state.setWsFiles}
                currentFileName={state.currentFileName}
                setCurrentFileName={state.setCurrentFileName}
                wsProjectName={state.wsProjectName}
                setWsProjectName={state.setWsProjectName}
                currentWorkspaceId={state.currentWorkspaceId}
                setCurrentWorkspaceId={state.setCurrentWorkspaceId}
                savedProjects={state.savedProjects}
                setSavedProjects={state.setSavedProjects}
                aiContextFiles={state.aiContextFiles}
                setAiContextFiles={state.setAiContextFiles}
                onAskAIToFix={handleAskAIToFix}
                iframeRef={iframeRef}
              />
            </div>
          </>
        )}
      </main>

      {/* Minimalist Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden flex bg-[#0a0a0a] border-t border-[#262626] pb-[env(safe-area-inset-bottom)]">
        <button
          onClick={() => state.setActiveTab('chat')}
          className={cn(
            "flex-1 py-3 flex flex-col items-center gap-1 text-[10px] font-medium cursor-pointer transition-colors",
            state.activeTab === 'chat' ? "text-blue-500" : "text-[#888]"
          )}
        >
          <MessageSquare className="w-5 h-5" />
          Sohbet
        </button>
        <button
          onClick={() => state.setActiveTab('files')}
          className={cn(
            "flex-1 py-3 flex flex-col items-center gap-1 text-[10px] font-medium cursor-pointer transition-colors",
            state.activeTab === 'files' ? "text-blue-500" : "text-[#888]"
          )}
        >
          <Folder className="w-5 h-5" />
          Dosyalar
        </button>
        <button
          onClick={() => state.setActiveTab('code')}
          className={cn(
            "flex-1 py-3 flex flex-col items-center gap-1 text-[10px] font-medium cursor-pointer transition-colors",
            state.activeTab === 'code' ? "text-blue-500" : "text-[#888]"
          )}
        >
          <Code className="w-5 h-5" />
          Kod
        </button>
        <button
          onClick={() => state.setActiveTab('preview')}
          className={cn(
            "flex-1 py-3 flex flex-col items-center gap-1 text-[10px] font-medium cursor-pointer transition-colors",
            state.activeTab === 'preview' ? "text-blue-500" : "text-[#888]"
          )}
        >
          <MonitorPlay className="w-5 h-5" />
          Önizleme
        </button>
      </nav>

      {/* Modals */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        archivedSessions={state.archivedSessions}
        onDeleteSession={state.deleteArchivedSession}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={state.theme}
        setTheme={state.setTheme}
        models={state.models}
        setModels={state.setModels}
        activeModelId={state.activeModelId}
        setActiveModelId={state.setActiveModelId}
      />
    </div>
  );
}
