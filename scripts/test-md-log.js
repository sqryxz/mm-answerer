#!/usr/bin/env node

// Import the logger - using a direct path since this is a script
const path = require('path');
const fs = require('fs');

// Define log levels
const LogLevel = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
  SUCCESS: 'SUCCESS'
};

// Define descriptive names for subroutines
const SubroutineNames = {
  // Test subroutines
  'TEST_MD_LOG': 'Markdown Log Test',
  'DATA_PROCESSING': 'Data Processing Routine',
  'API_SIMULATION': 'API Call Simulation',
  'ERROR_HANDLING': 'Error Handling Routine',
  'PARENT_WORKFLOW': 'Parent Workflow',
  'CHILD_WORKFLOW_1': 'Child Workflow - Data Fetching',
  'CHILD_WORKFLOW_2': 'Child Workflow - Data Processing',
  'LOGGER': 'Logging System'
};

// Get the descriptive name for a subroutine
function getSubroutineName(subroutineCode) {
  return SubroutineNames[subroutineCode] || subroutineCode;
}

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
const subroutines = {};

/**
 * Log a message to the console and to a file
 */
function log(message, level = LogLevel.INFO, subroutine) {
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
 */
function logStart(subroutine) {
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
 */
function logComplete(subroutine, timeMs) {
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
 */
function logError(subroutine, error) {
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
 */
function createTimer() {
  const startTime = Date.now();
  return () => Date.now() - startTime;
}

/**
 * Generate a summary of the current run and append it to the Markdown log
 */
function generateRunSummary() {
  try {
    fs.appendFileSync(MD_LOG_FILE, `\n## Run Summary\n\n`);
    
    // Add subroutine summary
    fs.appendFileSync(MD_LOG_FILE, `### Subroutines\n\n`);
    fs.appendFileSync(MD_LOG_FILE, `| Subroutine | Status | Duration | Errors |\n`);
    fs.appendFileSync(MD_LOG_FILE, `| --- | --- | --- | --- |\n`);
    
    for (const [code, data] of Object.entries(subroutines)) {
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

// Function to simulate a subroutine
async function simulateSubroutine(name, description, duration, shouldError = false) {
  const timer = createTimer();
  logStart(name);
  
  log(`Executing ${description}`, LogLevel.INFO, name);
  
  // Simulate processing
  await new Promise(resolve => setTimeout(resolve, duration));
  
  if (shouldError) {
    logError(name, new Error(`Simulated error in ${description}`));
  } else {
    log(`${description} completed successfully`, LogLevel.SUCCESS, name);
  }
  
  logComplete(name, timer());
}

// Main test function
async function runTest() {
  const mainTimer = createTimer();
  logStart('TEST_MD_LOG');
  
  log('Starting Markdown log test with descriptive subroutine names', LogLevel.INFO, 'TEST_MD_LOG');
  
  try {
    // Simulate a series of subroutines with descriptive names
    await simulateSubroutine('DATA_PROCESSING', 'Data processing routine', 500);
    await simulateSubroutine('API_SIMULATION', 'API call simulation', 1000, true); // This one will have an error
    await simulateSubroutine('ERROR_HANDLING', 'Error handling routine', 750);
    
    // Simulate nested subroutines
    logStart('PARENT_WORKFLOW');
    log('Starting parent workflow with nested children', LogLevel.INFO, 'PARENT_WORKFLOW');
    
    await simulateSubroutine('CHILD_WORKFLOW_1', 'Data fetching workflow', 300);
    await simulateSubroutine('CHILD_WORKFLOW_2', 'Data processing workflow', 400);
    
    logComplete('PARENT_WORKFLOW', 800);
    
    // Log some different levels
    log('This is a debug message with detailed information', LogLevel.DEBUG, 'TEST_MD_LOG');
    log('This is a warning message about potential issues', LogLevel.WARNING, 'TEST_MD_LOG');
    log('This is an informational message about the test progress', LogLevel.INFO, 'TEST_MD_LOG');
    
    logComplete('TEST_MD_LOG', mainTimer());
    
    // Generate the run summary
    generateRunSummary();
    
    console.log('\nTest completed successfully. Check the logs/md directory for the generated Markdown log.');
  } catch (error) {
    logError('TEST_MD_LOG', error);
    console.error('Test failed:', error);
    
    // Generate a run summary even if there was an error
    generateRunSummary();
  }
}

// Run the test
runTest(); 