// JobMatch Evaluator JavaScript
class JobMatchEvaluator {
    constructor() {
        this.apiKey = '';
        this.resumeText = '';
        this.jobDescription = '';
        
        this.initializeElements();
        this.initializeEventListeners();
    }
    
    initializeElements() {
        this.apiKeyInput = document.getElementById('apiKey');
        this.resumeTextArea = document.getElementById('resumeText');
        this.resumeFileInput = document.getElementById('resumeFile');
        this.resumeFileInfo = document.getElementById('resumeFileInfo');
        this.jobDescriptionTextArea = document.getElementById('jobDescription');
        this.evaluateBtn = document.getElementById('evaluateBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.processingSection = document.getElementById('processingSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.errorMessage = document.getElementById('errorMessage');
        
        // Results elements
        this.scoreValue = document.getElementById('scoreValue');
        this.scoreDescription = document.getElementById('scoreDescription');
        this.matchedKeywords = document.getElementById('matchedKeywords');
        this.missingKeywords = document.getElementById('missingKeywords');
        this.coverLetterText = document.getElementById('coverLetterText');
        this.copyCoverLetterBtn = document.getElementById('copyCoverLetterBtn');
    }
    
    initializeEventListeners() {
        // API key input
        this.apiKeyInput.addEventListener('input', () => {
            this.apiKey = this.apiKeyInput.value.trim();
            this.updateEvaluateButton();
        });
        
        // Resume text area
        this.resumeTextArea.addEventListener('input', () => {
            this.resumeText = this.resumeTextArea.value.trim();
            this.updateEvaluateButton();
        });
        
        // Job description text area
        this.jobDescriptionTextArea.addEventListener('input', () => {
            this.jobDescription = this.jobDescriptionTextArea.value.trim();
            this.updateEvaluateButton();
        });
        
        // File upload
        this.resumeFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.handleFileUpload(file);
            }
        });
        
        // Evaluate button
        this.evaluateBtn.addEventListener('click', () => {
            this.evaluateMatch();
        });
        
        // Clear button
        this.clearBtn.addEventListener('click', () => {
            this.clearAll();
        });
        
        // Copy cover letter button
        this.copyCoverLetterBtn.addEventListener('click', () => {
            this.copyCoverLetter();
        });
    }
    
    updateEvaluateButton() {
        const hasApiKey = this.apiKey.length > 0;
        const hasResume = this.resumeText.length > 0;
        const hasJobDescription = this.jobDescription.length > 0;
        
        this.evaluateBtn.disabled = !(hasApiKey && hasResume && hasJobDescription);
    }
    
    async handleFileUpload(file) {
        const fileType = file.name.split('.').pop().toLowerCase();
        
        try {
            this.resumeFileInfo.textContent = `Loading ${file.name}...`;
            
            let text = '';
            
            if (fileType === 'pdf') {
                text = await this.parsePDF(file);
            } else if (fileType === 'docx' || fileType === 'doc') {
                text = await this.parseDOCX(file);
            } else if (fileType === 'txt') {
                text = await this.parseTXT(file);
            } else {
                throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT.');
            }
            
            this.resumeText = text;
            this.resumeTextArea.value = text;
            this.resumeFileInfo.textContent = `✓ Loaded: ${file.name}`;
            this.updateEvaluateButton();
            
        } catch (error) {
            this.showError(`Error loading file: ${error.message}`);
            this.resumeFileInfo.textContent = '';
        }
    }
    
    async parsePDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            text += pageText + '\n';
        }
        
        return text.trim();
    }
    
    async parseDOCX(file) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value.trim();
    }
    
    async parseTXT(file) {
        return await file.text();
    }
    
    async evaluateMatch() {
        try {
            this.hideError();
            this.showProcessing();
            
            // Get embeddings for both texts
            const [resumeEmbedding, jobEmbedding] = await Promise.all([
                this.getEmbedding(this.resumeText),
                this.getEmbedding(this.jobDescription)
            ]);
            
            // Calculate base embedding similarity
            const embedSimilarity = this.calculateCosineSimilarity(resumeEmbedding, jobEmbedding);
            
            // Get comprehensive analysis
            const analysis = await this.analyzeMatchComprehensive(this.resumeText, this.jobDescription);
            
            // Calculate component scores
            const semanticScore = Math.min(embedSimilarity * 0.9, 0.9) * 25; // Cap at 90% of 25 points
            
            const hardSkillsScore = (analysis.hardSkills.matched / 
                                    Math.max(analysis.hardSkills.total, 1)) * 35;
            
            const softSkillsScore = (analysis.softSkills.matched / 
                                    Math.max(analysis.softSkills.total, 1)) * 15;
            
            const roleRelevanceScore = analysis.roleRelevance * 25;
            
            // Calculate final score
            const finalScore = Math.round(
                semanticScore + 
                hardSkillsScore + 
                softSkillsScore + 
                roleRelevanceScore
            );
            
            // Generate cover letter starter
            const coverLetter = await this.generateCoverLetter(
                this.resumeText, 
                this.jobDescription, 
                [...analysis.hardSkills.matchedList, ...analysis.softSkills.matchedList].slice(0, 3)
            );
            
            // Display results with score breakdown
            this.displayResults({
                score: finalScore,
                scoreBreakdown: {
                    semantic: Math.round(semanticScore),
                    hardSkills: Math.round(hardSkillsScore),
                    softSkills: Math.round(softSkillsScore),
                    roleRelevance: Math.round(roleRelevanceScore)
                },
                matchedKeywords: analysis.hardSkills.matchedList,
                missingKeywords: analysis.hardSkills.missingList,
                summary: analysis.summary,
                coverLetter
            });
            
        } catch (error) {
            this.showError(`Error analyzing match: ${error.message}`);
        } finally {
            this.hideProcessing();
        }
    }
    
    async getEmbedding(text) {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'text-embedding-ada-002',
                input: text.slice(0, 8000) // Limit text length
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to get embedding');
        }
        
        const data = await response.json();
        return data.data[0].embedding;
    }
    
    calculateCosineSimilarity(vec1, vec2) {
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }
        
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }
    
    async analyzeMatch(resumeText, jobDescription) {
        const prompt = `Analyze the match between this resume and job description. 
        Extract and categorize the most important skills and keywords.
        
        Resume:
        ${resumeText.slice(0, 3000)}
        
        Job Description:
        ${jobDescription.slice(0, 3000)}
        
        Respond in JSON format:
        {
            "matchedKeywords": ["keyword1", "keyword2", ...],
            "missingKeywords": ["keyword1", "keyword2", ...],
            "summary": "One sentence summary of the match"
        }`;
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'system',
                    content: 'You are a professional resume analyzer. Always respond with valid JSON.'
                }, {
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.3,
                max_tokens: 500
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to analyze match');
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        try {
            return JSON.parse(content);
        } catch (e) {
            // Fallback if JSON parsing fails
            return {
                matchedKeywords: [],
                missingKeywords: [],
                summary: "Unable to parse analysis"
            };
        }
    }
    
    async analyzeMatchComprehensive(resumeText, jobDescription) {
        const prompt = `Analyze this resume against the job description with a focus on accurate skill matching and role relevance.
        
        Resume:
        ${resumeText.slice(0, 3000)}
        
        Job Description:
        ${jobDescription.slice(0, 3000)}
        
        Provide a comprehensive analysis in JSON format:
        {
            "hardSkills": {
                "matchedList": ["specific technical skills that match"],
                "missingList": ["required technical skills not found"],
                "matched": <number of matched hard skills>,
                "total": <total required hard skills>
            },
            "softSkills": {
                "matchedList": ["soft skills that match"],
                "missingList": ["soft skills not found"],
                "matched": <number of matched soft skills>,
                "total": <total soft skills mentioned>
            },
            "roleRelevance": <0-1 score based on job title similarity, industry match, and experience level>,
            "summary": "Brief explanation of match quality"
        }
        
        For roleRelevance scoring:
        - 0.8-1.0: Same or very similar role/industry
        - 0.5-0.8: Related role or transferable industry
        - 0.2-0.5: Some transferable aspects
        - 0-0.2: Different field entirely
        
        Be strict about technical skills - only count exact or very close matches.`;
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'system',
                    content: 'You are an expert recruiter and resume analyzer. Be accurate and strict in skill matching. Always respond with valid JSON.'
                }, {
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.3,
                max_tokens: 800
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to analyze match');
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        try {
            return JSON.parse(content);
        } catch (e) {
            // Fallback if JSON parsing fails
            return {
                hardSkills: {
                    matchedList: [],
                    missingList: [],
                    matched: 0,
                    total: 1
                },
                softSkills: {
                    matchedList: [],
                    missingList: [],
                    matched: 0,
                    total: 1
                },
                roleRelevance: 0.1,
                summary: "Unable to parse analysis"
            };
        }
    }
    
    async generateCoverLetter(resumeText, jobDescription, matchedKeywords) {
        const prompt = `Based on this resume and job description, write a compelling 2-3 sentence cover letter introduction that:
        1. Highlights the strongest matching qualifications
        2. Shows enthusiasm for the specific role
        3. Mentions 1-2 key matched skills: ${matchedKeywords.slice(0, 2).join(', ')}
        
        Resume excerpt:
        ${resumeText.slice(0, 1000)}
        
        Job Description excerpt:
        ${jobDescription.slice(0, 1000)}
        
        Write only the cover letter introduction sentences, nothing else.`;
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'system',
                    content: 'You are a professional cover letter writer. Write compelling, concise introductions.'
                }, {
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 150
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to generate cover letter');
        }
        
        const data = await response.json();
        return data.choices[0].message.content.trim();
    }
    
    displayResults(results) {
        // Update score
        this.scoreValue.textContent = `${results.score}%`;
        this.updateScoreVisual(results.score);
        
        // Update score description
        let description = '';
        if (results.score >= 80) {
            description = "Excellent match! You're highly qualified for this position.";
        } else if (results.score >= 60) {
            description = "Good match! You meet many of the key requirements.";
        } else if (results.score >= 40) {
            description = "Moderate match. Consider highlighting transferable skills.";
        } else {
            description = "Low match. You may need to gain additional experience or skills.";
        }
        this.scoreDescription.textContent = description;
        
        // Update score breakdown
        if (results.scoreBreakdown) {
            this.updateScoreBreakdown(results.scoreBreakdown);
        }
        
        // Display matched keywords
        this.matchedKeywords.innerHTML = '';
        results.matchedKeywords.forEach(keyword => {
            const span = document.createElement('span');
            span.className = 'keyword';
            span.textContent = keyword;
            this.matchedKeywords.appendChild(span);
        });
        
        // Display missing keywords
        this.missingKeywords.innerHTML = '';
        results.missingKeywords.forEach(keyword => {
            const span = document.createElement('span');
            span.className = 'keyword missing';
            span.textContent = keyword;
            this.missingKeywords.appendChild(span);
        });
        
        // Display cover letter
        this.coverLetterText.textContent = results.coverLetter;
        
        // Show results section
        this.resultsSection.style.display = 'block';
        this.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    updateScoreVisual(score) {
        const scoreCircle = document.querySelector('.score-circle');
        
        // Update background color based on score
        if (score >= 80) {
            scoreCircle.style.background = '#d1fae5';
            scoreCircle.style.border = '3px solid #10b981';
        } else if (score >= 60) {
            scoreCircle.style.background = '#fef3c7';
            scoreCircle.style.border = '3px solid #f59e0b';
        } else if (score >= 40) {
            scoreCircle.style.background = '#fed7aa';
            scoreCircle.style.border = '3px solid #f97316';
        } else {
            scoreCircle.style.background = '#fee2e2';
            scoreCircle.style.border = '3px solid #ef4444';
        }
    }
    
    updateScoreBreakdown(breakdown) {
        // Update semantic score
        document.getElementById('semanticScore').textContent = `${breakdown.semantic}/25`;
        document.getElementById('semanticBar').style.width = `${(breakdown.semantic / 25) * 100}%`;
        
        // Update hard skills score
        document.getElementById('hardSkillsScore').textContent = `${breakdown.hardSkills}/35`;
        document.getElementById('hardSkillsBar').style.width = `${(breakdown.hardSkills / 35) * 100}%`;
        
        // Update soft skills score
        document.getElementById('softSkillsScore').textContent = `${breakdown.softSkills}/15`;
        document.getElementById('softSkillsBar').style.width = `${(breakdown.softSkills / 15) * 100}%`;
        
        // Update role relevance score
        document.getElementById('roleScore').textContent = `${breakdown.roleRelevance}/25`;
        document.getElementById('roleBar').style.width = `${(breakdown.roleRelevance / 25) * 100}%`;
    }
    
    copyCoverLetter() {
        const text = this.coverLetterText.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const originalText = this.copyCoverLetterBtn.textContent;
            this.copyCoverLetterBtn.textContent = '✓ Copied!';
            setTimeout(() => {
                this.copyCoverLetterBtn.textContent = originalText;
            }, 2000);
        });
    }
    
    clearAll() {
        this.resumeText = '';
        this.jobDescription = '';
        this.resumeTextArea.value = '';
        this.jobDescriptionTextArea.value = '';
        this.resumeFileInput.value = '';
        this.resumeFileInfo.textContent = '';
        this.resultsSection.style.display = 'none';
        this.hideError();
        this.updateEvaluateButton();
    }
    
    showProcessing() {
        this.processingSection.style.display = 'block';
        this.evaluateBtn.disabled = true;
    }
    
    hideProcessing() {
        this.processingSection.style.display = 'none';
        this.updateEvaluateButton();
    }
    
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
    }
    
    hideError() {
        this.errorMessage.style.display = 'none';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new JobMatchEvaluator();
});