import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';

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
const API_TIMEOUT = 5000; // 5 seconds to leave room for processing

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

    let geminiResponse: string = "Attempting to get response from Gemini...";
    let deepseekResponse: string = "Attempting to get response from Deepseek...";
    let mergedResponse: string = "";
    
    // Try Gemini API with timeout
    try {
      const geminiResult = await Promise.race([
        queryGemini(query, querySettings),
        timeoutPromise(API_TIMEOUT)
      ]);
      geminiResponse = geminiResult as string;
    } catch (error) {
      console.error('Error or timeout with Gemini API:', error);
      geminiResponse = "Error querying Gemini: Unable to get response";
    }
    
    // Try Deepseek API with timeout
    try {
      const deepseekResult = await Promise.race([
        queryDeepseek(query, querySettings),
        timeoutPromise(API_TIMEOUT)
      ]);
      deepseekResponse = deepseekResult as string;
    } catch (error) {
      console.error('Error or timeout with Deepseek API:', error);
      deepseekResponse = "Error querying Deepseek: Unable to get response";
    }
    
    // Check if we have at least one valid response
    const hasGeminiResponse = !geminiResponse.includes('Error') && !geminiResponse.includes('timed out');
    const hasDeepseekResponse = !deepseekResponse.includes('Error') && !deepseekResponse.includes('timed out');
    
    // Create merged response based on available responses
    if (hasGeminiResponse && hasDeepseekResponse) {
      // Try to merge both responses
      try {
        mergedResponse = await Promise.race([
          mergeResponses(query, geminiResponse, deepseekResponse, querySettings),
          timeoutPromise(API_TIMEOUT)
        ]).catch(() => {
          // Fallback if merging times out
          return `
# Combined Response to: "${query}"

## Gemini Response
${geminiResponse}

## Deepseek Response
${deepseekResponse}
`;
        });
      } catch (error) {
        // Fallback if merging fails
        mergedResponse = `
# Combined Response to: "${query}"

## Gemini Response
${geminiResponse}

## Deepseek Response
${deepseekResponse}
`;
      }
    } else if (hasGeminiResponse) {
      mergedResponse = `
# Response to: "${query}"

${geminiResponse}

*Note: This response is from Gemini AI only.*
`;
    } else if (hasDeepseekResponse) {
      mergedResponse = `
# Response to: "${query}"

${deepseekResponse}

*Note: This response is from DeepSeek AI only.*
`;
    } else {
      // Neither API returned a valid response
      mergedResponse = `
# Response to: "${query}"

Sorry, we couldn't get a complete response at this time. Please try again later.

## Errors:
- Gemini: ${geminiResponse}
- Deepseek: ${deepseekResponse}
`;
    }

    // Always return a response, even if there were errors
    return NextResponse.json({ 
      query,
      geminiResponse,
      deepseekResponse,
      mergedResponse,
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    console.error('Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Even for general errors, return a response instead of an error status
    return NextResponse.json({ 
      query: request.body ? 'Error parsing query' : '',
      geminiResponse: "Error processing request",
      deepseekResponse: "Error processing request",
      mergedResponse: `Sorry, we encountered an error processing your request. Please try again later.`,
      error: 'Failed to process request', 
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 200 }); // Use 200 instead of 500 to ensure the client gets a response
  }
}

async function queryGemini(query: string, settings: QuerySettings): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: settings.temperature,
        maxOutputTokens: 1000, // Limit response length to ensure faster responses
      }
    });

    // Use direct content generation with system instruction and user query
    const systemAndQuery = `${settings.systemPrompt}\n\n${query}`;
    
    const result = await model.generateContent(systemAndQuery);
    return result.response.text() || 'No content returned from Gemini API.';
  } catch (error: unknown) {
    console.error('Error querying Gemini:', error);
    throw error; // Propagate the error for better handling upstream
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
    
    return response.choices[0].message.content || 'No content returned from Deepseek API.';
  } catch (error: unknown) {
    console.error('Error querying Deepseek:', error);
    throw error; // Propagate the error for better handling upstream
  }
}

async function mergeResponses(
  query: string, 
  geminiResponse: string, 
  deepseekResponse: string,
  settings: QuerySettings
): Promise<string> {
  try {
    // Use Gemini to merge the responses intelligently
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: Math.max(0.3, settings.temperature - 0.2), // Slightly lower temperature for merging
        maxOutputTokens: 1500, // Allow slightly longer response for the merged content
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

    // Use direct content generation
    const result = await model.generateContent(mergePrompt);
    return result.response.text() || 'Failed to merge responses.';
  } catch (error: unknown) {
    console.error('Error merging responses:', error);
    throw error; // Propagate the error for better handling upstream
  }
} 