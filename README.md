# Geoffrey.ai - AI Visibility & GEO Optimization Platform

Geoffrey.ai helps businesses measure and improve their visibility across AI assistants like ChatGPT, Gemini, Perplexity, and Claude. Get actionable insights to optimize your presence in AI-generated responses.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Clerk account (for authentication)
- OpenAI API key
- Google Cloud project (for GA4 integration)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd geoffrey-mvp
   ```

2. **Install dependencies**
   ```bash
   # Backend dependencies
   npm install
   
   # Frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Set up database**
   - Run SQL migrations in `schema/` directory in your Supabase project
   - See `docs/DEVELOPMENT.md` for detailed setup instructions

5. **Start development servers**
   ```bash
   npm run dev
   ```
   - Backend: http://localhost:3000
   - Frontend: http://localhost:5173

## 📁 Project Structure

```
geoffrey-mvp/
├── frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utilities (Supabase client, etc.)
│   │   └── types.ts        # Frontend type definitions
│   └── package.json
├── src/               # Backend (Node.js + Express)
│   ├── routes/       # API route handlers
│   ├── lib/          # Utilities (encryption, GA4, etc.)
│   ├── core/         # Core business logic
│   ├── scanner.ts    # Website scanning logic
│   └── server.ts     # Express server setup
├── schema/           # Database migrations (Supabase SQL)
├── scripts/          # Development/test scripts
└── docs/             # Documentation
    ├── PRE_LAUNCH_CHECKLIST.md
    ├── GA4_SETUP.md
    └── PLANNING/     # Historical planning documents
```

## 🛠 Tech Stack

### Frontend
- **React** + **TypeScript**
- **Vite** (build tool)
- **Clerk** (authentication)
- **Supabase** (database client)
- **React Router** (routing)
- **Recharts** (data visualization)

### Backend
- **Node.js** + **Express**
- **TypeScript**
- **Supabase** (database)
- **OpenAI API** (GPT-4o-mini)
- **Google Analytics Data API** (GA4 integration)
- **Cheerio** (web scraping)

## 📚 Documentation

- **[Development Guide](docs/DEVELOPMENT.md)** - Setup, workflow, and development practices
- **[Pre-Launch Checklist](docs/PRE_LAUNCH_CHECKLIST.md)** - Items to complete before production
- **[GA4 Setup](docs/GA4_SETUP.md)** - Google Analytics integration guide
- **[Architecture](docs/ARCHITECTURE.md)** - System design and architecture overview

## 🔑 Key Features

- **AI Visibility Scanning** - Measure how often your business is mentioned in AI responses
- **Competitor Analysis** - Track Share of Voice (SoV) against competitors
- **Prompt Testing** - Test how your business appears in different AI queries
- **GEO Optimization** - Get recommendations to improve AI discoverability
- **GA4 Integration** - Track AI-originated traffic and conversions

## 🧪 Development Scripts

```bash
npm run dev          # Start both frontend and backend
npm run server       # Start backend only
npm run frontend      # Start frontend only (from root)
npm run test-cli      # Run test CLI script
```

## 📝 License

ISC

## 🤝 Contributing

This is a private MVP project. For questions or issues, contact the development team.

---

**Status:** 🚧 In Active Development
