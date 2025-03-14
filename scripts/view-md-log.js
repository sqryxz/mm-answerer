#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get the log directory
const MD_LOG_DIR = path.join(process.cwd(), 'logs', 'md');

// Check if the directory exists
if (!fs.existsSync(MD_LOG_DIR)) {
  console.error(`Markdown log directory not found: ${MD_LOG_DIR}`);
  process.exit(1);
}

// Get the log file from command line arguments or use the most recent one
let logFile;

if (process.argv[2]) {
  // If a specific log file is requested
  logFile = path.join(MD_LOG_DIR, process.argv[2]);
  if (!fs.existsSync(logFile)) {
    console.error(`Log file not found: ${logFile}`);
    console.error(`Available log files:`);
    listLogFiles();
    process.exit(1);
  }
} else {
  // Find the most recent log file
  const files = fs.readdirSync(MD_LOG_DIR)
    .filter(file => file.startsWith('run-') && file.endsWith('.md'))
    .map(file => ({
      name: file,
      path: path.join(MD_LOG_DIR, file),
      mtime: fs.statSync(path.join(MD_LOG_DIR, file)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    console.error('No Markdown log files found.');
    process.exit(1);
  }

  logFile = files[0].path;
  console.log(`Viewing most recent log file: ${files[0].name}`);
}

// Read and display the log file
const content = fs.readFileSync(logFile, 'utf8');
console.log('\n' + content);

// Function to list available log files
function listLogFiles() {
  const files = fs.readdirSync(MD_LOG_DIR)
    .filter(file => file.startsWith('run-') && file.endsWith('.md'))
    .map(file => ({
      name: file,
      path: path.join(MD_LOG_DIR, file),
      mtime: fs.statSync(path.join(MD_LOG_DIR, file)).mtime,
      size: fs.statSync(path.join(MD_LOG_DIR, file)).size
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    console.log('No Markdown log files found.');
    return;
  }

  console.log('\nAvailable log files:');
  console.log('--------------------');
  files.forEach((file, index) => {
    const date = file.mtime.toISOString().replace('T', ' ').substring(0, 19);
    const sizeKB = (file.size / 1024).toFixed(2);
    console.log(`${index + 1}. ${file.name} (${date}, ${sizeKB} KB)`);
  });
  
  console.log('\nTo view a specific log file, run:');
  console.log('npm run view-md-log -- <filename>');
}

// If no specific file was requested, also list all available files
if (!process.argv[2]) {
  listLogFiles();
} 