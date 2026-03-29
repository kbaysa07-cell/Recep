import React, { useState, useEffect, useRef } from 'react';
import { Bot, FileText, Terminal, Search, ChevronDown, ChevronUp, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { Activity } from '../hooks/useActivity';

interface AgentActivityPanelProps {
  activity: Activity[];
  isLoading?: boolean;
}

export function AgentActivityPanel({ activity, isLoading }: AgentActivityPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredActivity = activity.filter(item => item.type !== 'thought');

  // Auto-scroll to bottom when new activity arrives
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredActivity, isExpanded]);

  // Auto-expand when loading starts, auto-collapse when done
  useEffect(() => {
    if (isLoading) {
      setIsExpanded(true);
    } else {
      // Optional: Collapse after a few seconds when done
      const timer = setTimeout(() => setIsExpanded(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (filteredActivity.length === 0 && !isLoading) return null;

  const lastActivity = filteredActivity[filteredActivity.length - 1];

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      "bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#262626] rounded-xl overflow-hidden mb-4 transition-all duration-300 shadow-lg",
      isLoading ? "border-blue-500/30 shadow-blue-500/10" : "border-gray-200 dark:border-[#262626]"
    )}>
      {/* Header / Compact View */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1e1e1e] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative flex-shrink-0">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              isLoading ? "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400" : "bg-green-50 dark:bg-green-500/20 text-green-600 dark:text-green-400"
            )}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
            {isLoading && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white dark:border-[#151515] animate-pulse"></span>
            )}
          </div>
          
          <div className="flex flex-col truncate">
            <span className="text-[12px] font-semibold text-gray-900 dark:text-[#e0e0e0]">
              {isLoading ? "Recep AI Çalışıyor..." : "İşlem Tamamlandı"}
            </span>
            <span className="text-[11px] text-gray-500 dark:text-[#888] truncate flex items-center gap-1">
              {lastActivity?.timestamp && <Clock className="w-3 h-3 inline" />}
              {lastActivity ? `${formatTime(lastActivity.timestamp)} - ${lastActivity.message}` : "Hazırlanıyor..."}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0 pl-2">
          <span className="text-[10px] bg-gray-100 dark:bg-[#262626] text-gray-500 dark:text-[#888] px-2 py-0.5 rounded-full font-mono transition-colors duration-200">
            {filteredActivity.length} işlem
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500 dark:text-[#888]" /> : <ChevronDown className="w-4 h-4 text-gray-500 dark:text-[#888]" />}
        </div>
      </div>
      
      {/* Expanded Timeline View */}
      {isExpanded && filteredActivity.length > 0 && (
        <div className="border-t border-gray-200 dark:border-[#262626] bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-200">
          <div 
            ref={scrollRef}
            className="flex flex-col p-3 max-h-[350px] overflow-y-auto scroll-smooth font-mono"
          >
            <div className="relative pl-4 border-l-2 border-gray-200 dark:border-[#262626] ml-3 space-y-4 py-2 transition-colors duration-200">
              {filteredActivity.map((item, index) => {
                const isLast = index === filteredActivity.length - 1;
                return (
                  <div key={index} className="relative group">
                    {/* Timeline Dot */}
                    <div className={cn(
                      "absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-50 dark:border-[#0a0a0a] transition-colors duration-200",
                      item.type === 'thought' ? "bg-purple-500" :
                      item.type === 'file' ? "bg-orange-500" :
                      item.type === 'terminal' ? "bg-green-500" : "bg-blue-500",
                      isLast && isLoading ? "animate-pulse ring-2 ring-offset-1 ring-offset-gray-50 dark:ring-offset-[#0a0a0a] ring-blue-500/50" : ""
                    )}></div>
                    
                    {/* Content */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                        {item.type === 'thought' && <Bot className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                        {item.type === 'file' && <FileText className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />}
                        {item.type === 'terminal' && <Terminal className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />}
                        {item.type === 'web' && <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={cn(
                          "text-[12px] leading-relaxed break-words",
                          isLast && isLoading ? "text-gray-900 dark:text-[#e0e0e0] font-medium" : "text-gray-600 dark:text-[#a0a0a0]"
                        )}>
                          {item.message}
                        </span>
                        {item.timestamp && (
                          <span className="text-[10px] text-gray-400 dark:text-[#666] mt-0.5">
                            {formatTime(item.timestamp)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
