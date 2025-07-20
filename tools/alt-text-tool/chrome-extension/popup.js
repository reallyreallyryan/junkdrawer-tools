// Simplified popup script - core functionality only

console.log("🚀 Popup opened");

// Initialize popup when it loads
document.addEventListener('DOMContentLoaded', async () => {
    await initializePopup();
    setupEventListeners();
});

// Initialize popup state
async function initializePopup() {
    try {
        const data = await chrome.storage.local.get(['apiKey', 'licenseKey', 'dailyUsage', 'licenseUsage', 'allResults']);
        
        updateUIState(data);
        displayResults(data.allResults || []);
        
    } catch (error) {
        console.error("❌ Error initializing popup:", error);
        showError("Error loading extension data");
    }
}

// Update UI based on current state
function updateUIState(data) {
    const { apiKey, licenseKey, dailyUsage = {}, licenseUsage = {} } = data;
    const today = new Date().toDateString();
    const todayUsage = dailyUsage[today] || 0;
    
    const apiKeySection = document.getElementById('apiKeySection');
    const licenseSection = document.getElementById('licenseSection');
    const statusSection = document.getElementById('statusSection');
    const upgradeSection = document.getElementById('upgradeSection');
    
    // Show/hide sections based on setup state
    if (!apiKey) {
        // No API key - show setup
        apiKeySection.classList.remove('hidden');
        licenseSection.classList.add('hidden');
        statusSection.classList.add('hidden');
        upgradeSection.classList.add('hidden');
        
        document.getElementById('results').innerHTML = `
            <div class="no-results">
                Set up your OpenAI API key above to get started!
            </div>
        `;
    } else {
        // API key configured - show license and status
        apiKeySection.classList.add('hidden', 'complete');
        licenseSection.classList.remove('hidden');
        statusSection.classList.remove('hidden');
        
        // Update status display
        document.getElementById('apiKeyStatus').textContent = "✅ Configured";
        
        // Get license info
        const licenseInfo = licenseKey ? getLicenseInfo(licenseKey) : null;
        
        if (licenseInfo) {
            // User has valid license
            if (licenseInfo.type === 'starter') {
                const usedCount = licenseUsage[licenseKey] || 0;
                document.getElementById('userStatus').textContent = "Starter License";
                document.getElementById('userStatus').classList.add('premium');
                document.getElementById('dailyUsage').textContent = `${usedCount}/500 total`;
                
                // Show upgrade to pro if approaching limit
                if (usedCount > 400) {
                    upgradeSection.classList.remove('hidden');
                }
            } else if (licenseInfo.type === 'pro') {
                document.getElementById('userStatus').textContent = "Pro License";
                document.getElementById('userStatus').classList.add('premium');
                document.getElementById('dailyUsage').textContent = "Unlimited";
                upgradeSection.classList.add('hidden');
            }
            
            // Update license section to show activated state
            licenseSection.querySelector('.setup-title').textContent = `🚀 ${licenseInfo.name} License Active`;
            licenseSection.classList.add('complete');
            document.getElementById('licenseInput').value = licenseKey;
            document.getElementById('saveLicense').textContent = "✅ Active";
            document.getElementById('saveLicense').disabled = true;
            
        } else {
            // Free user
            document.getElementById('userStatus').textContent = "Free User";
            document.getElementById('dailyUsage').textContent = `${todayUsage}/5 daily`;
            
            // Show upgrade section if approaching limit
            if (todayUsage >= 3) {
                upgradeSection.classList.remove('hidden');
            }
            
            // Update license section
            licenseSection.querySelector('.setup-title').textContent = "🚀 Upgrade Your License";
        }
    }
}

// Get license information
function getLicenseInfo(licenseKey) {
    if (!licenseKey) return null;
    
    const upperKey = licenseKey.toUpperCase();
    
    if (upperKey.includes('STARTER') || upperKey === 'SEO-TEST-STARTER') {
        return { type: 'starter', name: 'Starter', limit: 500 };
    }
    
    if (upperKey.includes('PRO') || upperKey === 'SEO-TEST-PRO') {
        return { type: 'pro', name: 'Pro', limit: -1 };
    }
    
    return null;
}

// Setup event listeners
function setupEventListeners() {
    // API Key management
    document.getElementById('saveApiKey').addEventListener('click', saveApiKey);
    document.getElementById('helpLink').addEventListener('click', openHelp);
    
    // License management
    document.getElementById('saveLicense').addEventListener('click', saveLicense);
    document.getElementById('buyLicense').addEventListener('click', buyLicense);
    document.getElementById('upgradeBtn').addEventListener('click', () => buyLicense('pro'));
    
    // Enter key support
    document.getElementById('apiKeyInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveApiKey();
    });
    
    document.getElementById('licenseInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveLicense();
    });
}

