import React, { useState } from 'react';
import { Bug, AlertTriangle, Zap, ShieldAlert, Search } from 'lucide-react';
import { WorkspaceFiles } from '../types';

interface DebuggerProps {
  wsFiles: WorkspaceFiles;
}

export function Debugger({ wsFiles }: DebuggerProps) {
  const [analysis, setAnalysis] = useState<{type: 'style' | 'logic' | 'perf' | 'security', msg: string, file: string}[]>([]);

  const runAnalysis = () => {
    const newAnalysis: typeof analysis = [];
    
    Object.entries(wsFiles).forEach(([fileName, node]) => {
      if (node.type !== 'file') return;
      const content = node.content || '';

      // Simple analysis rules
      if (content.includes('var ')) {
        newAnalysis.push({ type: 'style', msg: '`var` kullanımı yerine `let` veya `const` tercih edin.', file: fileName });
      }
      if (content.includes('console.log')) {
        newAnalysis.push({ type: 'perf', msg: 'Üretim ortamında `console.log` kullanımı performans kaybına yol açabilir.', file: fileName });
      }
      if (content.includes('innerHTML')) {
        newAnalysis.push({ type: 'security', msg: '`innerHTML` kullanımı XSS saldırılarına açık olabilir.', file: fileName });
      }
      if (content.length > 5000) {
        newAnalysis.push({ type: 'perf', msg: 'Dosya boyutu çok büyük, modülerleştirmeyi düşünün.', file: fileName });
      }
    });

    setAnalysis(newAnalysis);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0a0a0a] p-4 gap-4 overflow-hidden transition-colors duration-200">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-200">
          <Bug className="w-5 h-5 text-purple-600 dark:text-purple-500" />
          Kod Analizi ve Hata Ayıklama
        </h2>
        <button onClick={runAnalysis} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-[13px] transition-colors shadow-sm">
          <Search className="w-4 h-4" /> Analizi Çalıştır
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {analysis.length === 0 && (
          <div className="text-center p-10 text-gray-500 dark:text-[#555] italic transition-colors duration-200">
            Analiz sonuçları burada görünecek.
          </div>
        )}
        {analysis.map((item, i) => (
          <div key={i} className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#2a2a2a] p-3 rounded-lg flex gap-3 items-start shadow-sm transition-colors duration-200">
            {item.type === 'style' && <Zap className="w-5 h-5 text-yellow-500 flex-shrink-0" />}
            {item.type === 'logic' && <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />}
            {item.type === 'perf' && <Zap className="w-5 h-5 text-blue-500 flex-shrink-0" />}
            {item.type === 'security' && <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />}
            
            <div className="flex-1">
              <div className="font-semibold text-[13px] text-gray-900 dark:text-white transition-colors duration-200">{item.file}</div>
              <div className="text-[12px] text-gray-600 dark:text-[#aaa] transition-colors duration-200">{item.msg}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
