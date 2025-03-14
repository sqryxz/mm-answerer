import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

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

    const geminiResponse: string = "Gemini API is not available in your region.";
    let deepseekResponse: string = "";
    let mergedResponse: string = "";

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