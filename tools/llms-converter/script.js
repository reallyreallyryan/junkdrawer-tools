// Frontend JavaScript for LLMS.txt Converter
// Updated with better error handling and API communication

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
        
        // Improved API base URL detection
        this.apiBase = this.determineAPIBase();
        
        this.initializeEventListeners();
        this.updateAPIKeyVisibility();
    }
    
    determineAPIBase() {
        // Better API base URL detection
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        // Development environment
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            if (port === '8002' || port === '8080') {
                return 'http://localhost:8001';
            }
            // Railway or production with API mounted at /api
            return window.location.origin + '/api';
        }
        
        // Production environment
        return window.location.origin + '/api';
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
        
        // Add Enter key support for URL field
        document.getElementById('websiteUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.validateURL(e.target.value)) {
                e.preventDefault();
                this.handleConvert(false);
            }
        });
    }
    
    updateAPIKeyVisibility() {
        const useAI = document.getElementById('useAI').checked;
        const apiKeyGroup = document.getElementById('apiKeyGroup');
        
        if (useAI) {
            apiKeyGroup.style.display = 'block';
            apiKeyGroup.style.animation = 'slideIn 0.3s ease-out';
        } else {
            apiKeyGroup.style.display = 'none';
        }
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
        
        // Show button loading state
        this.setButtonLoading(true);
        
        // Show progress
        this.showProgress();
        this.hideResults();
        this.hideError();
        
        try {
            await this.processWithAPI(formData);
        } catch (error) {
            console.error('Processing error:', error);
            this.showError(error.message);
            this.hideProgress();
            this.setButtonLoading(false);
        }
    }
    
    setButtonLoading(loading) {
        if (loading) {
            this.convertBtn.classList.add('loading');
            this.convertBtn.disabled = true;
            this.previewBtn.disabled = true;
        } else {
            this.convertBtn.classList.remove('loading');
            this.convertBtn.disabled = false;
            this.previewBtn.disabled = false;
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
            this.showError('OpenAI API key is required for AI enhancement. Uncheck "Enhance with AI" to proceed without it.');
            document.getElementById('apiKey').focus();
            return false;
        }
        
        return true;
    }
    
    async processWithAPI(formData) {
        try {
            // Start the processing job
            this.updateProgress(0, 'Starting website processing...', 'crawling');
            
            const response = await fetch(`${this.apiBase}/process-website`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Server error' }));
                throw new Error(errorData.detail || `Server error: ${response.status}`);
            }
            
            const startData = await response.json();
            this.currentJobId = startData.job_id;
            
            // Start polling for progress
            this.startProgressPolling();
            
        } catch (error) {
            console.error('API Error:', error);
            
            // Provide helpful error messages
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Cannot connect to the conversion service. Please try again later.');
            } else if (error.message.includes('404')) {
                throw new Error('Conversion service not found. Please contact support.');
            } else {
                throw error;
            }
        }
    }
    
    startProgressPolling() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        
        let pollCount = 0;
        const maxPolls = 300; // 5 minutes maximum
        
        this.progressInterval = setInterval(async () => {
            pollCount++;
            
            if (pollCount > maxPolls) {
                clearInterval(this.progressInterval);
                this.showError('Processing timeout. The website might be too large or the service is busy.');
                this.hideProgress();
                this.setButtonLoading(false);
                return;
            }
            
            try {
                const response = await fetch(`${this.apiBase}/job-status/${this.currentJobId}`);
                
                if (!response.ok) {
                    throw new Error('Failed to get job status');
                }
                
                const status = await response.json();
                
                // Update progress with enhanced information
                this.updateProgress(
                    status.progress || 0, 
                    status.message || 'Processing...', 
                    status.phase, 
                    status.current_page, 
                    status.total_pages
                );
                
                // Check if job is complete
                if (status.status === 'completed') {
                    clearInterval(this.progressInterval);
                    this.showResults(status.result, status.filename);
                    this.hideProgress();
                    this.setButtonLoading(false);
                } else if (status.status === 'error') {
                    clearInterval(this.progressInterval);
                    throw new Error(status.error || 'Processing failed');
                }
                
            } catch (error) {
                clearInterval(this.progressInterval);
                this.showError(error.message);
                this.hideProgress();
                this.setButtonLoading(false);
            }
        }, 1000); // Poll every second
    }
    
    showResults(results, filename) {
        const resultsSection = document.getElementById('resultsSection');
        
        // Animate results appearance
        resultsSection.style.opacity = '0';
        resultsSection.style.display = 'block';
        setTimeout(() => {
            resultsSection.style.opacity = '1';
        }, 50);
        
        // Update title with animation
        const title = resultsSection.querySelector('h2');
        title.textContent = '✅ Conversion Complete!';
        title.style.animation = 'fadeInDown 0.6s ease-out';
        
        // Show stats with staggered animation
        const statsGrid = document.getElementById('statsGrid');
        statsGrid.innerHTML = `
            <div class="stat-card" style="animation-delay: 0.1s">
                <div class="stat-number">${results.stats.total_rows || 0}</div>
                <div class="stat-label">Total URLs</div>
            </div>
            <div class="stat-card" style="animation-delay: 0.2s">
                <div class="stat-number">${results.stats.unique_pages || 0}</div>
                <div class="stat-label">Processed Pages</div>
            </div>
            <div class="stat-card" style="animation-delay: 0.3s">
                <div class="stat-number">${Object.keys(results.categories || {}).length}</div>
                <div class="stat-label">Categories</div>
            </div>
            <div class="stat-card" style="animation-delay: 0.4s">
                <div class="stat-number">${results.stats.ai_enhanced ? '✓' : '✗'}</div>
                <div class="stat-label">AI Enhanced</div>
            </div>
        `;
        
        // Apply animations to stat cards
        const statCards = statsGrid.querySelectorAll('.stat-card');
        statCards.forEach((card, index) => {
            card.style.animation = `slideIn 0.5s ease-out ${index * 0.1}s both`;
        });
        
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
        
        // Show preview content with syntax highlighting (basic)
        const previewContent = results.preview || '';
        const previewElement = document.getElementById('previewContent');
        previewElement.textContent = previewContent;
        
        // Store results for download
        this.lastResults = results;
        this.lastFilename = filename;
        
        // Show category breakdown if available
        if (results.categories) {
            const categoryList = Object.entries(results.categories)
                .map(([cat, count]) => `${cat}: ${count} pages`)
                .join(', ');
            console.log('Categories:', categoryList);
        }
    }
    
    async downloadFile(fileType) {
        if (!this.currentJobId) {
            this.showError('No conversion results available for download');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/download/${this.currentJobId}/${fileType}`);
            
            if (!response.ok) {
                throw new Error('Download failed. Please try again.');
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
            
            // Show success feedback
            this.showSuccess(`${filename} downloaded successfully!`);
            
        } catch (error) {
            this.showError(`Download failed: ${error.message}`);
        }
    }
    
    showProgress() {
        this.progressSection.style.display = 'block';
        this.progressSection.style.animation = 'slideIn 0.5s ease-out';
    }
    
    hideProgress() {
        this.progressSection.style.display = 'none';
        
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }
    
    updateProgress(percentage, text, phase = null, currentPage = null, totalPages = null) {
        // Update progress bar with smooth animation
        const progressFill = document.getElementById('progressFill');
        progressFill.style.width = percentage + '%';
        
        // Update progress text
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
            
            const remainingPages = totalPages - currentPage;
            const remainingSeconds = Math.ceil((remainingPages / totalPages) * estimatedSeconds);
            
            const estimatedMinutes = Math.ceil(remainingSeconds / 60);
            document.getElementById('estimatedTime').textContent = 
                remainingSeconds < 60 ? '< 1 min' : `~${estimatedMinutes} min remaining`;
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
    
    hideResults() {
        this.resultsSection.style.display = 'none';
    }
    
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'flex';
        this.errorMessage.style.animation = 'slideIn 0.3s ease-out';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            this.hideError();
        }, 10000);
    }
    
    showSuccess(message) {
        // Temporarily show success message in place of error
        const errorElement = this.errorMessage;
        const originalClass = errorElement.className;
        
        errorElement.className = 'success-message';
        errorElement.textContent = '✅ ' + message;
        errorElement.style.display = 'flex';
        errorElement.style.background = '#d4edda';
        errorElement.style.color = '#155724';
        errorElement.style.borderColor = '#c3e6cb';
        
        setTimeout(() => {
            errorElement.style.display = 'none';
            errorElement.className = originalClass;
            errorElement.style = '';
        }, 3000);
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
    document.getElementById('useAI').checked = true;
    
    // Hide sections with animation
    const sections = ['progressSection', 'resultsSection', 'errorMessage'];
    sections.forEach(id => {
        const element = document.getElementById(id);
        element.style.opacity = '0';
        setTimeout(() => {
            element.style.display = 'none';
            element.style.opacity = '1';
        }, 300);
    });
    
    // Reset button states
    window.llmsConverter.setButtonLoading(false);
    
    // Clear any ongoing polling
    if (window.llmsConverter.progressInterval) {
        clearInterval(window.llmsConverter.progressInterval);
        window.llmsConverter.progressInterval = null;
    }
    
    // Reset job ID
    window.llmsConverter.currentJobId = null;
    
    // Update API key visibility
    window.llmsConverter.updateAPIKeyVisibility();
    
    // Focus on URL input
    document.getElementById('websiteUrl').focus();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.llmsConverter = new LLMSConverter();
    
    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Focus on URL input on load
    document.getElementById('websiteUrl').focus();
});