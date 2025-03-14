'use client';

import { useState } from 'react';
import { QuerySettings } from './QueryForm';

interface HistoryItem {
  id: string;
  query: string;
  timestamp: number;
  settings?: QuerySettings;
}

interface QueryHistoryProps {
  history: HistoryItem[];
  onSelectQuery: (id: string) => void;
  onClearHistory: () => void;
}

export default function QueryHistory({ history, onSelectQuery, onClearHistory }: QueryHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  if (history.length === 0) {
    return null;
  }

  const toggleItemExpansion = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  return (
    <div className="w-full max-w-3xl mt-6">
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 mr-1 transition-transform ${isOpen ? 'rotate-90' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Query History ({history.length})
        </button>
        <button
          onClick={onClearHistory}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          Clear History
        </button>
      </div>

      {isOpen && (
        <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {history.map((item) => (
              <li key={item.id} className="border-b border-gray-100 last:border-b-0">
                <div className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <button
                        onClick={() => onSelectQuery(item.id)}
                        className="w-full text-left hover:text-blue-600 transition-colors"
                      >
                        <div className="font-medium truncate">{item.query}</div>
                      </button>
                      <div className="text-sm text-gray-500 mt-1">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleItemExpansion(item.id)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 transition-transform ${expandedItem === item.id ? 'rotate-180' : ''}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                  
                  {expandedItem === item.id && item.settings && (
                    <div className="mt-2 pt-2 border-t border-gray-100 text-sm text-gray-600">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-medium">Temperature:</span> {item.settings.temperature}
                        </div>
                        <div>
                          <span className="font-medium">System Prompt:</span>
                          <div className="text-xs mt-1 bg-gray-50 p-1 rounded">
                            {item.settings.systemPrompt}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => onSelectQuery(item.id)}
                          className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"
                        >
                          Load Response
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 