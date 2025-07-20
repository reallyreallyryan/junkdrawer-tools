// Frontend JavaScript for LLMS.txt Converter
// This is a demo implementation - in production you'd connect to a backend API

class LLMSConverter {
    constructor() {
        this.form = document.getElementById('llmsForm');
        this.progressSection = document.getElementById('progressSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.errorMessage = document.getElementById('errorMessage');
        this.convertBtn = document.getElementById('convertBtn');
        this.previewBtn = document.getElementById('previewBtn');
        
        this.initializeEventListeners();
        this.updateAPIKeyVisibility();
    }
    
    initializeEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleConvert(false);
        });
        
        // Preview button
        this.previewBtn.addEventListener('click', () => {
            this.handleConvert(true);
        });
        
        // AI enhancement checkbox
        document.getElementById('useAI').addEventListener('change', () => {
            this.updateAPIKeyVisibility();
        });
        
        // URL input validation
        document.getElementById('websiteUrl').addEventListener('input', (e) => {
            this.validateURL(e.target.value);
        });
    }
    
    updateAPIKeyVisibility() {
        const useAI = document.getElementById('useAI').checked;
        const apiKeyGroup = document.getElementById('apiKeyGroup');
        apiKeyGroup.style.display = useAI ? 'block' : 'none';
    }
    
    validateURL(url) {
        const urlInput = document.getElementById('websiteUrl');
        
        if (!url) {
            this.clearValidation(urlInput);
            return false;
        }
        
        try {
            const parsedUrl = new URL(url);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                this.setValidationError(urlInput, 'URL must start with http:// or https://');
                return false;
            }
            
            this.setValidationSuccess(urlInput);
            return true;
        } catch (e) {
            this.setValidationError(urlInput, 'Please enter a valid URL');
            return false;
        }
    }
    
    setValidationError(input, message) {
        input.style.borderColor = '#e53e3e';
        this.showError(message);
    }
    
    setValidationSuccess(input) {
        input.style.borderColor = '#38a169';
        this.hideError();
    }
    
    clearValidation(input) {
        input.style.borderColor = '#e5e7eb';
        this.hideError();
    }
    
    async handleConvert(previewOnly = false) {
        const formData = this.getFormData();
        
        // Validate inputs
        if (!this.validateInputs(formData)) {
            return;
        }
        
        // Show progress
        this.showProgress();
        this.hideResults();
        this.hideError();
        
        try {
            if (previewOnly) {
                await this.simulatePreview(formData);
            } else {
                await this.simulateConversion(formData);
            }
        } catch (error) {
            this.showError(error.message);
            this.hideProgress();
        }
    }
    
    getFormData() {
        return {
            websiteUrl: document.getElementById('websiteUrl').value.trim(),
            maxPages: parseInt(document.getElementById('maxPages').value),
            filename: document.getElementById('filename').value.trim() || 'LLMS',
            useAI: document.getElementById('useAI').checked,
            apiKey: document.getElementById('apiKey').value.trim()
        };
    }
    
    validateInputs(formData) {
        if (!formData.websiteUrl) {
            this.showError('Please enter a website URL');
            return false;
        }
        
        if (!this.validateURL(formData.websiteUrl)) {
            return false;
        }
        
        if (formData.maxPages < 10 || formData.maxPages > 500) {
            this.showError('Max pages must be between 10 and 500');
            return false;
        }
        
        if (formData.useAI && !formData.apiKey) {
            this.showError('OpenAI API key is required for AI enhancement');
            return false;
        }
        
        return true;
    }
    
    async simulatePreview(formData) {
        // Simulate preview generation
        const steps = [
            'Validating URL...',
            'Discovering pages...',
            'Analyzing content...',
            'Generating preview...'
        ];
        
        for (let i = 0; i < steps.length; i++) {
            this.updateProgress((i + 1) / steps.length * 100, steps[i]);
            await this.delay(1000 + Math.random() * 1000);
        }
        
        // Generate mock preview
        const preview = this.generateMockPreview(formData);
        this.showPreviewResults(preview, formData);
        this.hideProgress();
    }
    
    async simulateConversion(formData) {
        // Simulate full conversion
        const steps = [
            'Validating URL...',
            'Crawling website...',
            'Extracting content...',
            'Categorizing pages...',
            formData.useAI ? 'Enhancing with AI...' : 'Processing content...',
            'Generating LLMS.txt...',
            'Creating downloads...',
            'Complete!'
        ];
        
        for (let i = 0; i < steps.length; i++) {
            this.updateProgress((i + 1) / steps.length * 100, steps[i]);
            
            // Longer delay for AI enhancement
            const delay = steps[i].includes('AI') ? 3000 : 1000 + Math.random() * 1000;
            await this.delay(delay);
        }
        
        // Generate mock results
        const results = this.generateMockResults(formData);
        this.showResults(results, formData);
        this.hideProgress();
    }
    
    generateMockPreview(formData) {
        const domain = new URL(formData.websiteUrl).hostname;
        
        return {
            preview: `# ${domain.charAt(0).toUpperCase() + domain.slice(1)}

> Professional services and solutions

## Services
- [Consulting Services](${formData.websiteUrl}/services/consulting): Expert guidance and strategic planning
- [Implementation Support](${formData.websiteUrl}/services/implementation): Full-service implementation and setup
- [Training Programs](${formData.websiteUrl}/services/training): Comprehensive training and education

## About
- [About Us](${formData.websiteUrl}/about): Company overview and mission
- [Our Team](${formData.websiteUrl}/team): Meet our expert professionals

## Resources
- [Blog](${formData.websiteUrl}/blog): Latest insights and industry news
- [Case Studies](${formData.websiteUrl}/case-studies): Success stories and examples

## Contact
- [Contact Us](${formData.websiteUrl}/contact): Get in touch with our team

... (preview truncated)`,
            stats: {
                total_pages_found: Math.floor(Math.random() * 50) + 20,
                preview_pages: 10
            },
            categories: {
                'Services': 3,
                'About': 2,
                'Resources': 2,
                'Contact': 1
            }
        };
    }
    
    generateMockResults(formData) {
        const domain = new URL(formData.websiteUrl).hostname;
        const totalPages = Math.min(formData.maxPages, Math.floor(Math.random() * 80) + 30);
        
        // Generate mock LLMS.txt content
        const llmsContent = this.generateMockLLMSContent(domain, formData.websiteUrl, formData.useAI);
        
        return {
            stats: {
                total_rows: totalPages + 20,
                indexable_pages: totalPages + 5,
                unique_pages: totalPages
            },
            categories: {
                'Services': Math.floor(totalPages * 0.3),
                'Products': Math.floor(totalPages * 0.2),
                'Resources': Math.floor(totalPages * 0.25),
                'About': Math.floor(totalPages * 0.1),
                'Locations': Math.floor(totalPages * 0.05),
                'Contact': Math.floor(totalPages * 0.1)
            },
            files: {
                txt_content: llmsContent,
                json_content: JSON.stringify({
                    metadata: {
                        site_title: domain,
                        site_url: formData.websiteUrl,
                        generated_at: new Date().toISOString(),
                        ai_enhanced: formData.useAI
                    }
                }, null, 2)
            }
        };
    }
    
    generateMockLLMSContent(domain, url, aiEnhanced) {
        const title = domain.charAt(0).toUpperCase() + domain.slice(1);
        const enhancement = aiEnhanced ? ' (AI Enhanced)' : '';
        
        return `# ${title}

> Professional services and comprehensive solutions${enhancement}

<!-- Generated on ${new Date().toISOString().split('T')[0]} -->

## Services
- [Consulting Services](${url}/services/consulting): ${aiEnhanced ? 'Strategic guidance and expert consultation for business growth' : 'Professional consulting services'}
- [Implementation Support](${url}/services/implementation): ${aiEnhanced ? 'End-to-end implementation with dedicated support team' : 'Full implementation support'}
- [Custom Solutions](${url}/services/custom): ${aiEnhanced ? 'Tailored solutions designed for your specific needs' : 'Custom solution development'}

## Products
- [Enterprise Platform](${url}/products/enterprise): ${aiEnhanced ? 'Comprehensive enterprise solution with advanced analytics' : 'Enterprise platform solution'}
- [Professional Tools](${url}/products/professional): ${aiEnhanced ? 'Professional-grade tools for enhanced productivity' : 'Professional software tools'}

## Resources
- [Knowledge Base](${url}/resources/knowledge): ${aiEnhanced ? 'Comprehensive guides and best practices documentation' : 'Knowledge base and documentation'}
- [Blog](${url}/blog): ${aiEnhanced ? 'Industry insights and expert analysis on trends' : 'Company blog and articles'}
- [Case Studies](${url}/case-studies): ${aiEnhanced ? 'Real success stories demonstrating proven results' : 'Customer case studies'}

## About
- [Company Overview](${url}/about): ${aiEnhanced ? 'Our mission, values, and commitment to excellence' : 'About our company'}
- [Leadership Team](${url}/about/team): ${aiEnhanced ? 'Meet our experienced leadership and expert team' : 'Our team and leadership'}

## Contact
- [Get in Touch](${url}/contact): ${aiEnhanced ? 'Connect with our team for personalized assistance' : 'Contact information and forms'}
- [Schedule Demo](${url}/demo): ${aiEnhanced ? 'Book a personalized demonstration of our solutions' : 'Schedule a product demo'}`;
    }
    
    showPreviewResults(preview, formData) {
        const resultsSection = document.getElementById('resultsSection');
        
        // Update title
        resultsSection.querySelector('h2').textContent = '👁️ Preview Generated!';
        
        // Show stats
        const statsGrid = document.getElementById('statsGrid');
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${preview.stats.total_pages_found}</div>
                <div class="stat-label">Pages Found</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${preview.stats.preview_pages}</div>
                <div class="stat-label">Pages Previewed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.keys(preview.categories).length}</div>
                <div class="stat-label">Categories</div>
            </div>
        `;
        
        // Hide download buttons for preview
        document.getElementById('downloadButtons').innerHTML = `
            <button class="btn" onclick="llmsConverter.convertToFull()">
                🔄 Generate Full LLMS.txt
            </button>
        `;
        
        // Show preview content
        document.getElementById('previewContent').textContent = preview.preview;
        
        this.showResults();
    }
    
    showResults(results, formData) {
        const resultsSection = document.getElementById('resultsSection');
        
        // Update title
        resultsSection.querySelector('h2').textContent = '✅ Conversion Complete!';
        
        // Show stats
        const statsGrid = document.getElementById('statsGrid');
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${results.stats.total_rows}</div>
                <div class="stat-label">Total URLs</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${results.stats.unique_pages}</div>
                <div class="stat-label">Processed Pages</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.keys(results.categories).length}</div>
                <div class="stat-label">Categories</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${formData.useAI ? 'Yes' : 'No'}</div>
                <div class="stat-label">AI Enhanced</div>
            </div>
        `;
        
        // Show download buttons
        const downloadButtons = document.getElementById('downloadButtons');
        downloadButtons.innerHTML = `
            <button class="btn" onclick="llmsConverter.downloadFile('${formData.filename}.txt', 'text/plain')">
                📄 Download LLMS.txt
            </button>
            <button class="btn btn-secondary" onclick="llmsConverter.downloadFile('${formData.filename}.json', 'application/json')">
                📊 Download JSON
            </button>
        `;
        
        // Show preview content (truncated)
        const previewLines = results.files.txt_content.split('\n');
        const truncated = previewLines.slice(0, 30).join('\n') + 
                         (previewLines.length > 30 ? '\n\n... (truncated for preview)' : '');
        document.getElementById('previewContent').textContent = truncated;
        
        // Store results for download
        this.lastResults = results;
        this.lastFormData = formData;
        
        this.showResults();
    }
    
    convertToFull() {
        // Convert the preview to full conversion
        this.handleConvert(false);
    }
    
    downloadFile(filename, mimeType) {
        if (!this.lastResults) return;
        
        let content;
        if (filename.endsWith('.txt')) {
            content = this.lastResults.files.txt_content;
        } else if (filename.endsWith('.json')) {
            content = this.lastResults.files.json_content;
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    showProgress() {
        this.progressSection.style.display = 'block';
        this.convertBtn.disabled = true;
        this.previewBtn.disabled = true;
    }
    
    hideProgress() {
        this.progressSection.style.display = 'none';
        this.convertBtn.disabled = false;
        this.previewBtn.disabled = false;
    }
    
    updateProgress(percentage, text) {
        document.getElementById('progressFill').style.width = percentage + '%';
        document.getElementById('progressText').textContent = text;
    }
    
    showResults() {
        this.resultsSection.style.display = 'block';
    }
    
    hideResults() {
        this.resultsSection.style.display = 'none';
    }
    
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
    }
    
    hideError() {
        this.errorMessage.style.display = 'none';
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Global functions
function resetTool() {
    // Reset form
    document.getElementById('llmsForm').reset();
    document.getElementById('maxPages').value = 100;
    document.getElementById('filename').value = 'LLMS';
    
    // Hide sections
    document.getElementById('progressSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
    
    // Reset button states
    document.getElementById('convertBtn').disabled = false;
    document.getElementById('previewBtn').disabled = false;
    
    // Update API key visibility
    llmsConverter.updateAPIKeyVisibility();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.llmsConverter = new LLMSConverter();
});