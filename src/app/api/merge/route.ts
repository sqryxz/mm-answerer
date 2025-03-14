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

    // Query Gemini API
    const geminiResponse = await queryGemini(query, querySettings);

    // Query Deepseek API
    const deepseekResponse = await queryDeepseek(query, querySettings);

    // Merge the responses
    const mergedResponse = await mergeResponses(query, geminiResponse, deepseekResponse, querySettings);

    return NextResponse.json({ 
      query,
      geminiResponse,
      deepseekResponse,
      mergedResponse
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
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

    const chat = model.startChat({
      systemInstruction: settings.systemPrompt,
    });

    const result = await chat.sendMessage(query);
    return result.response.text();
  } catch (error) {
    console.error('Error querying Gemini:', error);
    return 'Error querying Gemini API';
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
  } catch (error) {
    console.error('Error querying Deepseek:', error);
    return 'Error querying Deepseek API';
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

    const result = await model.generateContent(mergePrompt);
    const mergedContent = result.response.text();
    
    return mergedContent;
  } catch (error) {
    console.error('Error merging responses:', error);
    
    // Fallback to simple merging if intelligent merging fails
    return `
# Combined AI Response to: "${query}"

## Gemini Response
${geminiResponse}

## Deepseek Response
${deepseekResponse}

## Summary
Both models have provided their perspectives on your question. Consider the strengths of each response to form a more comprehensive understanding.
`;
  }
} 