import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { log, logStart, logComplete, logError, createTimer, LogLevel, generateRunSummary } from './utils/logger';

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
  const timer = createTimer();
  logStart('TEST_MERGE_PROCESS');
  
  try {
    log('Initializing Gemini model for test merging', LogLevel.DEBUG, 'TEST_MERGE_PROCESS');
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

    log('Sending merge request to Gemini API', LogLevel.DEBUG, 'TEST_MERGE_PROCESS');
    // Use direct content generation
    const result = await model.generateContent(mergePrompt);
    const response = result.response.text() || 'Failed to merge responses.';
    
    logComplete('TEST_MERGE_PROCESS', timer());
    return response;
  } catch (error: unknown) {
    logError('TEST_MERGE_PROCESS', error);
    throw error; // Propagate the error for better handling upstream
  }
}

// Test data
// Commented out unused variables to fix linting errors
// const testQuery = "What are the key differences between React and Vue?";
// const geminiResponse = `...`;
// const deepseekResponse = `...`;
// const settings: QuerySettings = {
//   temperature: 0.7,
//   systemPrompt: 'You are a helpful assistant.'
// };

// Run the test
async function runTest() {
  const testTimer = createTimer();
  logStart('TEST_RUN');
  
  try {
    log('Starting test run with sample data', LogLevel.INFO, 'TEST_RUN');
    
    const query = "What are the key differences between React and Vue?";
    const settings = {
      temperature: 0.7,
      systemPrompt: "You are a helpful assistant."
    };
    
    const geminiResponse = `
React and Vue are both popular JavaScript frameworks for building user interfaces, but they have several key differences:

1. **Learning Curve**:
   - React has a steeper learning curve as it requires understanding JSX, and often requires additional libraries for routing and state management.
   - Vue is generally considered easier to learn with a more gentle learning curve, as it uses HTML templates and provides more built-in features.

2. **Component Structure**:
   - React uses JSX, which combines HTML and JavaScript in the same file.
   - Vue uses a more traditional separation with Single File Components that have distinct template, script, and style sections.

3. **State Management**:
   - React uses a unidirectional data flow and relies on external libraries like Redux for complex state management.
   - Vue has Vuex for state management but also offers simpler built-in reactivity.

4. **Size and Performance**:
   - Both are lightweight and perform well, but Vue is slightly smaller in size.
   - React may have a slight edge in performance for very complex applications.

5. **Flexibility vs. Convention**:
   - React is more flexible but requires more decisions about project structure and additional libraries.
   - Vue provides more built-in features and follows more conventions, making it more opinionated.

6. **Corporate Backing**:
   - React is developed and maintained by Facebook.
   - Vue was created by an individual developer (Evan You) and is community-driven, though it has corporate sponsors.

7. **Mobile Development**:
   - React has React Native for mobile app development.
   - Vue has integrations with NativeScript and Ionic, but doesn't have an equivalent to React Native.

Both frameworks are excellent choices with strong communities and can be used to build modern, responsive web applications.
`;

    const deepseekResponse = `
# React vs Vue: Key Differences

React and Vue are two of the most popular frontend JavaScript frameworks. While they share many similarities, they also have distinct differences in philosophy, design, and implementation.

## Architecture & Design Philosophy

**React:**
- Developed and maintained by Facebook
- Library-focused approach (not a complete framework)
- Uses JSX (JavaScript XML) syntax
- Emphasizes functional programming concepts
- Unidirectional data flow
- Requires additional libraries for routing, state management, etc.

**Vue:**
- Created by Evan You (ex-Google employee)
- Progressive framework approach
- Uses HTML templates with optional JSX support
- Combines reactive and component-based approaches
- Bidirectional data binding available
- More features included out-of-the-box

## Learning Curve

**React:**
- Steeper learning curve
- Requires understanding of JavaScript concepts like closures
- JSX mixing of JavaScript and HTML can be confusing initially
- More decisions to make about project structure

**Vue:**
- Generally considered easier to learn
- More intuitive for developers coming from HTML/CSS background
- Clear separation of concerns in Single File Components
- More opinionated, requiring fewer architectural decisions

## Performance

Both frameworks offer excellent performance with virtual DOM implementations, but:

**React:**
- Fiber architecture for asynchronous rendering
- Better for highly dynamic content with frequent updates
- More optimized for large-scale applications

**Vue:**
- Slightly better performance in most benchmarks
- More efficient updates due to its dependency tracking system
- Lighter weight with smaller bundle size

## Community & Ecosystem

**React:**
- Larger community and job market
- Extensive ecosystem of libraries
- Strong corporate backing
- React Native for mobile development

**Vue:**
- Growing community
- More cohesive ecosystem (official router, state management)
- Community-driven development
- Less fragmentation in approach

## When to Choose Each

**Choose React when:**
- Building large, complex applications
- Working with a team familiar with JavaScript
- Need for React Native mobile development
- Working at a company with existing React infrastructure

**Choose Vue when:**
- Prioritizing quick development and ease of integration
- Working with designers or less experienced developers
- Building medium-sized applications
- Prefer more structure and conventions

Both frameworks are excellent choices for modern web development, and the decision often comes down to team preference, project requirements, and existing expertise.
`;

    log('Merging sample responses', LogLevel.INFO, 'TEST_RUN');
    const mergedResponse = await mergeResponses(query, geminiResponse, deepseekResponse, settings);
    
    log('Test completed successfully', LogLevel.SUCCESS, 'TEST_RUN');
    console.log("\n\n=== MERGED RESPONSE ===\n");
    console.log(mergedResponse);
    
    logComplete('TEST_RUN', testTimer());
    
    // Generate a run summary for this test
    generateRunSummary();
  } catch (error) {
    logError('TEST_RUN', error);
    console.error("Test failed:", error);
    
    // Generate a run summary even if there was an error
    generateRunSummary();
  }
}

// Execute the test
runTest(); 