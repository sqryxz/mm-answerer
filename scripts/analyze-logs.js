#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Define descriptive names for subroutines
const SubroutineNames = {
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
  'PROCESS': 'Process Manager'
};

// Get the descriptive name for a subroutine
function getSubroutineName(subroutineCode) {
  return SubroutineNames[subroutineCode] || subroutineCode;
}

// Get the log file path from command line arguments or use today's log
const today = new Date().toISOString().split('T')[0];
const defaultLogFile = path.join(process.cwd(), 'logs', `app-${today}.log`);
const logFile = process.argv[2] || defaultLogFile;

// Check if the log file exists
if (!fs.existsSync(logFile)) {
  console.error(`Log file not found: ${logFile}`);
  console.error(`Usage: node analyze-logs.js [path-to-logfile]`);
  process.exit(1);
}

// Statistics to collect
const stats = {
  totalRequests: 0,
  totalErrors: 0,
  averageRequestTime: 0,
  totalRequestTime: 0,
  subroutines: {},
  errorTypes: {},
  requestTimes: []
};

// Regular expressions for parsing log entries
const logEntryRegex = /^(.*?) \[(INFO|WARNING|ERROR|DEBUG|SUCCESS)\] \[(.*?)\] (.*)$/;
const completedRegex = /Completed .*? \(completed in (\d+)ms\)/;
const errorRegex = /Error in .*?: (.*)/;
const oldErrorRegex = /Error: (.*)/; // For backward compatibility

// Create a readline interface
const rl = readline.createInterface({
  input: fs.createReadStream(logFile),
  crlfDelay: Infinity
});

// Create a reverse mapping from descriptive names to codes
const DescriptiveNameToCode = {};
for (const [code, name] of Object.entries(SubroutineNames)) {
  DescriptiveNameToCode[name] = code;
}

// Process each line
rl.on('line', (line) => {
  const match = line.match(logEntryRegex);
  if (!match) return;
  
  const [, timestamp, level, subroutineDisplay, message] = match;
  
  // Determine if this is a code or descriptive name
  const isCode = Object.keys(SubroutineNames).includes(subroutineDisplay);
  const isDescriptiveName = Object.values(SubroutineNames).includes(subroutineDisplay);
  
  // Use the descriptive name as the key if available, otherwise use the code
  let subroutineKey;
  if (isDescriptiveName) {
    subroutineKey = subroutineDisplay;
  } else if (isCode && SubroutineNames[subroutineDisplay]) {
    subroutineKey = SubroutineNames[subroutineDisplay];
  } else {
    subroutineKey = subroutineDisplay;
  }
  
  // Track subroutine counts
  if (!stats.subroutines[subroutineKey]) {
    stats.subroutines[subroutineKey] = { 
      count: 0, 
      errors: 0, 
      totalTime: 0, 
      times: [],
      name: subroutineKey
    };
  }
  stats.subroutines[subroutineKey].count++;
  
  // Track API requests
  if (subroutineDisplay === 'API Request Handler' || subroutineDisplay === 'API_REQUEST') {
    if (message.startsWith('Processing query') || message.includes('Starting API Request Handler')) {
      stats.totalRequests++;
    }
  }
  
  // Track errors
  if (level === 'ERROR') {
    stats.totalErrors++;
    stats.subroutines[subroutineKey].errors++;
    
    // Try both error regex patterns
    const errorMatch = message.match(errorRegex) || message.match(oldErrorRegex);
    if (errorMatch) {
      const errorMessage = errorMatch[1];
      const errorType = `${errorMessage} in ${subroutineKey}`;
      stats.errorTypes[errorType] = (stats.errorTypes[errorType] || 0) + 1;
    }
  }
  
  // Track completion times
  const completedMatch = message.match(completedRegex);
  if (completedMatch) {
    const time = parseInt(completedMatch[1], 10);
    stats.subroutines[subroutineKey].totalTime += time;
    stats.subroutines[subroutineKey].times.push(time);
    
    if (subroutineDisplay === 'API Request Handler' || subroutineDisplay === 'API_REQUEST') {
      stats.totalRequestTime += time;
      stats.requestTimes.push(time);
    }
  }
});

