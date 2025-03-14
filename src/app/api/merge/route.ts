import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';

// Check if Gemini API is available in the current region
let isGeminiAvailable = false; // Start with Gemini disabled to avoid timeouts

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Initialize the Deepseek API client (using OpenAI compatible SDK)
const deepseekClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com',
});

interface QuerySettings {
  temperature: number;
  systemPrompt: string;
}

// Set a shorter timeout for API calls to prevent Vercel timeouts
const API_TIMEOUT = 8000; // 8 seconds (Vercel has a 10s limit for Edge functions)

// Helper function to create a promise that rejects after a timeout
function timeoutPromise(ms: number) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
  });
}

// Configure the API route for Vercel
export const config = {
  runtime: 'edge',
};

export async function POST(request: NextRequest) {
  try {
    const { query, settings } = await request.json();
    const querySettings: QuerySettings = settings || {
      temperature: 0.7,
      systemPrompt: 'You are a helpful assistant.',
    };

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    let geminiResponse: string = "Gemini API is not available in your region.", 
        deepseekResponse: string = "", 
        mergedResponse: string = "";

    // Skip Gemini API completely to avoid timeouts
    // We'll focus only on Deepseek which is working in your region

    try {
      // Query Deepseek API with timeout
      const deepseekResult = await Promise.race([
        queryDeepseek(query, querySettings),
        timeoutPromise(API_TIMEOUT)
      ]);
      deepseekResponse = deepseekResult as string;
      
      // Just use the Deepseek response directly
      mergedResponse = `
# Response to: "${query}"

${deepseekResponse}
`;
    } catch (error: unknown) {
      console.error('Error querying Deepseek:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      deepseekResponse = `Error querying Deepseek: ${errorMessage}`;
      mergedResponse = `Error: Failed to get a response. Please try again later.`;
      
      return NextResponse.json({ 
        error: 'Failed to get response from Deepseek API', 
        details: errorMessage
      }, { status: 500 });
    }

    return NextResponse.json({ 
      query,
      geminiResponse,
      deepseekResponse,
      mergedResponse
    });
  } catch (error: unknown) {
    console.error('Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to process request', 
      details: errorMessage
    }, { status: 500 });
  }
}

async function queryGemini(query: string, settings: QuerySettings): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: settings.temperature,
      }
    });

    // Use direct content generation with system instruction and user query
    const systemAndQuery = `${settings.systemPrompt}\n\n${query}`;
    
    const result = await model.generateContent(systemAndQuery);
    return result.response.text();
  } catch (error: unknown) {
    console.error('Error querying Gemini:', error);
    throw error; // Propagate the error for better debugging
  }
}

async function queryDeepseek(query: string, settings: QuerySettings): Promise<string> {
  try {
    // Set a maximum token limit to ensure faster responses
    const response = await deepseekClient.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: settings.systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: settings.temperature,
      max_tokens: 1000, // Limit response length to ensure faster responses
    });
    
    return response.choices[0].message.content || '';
  } catch (error: unknown) {
    console.error('Error querying Deepseek:', error);
    throw error; // Propagate the error for better debugging
  }
}

async function mergeResponses(
  query: string, 
  geminiResponse: string, 
  deepseekResponse: string,
  settings: QuerySettings
): Promise<string> {
  // If Gemini response contains an error, just return the Deepseek response
  if (geminiResponse.includes('Error querying Gemini') || !isGeminiAvailable) {
    return `
# Response to: "${query}"

${deepseekResponse}

*Note: This response is from DeepSeek AI only.*
`;
  }

  try {
    // Use Gemini to merge the responses intelligently
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: Math.max(0.3, settings.temperature - 0.2), // Slightly lower temperature for merging
      }
    });
    
    const mergePrompt = `
I have asked the following question to two different AI models:

QUESTION: "${query}"

RESPONSE FROM MODEL 1 (GEMINI):
${geminiResponse}

RESPONSE FROM MODEL 2 (DEEPSEEK):
${deepseekResponse}

Please analyze both responses and create a comprehensive merged answer that:
1. Combines the unique insights from both models
2. Resolves any contradictions between the responses
3. Organizes the information in a clear, logical structure
4. Provides a balanced perspective that leverages the strengths of each model
5. Format your response in Markdown for readability

Your merged response should be more valuable than either individual response alone.
`;

    // Use direct content generation instead of chat
    const result = await model.generateContent(mergePrompt);
    const mergedContent = result.response.text();
    
    return mergedContent;
  } catch (error: unknown) {
    console.error('Error merging responses:', error);
    
    // Fallback to simple merging if intelligent merging fails
    return `
# Combined AI Response to: "${query}"

## Deepseek Response
${deepseekResponse}

${geminiResponse.includes('Error') ? '' : `
## Gemini Response
${geminiResponse}
`}

## Summary
${geminiResponse.includes('Error') 
  ? 'Only the Deepseek model was able to provide a response to your question.' 
  : 'Both models have provided their perspectives on your question. Consider the strengths of each response to form a more comprehensive understanding.'}
`;
  }
} 