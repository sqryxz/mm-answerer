import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';

// Check if Gemini API is available in the current region
let isGeminiAvailable = true;

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

// Set a timeout for API calls to prevent long-running requests
const API_TIMEOUT = 15000; // 15 seconds

// Helper function to create a promise that rejects after a timeout
function timeoutPromise(ms: number) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
  });
}

// Configure the API route for Vercel
export const config = {
  runtime: 'edge',
  regions: ['iad1'], // Use a specific region for better performance
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

    let geminiResponse: string = "", deepseekResponse: string = "", mergedResponse: string = "";

    // Only try Gemini if we think it's available
    if (isGeminiAvailable) {
      try {
        // Query Gemini API with timeout
        const geminiResult = await Promise.race([
          queryGemini(query, querySettings),
          timeoutPromise(API_TIMEOUT)
        ]);
        geminiResponse = geminiResult as string;
      } catch (error: unknown) {
        console.error('Error querying Gemini:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // If the error is related to location/region, mark Gemini as unavailable
        if (typeof errorMessage === 'string' && 
            (errorMessage.includes('location is not supported') || 
            errorMessage.includes('User location is not supported'))) {
          isGeminiAvailable = false;
          console.log('Gemini API marked as unavailable in this region');
        }
        
        geminiResponse = `Error querying Gemini: ${errorMessage}`;
      }
    } else {
      geminiResponse = "Gemini API is not available in your region.";
    }

    try {
      // Query Deepseek API with timeout
      const deepseekResult = await Promise.race([
        queryDeepseek(query, querySettings),
        timeoutPromise(API_TIMEOUT)
      ]);
      deepseekResponse = deepseekResult as string;
    } catch (error: unknown) {
      console.error('Error querying Deepseek:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      deepseekResponse = `Error querying Deepseek: ${errorMessage}`;
    }

    // If Gemini is not available, just return the Deepseek response
    if (!isGeminiAvailable || geminiResponse.includes('Error querying Gemini')) {
      mergedResponse = deepseekResponse;
    } else {
      try {
        // Only attempt to merge if both responses are valid
        const mergeResult = await Promise.race([
          mergeResponses(query, geminiResponse, deepseekResponse, querySettings),
          timeoutPromise(API_TIMEOUT)
        ]);
        mergedResponse = mergeResult as string;
      } catch (error: unknown) {
        console.error('Error merging responses:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Use a simple fallback that doesn't require Gemini
        mergedResponse = `
# Response to: "${query}"

${deepseekResponse}

*Note: This response is from DeepSeek AI only. Gemini API response could not be included.*
`;
      }
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
    const response = await deepseekClient.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: settings.systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: settings.temperature,
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