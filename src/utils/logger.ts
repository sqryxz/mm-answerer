import fs from 'fs';
import path from 'path';

// Define log levels
export enum LogLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
  SUCCESS = 'SUCCESS'
}

// Define descriptive names for subroutines
export const SubroutineNames: Record<string, string> = {
  // API Request Flow
  'API_REQUEST': 'API Request Handler',
  'GEMINI_QUERY': 'Gemini API Query',
  'DEEPSEEK_QUERY': 'Deepseek API Query',
  'MERGE_RESPONSES': 'Response Merger',
  
  // Internal Processing
  'GEMINI_PROCESS': 'Gemini Processing',
  'DEEPSEEK_PROCESS': 'Deepseek Processing',
  'MERGE_PROCESS': 'Merge Processing',
  
  // Testing
  'TEST_MERGE_PROCESS': 'Test Merge Process',
  'TEST_RUN': 'Test Run',
  'TEST_MD_LOG': 'Markdown Log Test',
  
  // Client-side
  'APP_INIT': 'Application Initialization',
  'APP_CLEANUP': 'Application Cleanup',
  'HISTORY_LOAD': 'History Loading',
  'HISTORY_SAVE': 'History Saving',
  'QUERY_SUBMIT': 'Query Submission',
  'API_RESPONSE': 'API Response Handler',
  'HISTORY_UPDATE': 'History Update',
  'QUERY_COMPLETE': 'Query Completion',
  'HISTORY_SELECT': 'History Selection',
  'HISTORY_CLEAR': 'History Clearing',
  
  // System
  'LOGGER': 'Logging System',
  'PROCESS': 'Process Manager',
  
  // Test subroutines
  'SUBROUTINE_A': 'Test Subroutine A',
  'SUBROUTINE_B': 'Test Subroutine B',
  'SUBROUTINE_C': 'Test Subroutine C',
  'PARENT_ROUTINE': 'Parent Test Routine',
  'CHILD_ROUTINE_1': 'Child Test Routine 1',
  'CHILD_ROUTINE_2': 'Child Test Routine 2'
};

// Define log directory and file path
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, `app-${new Date().toISOString().split('T')[0]}.log`);
const MD_LOG_DIR = path.join(LOG_DIR, 'md');

// Generate a unique run ID
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const MD_LOG_FILE = path.join(MD_LOG_DIR, `run-${RUN_ID}.md`);

// Ensure log directories exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
if (!fs.existsSync(MD_LOG_DIR)) {
  fs.mkdirSync(MD_LOG_DIR, { recursive: true });
}

// Initialize the Markdown log file with a header
fs.writeFileSync(MD_LOG_FILE, `# Application Run Log: ${new Date().toISOString()}\n\n`);
fs.appendFileSync(MD_LOG_FILE, `## Run ID: ${RUN_ID}\n\n`);
fs.appendFileSync(MD_LOG_FILE, `| Timestamp | Level | Subroutine | Message |\n`);
fs.appendFileSync(MD_LOG_FILE, `| --- | --- | --- | --- |\n`);

// Track subroutines for the summary
const subroutines: Record<string, { 
  started: boolean, 
  completed: boolean, 
  startTime?: number,
  endTime?: number,
  errors: number,
  name: string
}> = {};

/**
 * Get the descriptive name for a subroutine
 * @param subroutineCode The code/key for the subroutine
 * @returns The descriptive name or the original code if not found
 */
function getSubroutineName(subroutineCode: string): string {
  return SubroutineNames[subroutineCode] || subroutineCode;
}

/**
 * Log a message to the console and to a file
 * @param message The message to log
 * @param level The log level
 * @param subroutine Optional subroutine name
 */
