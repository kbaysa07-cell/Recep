import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from './lib/useAppState';
import { ChatView } from './components/ChatView';
import { ProjectsView } from './components/ProjectsView';
import { WorkspaceView } from './components/WorkspaceView';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { MessageSquare, Folder, History, Trash2, Settings as SettingsIcon, Bot, Plus, Code, MonitorPlay, CheckSquare, Bug, PanelLeft, PanelRight } from 'lucide-react';
import { cn } from './lib/utils';
import * as Resizable from 'react-resizable-panels';
const { Panel, Group, Separator: PanelResizeHandle } = Resizable as any;
import { Toaster } from 'sonner';

export default function App() {
  const state = useAppState();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTaskMode, setIsTaskMode] = useState(false);
  const [activity, setActivity] = useState<{type: 'thought' | 'file' | 'terminal' | 'web', message: string}[]>([]);
  const [chatPosition, setChatPosition] = useState<'left' | 'right'>('left');
  const [isMobile, setIsMobile] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile && state.activeTab === 'chat') {
        state.setActiveTab('code');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [state.activeTab]);

  const handleAskAIToFix = (errorMsg: string) => {
    state.setActiveTab('chat');
    
    const prompt = `Şu hatayı aldım:\n\`${errorMsg}\`\n\nLütfen projeyi incele, mantık/sözdizimi hatasını bulup SADECE hatayı düzelttiğin dosyayı gönder. Tüm projeyi baştan yazma.`;
    state.setPendingPrompt(prompt);
  };

  const renderChat = () => (
    <div className="flex flex-col h-full w-full bg-[#0a0a0a]">
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
        activity={activity}
        setActivity={setActivity}
        setWsFiles={state.setWsFiles}
        searchContext={state.searchContext}
      />
    </div>
  );

  const renderWorkspace = () => (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#0f0f0f]">
      <WorkspaceView
        activeTab={(state.activeTab === 'files' || state.activeTab === 'code' || state.activeTab === 'preview' || state.activeTab === 'plan' || state.activeTab === 'debugger') ? state.activeTab : 'code'}
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
        undoWs={state.undoWs}
        redoWs={state.redoWs}
        canUndoWs={state.canUndoWs}
        canRedoWs={state.canRedoWs}
      />
    </div>
  );

  return (
    <div className={cn("flex flex-col h-[100dvh] w-full bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-[#ededed] overflow-hidden font-sans selection:bg-blue-500/30 transition-colors duration-200", state.theme)}>
      <Toaster position="top-center" theme={state.theme} />
      {/* Minimalist Header */}
      <header className="px-4 py-2.5 flex justify-between items-center border-b border-gray-200 dark:border-[#262626] z-10 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg flex justify-center items-center font-bold shadow-lg shadow-blue-500/20">
            <Bot className="w-4 h-4" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-[#a3a3a3]">
            Recep AI Engine
          </span>
        </div>
        <div className="flex gap-1.5 md:gap-2 items-center">
          <button onClick={() => setIsTaskMode(!isTaskMode)} className={cn("text-[11px] px-2.5 py-1.5 rounded-md transition-all font-medium flex items-center gap-1.5", isTaskMode ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-[#a3a3a3] hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#262626]")} title="Mod Değiştir">
            {isTaskMode ? <><CheckSquare className="w-3.5 h-3.5" /> Görev Modu</> : <><MessageSquare className="w-3.5 h-3.5" /> Sohbet Modu</>}
          </button>
          <div className="hidden md:flex items-center bg-gray-100 dark:bg-[#1a1a1a] rounded-md p-0.5 ml-2 transition-colors duration-200">
            <button onClick={() => setChatPosition('left')} className={cn("p-1.5 rounded-sm transition-colors", chatPosition === 'left' ? "bg-white dark:bg-[#262626] text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-[#888] hover:text-gray-900 dark:hover:text-white")} title="Chat Solda">
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setChatPosition('right')} className={cn("p-1.5 rounded-sm transition-colors", chatPosition === 'right' ? "bg-white dark:bg-[#262626] text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-[#888] hover:text-gray-900 dark:hover:text-white")} title="Chat Sağda">
              <PanelRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-4 w-px bg-gray-200 dark:bg-[#262626] mx-1 hidden md:block transition-colors duration-200"></div>
          <button onClick={state.startNewChat} className="p-1.5 text-gray-500 dark:text-[#a3a3a3] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1a1a] rounded-md transition-colors" title="Yeni Sohbet">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={() => setIsHistoryOpen(true)} className="p-1.5 text-gray-500 dark:text-[#a3a3a3] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1a1a] rounded-md transition-colors" title="Geçmiş">
            <History className="w-4 h-4" />
          </button>
          <button onClick={state.clearChat} className="p-1.5 text-gray-500 dark:text-[#a3a3a3] hover:text-red-600 dark:hover:text-white hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400 rounded-md transition-colors" title="Sohbeti Temizle">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 text-gray-500 dark:text-[#a3a3a3] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1a1a] rounded-md transition-colors" title="Ayarlar">
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative bg-white dark:bg-[#0a0a0a] transition-colors duration-200">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex flex-col w-14 border-r border-gray-200 dark:border-[#262626] bg-gray-50 dark:bg-[#0a0a0a] py-4 items-center gap-4 z-10 transition-colors duration-200">
          <button onClick={() => setIsChatOpen(!isChatOpen)} className={cn("p-2.5 rounded-xl transition-all", isChatOpen ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500" : "text-gray-500 dark:text-[#666] hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#1a1a1a]")} title="Sohbeti Aç/Kapat">
            <MessageSquare className="w-5 h-5" />
          </button>
          <button onClick={() => state.setActiveTab('files')} className={cn("p-2.5 rounded-xl transition-all", state.activeTab === 'files' ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500" : "text-gray-500 dark:text-[#666] hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#1a1a1a]")} title="Dosyalar">
            <Folder className="w-5 h-5" />
          </button>
          <button onClick={() => state.setActiveTab('code')} className={cn("p-2.5 rounded-xl transition-all", state.activeTab === 'code' ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500" : "text-gray-500 dark:text-[#666] hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#1a1a1a]")} title="Kod">
            <Code className="w-5 h-5" />
          </button>
          <button onClick={() => state.setActiveTab('preview')} className={cn("p-2.5 rounded-xl transition-all", state.activeTab === 'preview' ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500" : "text-gray-500 dark:text-[#666] hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#1a1a1a]")} title="Önizleme">
            <MonitorPlay className="w-5 h-5" />
          </button>
          <button onClick={() => state.setActiveTab('plan')} className={cn("p-2.5 rounded-xl transition-all", state.activeTab === 'plan' ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500" : "text-gray-500 dark:text-[#666] hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#1a1a1a]")} title="Plan">
            <CheckSquare className="w-5 h-5" />
          </button>
          <button onClick={() => state.setActiveTab('debugger')} className={cn("p-2.5 rounded-xl transition-all", state.activeTab === 'debugger' ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500" : "text-gray-500 dark:text-[#666] hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#1a1a1a]")} title="Hata Ayıklama">
            <Bug className="w-5 h-5" />
          </button>
        </div>

        {state.activeTab === 'projects' ? (
          <ProjectsView
            projects={state.savedProjects}
            onOpenProject={state.openProjectFromList}
            onDeleteProject={state.deleteProject}
          />
        ) : (
          <div className="flex-1 w-full h-full">
            {isMobile ? (
              // Mobile Layout (Single View)
              <div className="w-full h-full flex flex-col">
                {state.activeTab === 'chat' && renderChat()}
                {(state.activeTab === 'files' || state.activeTab === 'code' || state.activeTab === 'preview' || state.activeTab === 'plan' || state.activeTab === 'debugger') && renderWorkspace()}
              </div>
            ) : (
              // Desktop Layout (Resizable Panels)
              <Group direction="horizontal" className="w-full h-full">
                {isChatOpen && chatPosition === 'left' && (
                  <>
                    <Panel defaultSize={35} minSize={20} className="h-full">
                      {renderChat()}
                    </Panel>
                    <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-[#262626] hover:bg-blue-400 dark:hover:bg-blue-500/50 active:bg-blue-500 transition-colors cursor-col-resize" />
                  </>
                )}
                
                <Panel defaultSize={isChatOpen ? 65 : 100} minSize={30} className="h-full">
                  {renderWorkspace()}
                </Panel>

                {isChatOpen && chatPosition === 'right' && (
                  <>
                    <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-[#262626] hover:bg-blue-400 dark:hover:bg-blue-500/50 active:bg-blue-500 transition-colors cursor-col-resize" />
                    <Panel defaultSize={35} minSize={20} className="h-full">
                      {renderChat()}
                    </Panel>
                  </>
                )}
              </Group>
            )}
          </div>
        )}
      </main>

      {/* Minimalist Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden flex bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-lg border-t border-gray-200 dark:border-[#262626] pb-[env(safe-area-inset-bottom)] px-1 pt-1 z-20 transition-colors duration-200">
        <button
          onClick={() => state.setActiveTab('chat')}
          className={cn(
            "flex-1 py-2.5 flex flex-col items-center gap-1 text-[10px] font-medium cursor-pointer transition-all rounded-xl mb-1",
            state.activeTab === 'chat' ? "text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-blue-500/10" : "text-gray-500 dark:text-[#666] hover:text-gray-900 dark:hover:text-[#aaa]"
          )}
        >
          <MessageSquare className="w-5 h-5" />
          Sohbet
        </button>
        <button
          onClick={() => state.setActiveTab('files')}
          className={cn(
            "flex-1 py-2.5 flex flex-col items-center gap-1 text-[10px] font-medium cursor-pointer transition-all rounded-xl mb-1",
            state.activeTab === 'files' ? "text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-blue-500/10" : "text-gray-500 dark:text-[#666] hover:text-gray-900 dark:hover:text-[#aaa]"
          )}
        >
          <Folder className="w-5 h-5" />
          Dosyalar
        </button>
        <button
          onClick={() => state.setActiveTab('code')}
          className={cn(
            "flex-1 py-2.5 flex flex-col items-center gap-1 text-[10px] font-medium cursor-pointer transition-all rounded-xl mb-1",
            state.activeTab === 'code' ? "text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-blue-500/10" : "text-gray-500 dark:text-[#666] hover:text-gray-900 dark:hover:text-[#aaa]"
          )}
        >
          <Code className="w-5 h-5" />
          Kod
        </button>
        <button
          onClick={() => state.setActiveTab('preview')}
          className={cn(
            "flex-1 py-2.5 flex flex-col items-center gap-1 text-[10px] font-medium cursor-pointer transition-all rounded-xl mb-1",
            state.activeTab === 'preview' ? "text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-blue-500/10" : "text-gray-500 dark:text-[#666] hover:text-gray-900 dark:hover:text-[#aaa]"
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
