# Logging System Documentation

This document explains the logging system implemented in the Multi-Model Answer application.

## Overview

The application now includes a comprehensive logging system that tracks:
- Application startup and shutdown
- API requests and responses
- Subroutine execution and completion
- Error handling
- Performance metrics (execution time)

## Log Format

Logs follow this standard format:
```
TIMESTAMP [LEVEL] [SUBROUTINE] MESSAGE
```

Example:
```
2023-06-15T14:32:45.123Z [INFO] [API Request Handler] Processing query: "What is the difference between React and Vue?"
```

## Log Levels

The following log levels are used:
- `INFO`: General information about application flow
- `DEBUG`: Detailed information useful for debugging
- `WARNING`: Potential issues that don't prevent operation
- `ERROR`: Errors that affect functionality
- `SUCCESS`: Successful completion of operations

## Subroutines Tracked

The following subroutines are tracked in the logs with descriptive names:

### Server-side
- `API_REQUEST`: API Request Handler
- `GEMINI_QUERY`: Gemini API Query
- `DEEPSEEK_QUERY`: Deepseek API Query
- `MERGE_RESPONSES`: Response Merger
- `GEMINI_PROCESS`: Gemini Processing
- `DEEPSEEK_PROCESS`: Deepseek Processing
- `MERGE_PROCESS`: Merge Processing
- `TEST_MERGE_PROCESS`: Test Merge Process
- `TEST_RUN`: Test Run

### Client-side
- `APP_INIT`: Application Initialization
- `APP_CLEANUP`: Application Cleanup
- `HISTORY_LOAD`: History Loading
- `HISTORY_SAVE`: History Saving
- `QUERY_SUBMIT`: Query Submission
- `API_REQUEST`: API Request Handler (client-side)
- `API_RESPONSE`: API Response Handler
- `HISTORY_UPDATE`: History Update
- `QUERY_COMPLETE`: Query Completion
- `HISTORY_SELECT`: History Selection
- `HISTORY_CLEAR`: History Clearing

### System
- `LOGGER`: Logging System
- `PROCESS`: Process Manager

## Log Storage

### Text Logs
Server-side logs are stored in the `logs` directory with filenames in the format `app-YYYY-MM-DD.log`.

Client-side logs are currently only output to the browser console. In a production environment, these could be sent to a server-side logging service.

### Markdown Logs
In addition to text logs, the application now generates Markdown log files for each run. These logs are stored in the `logs/md` directory with filenames in the format `run-YYYY-MM-DDTHH-mm-ss-sssZ.md`.

Each Markdown log includes:
- A header with the run timestamp and ID
- A table of all log entries with timestamp, level, descriptive subroutine name, and message
- A summary section with statistics for each subroutine
- Status indicators for each subroutine (completed, started but not completed, or not started)
- Duration information for each subroutine
- Error counts for each subroutine

## Viewing Logs

### Text Logs
You can view the current day's text logs using the following command:

```bash
npm run logs
```

This will display the contents of today's log file.

### Markdown Logs
You can list all available Markdown logs using:

```bash
npm run md-logs
```

You can view the most recent Markdown log using:

```bash
npm run view-md-log
```

You can view a specific Markdown log by providing its filename:

```bash
npm run view-md-log -- run-2023-06-15T14-32-45-123Z.md
```

## Log Analysis

The application includes a log analysis script that provides insights into the application's performance and error patterns:

```bash
npm run analyze-logs
```

This will analyze today's log file and generate a report with the following information:
- Total API requests
- Total errors
- Average, median, fastest, and slowest API request times
- Statistics for each subroutine (calls, errors, timing)
- Breakdown of error types

You can also analyze a specific log file:

```bash
npm run analyze-logs -- path/to/logfile.log
```

### Sample Analysis Report

```
===== Log Analysis Report =====

Total API Requests: 25
Total Errors: 3

Average API Request Time: 1250.45ms
Median API Request Time: 1125ms
Fastest API Request: 850ms
Slowest API Request: 2340ms

----- Subroutine Statistics -----

API Request Handler:
  Calls: 25
  Errors: 1
  Average Time: 1250.45ms
  Median Time: 1125ms
  Fastest: 850ms
  Slowest: 2340ms

Gemini API Query:
  Calls: 25
  Errors: 1
  Average Time: 650.32ms
  Median Time: 625ms
  Fastest: 450ms
  Slowest: 1200ms

Deepseek API Query:
  Calls: 25
  Errors: 1
  Average Time: 520.18ms
  Median Time: 510ms
  Fastest: 380ms
  Slowest: 950ms

----- Error Types -----

FetchError: 2
TimeoutError: 1

===== End of Report =====
```

## Performance Tracking

The logging system includes performance tracking for key operations:
- Overall API request processing time
- Time spent in each model's API call
- Time spent merging responses
- Client-side query processing time