// Output the results when done
rl.on('close', () => {
  console.log('\n===== Log Analysis Report =====\n');
  
  console.log(`Total API Requests: ${stats.totalRequests}`);
  console.log(`Total Errors: ${stats.totalErrors}`);
  
  if (stats.requestTimes.length > 0) {
    stats.averageRequestTime = stats.totalRequestTime / stats.requestTimes.length;
    console.log(`Average API Request Time: ${stats.averageRequestTime.toFixed(2)}ms`);
    
    const sortedTimes = [...stats.requestTimes].sort((a, b) => a - b);
    const median = sortedTimes[Math.floor(sortedTimes.length / 2)];
    console.log(`Median API Request Time: ${median}ms`);
    console.log(`Fastest API Request: ${sortedTimes[0]}ms`);
    console.log(`Slowest API Request: ${sortedTimes[sortedTimes.length - 1]}ms`);
  }
  
  console.log('\n----- Subroutine Statistics -----\n');
  
  // First, create a mapping of all codes to their descriptive names
  const codeToDescriptiveMap = {};
  for (const [code, name] of Object.entries(SubroutineNames)) {
    codeToDescriptiveMap[code] = name;
  }
  
  // Consolidate entries for codes and their descriptive names
  const consolidatedStats = {};
  const processedKeys = new Set();
  
  // First pass: Process descriptive names and merge with their code counterparts
  for (const [key, data] of Object.entries(stats.subroutines)) {
    // Skip if already processed
    if (processedKeys.has(key)) continue;
    
    // Check if this is a descriptive name
    const isDescriptiveName = Object.values(SubroutineNames).includes(key);
    if (isDescriptiveName) {
      // Find the corresponding code
      const code = DescriptiveNameToCode[key];
      
      // Initialize with the descriptive name data
      consolidatedStats[key] = { ...data };
      
      // If the code exists in stats, merge its data
      if (code && stats.subroutines[code]) {
        const codeData = stats.subroutines[code];
        consolidatedStats[key].count += codeData.count;
        consolidatedStats[key].errors += codeData.errors;
        consolidatedStats[key].totalTime += codeData.totalTime;
        consolidatedStats[key].times.push(...codeData.times);
        
        // Mark code as processed
        processedKeys.add(code);
      }
      
      // Mark descriptive name as processed
      processedKeys.add(key);
    }
  }
  
  // Second pass: Process remaining codes that don't have descriptive name entries
  for (const [key, data] of Object.entries(stats.subroutines)) {
    // Skip if already processed
    if (processedKeys.has(key)) continue;
    
    // Check if this is a code with a descriptive name mapping
    const descriptiveName = SubroutineNames[key];
    if (descriptiveName) {
      // If the descriptive name doesn't exist in stats, use the code data with descriptive name
      if (!stats.subroutines[descriptiveName]) {
        consolidatedStats[descriptiveName] = { ...data, name: descriptiveName };
      }
      // Otherwise, it was already processed in the first pass
    } else {
      // This is a code without a descriptive name mapping or a custom name
      consolidatedStats[key] = data;
    }
    
    // Mark as processed
    processedKeys.add(key);
  }
  
  // Sort subroutines by count
  const sortedSubroutines = Object.entries(consolidatedStats)
    .sort((a, b) => b[1].count - a[1].count);
  
  for (const [name, data] of sortedSubroutines) {
    console.log(`${name}:`);
    console.log(`  Calls: ${data.count}`);
    console.log(`  Errors: ${data.errors}`);
    
    if (data.times.length > 0) {
      const avgTime = data.totalTime / data.times.length;
      console.log(`  Average Time: ${avgTime.toFixed(2)}ms`);
      
      const sortedTimes = [...data.times].sort((a, b) => a - b);
      const median = sortedTimes[Math.floor(sortedTimes.length / 2)];
      console.log(`  Median Time: ${median}ms`);
      console.log(`  Fastest: ${sortedTimes[0]}ms`);
      console.log(`  Slowest: ${sortedTimes[sortedTimes.length - 1]}ms`);
    }
    
    console.log('');
  }
  
  if (Object.keys(stats.errorTypes).length > 0) {
    console.log('\n----- Error Types -----\n');
    
    const sortedErrors = Object.entries(stats.errorTypes)
      .sort((a, b) => b[1] - a[1]);
    
    for (const [type, count] of sortedErrors) {
      console.log(`${type}: ${count}`);
    }
  }
  
  console.log('\n===== End of Report =====');
});

console.log(`Analyzing log file: ${logFile}`); 