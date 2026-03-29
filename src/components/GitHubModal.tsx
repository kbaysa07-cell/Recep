import React, { useState } from 'react';
import { X, Github, Download, Key, Upload, GitCommit } from 'lucide-react';
import { GithubState } from '../types/workspace.types';


interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFetchRepo: (url: string, token?: string) => Promise<string>;
  onCommit: (message: string) => Promise<string>;
  onPush: () => Promise<string>;
  providerKeys: Record<string, string>;
  setProviderKeys: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  githubState: GithubState | null;
}

export function GitHubModal({ isOpen, onClose, onFetchRepo, onCommit, onPush, providerKeys, setProviderKeys, githubState }: GitHubModalProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [token, setToken] = useState(providerKeys['github'] || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [commitMessage, setCommitMessage] = useState('');

  if (!isOpen) return null;

  const handleFetch = async () => {
    if (!repoUrl) {
      setMessage('Lütfen bir depo URL\'si girin.');
      return;
    }

    setIsLoading(true);
    setMessage('');
    try {
      const result = await onFetchRepo(repoUrl, token);
      setMessage(result);
      if (result.includes('başarıyla')) {
        setTimeout(onClose, 2000);
      }
    } catch (error: any) {
      setMessage(`Hata: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToken = () => {
    setProviderKeys(prev => ({ ...prev, github: token }));
    setMessage('GitHub Token kaydedildi.');
  };

  const handleCommitAndPush = async () => {
    if (!commitMessage) {
      setMessage('Lütfen bir commit mesajı girin.');
      return;
    }
    setIsLoading(true);
    setMessage('Değişiklikler gönderiliyor...');
    
    try {
      const commitResult = await onCommit(commitMessage);
      setMessage(`Commit sonucu: ${commitResult}\nPush işlemi başlatılıyor...`);
      
      const pushResult = await onPush();
      setMessage(`Push sonucu: ${pushResult}`);
      
      if (pushResult.includes('başarılı') || pushResult.includes('simüle')) {
         setTimeout(onClose, 3000);
      }
    } catch (error: any) {
      setMessage(`Hata: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200 dark:border-[#333] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Github className="w-5 h-5" />
            GitHub Entegrasyonu
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Token Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <Key className="w-4 h-4" />
              GitHub Personal Access Token
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
                className="flex-1 p-2 border border-gray-300 dark:border-[#333] rounded bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-white"
              />
              <button
                onClick={handleSaveToken}
                className="px-3 py-2 bg-gray-200 dark:bg-[#333] text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-[#444] transition-colors"
              >
                Kaydet
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Özel depoları çekmek ve değişiklikleri göndermek (Push) için gereklidir.
            </p>
          </div>

          <hr className="border-gray-200 dark:border-[#333]" />

          {/* Clone Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1">
              <Download className="w-4 h-4" /> Depoyu Klonla
            </h3>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              GitHub Depo URL'si
            </label>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/kullanici/repo"
              className="w-full p-2 border border-gray-300 dark:border-[#333] rounded bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-white mb-2"
            />
            <button
              onClick={handleFetch}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isLoading ? 'İşleniyor...' : 'Depoyu Çek'}
            </button>
          </div>

          {/* Push Section (Only visible if a repo is loaded) */}
          {githubState && (
            <>
              <hr className="border-gray-200 dark:border-[#333]" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1">
                  <Upload className="w-4 h-4" /> Değişiklikleri Gönder (Push)
                </h3>
                <div className="bg-gray-50 dark:bg-[#151515] p-3 rounded border border-gray-200 dark:border-[#333] mb-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-gray-200">Depo:</span> {githubState.owner}/{githubState.repo}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-gray-200">Dal (Branch):</span> {githubState.branch}
                  </p>
                </div>
                
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Commit Mesajı
                </label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Örn: Buton rengi düzeltildi"
                  className="w-full p-2 border border-gray-300 dark:border-[#333] rounded bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-white mb-2"
                />
                <button
                  onClick={handleCommitAndPush}
                  disabled={isLoading || !token}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                  title={!token ? "Push işlemi için Token gereklidir" : ""}
                >
                  <GitCommit className="w-4 h-4" />
                  {isLoading ? 'İşleniyor...' : 'Commit & Push'}
                </button>
              </div>
            </>
          )}

          {message && (
            <div className={`p-3 rounded text-sm ${message.includes('Hata') || message.includes('Geçersiz') ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
