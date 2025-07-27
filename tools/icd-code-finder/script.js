// ICD-10 Code Finder - Enhanced with AI
// Part of JunkDrawer.Tools

// ICD-10 dataset - will be loaded from CDC file
let icdCodes = [
    // Common conditions
    { code: "M54.5", description: "Low back pain" },
    { code: "M25.511", description: "Pain in right shoulder" },
    { code: "M25.512", description: "Pain in left shoulder" },
    { code: "R51", description: "Headache" },
    { code: "J06.9", description: "Acute upper respiratory infection, unspecified" },
    { code: "K21.9", description: "Gastro-esophageal reflux disease without esophagitis" },
    { code: "E11.9", description: "Type 2 diabetes mellitus without complications" },
    { code: "I10", description: "Essential (primary) hypertension" },
    { code: "F41.9", description: "Anxiety disorder, unspecified" },
    { code: "F32.9", description: "Major depressive disorder, single episode, unspecified" },
    
    // Injuries
    { code: "S52.501A", description: "Unspecified fracture of the lower end of right radius, initial encounter" },
    { code: "S52.502A", description: "Unspecified fracture of the lower end of left radius, initial encounter" },
    { code: "S42.001A", description: "Fracture of unspecified part of right clavicle, initial encounter" },
    { code: "S92.901A", description: "Unspecified fracture of right foot, initial encounter" },
    { code: "T14.90", description: "Injury, unspecified" },
    
    // Fun animal-related codes
    { code: "W61.62XA", description: "Struck by duck, initial encounter" },
    { code: "W61.42XA", description: "Struck by turkey, initial encounter" },
    { code: "W61.32XA", description: "Struck by chicken, initial encounter" },
    { code: "W55.21XA", description: "Bitten by cow, initial encounter" },
    { code: "W55.41XA", description: "Bitten by pig, initial encounter" },
    { code: "W53.21XA", description: "Bitten by squirrel, initial encounter" },
    { code: "W56.22XA", description: "Struck by orca, initial encounter" },
    { code: "W56.01XA", description: "Bitten by dolphin, initial encounter" },
    { code: "V97.33XA", description: "Sucked into jet engine, initial encounter" },
    { code: "Y93.D", description: "Activities involving arts and handcrafts" },
    
    // More common conditions
    { code: "R06.02", description: "Shortness of breath" },
    { code: "R50.9", description: "Fever, unspecified" },
    { code: "R05", description: "Cough" },
    { code: "M79.3", description: "Myalgia" },
    { code: "G43.909", description: "Migraine, unspecified, not intractable, without status migrainosus" },
    { code: "L70.0", description: "Acne vulgaris" },
    { code: "H10.9", description: "Unspecified conjunctivitis" },
    { code: "J45.909", description: "Unspecified asthma, uncomplicated" },
    { code: "N39.0", description: "Urinary tract infection, site not specified" },
    { code: "B34.9", description: "Viral infection, unspecified" },
    
    // Foot-related
    { code: "M79.671", description: "Pain in right foot" },
    { code: "M79.672", description: "Pain in left foot" },
    { code: "R20.2", description: "Paresthesia of skin" },
    { code: "G57.60", description: "Lesion of plantar nerve, unspecified lower limb" },
    
    // Back-related
    { code: "M54.2", description: "Cervicalgia" },
    { code: "M54.6", description: "Pain in thoracic spine" },
    { code: "M54.9", description: "Dorsalgia, unspecified" },
    { code: "M51.36", description: "Other intervertebral disc degeneration, lumbar region" }
];

// Function to load ICD-10 data from file
async function loadICDData() {
    try {
        const response = await fetch('./icd10-codes.json');
        if (response.ok) {
            icdCodes = await response.json();
            console.log('✅ Loaded full ICD-10 dataset');
        } else {
            console.log('📦 Using sample dataset (add icd10-codes.json for full data)');
        }
    } catch (error) {
        console.log('📦 Using sample dataset:', error.message);
    }
}

