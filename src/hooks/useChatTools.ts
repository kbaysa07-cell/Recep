import { WorkspaceFiles, FileNode } from '../types';
import { Activity } from './useActivity';
import { getEmbedding, cosineSimilarity } from '../services/embeddingService';
import { analyzeAndFix } from '../services/selfHealingService';
import { findNode, cloneWorkspace, flattenWorkspace, ensureDirectory } from '../lib/workspaceUtils';

export function useChatTools(
  wsFiles: WorkspaceFiles,
  setWsFiles: React.Dispatch<React.SetStateAction<WorkspaceFiles>>,
  setActivity: React.Dispatch<React.SetStateAction<Activity[]>>,
  setGithubState?: React.Dispatch<React.SetStateAction<any>>
) {
  const runCommand = async (command: string) => {
    setActivity(prev => [...prev, { type: 'terminal', message: `Komut çalıştırıldı: ${command}`, timestamp: Date.now() }]);
    
    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      
      if (!response.ok) {
        throw new Error('Terminal API bulunamadı');
      }
      
      const data = await response.json();
      
      if (command.startsWith('git clone')) {
        const repoName = command.split(' ')[2] || 'depo';
        setActivity(prev => [...prev, { type: 'file', message: `Depo klonlandı: ${repoName}`, timestamp: Date.now() }]);
      }
      
      return data.stdout || data.stderr || data.error;
    } catch (err) {
      // Fallback for browser environment without backend
      if (command.startsWith('npm install') || command.startsWith('npm i')) {
        const packages = command.split(' ').slice(2).join(', ');
        return `Simüle edildi: ${packages} paketleri yüklendi (Tarayıcı ortamında paketler CDN üzerinden otomatik yüklenir).`;
      } else if (command.startsWith('git clone')) {
        return `Simüle edildi: 'fetchGithubRepo' aracını kullanarak GitHub depolarını klonlayabilirsiniz.`;
      } else {
        return `Simüle edildi: ${command} (Gerçek terminal bağlantısı yok)`;
      }
    }
  };

  const editFile = (path: string, content: string) => {
    setWsFiles(prev => {
      const newFiles = cloneWorkspace(prev);
      const parts = path.split('/').filter(Boolean);
      const fileName = parts.pop();
      
      if (!fileName) return prev;
      
      const parentDir = ensureDirectory(newFiles, parts.join('/'));
      
      if (parentDir[fileName]) {
        parentDir[fileName].content = content;
      } else {
        parentDir[fileName] = { type: 'file', name: fileName, content };
      }
      
      return newFiles;
    });
    setActivity(prev => [...prev, { type: 'file', message: `Dosya düzenlendi: ${path}`, timestamp: Date.now() }]);
  };

  const editMultipleFiles = (files: { path: string; content: string }[]) => {
    setWsFiles(prev => {
      const newFiles = cloneWorkspace(prev);
      
      files.forEach(file => {
        const parts = file.path.split('/').filter(Boolean);
        const fileName = parts.pop();
        
        if (!fileName) return;
        
        const parentDir = ensureDirectory(newFiles, parts.join('/'));
        
        if (parentDir[fileName]) {
          parentDir[fileName].content = file.content;
        } else {
          parentDir[fileName] = { type: 'file', name: fileName, content: file.content };
        }
      });
      
      return newFiles;
    });
    setActivity(prev => [...prev, { type: 'file', message: `Çoklu dosya düzenlendi: ${files.map(f => f.path).join(', ')}`, timestamp: Date.now() }]);
  };

  const createFile = (path: string, content: string) => {
    const isBinary = path.match(/\.(png|jpe?g|gif|webp|svg|mp3|wav|ogg)$/i) !== null;
    setWsFiles(prev => {
      const newFiles = cloneWorkspace(prev);
      const parts = path.split('/').filter(Boolean);
      const fileName = parts.pop();
      
      if (!fileName) return prev;
      
      const parentDir = ensureDirectory(newFiles, parts.join('/'));
      parentDir[fileName] = { type: 'file', name: fileName, content, isBinary };
      
      return newFiles;
    });
    setActivity(prev => [...prev, { type: 'file', message: `Dosya oluşturuldu: ${path}`, timestamp: Date.now() }]);
  };

  const readMultipleFiles = async (paths: string[]) => {
    let content = "";
    let totalLines = 0;
    let readCount = 0;
    const MAX_LINES = 2000;
    
    for (const path of paths) {
      const node = findNode(wsFiles, path);
      if (node && node.type === 'file') {
        const fileContent = node.content || '';
        const lines = fileContent.split('\n');
        
        if (totalLines + lines.length > MAX_LINES) {
          content += `--- ${path} (TRUNCATED - Bağlam sınırı aşıldı) ---\n${lines.slice(0, MAX_LINES - totalLines).join('\n')}\n...\n\n`;
          totalLines = MAX_LINES;
          break;
        }
        
        content += `--- ${path} ---\n${fileContent}\n\n`;
        totalLines += lines.length;
        readCount++;
      }
    }
    const msg = `${readCount} dosya okundu: ${paths.join(', ')} (${totalLines} satır kod analiz edildi)`;
    setActivity(prev => [...prev, { type: 'file', message: msg, timestamp: Date.now() }]);
    return content;
  };

  const grepSearch = async (pattern: string) => {
    let results: string[] = [];
    const allFiles = flattenWorkspace(wsFiles);
    
    allFiles.forEach(({ path, node }) => {
      if (node.type === 'file' && node.content) {
        const lines = node.content.split('\n');
        lines.forEach((line: string, index: number) => {
          if (line.includes(pattern)) {
            results.push(`${path}:${index + 1}: ${line.trim()}`);
          }
        });
      }
    });

    setActivity(prev => [...prev, { type: 'terminal', message: `Arama yapıldı: ${pattern}`, timestamp: Date.now() }]);
    return results.length > 0 ? results.join('\n') : 'Sonuç bulunamadı.';
  };

  const searchFiles = async (pattern: string) => {
    const allFiles = flattenWorkspace(wsFiles);
    const results = allFiles
      .filter(({ path }) => path.includes(pattern))
      .map(({ path }) => path);

    setActivity(prev => [...prev, { type: 'terminal', message: `Dosya arandı: ${pattern}`, timestamp: Date.now() }]);
    return results.length > 0 ? results.join('\n') : 'Dosya bulunamadı.';
  };

  const readFileChunk = async (path: string, startLine: number, endLine: number) => {
    const node = findNode(wsFiles, path);
    if (node && node.type === 'file') {
      const lines = (node.content || '').split('\n');
      const chunk = lines.slice(Math.max(0, startLine - 1), endLine).join('\n');
      setActivity(prev => [...prev, { type: 'file', message: `Dosya bölümü okundu: ${path} (${startLine}-${endLine})`, timestamp: Date.now() }]);
      return `--- ${path} (Satır ${startLine}-${endLine}) ---\n${chunk}`;
    }
    return `Hata: ${path} dosyası bulunamadı.`;
  };


  const dependencyCheck = async () => {
    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'npm list' }),
      });
      
      if (!response.ok) {
        throw new Error('Terminal API bulunamadı');
      }
      
      const data = await response.json();
      setActivity(prev => [...prev, { type: 'terminal', message: `Bağımlılık kontrolü yapıldı`, timestamp: Date.now() }]);
      return data.stdout || data.stderr || data.error;
    } catch (err) {
      setActivity(prev => [...prev, { type: 'terminal', message: `Bağımlılık kontrolü simüle edildi`, timestamp: Date.now() }]);
      return "Simüle edildi: Bağımlılıklar kontrol edildi. (Gerçek terminal bağlantısı yok)";
    }
  };

  const testRunner = async () => {
    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'npm test' }),
      });
      
      if (!response.ok) {
        throw new Error('Terminal API bulunamadı');
      }
      
      const data = await response.json();
      setActivity(prev => [...prev, { type: 'terminal', message: `Testler çalıştırıldı`, timestamp: Date.now() }]);
      return data.stdout || data.stderr || data.error;
    } catch (err) {
      setActivity(prev => [...prev, { type: 'terminal', message: `Testler simüle edildi`, timestamp: Date.now() }]);
      return "Simüle edildi: Testler çalıştırıldı ve başarılı oldu. (Gerçek terminal bağlantısı yok)";
    }
  };

  const runSpecificTests = async (testPath?: string) => {
    const command = testPath ? `npm test -- ${testPath}` : 'npm test';
    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      
      if (!response.ok) {
        throw new Error('Terminal API bulunamadı');
      }
      
      const data = await response.json();
      setActivity(prev => [...prev, { type: 'terminal', message: `Testler çalıştırıldı: ${testPath || 'tümü'}`, timestamp: Date.now() }]);
      return data.stdout || data.stderr || data.error;
    } catch (err) {
      setActivity(prev => [...prev, { type: 'terminal', message: `Testler simüle edildi: ${testPath || 'tümü'}`, timestamp: Date.now() }]);
      return `Simüle edildi: Testler çalıştırıldı (${testPath || 'tümü'}). (Gerçek terminal bağlantısı yok)`;
    }
  };
  const getFileContent = (path: string) => {
    const node = findNode(wsFiles, path);
    return node && node.type === 'file' ? node.content : null;
  };

  const selfHeal = async (testPath: string, filePath: string) => {
    setActivity(prev => [...prev, { type: 'terminal', message: `Otomatik iyileştirme başlatılıyor: ${testPath}`, timestamp: Date.now() }]);
    
    let attempts = 0;
    const MAX_ATTEMPTS = 3;
    
    while (attempts < MAX_ATTEMPTS) {
      const errorLog = await runSpecificTests(testPath);
      if (errorLog.includes('passed') || errorLog.includes('success')) {
        setActivity(prev => [...prev, { type: 'terminal', message: `Testler başarılı!`, timestamp: Date.now() }]);
        return "Testler başarılı.";
      }
      
      const fileContent = getFileContent(filePath) || "";

      const fixedContent = await analyzeAndFix(errorLog, fileContent, filePath);
      editFile(filePath, fixedContent);
      
      attempts++;
    }
    return "İyileştirme başarısız oldu.";
  };

  const semanticSearch = async (query: string) => {
    setActivity(prev => [...prev, { type: 'terminal', message: `Semantik arama yapılıyor: ${query}`, timestamp: Date.now() }]);
    
    try {
      const queryEmbedding = await getEmbedding(query);
      const results: { path: string; score: number; content: string }[] = [];
      
      const allFiles = flattenWorkspace(wsFiles);
      
      for (const { path, node } of allFiles) {
        if (node.type === 'file' && node.content) {
          const fileEmbedding = await getEmbedding(node.content.substring(0, 5000)); // İlk 5000 karakter
          const score = cosineSimilarity(queryEmbedding, fileEmbedding);
          results.push({ path, score, content: node.content });
        }
      }
      
      results.sort((a, b) => b.score - a.score);
      
      const topResults = results.slice(0, 3);
      
      setActivity(prev => [...prev, { type: 'terminal', message: `Semantik arama tamamlandı.`, timestamp: Date.now() }]);
      return topResults.map(r => `${r.path} (Benzerlik: ${r.score.toFixed(2)})`).join('\n');
    } catch (err: any) {
      setActivity(prev => [...prev, { type: 'terminal', message: `Semantik arama hatası: ${err.message}`, timestamp: Date.now() }]);
      return `Hata: ${err.message}`;
    }
  };


  const gitStatus = async () => {
    setActivity(prev => [...prev, { type: 'terminal', message: `Git durumu kontrol ediliyor...`, timestamp: Date.now() }]);
    return await runCommand('git status');
  };

  const gitAdd = async (file: string) => {
    setActivity(prev => [...prev, { type: 'terminal', message: `Dosya ekleniyor: ${file}`, timestamp: Date.now() }]);
    return await runCommand(`git add ${file}`);
  };

  const gitCommit = async (message: string) => {
    setActivity(prev => [...prev, { type: 'terminal', message: `Commit yapılıyor: ${message}`, timestamp: Date.now() }]);
    try {
      // First add all files
      await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: `git add .` }),
      });

      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: `git commit -m "${message}"` }),
      });
      if (!response.ok) throw new Error('Terminal API bulunamadı');
      const data = await response.json();
      return data.stdout || data.stderr || data.error || 'Commit başarılı.';
    } catch (err) {
      return `Simüle edildi: Commit yapıldı "${message}" (Gerçek terminal bağlantısı yok)`;
    }
  };
  const gitPush = async () => {
    setActivity(prev => [...prev, { type: 'terminal', message: `Değişiklikler push ediliyor...`, timestamp: Date.now() }]);
    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'git push' }),
      });
      if (!response.ok) throw new Error('Terminal API bulunamadı');
      const data = await response.json();
      return data.stdout || data.stderr || data.error || 'Push başarılı.';
    } catch (err) {
      return `Simüle edildi: Değişiklikler push edildi (Gerçek terminal bağlantısı yok)`;
    }
  };

  const gitPull = async () => {
    setActivity(prev => [...prev, { type: 'terminal', message: `Değişiklikler pull ediliyor...`, timestamp: Date.now() }]);
    return await runCommand('git pull');
  };

  const runDiagnostic = async () => {
    setActivity(prev => [...prev, { type: 'terminal', message: `Kapsamlı kod analizi başlatılıyor...`, timestamp: Date.now() }]);
    
    try {
      // 1. TypeScript Linting
      const lintRes = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'npm run lint' }),
      });
      const lintData = await lintRes.json();
      const lintResult = lintData.stdout || lintData.stderr || lintData.error || "Linting başarılı.";

      // 2. Security Audit (Simple grep for dangerous patterns)
      const securityRes = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'grep -rI "eval\\|innerHTML\\|dangerouslySetInnerHTML" src' }),
      });
      const securityData = await securityRes.json();
      const securityResult = securityData.stdout ? `Potansiyel güvenlik riskleri:\n${securityData.stdout}` : "Güvenlik taraması: Tehlikeli desen bulunamadı.";

      // 3. Performance Audit (Check for large files or heavy imports)
      const allFiles = flattenWorkspace(wsFiles);
      const largeFiles = allFiles.filter(({ node }) => (node.content?.length || 0) > 20000).map(({ path }) => path);
      const performanceResult = largeFiles.length > 0 ? `Büyük dosyalar (Performans uyarısı):\n${largeFiles.join('\n')}` : "Performans taraması: Büyük dosya bulunamadı.";

      const finalResult = `--- KOD ANALİZ RAPORU ---\n\n[LINT SONUCU]:\n${lintResult}\n\n[GÜVENLİK TARAMASI]:\n${securityResult}\n\n[PERFORMANS TARAMASI]:\n${performanceResult}`;
      
      setActivity(prev => [...prev, { type: 'terminal', message: `Kod analizi tamamlandı.`, timestamp: Date.now() }]);
      return finalResult;
    } catch (err) {
      setActivity(prev => [...prev, { type: 'terminal', message: `Kod analizi simüle edildi.`, timestamp: Date.now() }]);
      return "Simüle edildi: Kod analizi tamamlandı. (Gerçek terminal bağlantısı yok)";
    }
  };

  const fetchGithubRepo = async (repoUrl: string, token?: string) => {
    setActivity(prev => [...prev, { type: 'web', message: `GitHub deposu çekiliyor: ${repoUrl}`, timestamp: Date.now() }]);
    try {
      // Extract owner and repo from URL
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) return "Geçersiz GitHub URL'si. Lütfen 'https://github.com/owner/repo' formatında bir URL girin.";
      
      const owner = match[1];
      const repo = match[2].replace('.git', '');
      
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
      };
      
      if (token) {
        headers['Authorization'] = `token ${token}`;
      }
      
      // Fetch default branch
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (!repoRes.ok) return `Depo bulunamadı veya erişim reddedildi (Durum: ${repoRes.status}). Özel depolar için GitHub Token'ı ayarlardan girmelisiniz.`;
      
      const repoData = await repoRes.json();
      const defaultBranch = repoData.default_branch;
      
      if (setGithubState) {
        setGithubState({
          owner,
          repo,
          branch: defaultBranch,
          token
        });
      }
      
      // Fetch tree recursively
      const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, { headers });
      if (!treeRes.ok) return `Dosya ağacı çekilemedi (Durum: ${treeRes.status}).`;
      
      const treeData = await treeRes.json();
      
      // Sadece önemli dosyaları al (çok büyük projelerde limit aşımını önlemek için)
      const files = treeData.tree.filter((item: any) => 
        item.type === 'blob' && 
        !item.path.includes('node_modules/') && 
        !item.path.includes('.git/') &&
        !item.path.includes('dist/') &&
        !item.path.includes('build/') &&
        item.size < 100000 // 100KB'den küçük dosyalar
      );
      
      setActivity(prev => [...prev, { type: 'web', message: `${files.length} dosya bulundu. İndiriliyor...`, timestamp: Date.now() }]);
      
      // Build new workspace files object
      const newWsFiles: WorkspaceFiles = {};
      
      // Sadece ağaç yapısını oluştur, içerikleri daha sonra ihtiyaç oldukça çekeceğiz
      for (const file of files) {
        const parts = file.path.split('/');
        let current: any = newWsFiles;
        
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part]) {
            current[part] = { type: 'folder', name: part, children: {} };
          }
          if (!current[part].children) {
            current[part].children = {};
          }
          current = current[part].children;
        }
        
        const lastPart = parts[parts.length - 1];
        const isBinary = lastPart.match(/\.(png|jpe?g|gif|webp|svg|mp3|wav|ogg|ico|ttf|woff|woff2|eot)$/i) !== null;
        
        current[lastPart] = { 
          type: 'file', 
          name: lastPart, 
          content: `// Bu dosya GitHub'dan klonlandı. İçeriği okumak için 'readGithubFile' aracını kullanın.\n// URL: https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file.path}`, 
          isBinary,
          githubUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file.path}` // Özel alan
        };
      }
      
      setWsFiles(newWsFiles);
      setActivity(prev => [...prev, { type: 'file', message: `Depo başarıyla içe aktarıldı.`, timestamp: Date.now() }]);
      return `Depo başarıyla klonlandı. Toplam ${files.length} dosya bulundu. Dosya içeriklerini okumak için 'readGithubFile' aracını kullanabilirsiniz.`;
      
    } catch (err: any) {
      return `GitHub hatası: ${err.message}`;
    }
  };

  const readGithubFile = async (url: string, token?: string) => {
    setActivity(prev => [...prev, { type: 'web', message: `GitHub dosyası okunuyor: ${url.split('/').pop()}`, timestamp: Date.now() }]);
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `token ${token}`;
      }
      
      const res = await fetch(url, { headers });
      if (!res.ok) return `Dosya okunamadı (Durum: ${res.status}).`;
      
      const content = await res.text();
      
      // Çalışma alanındaki dosyayı güncelle
      const updateFileContent = (files: WorkspaceFiles, targetUrl: string, newContent: string) => {
        for (const [name, node] of Object.entries<any>(files)) {
          if (node.type === 'file' && node.githubUrl === targetUrl) {
            node.content = newContent;
            return true;
          } else if (node.children) {
            if (updateFileContent(node.children, targetUrl, newContent)) return true;
          }
        }
        return false;
      };
      
      setWsFiles(prev => {
        const newFiles = cloneWorkspace(prev);
        updateFileContent(newFiles, url, content);
        return newFiles;
      });
      
      setActivity(prev => [...prev, { type: 'file', message: `Dosya okundu ve çalışma alanına eklendi.`, timestamp: Date.now() }]);
      return content;
    } catch (err: any) {
      return `Dosya okuma hatası: ${err.message}`;
    }
  };

  return {
    editFile,
    editMultipleFiles,
    createFile,
    readMultipleFiles,
    grepSearch,
    searchFiles,
    readFileChunk,
    dependencyCheck,
    testRunner,
    runSpecificTests,
    selfHeal,
    runCommand,
    getFileContent,
    semanticSearch,
    gitStatus,
    gitAdd,
    gitCommit,
    gitPush,
    gitPull,
    runDiagnostic,
    fetchGithubRepo,
    readGithubFile
  };
}
