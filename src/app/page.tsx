'use client';

import { useState, useEffect } from 'react';
import QueryForm from '@/components/QueryForm';
import ResponseDisplay from '@/components/ResponseDisplay';
import QueryHistory from '@/components/QueryHistory';
import { QuerySettings } from '@/components/QueryForm';

// Client-side logger
const clientLog = (message: string, level: string = 'INFO', subroutine?: string) => {
  const timestamp = new Date().toISOString();
  const subroutineStr = subroutine ? `[${subroutine}]` : '';
  const logMessage = `${timestamp} [${level}] ${subroutineStr} ${message}`;
  
  console.log(logMessage);
  
  // In a production app, you might want to send logs to the server
  // or use a service like Sentry for client-side logging
};

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
    clientLog('Application started', 'INFO', 'APP_INIT');
    const savedHistory = localStorage.getItem('queryHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
        clientLog(`Loaded ${JSON.parse(savedHistory).length} history items`, 'INFO', 'HISTORY_LOAD');
      } catch (e) {
        clientLog(`Failed to parse history from localStorage: ${e}`, 'ERROR', 'HISTORY_LOAD');
      }
    }
    
    return () => {
      clientLog('Application closing', 'INFO', 'APP_CLEANUP');
    };
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('queryHistory', JSON.stringify(history));
    if (history.length > 0) {
      clientLog(`Saved ${history.length} history items to localStorage`, 'DEBUG', 'HISTORY_SAVE');
    }
  }, [history]);

  const handleSubmit = async (query: string, settings: QuerySettings) => {
    clientLog(`Submitting query: "${query}"`, 'INFO', 'QUERY_SUBMIT');
    const startTime = Date.now();
    
    setIsLoading(true);
    setError(null);
    
    try {
      clientLog('Sending request to API', 'INFO', 'API_REQUEST');
      const response = await fetch('/api/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, settings }),
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      clientLog('Received response from API', 'SUCCESS', 'API_RESPONSE');
      
      setResponseData(data);
      
      // Add to history
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        query,
        timestamp: Date.now(),
        responses: data,
        settings,
      };
      
      setHistory(prev => [newHistoryItem, ...prev]);
      clientLog('Added query to history', 'INFO', 'HISTORY_UPDATE');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      clientLog(`Error: ${errorMessage}`, 'ERROR', 'API_REQUEST');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      const duration = Date.now() - startTime;
      clientLog(`Query completed in ${duration}ms`, 'INFO', 'QUERY_COMPLETE');
    }
  };

  const handleSelectQuery = (id: string) => {
    clientLog(`Selected history item: ${id}`, 'INFO', 'HISTORY_SELECT');
    const item = history.find(h => h.id === id);
    if (item) {
      setResponseData(item.responses);
    }
  };

  const handleClearHistory = () => {
    clientLog('Clearing query history', 'INFO', 'HISTORY_CLEAR');
    setHistory([]);
  };

  return (
    <main className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 text-center">Multi-Model Answer</h1>
      <p className="text-center mb-8 text-gray-600">
        Ask a question and get responses from multiple AI models, intelligently merged into a comprehensive answer.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <QueryHistory 
            history={history} 
            onSelectQuery={handleSelectQuery} 
            onClearHistory={handleClearHistory}
          />
        </div>
        
        <div className="lg:col-span-3">
          <QueryForm onSubmit={handleSubmit} isLoading={isLoading} />
          
          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              Error: {error}
            </div>
          )}
          
          {responseData && !error && (
            <ResponseDisplay 
              query={responseData.query}
              geminiResponse={responseData.geminiResponse}
              deepseekResponse={responseData.deepseekResponse}
              mergedResponse={responseData.mergedResponse}
            />
          )}
        </div>
      </div>
    </main>
  );
}
