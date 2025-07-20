// Frontend JavaScript for LLMS.txt Converter
// Real API implementation connecting to FastAPI backend

class LLMSConverter {
    constructor() {
        this.form = document.getElementById('llmsForm');
        this.progressSection = document.getElementById('progressSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.errorMessage = document.getElementById('errorMessage');
        this.convertBtn = document.getElementById('convertBtn');
        this.previewBtn = document.getElementById('previewBtn');
        this.currentJobId = null;
        this.progressInterval = null;
        
        // API base URL - adjust for production
        this.apiBase = (window.location.port === '8002' || window.location.port === '8080')
            ? 'http://localhost:8001' 
            : window.location.origin + '/api';
        
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
            await this.processWithAPI(formData);
        } catch (error) {
            this.showError(error.message);
            this.hideProgress();
        }
    }
    
    getFormData() {
        return {
            website_url: document.getElementById('websiteUrl').value.trim(),
            max_pages: parseInt(document.getElementById('maxPages').value),
            filename: document.getElementById('filename').value.trim() || 'LLMS',
            use_ai: document.getElementById('useAI').checked,
            api_key: document.getElementById('apiKey').value.trim()
        };
    }
    
    validateInputs(formData) {
        if (!formData.website_url) {
            this.showError('Please enter a website URL');
            return false;
        }
        
        if (!this.validateURL(formData.website_url)) {
            return false;
        }
        
        if (formData.max_pages < 10 || formData.max_pages > 500) {
            this.showError('Max pages must be between 10 and 500');
            return false;
        }
        
        if (formData.use_ai && !formData.api_key) {
            this.showError('OpenAI API key is required for AI enhancement');
            return false;
        }
        
        return true;
    }
    
    async processWithAPI(formData) {
        try {
            // Start the processing job
            this.updateProgress(0, 'Starting website processing...');
            
            const response = await fetch(`${this.apiBase}/process-website`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to start processing');
            }
            
            const startData = await response.json();
            this.currentJobId = startData.job_id;
            
            // Start polling for progress
            this.startProgressPolling();
            
        } catch (error) {
            console.error('API Error:', error);
            throw new Error(`Processing failed: ${error.message}`);
        }
    }
    
    startProgressPolling() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        
        this.progressInterval = setInterval(async () => {
            try {
                const response = await fetch(`${this.apiBase}/job-status/${this.currentJobId}`);
                
                if (!response.ok) {
                    throw new Error('Failed to get job status');
                }
                
                const status = await response.json();
                
                // Update progress with enhanced information
                this.updateProgress(status.progress, status.message, status.phase, status.current_page, status.total_pages);
                
                // Check if job is complete
                if (status.status === 'completed') {
                    clearInterval(this.progressInterval);
                    this.showResults(status.result, status.filename);
                    this.hideProgress();
                } else if (status.status === 'error') {
                    clearInterval(this.progressInterval);
                    throw new Error(status.error || 'Processing failed');
                }
                
            } catch (error) {
                clearInterval(this.progressInterval);
                this.showError(error.message);
                this.hideProgress();
            }
        }, 1000); // Poll every second
    }
    
    showResults(results, filename) {
        const resultsSection = document.getElementById('resultsSection');
        
        // Update title
        resultsSection.querySelector('h2').textContent = '✅ Conversion Complete!';
        
        // Show stats
        const statsGrid = document.getElementById('statsGrid');
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${results.stats.total_rows || 0}</div>
                <div class="stat-label">Total URLs</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${results.stats.unique_pages || 0}</div>
                <div class="stat-label">Processed Pages</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.keys(results.categories || {}).length}</div>
                <div class="stat-label">Categories</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${results.stats.ai_enhanced ? 'Yes' : 'No'}</div>
                <div class="stat-label">AI Enhanced</div>
            </div>
        `;
        
        // Show download buttons
        const downloadButtons = document.getElementById('downloadButtons');
        downloadButtons.innerHTML = `
            <button class="btn" onclick="llmsConverter.downloadFile('txt')">
                📄 Download LLMS.txt
            </button>
            <button class="btn btn-secondary" onclick="llmsConverter.downloadFile('json')">
                📊 Download JSON
            </button>
        `;
        
        // Show preview content
        document.getElementById('previewContent').textContent = results.preview || '';
        
        // Store results for download
        this.lastResults = results;
        this.lastFilename = filename;
        
        this.showResultsSection();
    }
    
    async downloadFile(fileType) {
        if (!this.currentJobId) {
            this.showError('No job ID available for download');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/download/${this.currentJobId}/${fileType}`);
            
            if (!response.ok) {
                throw new Error('Download failed');
            }
            
            // Get the filename from Content-Disposition header or use default
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `${this.lastFilename || 'LLMS'}.${fileType}`;
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            // Create download
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            this.showError(`Download failed: ${error.message}`);
        }
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
        
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }
    
    updateProgress(percentage, text, phase = null, currentPage = null, totalPages = null) {
        // Update progress bar
        document.getElementById('progressFill').style.width = percentage + '%';
        document.getElementById('progressText').textContent = text;
        
        // Update page counter
        if (currentPage && totalPages) {
            document.getElementById('pageCounter').textContent = `${currentPage} / ${totalPages} pages`;
            
            // Calculate estimated time
            const useAI = document.getElementById('useAI').checked;
            let estimatedSeconds;
            if (useAI) {
                // ~1-2 minutes per 50 pages with AI
                estimatedSeconds = Math.ceil((totalPages / 50) * 90);
            } else {
                // ~2-5 seconds per page without AI
                estimatedSeconds = totalPages * 3;
            }
            
            const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
            document.getElementById('estimatedTime').textContent = 
                estimatedMinutes > 1 ? `~${estimatedMinutes} min` : '< 1 min';
        }
        
        // Update phase indicators
        if (phase) {
            this.updatePhaseIndicators(phase);
        }
    }
    
    updatePhaseIndicators(currentPhase) {
        const phases = ['crawling', 'processing', 'categorizing', 'enhancing', 'generating'];
        const indicators = document.querySelectorAll('.phase-indicator');
        
        indicators.forEach((indicator, index) => {
            const phaseData = indicator.getAttribute('data-phase');
            const currentIndex = phases.indexOf(currentPhase);
            const indicatorIndex = phases.indexOf(phaseData);
            
            indicator.classList.remove('active', 'completed');
            
            if (indicatorIndex < currentIndex) {
                indicator.classList.add('completed');
            } else if (indicatorIndex === currentIndex) {
                indicator.classList.add('active');
            }
            
            // Hide AI enhancement phase if not using AI
            if (phaseData === 'enhancing') {
                const useAI = document.getElementById('useAI').checked;
                indicator.style.display = useAI ? 'block' : 'none';
            }
        });
    }
    
    showResultsSection() {
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
    
    // Clear any ongoing polling
    if (window.llmsConverter.progressInterval) {
        clearInterval(window.llmsConverter.progressInterval);
        window.llmsConverter.progressInterval = null;
    }
    
    // Reset job ID
    window.llmsConverter.currentJobId = null;
    
    // Update API key visibility
    window.llmsConverter.updateAPIKeyVisibility();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.llmsConverter = new LLMSConverter();
});