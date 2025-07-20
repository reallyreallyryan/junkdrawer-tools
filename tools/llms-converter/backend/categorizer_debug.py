# Save this as backend/categorizer_debug.py
"""
Enhanced categorizer with detailed debugging
This will show you exactly what's happening with AI enhancement
"""
import re
import json
import logging
from typing import Dict, List, Optional
from collections import defaultdict
from openai import OpenAI
import os

logger = logging.getLogger(__name__)

class DebugCategorizer:
    """Categorizer with enhanced debugging output"""
    
    DEFAULT_PATTERNS = {
        "Services": [
            "services", "therapy", "treatment", "procedure", "injection", 
            "prp", "bmac", "decompression", "ablation", "stimulation",
            "surgery", "surgical", "operation", "removal", "repair"
        ],
        "Areas Treated": [
            "areas-we-treat", "conditions", "pain", "sciatica", "shoulder", 
            "hip", "back", "neck", "knee", "ankle", "elbow", "spine",
            "joint", "muscle", "tendon", "ligament"
        ],
        "Blog": [
            "blog", "article", "post", "news", "education", "learn",
            "guide", "tips", "advice", "resource", "insights", "update",
            "announcement", "opens", "featured", "q&a", "interview" 
        ],
        "Providers": [
            "physician", "provider", "doctor", "team", "staff",
            "pa-c", "md", "do", "phd", "nurse", "therapist",
            "surgeon", "specialist", "expert"
        ],
        "Locations": [
            "location", "office", "clinic", "contact", "directions",
            "address", "map", "hours", "parking", "facility"
        ],
        "Patient Resources": [
            "patient", "form", "insurance", "download", "faq",
            "appointment", "schedule", "privacy", "policy", "rights",
            "billing", "payment", "testimonial", "review",
            "request-appointment", "payment-plan" 
        ],
        "About": [
            "about", "mission", "vision", "values", "history",
            "career", "join", "team", "culture", "story",
            "welcome", "introduction", "who-we-are"
        ]
    }
    
    def __init__(self, use_gpt: bool = False, api_key: Optional[str] = None, debug: bool = True):
        self.use_gpt = use_gpt
        self.debug = debug
        self.patterns = self.DEFAULT_PATTERNS.copy()
        self.client = None
        
        if self.debug:
            print(f"🔧 DebugCategorizer initialized with use_gpt={use_gpt}")
        
        if use_gpt:
            if not api_key:
                api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                if self.debug:
                    print("❌ No OpenAI API key found!")
                raise ValueError("OpenAI API key required for GPT enhancement")
            
            try:
                self.client = OpenAI(api_key=api_key)
                if self.debug:
                    print(f"✅ OpenAI client initialized with key: {api_key[:10]}...")
            except Exception as e:
                if self.debug:
                    print(f"❌ Failed to initialize OpenAI client: {e}")
                raise
    
    def extract_title_from_url(self, url: str) -> str:
        """Extract meaningful title from URL when page title is empty"""
        path = re.sub(r'^https?://[^/]+/', '', url)
        path = re.sub(r'[?#].*$', '', path)
        path = re.sub(r'\.[^/]+$', '', path)
        
        if not path or path == '/':
            return 'Homepage'
        
        segments = [s for s in path.split('/') if s]
        if segments:
            if len(segments) >= 2 and len(segments[-1]) < 20:
                title_parts = segments[-2:]
            else:
                title_parts = [segments[-1]]
            
            title = ' '.join(title_parts)
            title = title.replace('-', ' ').replace('_', ' ')
            return title.title()
        
        return 'Page'
    
    def pattern_based_categorize(self, page: Dict) -> str:
        """Categorize a single page using patterns"""
        url = page.get('Address', '').lower()
        title = page.get('Title 1', '').lower()
        meta = page.get('Meta Description 1', '').lower()
        h1 = page.get('H1-1', '').lower()
        
        # Check URL structure first
        if '/blog/' in url:
            return "Blog"
        if '/patient-information/' in url or '/patient-resources/' in url:
            return "Patient Resources"
        if '/locations/' in url:
            return "Locations"
        if '/physicians/' in url or '/providers/' in url:
            return "Providers"
        if '/services/' in url:
            return "Services"
        
        # Content-based matching
        combined_text = f"{url} {title} {meta} {h1}"
        category_scores = defaultdict(int)
        
        for category, patterns in self.patterns.items():
            for pattern in patterns:
                if pattern.lower() in combined_text:
                    category_scores[category] += 1
        
        if category_scores:
            return max(category_scores.items(), key=lambda x: x[1])[0]
        return "Other"
    
    def prepare_page_for_display(self, page: Dict) -> Dict:
        """Prepare page data with proper title handling"""
        title = page.get('Title 1', '').strip()
        if not title:
            url = page.get('Address', '')
            title = self.extract_title_from_url(url)
        
        description = page.get('Meta Description 1', '').strip()
        if description:
            description = description.replace('[…]', '').replace('[...]', '').replace('…', '').strip()
        
        h1 = page.get('H1-1', '').strip()
        
        return {
            'url': page.get('Address', ''),
            'title': title,
            'description': description,
            'h1': h1,
            'enhanced': False
        }
    
    def enhance_batch_with_ai(self, batch: List[Dict], section: str, site_metadata: Dict) -> List[Dict]:
        """Enhanced AI processing with detailed debugging"""
        if not self.client:
            if self.debug:
                print("⚠️ No OpenAI client - skipping enhancement")
            return batch
        
        if self.debug:
            print(f"🤖 Enhancing {len(batch)} {section} pages...")
        
        prompt = f"""You are optimizing content for AI search engines and LLMS.txt files.
Site: {site_metadata.get('site_title', '')}
Section: {section}

For each page below, provide an optimized title and description.

TITLE requirements:
- Clear and specific about what the page offers
- Under 60 characters when possible
- Remove generic branding

DESCRIPTION requirements:
- 15-25 words explaining the key benefit
- Specific, not generic
- Complete sentences

Pages:
"""
        
        for i, page in enumerate(batch, 1):
            prompt += f"\n{i}. Title: {page['title']}"
            prompt += f"\n   Description: {page.get('description', 'None')[:100]}"
            prompt += f"\n   URL: {page['url']}\n"
        
        prompt += """
Return ONLY a JSON array:
[{"index": 1, "title": "...", "description": "..."}, {"index": 2, "title": "...", "description": "..."}, ...]"""

        try:
            if self.debug:
                print(f"📝 Sending prompt (first 300 chars): {prompt[:300]}...")
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an AI search optimization expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=800
            )
            
            content = response.choices[0].message.content.strip()
            
            if self.debug:
                print(f"🔄 Raw AI response (first 200 chars): {content[:200]}...")
            
            # Parse JSON
            enhanced_batch = self._parse_and_apply_enhancements(content, batch)
            
            if self.debug:
                enhanced_count = sum(1 for page in enhanced_batch if page.get('enhanced', False))
                print(f"✅ Successfully enhanced {enhanced_count}/{len(batch)} pages")
                
                # Show some examples
                for page in enhanced_batch[:2]:
                    if page.get('enhanced'):
                        print(f"   📝 '{page['title']}' -> Enhanced!")
            
            return enhanced_batch
            
        except Exception as e:
            if self.debug:
                print(f"❌ AI enhancement failed: {str(e)}")
                print(f"Error type: {type(e).__name__}")
            return batch
    
    def _parse_and_apply_enhancements(self, content: str, original_batch: List[Dict]) -> List[Dict]:
        """Parse AI response and apply enhancements with debugging"""
        try:
            # Clean and extract JSON
            content = content.replace('```json', '').replace('```', '')
            start = content.find('[')
            end = content.rfind(']') + 1
            
            if start == -1 or end <= start:
                if self.debug:
                    print("❌ No JSON array found in response")
                return original_batch
            
            json_str = content[start:end]
            json_str = re.sub(r',\s*]', ']', json_str)
            json_str = re.sub(r',\s*}', '}', json_str)
            
            if self.debug:
                print(f"📋 Extracted JSON: {json_str[:200]}...")
            
            enhancements = json.loads(json_str)
            
            # Apply enhancements
            enhanced_batch = []
            for i, page in enumerate(original_batch):
                enhanced_page = page.copy()
                
                # Find matching enhancement
                matching_enhancement = None
                for enhancement in enhancements:
                    if enhancement.get('index') == i + 1:
                        matching_enhancement = enhancement
                        break
                
                if matching_enhancement:
                    if 'title' in matching_enhancement and matching_enhancement['title']:
                        enhanced_page['title'] = matching_enhancement['title']
                    if 'description' in matching_enhancement and matching_enhancement['description']:
                        enhanced_page['description'] = matching_enhancement['description']
                    enhanced_page['enhanced'] = True
                    
                    if self.debug:
                        print(f"   ✨ Enhanced: {enhanced_page['title']}")
                
                enhanced_batch.append(enhanced_page)
            
            return enhanced_batch
            
        except json.JSONDecodeError as e:
            if self.debug:
                print(f"❌ JSON parsing error: {e}")
            return original_batch
        except Exception as e:
            if self.debug:
                print(f"❌ Enhancement parsing error: {e}")
            return original_batch
    
    def categorize_pages(self, pages: List[Dict], site_metadata: Dict) -> Dict[str, List[Dict]]:
        """Main categorization method with enhanced debugging"""
        if self.debug:
            print(f"🔄 Processing {len(pages)} pages with debug categorizer...")
            print(f"AI Enhancement: {'ENABLED' if self.use_gpt else 'DISABLED'}")
        
        # Step 1: Pattern-based categorization
        categorized = defaultdict(list)
        
        for page in pages:
            category = self.pattern_based_categorize(page)
            page_data = self.prepare_page_for_display(page)
            categorized[category].append(page_data)
        
        if self.debug:
            print("📁 Categories after pattern matching:")
            for category, items in categorized.items():
                print(f"   {category}: {len(items)} pages")
        
        # Step 2: AI Enhancement
        if self.use_gpt and self.client:
            if self.debug:
                print("🤖 Starting AI enhancement...")
            
            sections_to_enhance = ['Services', 'Providers', 'Locations', 'Blog']
            
            for section in sections_to_enhance:
                if section in categorized and categorized[section]:
                    if self.debug:
                        print(f"✨ Enhancing {section} section ({len(categorized[section])} pages)...")
                    
                    pages_list = categorized[section]
                    enhanced_pages = []
                    
                    # Process in batches of 5 for better results
                    for i in range(0, len(pages_list), 5):
                        batch = pages_list[i:i+5]
                        enhanced_batch = self.enhance_batch_with_ai(batch, section, site_metadata)
                        enhanced_pages.extend(enhanced_batch)
                    
                    categorized[section] = enhanced_pages
        else:
            if self.debug:
                print("⚠️ AI enhancement skipped")
        
        # Sort by page count
        sorted_categorized = dict(sorted(categorized.items(), key=lambda x: len(x[1]), reverse=True))
        
        if self.debug:
            total_enhanced = sum(1 for pages in sorted_categorized.values() for page in pages if page.get('enhanced', False))
            print(f"✅ Processing complete! {total_enhanced} pages enhanced with AI")
        
        return sorted_categorized