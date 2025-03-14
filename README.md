# Multi-Model Answer Merger

A web application that takes a single question, queries multiple AI models (Deepseek and Google Gemini), and fuses their responses into a unified answer.

## Features

- Query multiple AI models with a single question
- View individual responses from each model
- See a merged response that combines insights from all models
- Simple and intuitive user interface

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

## Usage

1. Enter your question in the text area
2. Click "Get Multi-Model Answer"
3. View the merged response or switch between tabs to see individual model responses

## Extending the Application

To add more AI models:

1. Add the new API key to your `.env.local` file
2. Update the API route handler in `src/app/api/merge/route.ts` to include the new model
3. Modify the `ResponseDisplay` component to include a new tab for the added model

## License

MIT
