'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface ResponseDisplayProps {
  query: string;
  geminiResponse: string;
  deepseekResponse: string;
  mergedResponse: string;
}

export default function ResponseDisplay({
  query,
  geminiResponse,
  deepseekResponse,
  mergedResponse,
}: ResponseDisplayProps) {
  const [activeTab, setActiveTab] = useState<'merged' | 'gemini' | 'deepseek'>('merged');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(`${type} copied!`);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopySuccess('Failed to copy');
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  const getActiveContent = () => {
    switch (activeTab) {
      case 'merged':
        return mergedResponse;
      case 'gemini':
        return geminiResponse;
      case 'deepseek':
        return deepseekResponse;
      default:
        return '';
    }
  };

  const exportAsMarkdown = () => {
    // eslint-disable-next-line react/no-unescaped-entities
    const content = `# Multi-Model Answer to: "${query}"

## Gemini Response
${geminiResponse}

## Deepseek Response
${deepseekResponse}

## Merged Response
${mergedResponse}
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multi-model-answer-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-3xl mt-8 border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-3 px-4 text-center ${
            activeTab === 'merged' ? 'bg-blue-50 text-blue-600 font-medium' : 'bg-white text-gray-600'
          }`}
          onClick={() => setActiveTab('merged')}
        >
          Merged Response
        </button>
        <button
          className={`flex-1 py-3 px-4 text-center ${
            activeTab === 'gemini' ? 'bg-blue-50 text-blue-600 font-medium' : 'bg-white text-gray-600'
          }`}
          onClick={() => setActiveTab('gemini')}
        >
          Gemini
        </button>
        <button
          className={`flex-1 py-3 px-4 text-center ${
            activeTab === 'deepseek' ? 'bg-blue-50 text-blue-600 font-medium' : 'bg-white text-gray-600'
          }`}
          onClick={() => setActiveTab('deepseek')}
        >
          Deepseek
        </button>
      </div>

      <div className="p-6 bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {activeTab === 'merged' 
              ? 'Combined Response' 
              : activeTab === 'gemini' 
                ? 'Gemini Response' 
                : 'Deepseek Response'} to: &quot;{query}&quot;
          </h2>
          <div className="flex gap-2 relative">
            <button
              onClick={() => copyToClipboard(getActiveContent(), activeTab.charAt(0).toUpperCase() + activeTab.slice(1))}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
              Copy
            </button>
            <button
              onClick={exportAsMarkdown}
              className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-sm flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export
            </button>
            {copySuccess && (
              <div className="absolute right-0 top-full mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
                {copySuccess}
              </div>
            )}
          </div>
        </div>

        <div className="prose max-w-none">
          {activeTab === 'merged' && (
            <div className="markdown-content">
              <ReactMarkdown>{mergedResponse}</ReactMarkdown>
            </div>
          )}

          {activeTab === 'gemini' && (
            <div className="markdown-content">
              <ReactMarkdown>{geminiResponse}</ReactMarkdown>
            </div>
          )}

          {activeTab === 'deepseek' && (
            <div className="markdown-content">
              <ReactMarkdown>{deepseekResponse}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 