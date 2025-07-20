# JunkDrawer.Tools

Your digital tool chest - free, API-powered utilities that just work.

## Available Tools

### 🖼️ Alt Text Generator (`/tools/alt-text-generator/`)
Generate SEO-friendly alt text for images using AI. Upload multiple images and get AI-powered descriptions for better accessibility and SEO.

**Features:**
- Drag & drop image uploads (JPG, PNG, GIF, WebP)
- AI-powered descriptions using OpenAI GPT-4o
- Batch processing for multiple images
- Copy to clipboard functionality
- No data storage - privacy-first approach

**Requirements:** OpenAI API key (~$0.02-0.05 per image)

### 🧠 LLMS.txt Converter (`/tools/llms-converter/`)
Convert any website into an AI-optimized LLMS.txt file. Perfect for AI search engines, chatbots, and language model training.

**Features:**
- Website crawling and content extraction
- AI-powered content categorization
- Multiple export formats (LLMS.txt, CSV, JSON)
- SEO-optimized descriptions
- Customizable crawling settings

**Requirements:** OpenAI API key (optional, for AI enhancement)

## API Integration

All tools follow a user-controlled API architecture:
- **User-provided API keys**: Bring your own OpenAI API key
- **Session-only storage**: API keys stored locally, never on our servers
- **Direct API calls**: Your data goes directly to OpenAI, not through our systems
- **Error handling**: Clear error messages and validation

## Getting Started

1. **Choose a tool** from the main site or navigate directly to tool URLs
2. **Get an OpenAI API key** - see our [API key guide](/blog/how-to-get-openai-api-key/)
3. **Use the tools** - enter your API key and start processing

## Repository Structure

```
junkdrawer-tools/
├── tools/                          # All tools directory
│   ├── alt-text-generator/         # Alt text generation tool
│   │   ├── index.html             # Tool interface
│   │   ├── script.js              # API integration logic
│   │   └── README.md              # Tool documentation
│   └── llms-converter/            # LLMS.txt conversion tool
│       ├── index.html             # Tool interface
│       ├── script.js              # Frontend logic
│       ├── backend/               # Python processing modules
│       │   ├── llms_processor.py  # Main orchestrator
│       │   ├── categorizer.py     # AI categorization
│       │   ├── url_processor.py   # Web crawling
│       │   └── [other modules]
│       ├── requirements.txt       # Python dependencies
│       └── README.md              # Tool documentation
├── shared/                        # Shared resources
│   └── styles/                    # Shared CSS components
├── blog/                          # SEO content and guides
├── index.html                     # Main landing page
├── styles.css                     # Global styles
├── script.js                      # Main site functionality
└── railway.json                   # Deployment configuration
```

## Local Development

```bash
# Serve the site locally
python -m http.server 8000

# Or with Node.js
npx http-server -p 8000
```

Visit http://localhost:8000

### Tool Development

Each tool is self-contained in its own directory under `/tools/`. To add a new tool:

1. Create a new directory under `/tools/`
2. Include `index.html`, `script.js`, and `README.md`
3. Follow the API integration patterns (user-provided keys, no data storage)
4. Update main navigation in `/index.html`
5. Test thoroughly with real API keys

## Deployment

This site is configured for Railway deployment:

1. Push to GitHub
2. Connect repository to Railway
3. Railway will automatically deploy using the included configuration

The deployment serves static files with Python's built-in HTTP server.

## Tech Stack

- **Frontend**: Pure HTML/CSS/JavaScript
- **Backend**: Python (for LLMS converter processing)
- **APIs**: OpenAI GPT-4o for AI functionality
- **Deployment**: Railway static hosting
- **Design**: Industrial theme with yellow (#FFD700) accents
- **Responsive**: Mobile-first design

## Security & Privacy

- **No API keys stored**: All API keys are user-provided and session-only
- **No data persistence**: Images and content are processed in-browser or in-memory
- **Direct API calls**: User data goes directly to OpenAI, not through our servers
- **Open source**: All code is transparent and auditable

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow existing code patterns and API integration standards
4. Test with real API keys
5. Submit a pull request

## License

Open source - see individual tool licenses for specific terms.