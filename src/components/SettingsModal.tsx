import React from 'react';
import { X, Sun, Moon, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { AIModel } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  models: AIModel[];
  setModels: React.Dispatch<React.SetStateAction<AIModel[]>>;
  activeModelId: string;
  setActiveModelId: (id: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  theme,
  setTheme,
  models,
  setModels,
  activeModelId,
  setActiveModelId
}: SettingsModalProps) {
  if (!isOpen) return null;

  const activeModel = models.find(m => m.id === activeModelId) || models[0];

  const updateApiKey = (key: string) => {
    setModels(prev => prev.map(m => m.id === activeModelId ? { ...m, apiKey: key } : m));
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[600] flex justify-center items-center p-4">
      <div className="bg-white dark:bg-[#242526] w-full max-w-[400px] rounded-2xl p-4 border border-gray-200 dark:border-[#3e4042] flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-[#3e4042] pb-3">
          <h3 className="m-0 text-[16px] text-gray-900 dark:text-gray-100 font-bold flex items-center gap-2">
            <Settings className="w-5 h-5" /> Ayarlar
          </h3>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-gray-500 dark:text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block mb-1.5 text-[13px] font-semibold text-gray-900 dark:text-gray-100">Model Seç</label>
          <select 
            value={activeModelId}
            onChange={e => setActiveModelId(e.target.value)}
            className="w-full p-2.5 border border-gray-300 dark:border-[#3e4042] rounded-lg bg-white dark:bg-[#3a3b3c] text-gray-900 dark:text-gray-100 outline-none text-[13px]"
          >
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div className="mb-4">
          <label className="block mb-1.5 text-[13px] font-semibold text-gray-900 dark:text-gray-100">API Key ({activeModel.name})</label>
          <input 
            type="password" 
            placeholder="API Anahtarınızı buraya girin" 
            value={activeModel.apiKey || ''}
            onChange={e => updateApiKey(e.target.value)}
            className="w-full p-2.5 border border-gray-300 dark:border-[#3e4042] rounded-lg bg-white dark:bg-[#3a3b3c] text-gray-900 dark:text-gray-100 outline-none text-[13px]"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1.5 text-[13px] font-semibold text-gray-900 dark:text-gray-100">Tema</label>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('light')}
              className={cn("flex-1 p-2 rounded-lg border text-[13px] font-semibold", theme === 'light' ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 dark:bg-[#3a3b3c] text-gray-700 dark:text-gray-300 border-transparent")}
            >
              <Sun className="w-4 h-4 inline mr-1" /> Aydınlık
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn("flex-1 p-2 rounded-lg border text-[13px] font-semibold", theme === 'dark' ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 dark:bg-[#3a3b3c] text-gray-700 dark:text-gray-300 border-transparent")}
            >
              <Moon className="w-4 h-4 inline mr-1" /> Karanlık
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 text-white border-none p-3 rounded-xl font-bold cursor-pointer text-[14px] hover:bg-blue-700"
        >
          Kapat
        </button>
      </div>
    </div>
  );
}