export function log(message: string, level: LogLevel = LogLevel.INFO, subroutine?: string): void {
  const timestamp = new Date().toISOString();
  const subroutineDisplayName = subroutine ? getSubroutineName(subroutine) : '';
  const subroutineStr = subroutine ? `[${subroutineDisplayName}]` : '';
  const logMessage = `${timestamp} [${level}] ${subroutineStr} ${message}`;
  
  // Log to console
  console.log(logMessage);
  
  // Log to file
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
    
    // Log to Markdown file
    const mdSubroutine = subroutine ? getSubroutineName(subroutine) : '-';
    const escapedMessage = message.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
    fs.appendFileSync(MD_LOG_FILE, `| ${timestamp} | ${level} | ${mdSubroutine} | ${escapedMessage} |\n`);
    
    // Track subroutine for summary
    if (subroutine) {
      if (!subroutines[subroutine]) {
        subroutines[subroutine] = { 
          started: false, 
          completed: false, 
          errors: 0,
          name: getSubroutineName(subroutine)
        };
      }
      
      if (level === LogLevel.ERROR) {
        subroutines[subroutine].errors++;
      }
    }
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

/**
 * Log the start of a subroutine
 * @param subroutine The name of the subroutine
 */
export function logStart(subroutine: string): void {
  if (!subroutines[subroutine]) {
    subroutines[subroutine] = { 
      started: true, 
      completed: false, 
      errors: 0,
      name: getSubroutineName(subroutine)
    };
  } else {
    subroutines[subroutine].started = true;
  }
  subroutines[subroutine].startTime = Date.now();
  
  log(`Starting ${getSubroutineName(subroutine)}`, LogLevel.INFO, subroutine);
}

/**
 * Log the completion of a subroutine
 * @param subroutine The name of the subroutine
 * @param timeMs Optional execution time in milliseconds
 */
export function logComplete(subroutine: string, timeMs?: number): void {
  if (!subroutines[subroutine]) {
    subroutines[subroutine] = { 
      started: true, 
      completed: true, 
      errors: 0,
      name: getSubroutineName(subroutine)
    };
  } else {
    subroutines[subroutine].completed = true;
  }
  subroutines[subroutine].endTime = Date.now();
  
  const timeInfo = timeMs ? ` (completed in ${timeMs}ms)` : '';
  log(`Completed ${getSubroutineName(subroutine)}${timeInfo}`, LogLevel.SUCCESS, subroutine);
}

/**
 * Log an error in a subroutine
 * @param subroutine The name of the subroutine
 * @param error The error object or message
 */
export function logError(subroutine: string, error: unknown): void {
  if (!subroutines[subroutine]) {
    subroutines[subroutine] = { 
      started: true, 
      completed: false, 
      errors: 1,
      name: getSubroutineName(subroutine)
    };
  } else {
    subroutines[subroutine].errors++;
  }
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  log(`Error in ${getSubroutineName(subroutine)}: ${errorMessage}`, LogLevel.ERROR, subroutine);
}

/**
 * Create a timer for measuring execution time
 * @returns A function that returns the elapsed time in milliseconds
 */
export function createTimer(): () => number {
  const startTime = Date.now();
  return () => Date.now() - startTime;
}

/**
 * Generate a summary of the current run and append it to the Markdown log
 */
export function generateRunSummary(): void {
  try {
    fs.appendFileSync(MD_LOG_FILE, `\n## Run Summary\n\n`);
    
    // Add subroutine summary
    fs.appendFileSync(MD_LOG_FILE, `### Subroutines\n\n`);
    fs.appendFileSync(MD_LOG_FILE, `| Subroutine | Status | Duration | Errors |\n`);
    fs.appendFileSync(MD_LOG_FILE, `| --- | --- | --- | --- |\n`);
    
    for (const data of Object.values(subroutines)) {
      const status = data.completed ? '✅ Completed' : (data.started ? '⚠️ Started but not completed' : '❌ Not started');
      const duration = (data.startTime && data.endTime) 
        ? `${data.endTime - data.startTime}ms` 
        : '-';
      fs.appendFileSync(MD_LOG_FILE, `| ${data.name} | ${status} | ${duration} | ${data.errors} |\n`);
    }
    
    // Add timestamp
    fs.appendFileSync(MD_LOG_FILE, `\n### End of Run\n\n`);
    fs.appendFileSync(MD_LOG_FILE, `Run completed at: ${new Date().toISOString()}\n`);
    
    log(`Generated run summary in ${MD_LOG_FILE}`, LogLevel.INFO, 'LOGGER');
  } catch (error) {
    console.error('Failed to generate run summary:', error);
  }
}

// Register process exit handler to generate summary
process.on('exit', () => {
  generateRunSummary();
});

// Also handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  log('Application terminated by user', LogLevel.WARNING, 'PROCESS');
  generateRunSummary();
  process.exit(0);
}); 