// Load data on page load
window.addEventListener('DOMContentLoaded', () => {
    loadICDData().then(() => {
        console.log(`✅ Loaded ${icdCodes.length} ICD-10 codes`);
        
        // Show some stats in console
        const funCodes = icdCodes.filter(c => 
            c.description.toLowerCase().match(/duck|turkey|chicken|orca|spacecraft|turtle/));
        console.log(`🎉 Found ${funCodes.length} fun animal/space codes!`);
    });
});

// Keywords mapping for natural language processing (legacy - not currently used)
const keywordMappings = {
    'back': ['M54.5', 'M54.2', 'M54.6', 'M54.9', 'M51.36'],
    'pain': ['M54.5', 'M25.511', 'M25.512', 'R51', 'M79.671', 'M79.672', 'M79.3'],
    'headache': ['R51', 'G43.909'],
    'migraine': ['G43.909'],
    'diabetes': ['E11.9'],
    'anxiety': ['F41.9'],
    'depression': ['F32.9'],
    'foot': ['M79.671', 'M79.672', 'S92.901A', 'G57.60'],
    'tingling': ['R20.2', 'G57.60'],
    'duck': ['W61.62XA'],
    'turkey': ['W61.42XA'],
    'chicken': ['W61.32XA'],
    'bitten': ['W55.21XA', 'W55.41XA', 'W53.21XA', 'W56.01XA'],
    'struck': ['W61.62XA', 'W61.42XA', 'W61.32XA', 'W56.22XA'],
    'broken': ['S52.501A', 'S52.502A', 'S42.001A', 'S92.901A'],
    'fracture': ['S52.501A', 'S52.502A', 'S42.001A', 'S92.901A'],
    'cough': ['R05', 'J06.9'],
    'fever': ['R50.9'],
    'breathing': ['R06.02', 'J45.909'],
    'shoulder': ['M25.511', 'M25.512']
};

let searchTimeout;

async function searchCodes(query) {
    query = query.toLowerCase().trim();
    
    if (!query) {
        document.getElementById('results').innerHTML = '';
        return;
    }
    
    // Check for easter eggs
    if (query.includes('duck') || query.includes('bitten by duck')) {
        document.getElementById('duckAlert').style.display = 'block';
    } else {
        document.getElementById('duckAlert').style.display = 'none';
    }
    
    // Show loading state
    document.getElementById('results').innerHTML = '<div class="loading">Searching ICD-10 codes...</div>';
    
    try {
        // First get keyword matches
        const keywordResults = findMatchingCodes(query);
        
        // Check if AI enhancement is enabled
        const useAI = document.getElementById('useAI').checked;
        const apiKey = document.getElementById('apiKey').value.trim();
        
        let finalResults = keywordResults;
        
        if (useAI && apiKey && keywordResults.length > 0) {
            document.getElementById('results').innerHTML = '<div class="loading">Enhancing results with AI...</div>';
            try {
                const aiEnhancedResults = await enhanceWithAI(query, keywordResults, apiKey);
                finalResults = aiEnhancedResults;
            } catch (error) {
                console.error('AI enhancement failed:', error);
                // Fall back to keyword results
                finalResults = keywordResults;
                showErrorMessage('AI enhancement failed. Showing keyword results.');
            }
        }
        
        displayResults(finalResults, useAI && apiKey);
    } catch (error) {
        console.error('Search failed:', error);
        document.getElementById('results').innerHTML = `
            <div class="no-results">
                <p>Search failed. Please try again.</p>
            </div>
        `;
    }
}

