# Alt Text Generator

Generate SEO-friendly alt text for images using AI. Upload multiple images and get AI-powered descriptions for better accessibility and SEO.

## Features

- **Drag & Drop Upload**: Easy image uploading with drag and drop support
- **Multiple Formats**: Supports JPG, PNG, GIF, WebP (max 10MB each)
- **AI-Powered**: Uses OpenAI GPT-4o for accurate, SEO-optimized descriptions
- **Batch Processing**: Process multiple images at once
- **Copy to Clipboard**: Easy one-click copying of generated alt text
- **No Data Storage**: Your images and API key are never stored on our servers

## How to Use

1. **Get an OpenAI API Key**
   - Visit [OpenAI's website](https://platform.openai.com/api-keys)
   - Create an account and generate an API key
   - See our [API key guide](/blog/how-to-get-openai-api-key/) for detailed instructions

2. **Upload Your Images**
   - Drag and drop images onto the upload area, or click to browse
   - Supports multiple images for batch processing
   - Maximum file size: 10MB per image

3. **Generate Alt Text**
   - Enter your OpenAI API key (stored locally for the session)
   - Click "Generate Alt Text" to process all uploaded images
   - Copy the generated descriptions to your clipboard

## API Requirements

- **OpenAI API Key**: Required for AI-powered alt text generation
- **Cost**: Approximately $0.02-0.05 per image (varies by image complexity)
- **Model**: Uses GPT-4o for optimal image understanding

## Technical Details

- **Frontend Only**: Pure HTML, CSS, and JavaScript implementation
- **No Backend**: Direct API calls to OpenAI from your browser
- **Privacy**: No data sent to our servers - API calls go directly to OpenAI
- **Responsive**: Works on desktop and mobile devices

## Alt Text Best Practices

Generated alt text will be:
- Under 125 characters for optimal SEO
- Descriptive and accurate to the image content
- SEO-friendly with relevant keywords when appropriate
- Accessible for screen readers and assistive technology

## Troubleshooting

**Common Issues:**

- **"Invalid API key"**: Ensure your OpenAI API key starts with "sk-" and is active
- **"API request failed"**: Check your OpenAI account has available credits
- **"File too large"**: Resize images to under 10MB before uploading
- **Slow processing**: Large images or complex scenes may take longer to process

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requires modern browser support for FileReader API and Fetch API.