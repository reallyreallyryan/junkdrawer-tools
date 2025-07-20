# backend/categorizer.py
"""
Handles page categorization using pattern matching and AI
Based on the working medical tool, adapted for generic use
"""
import re
import json
import logging
from typing import Dict, List, Optional
from collections import defaultdict
import tiktoken
from openai import OpenAI
import os

logger = logging.getLogger(__name__)

class Categorizer:
    """Categorize pages using patterns and AI enhancement"""
    
    # Generic patterns that work across industries
    DEFAULT_PATTERNS = {
        "Services": [
            "services", "solutions", "what-we-do", "offerings", "capabilities",
            "expertise", "consulting", "support", "implementation", 
            "maintenance", "strategy", "development", "design", "therapy", 
            "treatment", "procedure", "injection", "repair"
        ],
        "Products": [
            "products", "features", "pricing", "plans", "packages",
            "shop", "store", "catalog", "marketplace", "software",
            "platform", "tools", "apps", "dashboard"
        ],
        "Resources": [
            "blog", "articles", "guides", "resources", "documentation",
            "help", "support", "tutorials", "webinars", "case-studies",
            "whitepapers", "ebooks", "news", "insights", "tips", "education", 
            "learn", "advice", "update", "announcement"
        ],
        "Providers": [
            "team", "staff", "physician", "provider", "doctor", "experts",
            "specialists", "professionals", "about-us", "our-team"
        ],
        "Locations": [
            "locations", "offices", "contact", "directions", "address", 
            "map", "hours", "parking", "facility", "clinic"
        ],
        "About": [
            "about", "company", "mission", "vision", "values", "history",
            "careers", "culture", "story", "who-we-are", "our-story"
        ],
        "Contact": [
            "contact", "get-started", "demo", "trial", "reach-us", 
            "talk-to-us", "schedule", "book", "consultation", "quote", "estimate"
        ]
    }
    
    def __init__(self, use_gpt: bool = False, api_key: Optional[str] = None):
        self.use_gpt = use_gpt
        self.patterns = self.DEFAULT_PATTERNS.copy()
        
        if use_gpt:
            if not api_key:
                api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OpenAI API key required for GPT enhancement")
            
            self.client = OpenAI(api_key=api_key)
            self.encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
            logger.info("GPT enhancement enabled")
        else:
            self.client = None
            logger.info("GPT enhancement disabled")
    
    def normalize_url(self, url: str) -> str:
        """Normalize URL for comparison"""
        return url.rstrip("/").strip().lower()
    
    def extract_url_segments(self, url: str) -> List[str]:
        """Extract meaningful segments from URL"""
        # Remove protocol and domain
        path = re.sub(r'^https?://[^/]+', '', url)
        # Split by / and - and _
        segments = re.split(r'[/\-_]', path)
        # Filter out empty strings and common words
        return [s for s in segments if s and len(s) > 2]
    
    def extract_title_from_url(self, url: str) -> str:
        """Extract a meaningful title from URL when page title is empty"""
        # Remove protocol and domain
        path = re.sub(r'^https?://[^/]+/', '', url)
        
        # Remove query parameters and fragments
        path = re.sub(r'[?#].*$', '', path)
        
        # Remove file extension
        path = re.sub(r'\.[^/]+$', '', path)
        
        # Handle special cases
        if not path or path == '/':
            return 'Homepage'
        
        # Split by / and take the last meaningful segment
        segments = [s for s in path.split('/') if s]
        
        if segments:
            # Take the last segment or last two if more descriptive
            if len(segments) >= 2 and len(segments[-1]) < 20:
                # Combine last two segments for better context
                title_parts = segments[-2:]
            else:
                title_parts = [segments[-1]]
            
            # Convert to readable title
            title = ' '.join(title_parts)
            # Replace hyphens/underscores with spaces
            title = title.replace('-', ' ').replace('_', ' ')
            # Title case
            title = title.title()
            
            return title
        
        return 'Page'
    
    def prepare_page_for_display(self, page: Dict) -> Dict:
        """Prepare page data with proper title handling"""
        title = page.get('Title 1', '').strip()
        
        # If title is empty, try to extract from URL
        if not title:
            url = page.get('Address', '')
            title = self.extract_title_from_url(url)
        
        # Get description, fallback to H1 or generate from URL
        description = page.get('Meta Description 1', '').strip()
        
        # Clean up truncation marks from descriptions
        if description:
            # Remove various forms of truncation marks
            description = description.replace('[…]', '').replace('[...]', '').strip()
            description = description.replace('…', '').strip()
            
            # If description ends with incomplete sentence, try to complete it
            if description and not description[-1] in '.!?':
                # Add a period if it seems like a complete thought
                if len(description.split()) > 5:  # Has enough words
                    description += '.'
        
        if not description:
            h1 = page.get('H1-1', '').strip()
            if h1:
                description = h1
            else:
                # Generate description from title
                description = f"Information about {title.lower()}"
        
        return {
            'url': page.get('Address', ''),
            'title': title,
            'description': description
        }
    
    def pattern_based_categorize(self, page: Dict) -> str:
        """Categorize a single page using patterns"""
        url = self.normalize_url(page.get('Address', ''))
        title = page.get('Title 1', '').lower()
        meta = page.get('Meta Description 1', '').lower()
        h1 = page.get('H1-1', '').lower()
        
        # PRIORITY 1: Check URL structure first for definitive categorization
        # Blog posts should ALWAYS go in Resources category
        if '/blog/' in url or '/articles/' in url or '/news/' in url:
            return "Resources"
        
        # Provider/team pages
        if '/team/' in url or '/staff/' in url or '/providers/' in url or '/physicians/' in url:
            return "Providers"
        
        # Location pages
        if '/locations/' in url or '/offices/' in url or '/contact/' in url:
            return "Locations"
        
        # Service pages
        if '/services/' in url or '/treatments/' in url or '/procedures/' in url:
            return "Services"
        
        # Product pages
        if '/products/' in url or '/pricing/' in url or '/features/' in url:
            return "Products"
        
        # About pages
        if '/about/' in url:
            return "About"
        
        # PRIORITY 2: If no clear URL pattern, use content matching
        combined_text = f"{url} {title} {meta} {h1}"
        url_segments = self.extract_url_segments(url)
        
        # Score each category
        category_scores = defaultdict(int)
        
        for category, patterns in self.patterns.items():
            for pattern in patterns:
                pattern_lower = pattern.lower()
                # Check in combined text
                if pattern_lower in combined_text:
                    category_scores[category] += 2
                # Check in URL segments (higher weight)
                for segment in url_segments:
                    if pattern_lower in segment:
                        category_scores[category] += 3
        
        # Return category with highest score, or "Other"
        if category_scores:
            return max(category_scores.items(), key=lambda x: x[1])[0]
        return "Other"
    
    def categorize_pages(self, pages: List[Dict], site_metadata: Dict) -> Dict[str, List[Dict]]:
        """Main categorization method - ALWAYS use patterns, optionally enhance"""
        
        # ALWAYS use pattern-based categorization for accuracy
        logger.info("Using pattern-based categorization...")
        categorized = self._pattern_categorize_all(pages)
        
        # If GPT is enabled, use it for title AND description enhancement
        if self.use_gpt:
            logger.info("Enhancing titles and descriptions with GPT...")
            categorized = self._enhance_categorized_content(categorized, site_metadata)
        
        return categorized
    
    def _pattern_categorize_all(self, pages: List[Dict]) -> Dict[str, List[Dict]]:
        """Categorize all pages using patterns"""
        categorized = defaultdict(list)
        
        for page in pages:
            category = self.pattern_based_categorize(page)
            
            # Prepare page entry with proper display data
            page_entry = self.prepare_page_for_display(page)
            
            categorized[category].append(page_entry)
        
        # Sort categories by number of pages (descending)
        sorted_categories = dict(
            sorted(categorized.items(), 
                   key=lambda x: len(x[1]), 
                   reverse=True)
        )
        
        return sorted_categories
    
    def _enhance_categorized_content(self, categorized: Dict[str, List[Dict]], 
                                   site_metadata: Dict) -> Dict[str, List[Dict]]:
        """Enhance both titles and descriptions for already-categorized pages"""
        
        # Include all major sections in enhancement
        sections_to_enhance = ['Services', 'Products', 'Providers', 'Locations', 'Resources', 'About', 'Other']
        enhanced_categorized = categorized.copy()
        
        for section in sections_to_enhance:
            if section not in categorized or not categorized[section]:
                continue
                
            logger.info(f"Enhancing {len(categorized[section])} {section} titles and descriptions...")
            
            pages = categorized[section]
            enhanced_pages = []
            
            # Process in batches of 8
            for i in range(0, len(pages), 8):
                batch = pages[i:i+8]
                
                try:
                    # Create enhanced prompt based on section type
                    if section == 'Resources':
                        prompt = f"""You are optimizing content for AI search engines (ChatGPT, Claude, Perplexity) and LLMS.txt files.
Site: {site_metadata.get('site_title', '')}

For each resource/article below, provide an optimized title and description. 

CRITICAL: Remove ALL site branding from titles (like "- CBCIDD", "| Company Name", "- Blog", etc.)

TITLE requirements:
- Remove site branding, company names, and generic words
- Clear, descriptive, and specific about what the content covers
- Concise but informative (under 60 characters when possible)
- Focus on the core topic

DESCRIPTION requirements:
- 15-25 words explaining what readers will learn or achieve
- Uses natural, complete sentences (no truncation marks)
- Actionable and informative
- Focus on benefits and outcomes

Resources:
"""
                    else:
                        prompt = f"""You are optimizing content for AI search engines (ChatGPT, Claude, Perplexity) and LLMS.txt files.
Site: {site_metadata.get('site_title', '')}
Section: {section}

For each page below, provide an optimized title and description.

CRITICAL: Remove ALL site branding from titles (like "- CBCIDD", "| Company Name", etc.)

TITLE requirements:
- Remove site branding, company names, and generic words completely
- Clear and specific about the service/solution/topic offered
- Concise but descriptive (under 60 characters when possible)
- Focus on the core value proposition

DESCRIPTION requirements:
- 15-25 words stating the specific benefit or outcome
- Includes keywords AI would search for
- Specific, not generic
- Focus on what users will get or achieve

Pages:
"""
                    
                    for j, page in enumerate(batch):
                        current_title = page['title']
                        current_desc = page.get('description', '')
                        
                        # Clean up [...] from existing descriptions before sending to GPT
                        if current_desc:
                            current_desc = current_desc.replace('[…]', '').replace('[...]', '').replace('…', '').strip()
                        
                        prompt += f"\n{j+1}. Current Title: {current_title}"
                        prompt += f"\n   Current Description: {current_desc[:100] if current_desc else 'None'}"
                        prompt += f"\n   URL: {page['url']}\n"
                    
                    prompt += """
Return ONLY a JSON array with enhanced titles and descriptions:
[{{"index": 1, "title": "Clean Title Without Branding", "description": "Benefit-focused description explaining specific outcomes."}}, {{"index": 2, "title": "Another Clean Title", "description": "Another specific description."}}]

REMEMBER: Completely remove all site branding from titles. Make them clean and specific for LLMS.txt format."""

                    response = self.client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[
                            {"role": "system", "content": "You are an AI search optimization expert. Always remove site branding from titles and write benefit-focused descriptions without truncation marks."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.7,
                        max_tokens=800
                    )
                    
                    content = response.choices[0].message.content.strip()
                    
                    # Extract JSON more carefully
                    # Remove any markdown formatting
                    content = content.replace('```json', '').replace('```', '')
                    
                    # Find the JSON array
                    start = content.find('[')
                    end = content.rfind(']') + 1
                    
                    if start != -1 and end > start:
                        json_str = content[start:end]
                        
                        # Clean common issues
                        json_str = re.sub(r',\s*]', ']', json_str)  # Remove trailing commas
                        json_str = re.sub(r',\s*}', '}', json_str)
                        
                        improvements = json.loads(json_str)
                        
                        # Create enhanced batch
                        enhanced_batch = batch.copy()
                        for item in improvements:
                            idx = item.get('index', 0) - 1
                            if 0 <= idx < len(enhanced_batch):
                                enhanced_batch[idx] = batch[idx].copy()
                                # Update title if provided - with extra cleaning
                                if 'title' in item and item['title']:
                                    new_title = item['title']
                                    # Extra cleaning for common branding patterns
                                    new_title = re.sub(r'\s*[-|]\s*(CBCIDD|CB\s*Home\s*Care|Blog|Page|Article)\s*$', '', new_title, flags=re.IGNORECASE)
                                    new_title = re.sub(r'\s*[-|]\s*[A-Z]{2,}\s*$', '', new_title)  # Remove abbreviations at end
                                    new_title = new_title.strip()
                                    enhanced_batch[idx]['title'] = new_title
                                # Update description if provided
                                if 'description' in item and item['description']:
                                    enhanced_batch[idx]['description'] = item['description']
                                # Mark as enhanced
                                enhanced_batch[idx]['enhanced'] = True
                        
                        enhanced_pages.extend(enhanced_batch)
                        logger.info(f"✓ Enhanced {len(improvements)} {section} titles and descriptions")
                    else:
                        # If parsing fails, keep originals
                        enhanced_pages.extend(batch)
                        logger.warning("Could not parse GPT response, keeping original content")
                        
                except json.JSONDecodeError as e:
                    logger.warning(f"Enhancement failed for batch: {e}")
                    enhanced_pages.extend(batch)  # Keep originals on error
                except Exception as e:
                    logger.warning(f"Enhancement failed for batch: {e}")
                    enhanced_pages.extend(batch)  # Keep originals on error
            
            # Update the section with enhanced pages
            enhanced_categorized[section] = enhanced_pages
        
        return enhanced_categorized