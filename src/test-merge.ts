import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface QuerySettings {
  temperature: number;
  systemPrompt: string;
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

    // Create a chat session
    const chat = model.startChat({
      history: [],
    });
    
    // Send the merge prompt
    const result = await chat.sendMessage(mergePrompt);
    const mergedContent = result.response.text();
    
    return mergedContent;
  } catch (error: unknown) {
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

// Test data
const testQuery = "What are the key differences between React and Vue?";

const geminiResponse = `
# React vs Vue: Key Differences

React and Vue are both popular JavaScript frameworks for building user interfaces, but they have several key differences:

## Component Structure
- **React**: Uses JSX, a syntax extension that allows you to write HTML-like code in JavaScript
- **Vue**: Uses templates that are more similar to traditional HTML, with special directives

## State Management
- **React**: Relies on unidirectional data flow and requires external libraries like Redux for complex state management
- **Vue**: Has built-in state management with Vuex, though it's optional

## Learning Curve
- **React**: Steeper learning curve, especially for beginners who aren't familiar with JavaScript concepts
- **Vue**: Generally considered easier to learn with more intuitive syntax and better documentation

## Performance
- **React**: Uses a virtual DOM and has excellent performance for complex applications
- **Vue**: Also uses a virtual DOM but with additional optimizations that can make it faster in some cases

## Flexibility vs Convention
- **React**: More flexible but requires more decisions about project structure and additional libraries
- **Vue**: More opinionated with built-in solutions for common problems

## Community and Ecosystem
- **React**: Larger community and ecosystem, backed by Facebook
- **Vue**: Smaller but growing community, created and led by Evan You

Both frameworks are excellent choices depending on your specific needs and preferences.
`;

const deepseekResponse = `
React and Vue are two of the most popular frontend JavaScript frameworks. Here are the key differences between them:

### Philosophy and Design
- **React** is a library focused primarily on the view layer, giving developers more freedom to choose additional libraries for routing, state management, etc.
- **Vue** is a more complete framework that provides official solutions for common needs like routing and state management.

### Syntax and Templates
- **React** uses JSX, which combines JavaScript and HTML-like syntax in the same file.
- **Vue** uses HTML templates with special directives (like v-if, v-for) that may feel more familiar to traditional web developers.

### Component Structure
- **React** components typically combine logic and presentation in a single file.
- **Vue** uses a more explicit separation with template, script, and style sections in Single File Components.

### State Management
- **React** uses hooks (useState, useEffect) in functional components or setState in class components.
- **Vue** uses a reactive data property in components and provides Vuex for centralized state management.

### Learning Curve
- **React** has a steeper learning curve if you're not familiar with JavaScript concepts like functional programming.
- **Vue** is often considered easier to learn for beginners due to its more straightforward syntax and comprehensive documentation.

### Performance
Both frameworks offer similar performance characteristics, with Vue sometimes having a slight edge in specific scenarios due to its more fine-grained reactivity system.

### Community and Support
- **React** has a larger community and ecosystem, with more third-party libraries and components available.
- **Vue** has excellent documentation and a growing community.

### Corporate Backing
- **React** is developed and maintained by Facebook.
- **Vue** was created by an individual developer (Evan You) and is now supported by a team of core contributors and sponsors.

The choice between React and Vue often comes down to team preference, project requirements, and existing expertise.
`;

const settings: QuerySettings = {
  temperature: 0.7,
  systemPrompt: 'You are a helpful assistant.'
};

// Run the test
async function runTest() {
  console.log("Testing merge function...");
  console.log("Query:", testQuery);
  console.log("\n--- Starting merge process ---\n");
  
  try {
    const mergedResponse = await mergeResponses(
      testQuery,
      geminiResponse,
      deepseekResponse,
      settings
    );
    
    console.log("Merged Response:");
    console.log(mergedResponse);
    console.log("\n--- Merge completed successfully ---");
  } catch (error) {
    console.error("Error during merge test:", error);
  }
}

// Execute the test
runTest(); 