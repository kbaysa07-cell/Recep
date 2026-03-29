import React, { useState } from 'react';
import { useChatTools } from '../hooks/useChatTools';

export const DebugDashboard: React.FC = () => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { runDiagnostic } = useChatTools({} as any, () => {}, () => {});

  const handleRunDiagnostic = async () => {
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
    <div className="p-4 bg-zinc-900 text-zinc-100 rounded-xl shadow-lg border border-zinc-800">
      <h2 className="text-xl font-bold mb-4">Hata Ayıklama Panosu</h2>
      <button 
        onClick={handleRunDiagnostic} 
        disabled={loading}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50"
      >
        {loading ? 'Analiz ediliyor...' : 'Kod Analizini Çalıştır'}
      </button>
      {report && (
        <pre className="mt-4 p-4 bg-black rounded-md overflow-x-auto text-xs font-mono whitespace-pre-wrap">
          {report}
        </pre>
      )}
    </div>
  );
};
