import React, { useState } from 'react';
import { ArchivedSession } from '../types';
import { X, Trash2, ArrowLeft } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  archivedSessions: ArchivedSession[];
  onDeleteSession: (id: string) => void;
}

export function HistoryModal({ isOpen, onClose, archivedSessions, onDeleteSession }: HistoryModalProps) {
  const [selectedSession, setSelectedSession] = useState<ArchivedSession | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setSelectedSession(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[600] flex justify-center items-center p-4 transition-colors duration-200">
      <div className="bg-white dark:bg-[#242526] w-full max-w-[450px] rounded-2xl p-4 border border-gray-200 dark:border-[#3e4042] flex flex-col max-h-[85vh] shadow-xl transition-colors duration-200">
        <div className="flex justify-between items-center mb-3 border-b border-gray-200 dark:border-[#3e4042] pb-2.5 transition-colors duration-200">
          <h3 className="m-0 text-[16px] text-gray-900 dark:text-gray-100 font-bold transition-colors duration-200">
            {selectedSession ? "Sohbet Detayı" : "📜 Geçmiş Sohbetler"}
          </h3>
          <button onClick={handleClose} className="bg-transparent border-none text-[20px] cursor-pointer text-gray-500 dark:text-gray-400 opacity-80 hover:opacity-100 transition-opacity">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!selectedSession ? (
          <div className="overflow-y-auto flex-1 flex flex-col gap-2.5 pb-2.5">
            {archivedSessions.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-12 text-[14px] transition-colors duration-200">
                Geçmiş sohbet yok.
              </div>
            ) : (
              [...archivedSessions].reverse().map(session => (
                <div key={session.id} onClick={() => setSelectedSession(session)} className="bg-gray-50 dark:bg-[#18191a] border border-gray-200 dark:border-[#3e4042] p-2 px-3 rounded-xl cursor-pointer flex justify-between items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] transition-colors duration-200">
                  <div className="flex-1 overflow-hidden flex flex-col justify-center">
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 transition-colors duration-200">📅 {session.date}</div>
                    <div className="text-[13px] text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden text-ellipsis font-medium transition-colors duration-200">
                      💬 {session.preview}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if(window.confirm("Kalıcı olarak silinsin mi?")) onDeleteSession(session.id);
                    }}
                    className="bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 border-none p-3 rounded-xl cursor-pointer text-[16px] flex items-center justify-center min-w-[44px] min-h-[44px] transition-colors hover:bg-red-100 dark:hover:bg-red-900/50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="overflow-y-auto flex-1 flex flex-col gap-2.5 p-2.5 bg-gray-50 dark:bg-[#18191a] rounded-xl border border-gray-200 dark:border-[#3e4042] transition-colors duration-200">
              {selectedSession.messages.map(msg => (
                <div key={msg.id} className={`max-w-[95%] p-2.5 rounded-2xl text-[14px] leading-relaxed shadow-sm break-words transition-colors duration-200 ${msg.sender === 'user' ? 'self-end bg-blue-600 text-white rounded-br-sm' : 'self-start bg-white dark:bg-[#242526] text-gray-900 dark:text-gray-100 rounded-bl-sm w-full border border-gray-200 dark:border-[#3e4042]'}`}>
                  {msg.sender === 'user' ? (
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  ) : (
                    <div className="markdown-body prose dark:prose-invert max-w-none text-sm">
                      <Markdown remarkPlugins={[remarkGfm]}>
                        {msg.isRaw ? msg.text.replace(/\[DOSYA:([^\]]+)\]([\s\S]*?)\[\/DOSYA\]/g, '\n**Dosya: $1**\n```\n$2\n```\n') : msg.text}
                      </Markdown>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setSelectedSession(null)} className="bg-blue-600 text-white border-none p-3 rounded-xl font-bold mt-3 cursor-pointer text-[14px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm">
              <ArrowLeft className="w-4 h-4" /> Listeye Dön
            </button>
          </>
        )}
      </div>
    </div>
  );
}
