# Multi-Model Answer Merger

A web application that takes a single question, queries multiple AI models (Deepseek and Google Gemini), and fuses their responses into a unified answer.

## Features

- Query multiple AI models with a single question
- View individual responses from each model
- See a merged response that combines insights from all models
- Simple and intuitive user interface
- Comprehensive logging system for tracking application execution and subroutines
- Markdown log generation for each application run

## Technologies Used

- Next.js 14
- TypeScript
- Tailwind CSS
- Google Gemini API
- Deepseek API

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- API keys for Deepseek and Google Gemini

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/multi-model-answer.git
cd multi-model-answer
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory with your API keys:

```
DEEPSEEK_API_KEY=your_deepseek_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### Running the Application

1. Start the development server:

```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Alternative Port

If you encounter a port conflict (EADDRINUSE error), you can start the application on an alternative port:

```bash
npm run start:alt
```

This will start the application on port 3001 instead of the default port 3000.

## Deployment to Vercel

This project is configured for easy deployment to Vercel.

1. Push your code to a GitHub repository.

2. Visit [Vercel](https://vercel.com) and sign in with your GitHub account.

3. Click "New Project" and import your repository.

4. Configure the project:
   - Framework Preset: Next.js (should be auto-detected)
   - Root Directory: ./
   - Build Command: npm run build (default)
   - Output Directory: .next (default)

5. Add the following environment variables in the Vercel project settings:
   - `DEEPSEEK_API_KEY`: Your Deepseek API key
   - `GEMINI_API_KEY`: Your Google Gemini API key

6. Click "Deploy" and wait for the deployment to complete.

7. Your application will be available at the URL provided by Vercel.

## Usage

1. Enter your question in the text area
2. Click "Get Multi-Model Answer"
3. View the merged response or switch between tabs to see individual model responses

## Extending the Application

To add more AI models:

1. Add the new API key to your `.env.local` file
2. Update the API route handler in `src/app/api/merge/route.ts` to include the new model
3. Modify the `ResponseDisplay` component to include a new tab for the added model

## Logging System

The application includes a comprehensive logging system that tracks:
- Application startup and shutdown
- API requests and responses
- Subroutine execution and completion
- Error handling
- Performance metrics (execution time)

### Viewing Logs

You can view the current day's text logs using:

```bash
npm run logs
```

### Markdown Logs

The application generates a Markdown log file for each run, providing a readable and shareable format for logs. You can:

- List all Markdown logs: `npm run md-logs`
- View the most recent log: `npm run view-md-log`
- View a specific log: `npm run view-md-log -- <filename>`

### Log Analysis

You can analyze log performance and error patterns using:

```bash
npm run analyze-logs
```

For more details about the logging system, see [LOGGING.md](LOGGING.md).

## License

MIT
