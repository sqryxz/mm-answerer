'use client';

import { useState } from 'react';

interface QueryFormProps {
  onSubmit: (query: string, settings: QuerySettings) => void;
  isLoading: boolean;
}

export interface QuerySettings {
  temperature: number;
  systemPrompt: string;
}

export default function QueryForm({ onSubmit, isLoading }: QueryFormProps) {
  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [settings, setSettings] = useState<QuerySettings>({
    temperature: 0.7,
    systemPrompt: 'You are a helpful assistant.',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSubmit(query, settings);
    }
  };

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setSettings((prev) => ({ ...prev, temperature: value }));
  };

  const handleSystemPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSettings((prev) => ({ ...prev, systemPrompt: e.target.value }));
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl">
      <div className="flex flex-col gap-4">
        <label htmlFor="query" className="text-lg font-medium">
          Enter your question:
        </label>
        <textarea
          id="query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md min-h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          placeholder="Ask a question to multiple AI models..."
          disabled={isLoading}
        />

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 mr-1 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Advanced Settings
          </button>

          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Processing...' : 'Get Multi-Model Answer'}
          </button>
        </div>

        {showAdvanced && (
          <div className="mt-2 p-4 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="font-medium mb-3">Model Parameters</h3>
            
            <div className="mb-4">
              <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">
                Temperature: {settings.temperature}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs">0.1</span>
                <input
                  type="range"
                  id="temperature"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={settings.temperature}
                  onChange={handleTemperatureChange}
                  className="w-full"
                />
                <span className="text-xs">1.0</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Lower values produce more focused and deterministic responses. Higher values produce more diverse and creative responses.
              </p>
            </div>

            <div>
              <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700 mb-1">
                System Prompt
              </label>
              <textarea
                id="systemPrompt"
                value={settings.systemPrompt}
                onChange={handleSystemPromptChange}
                className="w-full p-2 border border-gray-300 rounded-md text-sm h-20 text-gray-900"
                placeholder="Instructions for the AI models..."
              />
              <p className="text-xs text-gray-500 mt-1">
                This prompt guides the behavior of the AI models.
              </p>
            </div>
          </div>
        )}
      </div>
    </form>
  );
} 