function findMatchingCodes(query) {
    const results = [];
    const searchTerms = query.toLowerCase().split(' ').filter(word => word.length > 0);
    
    // Score-based search for better relevance
    const scoredResults = icdCodes.map(code => {
        let score = 0;
        const codeStr = code.code.toLowerCase();
        const descLower = code.description.toLowerCase();
        
        // Exact code match gets highest score
        if (codeStr === query.toLowerCase()) {
            score += 1000;
        }
        
        // Code starts with query
        if (codeStr.startsWith(query.toLowerCase())) {
            score += 500;
        }
        
        // Full query match in description
        if (descLower.includes(query.toLowerCase())) {
            score += 100;
        }
        
        // Individual word matches
        searchTerms.forEach(term => {
            if (term.length >= 2) {
                // Word boundary match scores higher
                const wordBoundaryRegex = new RegExp(`\\b${term}\\b`, 'i');
                if (wordBoundaryRegex.test(code.description)) {
                    score += 50;
                } else if (descLower.includes(term)) {
                    score += 10;
                }
            }
        });
        
        // Bonus for shorter descriptions (more specific)
        if (score > 0) {
            score += Math.max(0, 100 - code.description.length) / 10;
        }
        
        return { code, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)  // Get top 20 results
    .map(item => item.code);
    
    return scoredResults;
}

// AI Enhancement Function
async function enhanceWithAI(query, keywordResults, apiKey) {
    const topResults = keywordResults.slice(0, 10); // Send top 10 to AI for efficiency
    
    const prompt = `You are a medical coding expert. Given a medical query and a list of ICD-10 codes, select and rank the most appropriate codes.

Query: "${query}"

Available ICD-10 codes:
${topResults.map((code, index) => `${index + 1}. ${code.code} - ${code.description}`).join('\n')}

Please respond with ONLY a JSON array of the most relevant codes in order of relevance. Include AT MOST 5 codes. Format:
[{"code": "CODE", "description": "DESCRIPTION", "relevance_score": 0.95}]

Focus on clinical accuracy and specificity. Consider:
- Exact medical terminology matches
- Anatomical specificity
- Condition severity/type
- Standard medical coding practices`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a medical coding expert. Respond only with valid JSON.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 500,
            temperature: 0.1
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    try {
        const aiResults = JSON.parse(aiResponse);
        return aiResults.map(result => ({
            code: result.code,
            description: result.description,
            aiEnhanced: true,
            relevanceScore: result.relevance_score || 1.0
        }));
    } catch (parseError) {
        console.error('Failed to parse AI response:', aiResponse);
        throw new Error('Invalid AI response format');
    }
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background: #fee;
        border: 1px solid #fcc;
        color: #c33;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
    `;
    errorDiv.textContent = message;
    
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.insertBefore(errorDiv, resultsSection.firstChild);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

function displayResults(results, isAiEnhanced = false) {
    const resultsContainer = document.getElementById('results');
    
    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <p>No matching ICD-10 codes found.</p>
                <p>Try different keywords or check your spelling!</p>
            </div>
        `;
        return;
    }
    
    const html = results.map(code => `
        <div class="result-item">
            <div class="result-code">
                <span>
                    ${code.code}
                    ${code.aiEnhanced ? '<span class="ai-enhanced-badge">AI Enhanced</span>' : ''}
                </span>
                <button class="copy-btn" onclick="copyCode('${code.code}', this)">
                    Copy Code
                </button>
            </div>
            <div class="result-description">${code.description}</div>
        </div>
    `).join('');
    
    resultsContainer.innerHTML = html;
}

function copyCode(code, button) {
    navigator.clipboard.writeText(code).then(() => {
        button.textContent = 'Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.textContent = 'Copy Code';
            button.classList.remove('copied');
        }, 2000);
    });
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchCodes(e.target.value);
    }, 300);
});

// API toggle handler
document.getElementById('useAI').addEventListener('change', (e) => {
    const apiKeyGroup = document.getElementById('apiKeyGroup');
    if (e.target.checked) {
        apiKeyGroup.classList.add('show');
    } else {
        apiKeyGroup.classList.remove('show');
    }
});

// Initial focus
document.getElementById('searchInput').focus();