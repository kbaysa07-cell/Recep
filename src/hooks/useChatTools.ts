import { WorkspaceFiles } from '../types';
import { toast } from 'sonner';

export function useChatTools(
  wsFiles: WorkspaceFiles,
  setWsFiles: React.Dispatch<React.SetStateAction<WorkspaceFiles>>,
  setActivity: React.Dispatch<React.SetStateAction<{type: 'thought' | 'file' | 'terminal' | 'web', message: string}[]>>
) {
  return {
    editFile: (path: string, content: string) => {
      setWsFiles(prev => ({
        ...prev,
        [path]: { ...(prev[path] || { type: 'file', name: path.split('/').pop() || path }), content }
      }));
      setActivity(prev => [...prev, { type: 'file', message: `Dosya düzenlendi: ${path}` }]);
      toast.success(`Dosya güncellendi: ${path}`);
    },
    createFile: (path: string, content: string) => {
      const isBinary = path.match(/\.(png|jpe?g|gif|webp|svg|mp3|wav|ogg)$/i) !== null;
      setWsFiles(prev => ({
        ...prev,
        [path]: { type: 'file', name: path.split('/').pop() || path, content, isBinary }
      }));
      setActivity(prev => [...prev, { type: 'file', message: `Dosya oluşturuldu: ${path}` }]);
      toast.success(`Yeni dosya oluşturuldu: ${path}`);
    },
    readMultipleFiles: async (paths: string[]) => {
      let content = "";
      let totalLines = 0;
      let readCount = 0;
      paths.forEach(path => {
        if (wsFiles[path]) {
          const fileContent = wsFiles[path].content;
          content += `--- ${path} ---\n${fileContent}\n\n`;
          totalLines += fileContent.split('\n').length;
          readCount++;
        }
      });
      const msg = `${readCount} dosya okundu (${totalLines} satır kod analiz edildi)`;
      setActivity(prev => [...prev, { type: 'file', message: msg }]);
      toast.info(msg);
      return content;
    },
    grepSearch: async (pattern: string) => {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: `grep -rI "${pattern}" .` }),
      });
      const data = await response.json();
      setActivity(prev => [...prev, { type: 'terminal', message: `Arama yapıldı: ${pattern}` }]);
      toast.info(`Projede arama yapıldı: "${pattern}"`);
      return data.stdout || data.stderr || data.error;
    },
    dependencyCheck: async () => {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'npm list' }),
      });
      const data = await response.json();
      setActivity(prev => [...prev, { type: 'terminal', message: `Bağımlılık kontrolü yapıldı` }]);
      return data.stdout || data.stderr || data.error;
    },
    testRunner: async () => {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'npm test' }),
      });
      const data = await response.json();
      setActivity(prev => [...prev, { type: 'terminal', message: `Testler çalıştırıldı` }]);
      return data.stdout || data.stderr || data.error;
    },
    runCommand: async (command: string) => {
      setActivity(prev => [...prev, { type: 'terminal', message: `Komut çalıştırıldı: ${command}` }]);
      
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await response.json();
      
      if (command.startsWith('git clone')) {
        // Basit bir simülasyon: Gerçek bir klonlama yerine, kullanıcıya bilgi veriyoruz.
        // Gerçek bir uygulamada, backend'den dosya ağacını alıp wsFiles'a eklemek gerekir.
        toast.success(`GitHub deposu klonlandı (Simülasyon): ${command.split(' ')[2]}`);
        setActivity(prev => [...prev, { type: 'file', message: `Depo klonlandı: ${command.split(' ')[2]}` }]);
      }
      
      return data.stdout || data.stderr || data.error;
    }
  };
}