This information can be used to identify bottlenecks and optimize performance.

## Error Handling

All errors are logged with detailed information about:
- The subroutine where the error occurred
- The error message
- The error stack trace (for server-side errors)

This helps with debugging and troubleshooting issues in production.

## Descriptive Subroutine Names

The logging system now uses descriptive names for subroutines instead of code identifiers. This makes logs more readable and easier to understand. The mapping between code identifiers and descriptive names is defined in the `SubroutineNames` object in the logger utility.

To add a new subroutine with a descriptive name:

1. Add the mapping to the `SubroutineNames` object in `src/utils/logger.ts`:
   ```typescript
   export const SubroutineNames: Record<string, string> = {
     // Existing mappings...
     'NEW_SUBROUTINE_CODE': 'New Descriptive Subroutine Name',
   };
   ```

2. Use the code identifier when calling the logging functions:
   ```typescript
   logStart('NEW_SUBROUTINE_CODE');
   // ... your code ...
   logComplete('NEW_SUBROUTINE_CODE', timer());
   ```

The logger will automatically use the descriptive name in the logs.

## Sample Markdown Log

Here's an example of what a Markdown log looks like with descriptive subroutine names:

```markdown
# Application Run Log: 2023-06-15T14:32:45.123Z

## Run ID: 2023-06-15T14-32-45-123Z

| Timestamp | Level | Subroutine | Message |
| --- | --- | --- | --- |
| 2023-06-15T14:32:45.123Z | INFO | API Request Handler | Starting API Request Handler |
| 2023-06-15T14:32:45.234Z | INFO | API Request Handler | Processing query: "What is the difference between React and Vue?" |
| 2023-06-15T14:32:45.345Z | INFO | Gemini API Query | Starting Gemini API Query |
| 2023-06-15T14:32:45.456Z | DEBUG | Gemini Processing | Initializing Gemini model |
| 2023-06-15T14:32:45.567Z | DEBUG | Gemini Processing | Sending request to Gemini API |
| 2023-06-15T14:32:46.678Z | SUCCESS | Gemini Processing | Completed Gemini Processing (completed in 1222ms) |
| 2023-06-15T14:32:46.789Z | SUCCESS | Gemini API Query | Completed Gemini API Query (completed in 1444ms) |
| 2023-06-15T14:32:46.890Z | INFO | Deepseek API Query | Starting Deepseek API Query |
| 2023-06-15T14:32:46.901Z | DEBUG | Deepseek Processing | Preparing Deepseek request |
| 2023-06-15T14:32:47.012Z | SUCCESS | Deepseek Processing | Completed Deepseek Processing (completed in 111ms) |
| 2023-06-15T14:32:47.123Z | SUCCESS | Deepseek API Query | Completed Deepseek API Query (completed in 233ms) |
| 2023-06-15T14:32:47.234Z | INFO | Response Merger | Starting Response Merger |
| 2023-06-15T14:32:47.345Z | DEBUG | Merge Processing | Initializing Gemini model for merging |
| 2023-06-15T14:32:47.456Z | DEBUG | Merge Processing | Sending merge request to Gemini API |
| 2023-06-15T14:32:48.567Z | SUCCESS | Merge Processing | Completed Merge Processing (completed in 1222ms) |
| 2023-06-15T14:32:48.678Z | SUCCESS | Response Merger | Completed Response Merger (completed in 1444ms) |
| 2023-06-15T14:32:48.789Z | SUCCESS | API Request Handler | Completed API Request Handler (completed in 3666ms) |
| 2023-06-15T14:32:48.890Z | INFO | Logging System | Generated run summary in /Users/username/multi-model-answer/logs/md/run-2023-06-15T14-32-45-123Z.md |

## Run Summary

### Subroutines

| Subroutine | Status | Duration | Errors |
| --- | --- | --- | --- |
| API Request Handler | ✅ Completed | 3666ms | 0 |
| Gemini API Query | ✅ Completed | 1444ms | 0 |
| Gemini Processing | ✅ Completed | 1222ms | 0 |
| Deepseek API Query | ✅ Completed | 233ms | 0 |
| Deepseek Processing | ✅ Completed | 111ms | 0 |
| Response Merger | ✅ Completed | 1444ms | 0 |
| Merge Processing | ✅ Completed | 1222ms | 0 |
| Logging System | ✅ Completed | - | 0 |

### End of Run

Run completed at: 2023-06-15T14:32:48.901Z
```

## Future Enhancements

Potential future enhancements to the logging system:
- Log rotation to prevent log files from growing too large
- Centralized log storage (e.g., using a service like Datadog, Loggly, or ELK stack)
- Log filtering and search capabilities
- Real-time log monitoring dashboard
- Alert system for critical errors
- Visualization of log data and performance metrics
- Integration with monitoring services
- Hierarchical subroutine grouping for better organization
- Custom log views based on subroutine categories 