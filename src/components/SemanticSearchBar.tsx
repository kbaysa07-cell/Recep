import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface SemanticSearchBarProps {
  onSearch: (query: string) => Promise<string>;
}

export function SemanticSearchBar({ onSearch }: SemanticSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string>('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    const res = await onSearch(query);
    setResults(res);
    setIsLoading(false);
  };

  return (
    <div className="p-2 border-b border-gray-200 dark:border-[#262626]">
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg p-2">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Semantik kod araması..."
          className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-[#ededed]"
        />
        <button onClick={handleSearch} disabled={isLoading} className="text-blue-600 dark:text-blue-400">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ara'}
        </button>
      </div>
      {results && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-[#151515] rounded text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {results}
        </div>
      )}
    </div>
  );
}
