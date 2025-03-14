'use client';

import { useState, useEffect } from 'react';
import QueryForm from '@/components/QueryForm';
import ResponseDisplay from '@/components/ResponseDisplay';
import QueryHistory from '@/components/QueryHistory';
import { QuerySettings } from '@/components/QueryForm';

interface ResponseData {
  query: string;
  geminiResponse: string;
  deepseekResponse: string;
  mergedResponse: string;
}

interface HistoryItem {
  id: string;
  query: string;
  timestamp: number;
  responses: ResponseData;
  settings: QuerySettings;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [responseData, setResponseData] = useState<ResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('queryHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history from localStorage:', e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('queryHistory', JSON.stringify(history));
  }, [history]);

  const handleSubmit = async (query: string, settings: QuerySettings) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, settings }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setResponseData(data);

      // Add to history
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        query,
        timestamp: Date.now(),
        responses: data,
        settings,
      };

      setHistory((prev) => [newHistoryItem, ...prev]);
    } catch (err) {
      console.error('Error submitting query:', err);
      setError('Failed to get responses. Please check your API keys and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectQuery = (id: string) => {
    const item = history.find((h) => h.id === id);
    if (item) {
      setResponseData(item.responses);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('queryHistory');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Multi-Model Answer Merger
          </h1>
          <p className="mt-3 text-xl text-gray-500">
            Ask one question, get answers from multiple AI models, merged into a unified response.
          </p>
        </div>

        <div className="flex flex-col items-center">
          <QueryForm onSubmit={handleSubmit} isLoading={isLoading} />

          <QueryHistory 
            history={history} 
            onSelectQuery={handleSelectQuery} 
            onClearHistory={handleClearHistory} 
          />

          {error && (
            <div className="mt-6 w-full max-w-3xl p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="mt-8 flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Querying multiple AI models...</p>
            </div>
          )}

          {responseData && !isLoading && (
            <ResponseDisplay
              query={responseData.query}
              geminiResponse={responseData.geminiResponse}
              deepseekResponse={responseData.deepseekResponse}
              mergedResponse={responseData.mergedResponse}
            />
          )}
        </div>
      </div>
    </div>
  );
}
