import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { log, logStart, logComplete, logError, createTimer, LogLevel, generateRunSummary } from '@/utils/logger';

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

// Configure the API route for Vercel
export const config = {
  runtime: 'edge',
};

// Add a GET handler to handle GET requests
export async function GET() {
  return NextResponse.json({ 
    message: 'This endpoint requires a POST request with a JSON body containing a query field.',
    example: {
      query: 'Your question here',
      settings: {
        temperature: 0.7,
        systemPrompt: 'You are a helpful assistant.'
      }
    }
  }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const appTimer = createTimer();
  logStart('API_REQUEST');
  
  try {
    const { query, settings } = await request.json();
    const querySettings: QuerySettings = settings || {
      temperature: 0.7,
      systemPrompt: 'You are a helpful assistant.',
    };

    log(`Processing query: "${query}"`, LogLevel.INFO, 'API_REQUEST');

    if (!query) {
      logError('API_REQUEST', 'Query is required');
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    let geminiResponse = "Attempting to get response from Gemini...";
    let deepseekResponse = "Attempting to get response from Deepseek...";
    let mergedResponse = "";
    
    // Try Gemini API
    try {
      logStart('GEMINI_QUERY');
      const geminiTimer = createTimer();
      geminiResponse = await queryGemini(query, querySettings);
      logComplete('GEMINI_QUERY', geminiTimer());
    } catch (error) {
      logError('GEMINI_QUERY', error);
      geminiResponse = "Error querying Gemini: Unable to get response";
    }
    
    // Try Deepseek API
    try {
      logStart('DEEPSEEK_QUERY');
      const deepseekTimer = createTimer();
      deepseekResponse = await queryDeepseek(query, querySettings);
      logComplete('DEEPSEEK_QUERY', deepseekTimer());
    } catch (error) {
      logError('DEEPSEEK_QUERY', error);
      deepseekResponse = "Error querying Deepseek: Unable to get response";
    }
    
    // Check if we have at least one valid response
    const hasGeminiResponse = !geminiResponse.includes('Error') && !geminiResponse.includes('timed out');
    const hasDeepseekResponse = !deepseekResponse.includes('Error') && !deepseekResponse.includes('timed out');
    
    // Create merged response based on available responses
    if (hasGeminiResponse && hasDeepseekResponse) {
      // Try to merge both responses
      try {
        logStart('MERGE_RESPONSES');
        const mergeTimer = createTimer();
        mergedResponse = await mergeResponses(query, geminiResponse, deepseekResponse, querySettings);
        logComplete('MERGE_RESPONSES', mergeTimer());
      } catch (error) {
        logError('MERGE_RESPONSES', error);
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
      log('Using Gemini response only', LogLevel.INFO, 'API_REQUEST');
      mergedResponse = `
# Response to: "${query}"

${geminiResponse}

*Note: This response is from Gemini AI only.*
`;
    } else if (hasDeepseekResponse) {
      log('Using Deepseek response only', LogLevel.INFO, 'API_REQUEST');
      mergedResponse = `
# Response to: "${query}"

${deepseekResponse}

*Note: This response is from DeepSeek AI only.*
`;
    } else {
      // Neither API returned a valid response
      log('No valid responses from either API', LogLevel.WARNING, 'API_REQUEST');
      mergedResponse = `
# Response to: "${query}"

Sorry, we couldn't get a complete response at this time. Please try again later.

## Errors:
- Gemini: ${geminiResponse}
- Deepseek: ${deepseekResponse}
`;
    }

    logComplete('API_REQUEST', appTimer());
    
    // Generate a run summary for this API request
    generateRunSummary();
    
    // Always return a response, even if there were errors
    return NextResponse.json({ 
      query,
      geminiResponse,
      deepseekResponse,
      mergedResponse,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logError('API_REQUEST', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Generate a run summary even if there was an error
    generateRunSummary();
    
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
  const timer = createTimer();
  logStart('GEMINI_PROCESS');
  
  try {
    log('Initializing Gemini model', LogLevel.DEBUG, 'GEMINI_PROCESS');
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: settings.temperature,
        maxOutputTokens: 1000, // Limit response length to ensure faster responses
      }
    });

    // Use direct content generation with system instruction and user query
    const systemAndQuery = `${settings.systemPrompt}\n\n${query}`;
    
    log('Sending request to Gemini API', LogLevel.DEBUG, 'GEMINI_PROCESS');
    const result = await model.generateContent(systemAndQuery);
    const response = result.response.text() || 'No content returned from Gemini API.';
    
    logComplete('GEMINI_PROCESS', timer());
    return response;
  } catch (error: unknown) {
    logError('GEMINI_PROCESS', error);
    throw error; // Propagate the error for better handling upstream
  }
}

async function queryDeepseek(query: string, settings: QuerySettings): Promise<string> {
  const timer = createTimer();
  logStart('DEEPSEEK_PROCESS');
  
  try {
    log('Preparing Deepseek request', LogLevel.DEBUG, 'DEEPSEEK_PROCESS');
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
    
    const result = response.choices[0].message.content || 'No content returned from Deepseek API.';
    logComplete('DEEPSEEK_PROCESS', timer());
    return result;
  } catch (error: unknown) {
    logError('DEEPSEEK_PROCESS', error);
    throw error; // Propagate the error for better handling upstream
  }
}

async function mergeResponses(
  query: string, 
  geminiResponse: string, 
  deepseekResponse: string,
  settings: QuerySettings
): Promise<string> {
  const timer = createTimer();
  logStart('MERGE_PROCESS');
  
  try {
    log('Initializing Gemini model for merging', LogLevel.DEBUG, 'MERGE_PROCESS');
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

    log('Sending merge request to Gemini API', LogLevel.DEBUG, 'MERGE_PROCESS');
    // Use direct content generation
    const result = await model.generateContent(mergePrompt);
    const response = result.response.text() || 'Failed to merge responses.';
    
    logComplete('MERGE_PROCESS', timer());
    return response;
  } catch (error: unknown) {
    logError('MERGE_PROCESS', error);
    throw error; // Propagate the error for better handling upstream
  }
} 