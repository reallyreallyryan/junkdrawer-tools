# backend/url_processor.py
"""
URL processing for website scraping and content extraction
Replaces CSV input with direct URL scraping
"""
import requests
from bs4 import BeautifulSoup
import urllib.robotparser
from urllib.parse import urljoin, urlparse, parse_qs
import time
import logging
from typing import Dict, List, Optional, Set
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class PageData:
    url: str
    title: str
    meta_description: str
    h1: str
    status_code: int
    word_count: int
    is_indexable: bool

class URLProcessor:
    """Process website URLs and extract content for LLMS.txt generation"""
    
    def __init__(self, base_url: str, max_pages: int = 100, delay: float = 1.0):
        self.base_url = base_url.rstrip('/')
        self.domain = urlparse(base_url).netloc
        self.max_pages = max_pages
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; LLMSConverter/1.0; +https://junkdrawer.tools/)'
        })
        self.visited_urls: Set[str] = set()
        self.robots_parser = None
        
    def setup_robots_parser(self) -> bool:
        """Setup robots.txt parser for the domain"""
        try:
            robots_url = f"{self.base_url}/robots.txt"
            self.robots_parser = urllib.robotparser.RobotFileParser()
            self.robots_parser.set_url(robots_url)
            self.robots_parser.read()
            return True
        except Exception as e:
            logger.warning(f"Could not read robots.txt: {e}")
            return False
    
    def can_fetch(self, url: str) -> bool:
        """Check if URL can be fetched according to robots.txt"""
        if not self.robots_parser:
            return True
        return self.robots_parser.can_fetch('*', url)
    
    def discover_sitemap_urls(self) -> List[str]:
        """Discover URLs from sitemap.xml"""
        urls = []
        sitemap_urls = [
            f"{self.base_url}/sitemap.xml",
            f"{self.base_url}/sitemap_index.xml",
            f"{self.base_url}/sitemaps.xml"
        ]
        
        for sitemap_url in sitemap_urls:
            try:
                response = self.session.get(sitemap_url, timeout=10)
                if response.status_code == 200:
                    urls.extend(self._parse_sitemap(response.text))
                    break
            except Exception as e:
                logger.debug(f"Could not fetch {sitemap_url}: {e}")
        
        return urls[:self.max_pages]
    
    def _parse_sitemap(self, sitemap_content: str) -> List[str]:
        """Parse sitemap XML and extract URLs"""
        urls = []
        try:
            soup = BeautifulSoup(sitemap_content, 'xml')
            
            # Handle sitemap index files
            sitemap_tags = soup.find_all('sitemap')
            if sitemap_tags:
                for sitemap_tag in sitemap_tags:
                    loc = sitemap_tag.find('loc')
                    if loc:
                        sub_sitemap_url = loc.get_text()
                        try:
                            response = self.session.get(sub_sitemap_url, timeout=10)
                            if response.status_code == 200:
                                urls.extend(self._parse_sitemap(response.text))
                        except Exception as e:
                            logger.debug(f"Could not fetch sub-sitemap {sub_sitemap_url}: {e}")
            
            # Handle regular sitemap files
            url_tags = soup.find_all('url')
            for url_tag in url_tags:
                loc = url_tag.find('loc')
                if loc:
                    url = loc.get_text().strip()
                    if self._is_valid_content_url(url):
                        urls.append(url)
        
        except Exception as e:
            logger.error(f"Error parsing sitemap: {e}")
        
        return urls
    
    def _is_valid_content_url(self, url: str) -> bool:
        """Check if URL is valid content (not images, scripts, etc.)"""
        # Skip non-content file extensions
        non_content_extensions = {
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
            '.css', '.js', '.json', '.xml', '.pdf', '.zip', '.txt',
            '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3', '.avi'
        }
        
        parsed = urlparse(url)
        path = parsed.path.lower()
        
        # Check file extension
        for ext in non_content_extensions:
            if path.endswith(ext):
                return False
        
        # Skip common non-content paths
        skip_patterns = [
            '/wp-admin/', '/admin/', '/api/', '/feed/', '/rss/',
            '/wp-content/', '/assets/', '/static/', '/media/',
            '?replytocom=', '?attachment_id='
        ]
        
        for pattern in skip_patterns:
            if pattern in url.lower():
                return False
        
        # Must be same domain
        if parsed.netloc != self.domain:
            return False
        
        return True
    
    def crawl_page(self, url: str) -> Optional[PageData]:
        """Crawl a single page and extract content"""
        if url in self.visited_urls:
            return None
        
        if not self.can_fetch(url):
            logger.debug(f"Robots.txt disallows fetching {url}")
            return None
        
        try:
            time.sleep(self.delay)  # Rate limiting
            response = self.session.get(url, timeout=15)
            self.visited_urls.add(url)
            
            if response.status_code != 200:
                return PageData(
                    url=url, title="", meta_description="", h1="",
                    status_code=response.status_code, word_count=0, is_indexable=False
                )
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract page data
            title = self._extract_title(soup)
            meta_description = self._extract_meta_description(soup)
            h1 = self._extract_h1(soup)
            word_count = self._count_words(soup)
            is_indexable = self._check_indexable(soup, response.headers)
            
            return PageData(
                url=url,
                title=title,
                meta_description=meta_description,
                h1=h1,
                status_code=response.status_code,
                word_count=word_count,
                is_indexable=is_indexable
            )
        
        except Exception as e:
            logger.error(f"Error crawling {url}: {e}")
            return None
    
    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract page title"""
        title_tag = soup.find('title')
        return title_tag.get_text().strip() if title_tag else ""
    
    def _extract_meta_description(self, soup: BeautifulSoup) -> str:
        """Extract meta description"""
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            return meta_desc['content'].strip()
        return ""
    
    def _extract_h1(self, soup: BeautifulSoup) -> str:
        """Extract first H1 tag"""
        h1_tag = soup.find('h1')
        return h1_tag.get_text().strip() if h1_tag else ""
    
    def _count_words(self, soup: BeautifulSoup) -> int:
        """Count words in main content"""
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()
        
        text = soup.get_text()
        words = text.split()
        return len(words)
    
    def _check_indexable(self, soup: BeautifulSoup, headers: Dict) -> bool:
        """Check if page is indexable"""
        # Check robots meta tag
        robots_meta = soup.find('meta', attrs={'name': 'robots'})
        if robots_meta and robots_meta.get('content'):
            content = robots_meta['content'].lower()
            if 'noindex' in content:
                return False
        
        # Check X-Robots-Tag header
        x_robots = headers.get('X-Robots-Tag', '').lower()
        if 'noindex' in x_robots:
            return False
        
        return True
    
    def process_website(self, progress_callback=None) -> Dict:
        """Main processing method - crawl website and return data"""
        logger.info(f"Starting website crawl for {self.base_url}")
        
        # Setup robots.txt parser
        self.setup_robots_parser()
        
        # Discover URLs from sitemap
        if progress_callback:
            progress_callback(0, 100, "Discovering URLs from sitemap...")
        
        urls = self.discover_sitemap_urls()
        
        if not urls:
            # Fallback: start from homepage and discover links
            logger.info("No sitemap found, starting from homepage")
            urls = [self.base_url]
        
        logger.info(f"Found {len(urls)} URLs to process")
        
        # Crawl pages
        pages = []
        total_urls = min(len(urls), self.max_pages)
        
        for i, url in enumerate(urls[:self.max_pages]):
            if progress_callback:
                progress_callback(i + 1, total_urls, f"Crawling page {i + 1}/{total_urls}")
            
            page_data = self.crawl_page(url)
            if page_data:
                pages.append(page_data)
        
        # Convert to format expected by existing processors
        processed_pages = []
        for page in pages:
            if page.status_code == 200 and page.is_indexable:
                processed_pages.append({
                    'Address': page.url,
                    'Status Code': page.status_code,
                    'Indexability': 'Indexable' if page.is_indexable else 'Non-Indexable',
                    'Title 1': page.title,
                    'Meta Description 1': page.meta_description,
                    'H1-1': page.h1,
                    'Word Count': page.word_count
                })
        
        # Extract site metadata
        homepage_data = next((p for p in pages if p.url == self.base_url), None)
        if not homepage_data and pages:
            homepage_data = pages[0]
        
        site_metadata = {
            'site_title': homepage_data.title if homepage_data else 'Website',
            'site_summary': homepage_data.meta_description if homepage_data else '',
            'site_url': self.base_url
        }
        
        stats = {
            'total_rows': len(pages),
            'indexable_pages': len([p for p in pages if p.is_indexable and p.status_code == 200]),
            'unique_pages': len(processed_pages)
        }
        
        if progress_callback:
            progress_callback(total_urls, total_urls, "Processing complete!")
        
        return {
            'pages': processed_pages,
            'site_metadata': site_metadata,
            'stats': stats
        }