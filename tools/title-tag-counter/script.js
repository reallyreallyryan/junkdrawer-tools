document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const titleInput = document.getElementById('titleInput');
    const previewText = document.getElementById('previewText');
    const pixelWidthEl = document.getElementById('pixelWidth');
    const charCountEl = document.getElementById('charCount');
    const statusEl = document.getElementById('status');
    const copyBtn = document.getElementById('copyBtn');
    const desktopBtn = document.getElementById('desktopBtn');
    const mobileBtn = document.getElementById('mobileBtn');
    const widthLimit = document.getElementById('widthLimit');
    
    // Configuration
    const limits = {
        desktop: 600,
        mobile: 350
    };
    
    let currentView = 'desktop';
    
    // Create a canvas for text measurement
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Function to measure text pixel width
    function measureTextWidth(text, fontSize = 20, fontFamily = 'Arial') {
        ctx.font = `${fontSize}px ${fontFamily}`;
        return Math.ceil(ctx.measureText(text).width);
    }
    
    // Function to update the preview and stats
    function updatePreview() {
        const text = titleInput.value.trim();
        const charCount = text.length;
        
        // Update preview text
        previewText.textContent = text || 'Type your page title here...';
        
        // Measure pixel width
        const pixelWidth = text ? measureTextWidth(text) : 0;
        
        // Update character count
        charCountEl.textContent = charCount;
        
        // Update pixel width
        pixelWidthEl.textContent = `${pixelWidth}px`;
        
        // Update status and colors based on current view limit
        const limit = limits[currentView];
        const percentage = (pixelWidth / limit) * 100;
        
        // Update status
        let status, statusClass, widthClass;
        
        if (pixelWidth === 0) {
            status = '✨ Ready';
            statusClass = 'success';
            widthClass = 'success';
        } else if (pixelWidth <= limit * 0.8) {
            status = '✅ Perfect';
            statusClass = 'success';
            widthClass = 'success';
        } else if (pixelWidth <= limit) {
            status = '⚠️ Close';
            statusClass = 'warning';
            widthClass = 'warning';
        } else {
            status = '❌ Too Long';
            statusClass = 'danger';
            widthClass = 'danger';
        }
        
        // Apply status styling
        statusEl.textContent = status;
        statusEl.className = `stat-value ${statusClass}`;
        pixelWidthEl.className = `stat-value ${widthClass}`;
        
        // Update copy button state
        copyBtn.disabled = !text;
        
        // Update character count color
        if (charCount === 0) {
            charCountEl.className = 'stat-value success';
        } else if (charCount <= 60) {
            charCountEl.className = 'stat-value success';
        } else if (charCount <= 70) {
            charCountEl.className = 'stat-value warning';
        } else {
            charCountEl.className = 'stat-value danger';
        }
    }
    
    // Function to update view (desktop/mobile)
    function updateView(view) {
        currentView = view;
        
        // Update button states
        desktopBtn.classList.toggle('active', view === 'desktop');
        mobileBtn.classList.toggle('active', view === 'mobile');
        
        // Update width limit line position
        const limit = limits[view];
        widthLimit.style.left = `${limit}px`;
        widthLimit.setAttribute('data-limit', `${limit}px`);
        
        // Update preview box width to show the limit
        const previewBox = document.getElementById('previewBox');
        previewBox.style.minWidth = `${limit + 50}px`;
        
        // Update preview
        updatePreview();
    }
    
    // Function to copy text to clipboard
    async function copyToClipboard() {
        const text = titleInput.value.trim();
        if (!text) return;
        
        try {
            await navigator.clipboard.writeText(text);
            
            // Visual feedback
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅ Copied!';
            copyBtn.style.background = '#10b981';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = '#10b981';
            }, 2000);
            
        } catch (err) {
            console.error('Failed to copy text: ', err);
            
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            // Visual feedback
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅ Copied!';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }
    }
    
    // Event listeners
    titleInput.addEventListener('input', updatePreview);
    titleInput.addEventListener('paste', () => {
        // Small delay to allow paste content to be processed
        setTimeout(updatePreview, 10);
    });
    
    desktopBtn.addEventListener('click', () => updateView('desktop'));
    mobileBtn.addEventListener('click', () => updateView('mobile'));
    
    copyBtn.addEventListener('click', copyToClipboard);
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to copy
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            copyToClipboard();
        }
        
        // Escape to clear input
        if (e.key === 'Escape' && document.activeElement === titleInput) {
            titleInput.value = '';
            updatePreview();
        }
    });
    
    // Auto-focus the input field
    titleInput.focus();
    
    // Initialize the view
    updateView('desktop');
    
    // Handle window resize to remeasure text
    window.addEventListener('resize', updatePreview);
    
    // Add some sample texts for quick testing (optional)
    const sampleTexts = [
        "SEO-Optimized Page Title That Converts Visitors",
        "Ultimate Guide to Web Development Best Practices in 2025",
        "Short Title",
        "This is an extremely long page title that will definitely exceed the recommended limits for both desktop and mobile search results",
        "How to Build Amazing Websites"
    ];
    
    // Add sample text buttons (optional enhancement)
    function addSampleTextButtons() {
        const sampleContainer = document.createElement('div');
        sampleContainer.style.cssText = `
            margin-top: 1rem;
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            justify-content: center;
        `;
        
        const label = document.createElement('p');
        label.textContent = 'Quick samples:';
        label.style.cssText = `
            width: 100%;
            text-align: center;
            margin: 0 0 0.5rem 0;
            font-size: 0.875rem;
            color: #666;
        `;
        sampleContainer.appendChild(label);
        
        sampleTexts.forEach(text => {
            const btn = document.createElement('button');
            btn.textContent = text.length > 30 ? text.substring(0, 30) + '...' : text;
            btn.style.cssText = `
                background: #f8f9fa;
                border: 1px solid #e5e7eb;
                padding: 0.5rem 1rem;
                border-radius: 6px;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.3s ease;
            `;
            
            btn.addEventListener('click', () => {
                titleInput.value = text;
                updatePreview();
                titleInput.focus();
            });
            
            btn.addEventListener('mouseenter', () => {
                btn.style.borderColor = 'var(--primary-yellow)';
                btn.style.background = '#fffbf0';
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.borderColor = '#e5e7eb';
                btn.style.background = '#f8f9fa';
            });
            
            sampleContainer.appendChild(btn);
        });
        
        // Insert after the input section
        const inputSection = document.querySelector('.input-section');
        inputSection.parentNode.insertBefore(sampleContainer, inputSection.nextSibling);
    }
    
    // Uncomment to add sample text buttons
    addSampleTextButtons();
});