import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, Clock, GripVertical, Plus, Trash2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export interface Task {
  id: string;
  text: string;
  status: 'todo' | 'in_progress' | 'done';
}

interface TaskBoardProps {
  content: string;
  onChange: (newContent: string) => void;
}

export function TaskBoard({ content, onChange }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');

  // Parse markdown to tasks
  useEffect(() => {
    const lines = content.split('\n');
    const parsedTasks: Task[] = [];
    let currentStatus: 'todo' | 'in_progress' | 'done' = 'todo';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('yapılacaklar') || lowerLine.includes('todo')) {
        currentStatus = 'todo';
      } else if (lowerLine.includes('yapılıyor') || lowerLine.includes('in progress')) {
        currentStatus = 'in_progress';
      } else if (lowerLine.includes('tamamlandı') || lowerLine.includes('done')) {
        currentStatus = 'done';
      } else {
        const match = line.match(/^\s*-\s*\[([ xX/])\]\s+(.*)$/);
        if (match) {
          const check = match[1].toLowerCase();
          let status = currentStatus;
          if (check === 'x') status = 'done';
          else if (check === '/') status = 'in_progress';
          
          parsedTasks.push({
            id: `task-${Date.now()}-${i}`,
            text: match[2],
            status: status
          });
        }
      }
    }
    setTasks(parsedTasks);
  }, [content]);

  const updateMarkdown = (newTasks: Task[]) => {
    let md = "# Görev Planı\n\n";
    
    const todos = newTasks.filter(t => t.status === 'todo');
    const inProgress = newTasks.filter(t => t.status === 'in_progress');
    const done = newTasks.filter(t => t.status === 'done');

    md += "### Yapılacaklar\n";
    if (todos.length === 0) md += "_Görev yok_\n";
    todos.forEach(t => md += `- [ ] ${t.text}\n`);
    
    md += "\n### Yapılıyor\n";
    if (inProgress.length === 0) md += "_Görev yok_\n";
    inProgress.forEach(t => md += `- [/] ${t.text}\n`);
    
    md += "\n### Tamamlandı\n";
    if (done.length === 0) md += "_Görev yok_\n";
    done.forEach(t => md += `- [x] ${t.text}\n`);

    onChange(md);
  };

  const moveTask = (id: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, status: newStatus } : t);
    setTasks(newTasks);
    updateMarkdown(newTasks);
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    
    const newTasks = [...tasks, {
      id: `task-${Date.now()}`,
      text: newTaskText.trim(),
      status: 'todo' as const
    }];
    
    setTasks(newTasks);
    updateMarkdown(newTasks);
    setNewTaskText('');
  };

  const deleteTask = (id: string) => {
    const newTasks = tasks.filter(t => t.id !== id);
    setTasks(newTasks);
    updateMarkdown(newTasks);
  };

  const Column = ({ title, status, icon: Icon, colorClass, bgClass, borderClass }: { title: string, status: 'todo' | 'in_progress' | 'done', icon: any, colorClass: string, bgClass: string, borderClass: string }) => {
    const columnTasks = tasks.filter(t => t.status === status);
    
    return (
      <div className={cn("flex-1 flex flex-col rounded-2xl overflow-hidden border transition-colors duration-200", bgClass, borderClass)}>
        <div className={cn("p-4 border-b flex items-center justify-between transition-colors duration-200", borderClass)}>
          <div className={cn("flex items-center gap-2 font-semibold text-[14px]", colorClass)}>
            <Icon className="w-4 h-4" />
            {title}
          </div>
          <span className="bg-gray-200 dark:bg-[#0a0a0a] text-gray-600 dark:text-[#888] text-[11px] px-2 py-0.5 rounded-full font-mono transition-colors duration-200">
            {columnTasks.length}
          </span>
        </div>
        
        <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3">
          <AnimatePresence>
            {columnTasks.map(task => (
              <motion.div 
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] p-3 rounded-xl flex flex-col gap-3 group hover:border-gray-300 dark:hover:border-[#555] transition-all shadow-sm hover:shadow-md"
              >
                <div className="flex items-start gap-3 text-[13px] text-gray-800 dark:text-[#e0e0e0]">
                  <span className="mt-0.5 opacity-30 cursor-grab active:cursor-grabbing"><GripVertical className="w-4 h-4" /></span>
                  <span className={cn("flex-1 leading-relaxed", status === 'done' && "line-through opacity-50")}>{task.text}</span>
                  <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-opacity p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="flex gap-2 mt-1 pl-7">
                  {status === 'todo' && (
                    <button onClick={() => moveTask(task.id, 'in_progress')} className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium transition-colors">
                      Başla <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  {status === 'in_progress' && (
                    <button onClick={() => moveTask(task.id, 'done')} className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 text-green-600 dark:text-green-400 font-medium transition-colors">
                      <CheckCircle2 className="w-3 h-3" /> Tamamla
                    </button>
                  )}
                  {status === 'done' && (
                    <button onClick={() => moveTask(task.id, 'todo')} className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-600 dark:text-[#888] font-medium transition-colors">
                      Geri Al
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {columnTasks.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="h-24 border-2 border-dashed border-gray-200 dark:border-[#2a2a2a] rounded-xl flex items-center justify-center text-gray-400 dark:text-[#555] text-[12px] font-medium transition-colors duration-200"
            >
              Buraya sürükle
            </motion.div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0a0a0a] p-6 gap-6 overflow-hidden transition-colors duration-200">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-200">
            <CheckSquare className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            Görev Panosu
          </h2>
          <p className="text-gray-500 dark:text-[#888] text-sm mt-1 transition-colors duration-200">Yapay zeka veya sizin tarafınızdan oluşturulan görevler.</p>
        </div>
        
        <form onSubmit={addTask} className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="Yeni görev ekle..." 
            className="flex-1 md:flex-none bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#2a2a2a] rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full md:w-[300px] transition-all shadow-inner"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 text-sm font-medium transition-colors shadow-lg shadow-blue-600/20 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Ekle
          </button>
        </form>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-y-auto md:overflow-hidden pb-4 md:pb-0">
        <Column title="Yapılacaklar" status="todo" icon={Square} colorClass="text-gray-500 dark:text-gray-400" bgClass="bg-white dark:bg-[#111]" borderClass="border-gray-200 dark:border-[#222]" />
        <Column title="Yapılıyor" status="in_progress" icon={Clock} colorClass="text-blue-600 dark:text-blue-400" bgClass="bg-blue-50 dark:bg-blue-950/10" borderClass="border-blue-200 dark:border-blue-900/30" />
        <Column title="Tamamlandı" status="done" icon={CheckCircle2} colorClass="text-green-600 dark:text-green-400" bgClass="bg-green-50 dark:bg-green-950/10" borderClass="border-green-200 dark:border-green-900/30" />
      </div>
    </div>
  );
}