// Save API key
async function saveApiKey() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        alert('Please enter your OpenAI API key');
        return;
    }
    
    if (!apiKey.startsWith('sk-')) {
        alert('Invalid API key format. OpenAI API keys start with "sk-"');
        return;
    }
    
    try {
        await chrome.storage.local.set({ apiKey });
        console.log("✅ API key saved");
        
        // Show success and refresh UI
        apiKeyInput.value = '';
        await initializePopup();
        
    } catch (error) {
        console.error("❌ Error saving API key:", error);
        alert('Error saving API key. Please try again.');
    }
}

// Save license key
async function saveLicense() {
    const licenseInput = document.getElementById('licenseInput');
    const licenseKey = licenseInput.value.trim().toUpperCase();
    
    if (!licenseKey) {
        alert('Please enter your license key');
        return;
    }
    
    try {
        // Send to background script for validation
        const licenseInfo = await chrome.runtime.sendMessage({
            action: 'validateLicense',
            licenseKey: licenseKey
        });
        
        if (!licenseInfo) {
            alert('Invalid license key. Please check your key and try again.');
            return;
        }
        
        await chrome.storage.local.set({ licenseKey });
        console.log("✅ License key saved:", licenseKey);
        
        await initializePopup();
        
    } catch (error) {
        console.error("❌ Error saving license key:", error);
        alert('Error saving license key. Please try again.');
    }
}

// Open license purchase page
function buyLicense(type = 'starter') {
    let url;
    if (type === 'pro') {
        url = 'https://buy.stripe.com/aFaeVegw3gLCcc06hGeUU05'; // Pro License - $24.99
    } else {
        url = 'https://buy.stripe.com/7sYcN66Vt52U2BqfSgeUU04'; // Starter License - $14.99
    }
    chrome.tabs.create({ url });
}

// Open help page
function openHelp(e) {
    e.preventDefault();
    chrome.tabs.create({ 
        url: 'https://imagealttext.pro/how-to-get-openai-api-key'
    });
}

// Display results in the popup
function displayResults(results) {
    const container = document.getElementById('results');
    
    if (!results || results.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                No alt text generated yet.<br>
                Right-click an image to get started!
            </div>
        `;
        return;
    }
    
    container.innerHTML = results.map((result, index) => {
        if (result.error) {
            return `
                <div class="result error">
                    <div class="result-header">
                        ❌ Error • ${formatTime(result.timestamp)}
                    </div>
                    <div class="result-body">
                        <div class="error-text">${escapeHtml(result.error)}</div>
                    </div>
                </div>
            `;
        } else {
            const usageDisplay = result.remainingUsage ? ` • ${result.remainingUsage}` : '';
            
            return `
                <div class="result">
                    <div class="result-header">
                        ✅ Generated • ${formatTime(result.timestamp)}${usageDisplay}
                    </div>
                    <div class="result-body">
                        <div class="alt-text">"${escapeHtml(result.altText)}"</div>
                        <button class="copy-btn" data-text="${escapeHtml(result.altText)}" data-index="${index}">
                            📋 Copy Alt Text
                        </button>
                    </div>
                </div>
            `;
        }
    }).join('');
    
    // Add event listeners to copy buttons
    attachCopyListeners();
}

// Attach event listeners to copy buttons
function attachCopyListeners() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const textToCopy = this.getAttribute('data-text');
            copyText(textToCopy, this);
        });
    });
}

// Copy text to clipboard with fallback methods
function copyText(text, buttonElement) {
    // Method 1: Modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showCopySuccess(buttonElement);
        }).catch(err => {
            console.warn('Clipboard API failed, trying fallback:', err);
            fallbackCopyText(text, buttonElement);
        });
    } else {
        fallbackCopyText(text, buttonElement);
    }
}

// Fallback copy method
function fallbackCopyText(text, buttonElement) {
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (successful) {
            showCopySuccess(buttonElement);
        } else {
            throw new Error('execCommand failed');
        }
    } catch (err) {
        console.error('All copy methods failed:', err);
        prompt('Copy this text manually:', text);
    }
}

// Show copy success feedback
function showCopySuccess(buttonElement) {
    const originalText = buttonElement.textContent;
    const originalBg = buttonElement.style.background;
    
    buttonElement.textContent = '✅ Copied!';
    buttonElement.style.background = '#10b981';
    buttonElement.disabled = true;
    
    setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.style.background = originalBg || '#4f46e5';
        buttonElement.disabled = false;
    }, 1500);
}

// Format timestamp
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
}

// Escape HTML for safe display
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Show error message
function showError(message) {
    const container = document.getElementById('results');
    container.innerHTML = `
        <div class="result error">
            <div class="result-header">❌ Error</div>
            <div class="result-body">
                <div class="error-text">${escapeHtml(message)}</div>
            </div>
        </div>
    `;
}

// Listen for storage changes to update UI in real-time
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.allResults) {
            displayResults(changes.allResults.newValue || []);
        }
        
        if (changes.apiKey || changes.licenseKey || changes.dailyUsage || changes.licenseUsage) {
            // Refresh UI state
            chrome.storage.local.get(['apiKey', 'licenseKey', 'dailyUsage', 'licenseUsage']).then(updateUIState);
        }
    }
});