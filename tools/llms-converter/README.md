# LLMS.txt Converter

Convert any website into an AI-optimized LLMS.txt file. Perfect for AI search engines, chatbots, and language model training.

## What is LLMS.txt?

LLMS.txt is a standardized format that helps AI systems understand and navigate your website content. It organizes your pages by category and includes optimized descriptions for better AI search visibility.

### Benefits:
- Improves discoverability in ChatGPT, Claude, and Perplexity
- Organizes content by Services, Products, Resources, etc.
- Provides AI-friendly summaries of your content
- Enhances your site's visibility in AI-powered search

## Features

- **Website Crawling**: Automatically discovers and processes website pages
- **Smart Categorization**: AI-powered content categorization
- **SEO Optimization**: Generates SEO-friendly descriptions
- **Multiple Formats**: Export as LLMS.txt, CSV, or JSON
- **Customizable**: Adjust crawling depth and AI enhancement settings
- **Privacy-First**: Your API key is never stored

## How to Use

1. **Enter Website URL**
   - Input the website you want to convert
   - Set maximum pages to crawl (10-500)
   - Choose your preferred filename

2. **Configure AI Enhancement (Optional)**
   - Check "Enhance with AI" for better categorization
   - Add your OpenAI API key for enhanced processing
   - AI enhancement improves page titles and descriptions

3. **Convert & Download**
   - Click "Convert to LLMS.txt" to start processing
   - Monitor progress as pages are crawled and processed
   - Download your generated files when complete

## Technical Architecture

### Frontend
- **Framework**: Pure HTML, CSS, JavaScript
- **Features**: Real-time progress tracking, file preview
- **Responsive**: Works on all device sizes

### Backend (Python)
- **Web Crawling**: Intelligent site discovery and content extraction
- **Content Processing**: Clean text extraction and formatting
- **AI Integration**: OpenAI API for enhanced categorization
- **Export Formats**: LLMS.txt, CSV, JSON generation

## API Requirements

**Optional AI Enhancement:**
- **OpenAI API Key**: For improved categorization and descriptions
- **Cost**: ~$0.01-0.03 per page (varies by content length)
- **Model**: Uses GPT-3.5-turbo for cost-effective processing

## File Formats

### LLMS.txt Format
```
# Company Name

## Services
https://example.com/service1 - Service description
https://example.com/service2 - Service description

## Products
https://example.com/product1 - Product description

## Resources
https://example.com/blog/post1 - Article description
```

### CSV Export
Includes columns: URL, Title, Description, Category, Word Count

### JSON Export
Structured data with full metadata for each page

## Backend Modules

- **`llms_processor.py`**: Main orchestration and processing
- **`categorizer.py`**: AI-powered content categorization
- **`url_processor.py`**: Web crawling and content extraction
- **`csv_processor.py`**: Data export and formatting
- **`llms_generator.py`**: LLMS.txt file generation

## Installation & Development

### Frontend Only
1. Serve the HTML file from any web server
2. No build process required

### With Backend (Full Features)
1. Install Python dependencies: `pip install -r requirements.txt`
2. Set up environment variables for OpenAI API
3. Run backend service for enhanced processing

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Use Cases

- **AI Training**: Prepare website content for language model training
- **Search Optimization**: Improve visibility in AI-powered search engines
- **Content Auditing**: Get organized overview of website structure
- **Documentation**: Create structured content inventories
- **SEO Analysis**: Analyze content categorization and descriptions