import React, { useState } from 'react';
import { Bug, AlertTriangle, Zap, ShieldAlert, Search } from 'lucide-react';
import { WorkspaceFiles } from '../types';
import { useChatTools } from '../hooks/useChatTools';
import { Activity } from '../hooks/useActivity';

interface DebuggerProps {
  wsFiles: WorkspaceFiles;
  setWsFiles: React.Dispatch<React.SetStateAction<WorkspaceFiles>>;
  setActivity: React.Dispatch<React.SetStateAction<Activity[]>>;
}

export function Debugger({ wsFiles, setWsFiles, setActivity }: DebuggerProps) {
  const [analysis, setAnalysis] = useState<{type: 'style' | 'logic' | 'perf' | 'security', msg: string, file: string}[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { runDiagnostic } = useChatTools(wsFiles, setWsFiles, setActivity);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const result = await runDiagnostic();
      setReport(result);
    } catch (error) {
      setReport(`Analiz hatası: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0a0a0a] p-4 gap-4 overflow-hidden transition-colors duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-200">
          <Bug className="w-5 h-5 text-purple-600 dark:text-purple-500" />
          Hata Ayıklama
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          {report && (
            <button 
              onClick={() => {
                const aiMsg = `Kod analizi raporu:\n\n${report}\n\nLütfen bu rapordaki sorunları incele ve gerekli düzeltmeleri yap.`;
                (window as any).onAskAIToFix?.(aiMsg);
              }}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 text-[12px] md:text-[13px] transition-colors shadow-sm"
            >
              <Zap className="w-4 h-4" /> <span className="hidden sm:inline">AI ile</span> Düzelt
            </button>
          )}
          <button onClick={runAnalysis} disabled={loading} className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 text-[12px] md:text-[13px] transition-colors shadow-sm disabled:opacity-50">
            <Search className="w-4 h-4" /> {loading ? '...' : 'Analiz Et'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {report && (
          <div className="flex flex-col gap-4">
            {report.split('---').filter(Boolean).map((section, idx) => {
              const [title, ...content] = section.trim().split('\n');
              return (
                <div key={idx} className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#262626] rounded-lg overflow-hidden transition-colors duration-200">
                  <div className="bg-gray-100 dark:bg-[#1a1a1a] px-3 py-2 border-b border-gray-200 dark:border-[#262626] text-[12px] font-bold text-gray-700 dark:text-gray-300">
                    {title.replace('[', '').replace(']', '').replace(':', '')}
                  </div>
                  <pre className="p-3 overflow-x-auto text-xs font-mono whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                    {content.join('\n').trim()}
                  </pre>
                </div>
              );
            })}
          </div>
        )}
        {!report && (
          <div className="flex flex-col items-center justify-center h-full text-center p-10 text-gray-500 dark:text-[#555] italic transition-colors duration-200">
            <ShieldAlert className="w-12 h-12 mb-4 opacity-20" />
            <p>Analiz sonuçları burada görünecek. Kod tabanındaki hataları, güvenlik açıklarını ve performans sorunlarını tespit etmek için yukarıdaki butona tıklayın.</p>
          </div>
        )}
      </div>
    </div>
  );
}
