// Alt Text Generator JavaScript
class AltTextGenerator {
    constructor() {
        this.apiKey = '';
        this.uploadedFiles = [];
        this.results = {};
        
        this.initializeElements();
        this.initializeEventListeners();
    }
    
    initializeElements() {
        this.apiKeyInput = document.getElementById('apiKey');
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.generateBtn = document.getElementById('generateBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.imagePreview = document.getElementById('imagePreview');
        this.processingSection = document.getElementById('processingSection');
        this.errorMessage = document.getElementById('errorMessage');
    }
    
    initializeEventListeners() {
        // API key input
        this.apiKeyInput.addEventListener('input', () => {
            this.apiKey = this.apiKeyInput.value.trim();
            this.updateGenerateButton();
        });
        
        // File upload area
        this.uploadArea.addEventListener('click', () => {
            this.fileInput.click();
        });
        
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
        
        // File input
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
        
        // Buttons
        this.generateBtn.addEventListener('click', () => {
            this.generateAltText();
        });
        
        this.clearBtn.addEventListener('click', () => {
            this.clearAll();
        });
    }
    
    handleFiles(files) {
        Array.from(files).forEach(file => {
            if (this.isValidImage(file)) {
                this.uploadedFiles.push(file);
            } else {
                this.showError(`Invalid file: ${file.name}. Please upload JPG, PNG, GIF, or WebP images.`);
            }
        });
        
        this.renderImagePreviews();
        this.updateGenerateButton();
    }
    
    isValidImage(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        return validTypes.includes(file.type) && file.size <= maxSize;
    }
    
    renderImagePreviews() {
        this.imagePreview.innerHTML = '';
        
        this.uploadedFiles.forEach((file, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = 'Preview';
            
            const filename = document.createElement('div');
            filename.className = 'image-filename';
            filename.textContent = file.name;
            
            const altTextResult = document.createElement('div');
            altTextResult.className = 'alt-text-result';
            altTextResult.id = `result-${index}`;
            altTextResult.textContent = 'Click "Generate Alt Text" to process';
            
            imageItem.appendChild(img);
            imageItem.appendChild(filename);
            imageItem.appendChild(altTextResult);
            
            this.imagePreview.appendChild(imageItem);
        });
    }
    
    updateGenerateButton() {
        const hasApiKey = this.apiKey.length > 0;
        const hasFiles = this.uploadedFiles.length > 0;
        
        this.generateBtn.disabled = !(hasApiKey && hasFiles);
    }
    
    async generateAltText() {
        if (!this.validateInputs()) return;
        
        this.showProcessing(true);
        this.hideError();
        
        try {
            for (let i = 0; i < this.uploadedFiles.length; i++) {
                const file = this.uploadedFiles[i];
                const resultElement = document.getElementById(`result-${i}`);
                
                resultElement.className = 'alt-text-result loading';
                resultElement.textContent = 'Generating...';
                
                try {
                    const altText = await this.processImage(file);
                    this.results[i] = altText;
                    
                    resultElement.className = 'alt-text-result success';
                    resultElement.innerHTML = `
                        <div style="text-align: left; width: 100%;">
                            <div style="margin-bottom: 0.5rem;">"${altText}"</div>
                            <button class="copy-btn" onclick="altTextGenerator.copyToClipboard('${altText.replace(/'/g, "\\'")}')">
                                📋 Copy
                            </button>
                        </div>
                    `;
                } catch (error) {
                    console.error('Error processing image:', error);
                    resultElement.className = 'alt-text-result error';
                    resultElement.textContent = `Error: ${error.message}`;
                }
            }
        } catch (error) {
            this.showError(`Processing failed: ${error.message}`);
        } finally {
            this.showProcessing(false);
        }
    }
    
    async processImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const base64Image = e.target.result.split(',')[1];
                    const altText = await this.callOpenAIAPI(base64Image);
                    resolve(altText);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read image file'));
            reader.readAsDataURL(file);
        });
    }
    
    async callOpenAIAPI(base64Image) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Generate SEO-friendly alt text for this image. The alt text should be descriptive, concise (under 125 characters), and optimized for search engines and accessibility. Focus on what\'s actually visible in the image and any relevant context that would help users understand the content. Return only the alt text without quotes or additional formatting.'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 100,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        const altText = data.choices[0].message.content.trim();
        
        // Ensure alt text is under 125 characters
        return altText.length > 125 ? altText.substring(0, 122) + '...' : altText;
    }
    
    validateInputs() {
        if (!this.apiKey) {
            this.showError('Please enter your OpenAI API key.');
            return false;
        }
        
        if (!this.apiKey.startsWith('sk-')) {
            this.showError('Invalid API key format. OpenAI API keys start with "sk-".');
            return false;
        }
        
        if (this.uploadedFiles.length === 0) {
            this.showError('Please upload at least one image.');
            return false;
        }
        
        return true;
    }
    
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            // Show temporary success feedback
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = '✅ Copied!';
            button.style.background = '#059669';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '#10b981';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        });
    }
    
    clearAll() {
        this.uploadedFiles = [];
        this.results = {};
        this.apiKeyInput.value = '';
        this.apiKey = '';
        this.fileInput.value = '';
        this.imagePreview.innerHTML = '';
        this.hideError();
        this.showProcessing(false);
        this.updateGenerateButton();
    }
    
    showProcessing(show) {
        this.processingSection.style.display = show ? 'block' : 'none';
    }
    
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
        
        // Auto-hide error after 10 seconds
        setTimeout(() => {
            this.hideError();
        }, 10000);
    }
    
    hideError() {
        this.errorMessage.style.display = 'none';
    }
}

// Initialize the application
const altTextGenerator = new AltTextGenerator();