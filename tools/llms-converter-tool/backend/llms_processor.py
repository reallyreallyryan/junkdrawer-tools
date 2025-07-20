# backend/llms_processor.py
"""
Main processing orchestrator for LLMS File Builder
Supports both URL input and CSV processing with progress tracking
"""
import logging
from typing import Dict, Optional, Callable
from pathlib import Path
import time
import tempfile

from .csv_processor import CSVProcessor
from .url_processor import URLProcessor
from .categorizer import Categorizer
from .llms_generator import LLMSGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class LLMSProcessor:
    """Main orchestrator for LLMS file generation with progress tracking"""
    
    def __init__(self, 
                 output_dir: Optional[str] = None,
                 use_gpt: bool = False,
                 api_key: Optional[str] = None):
        self.output_dir = output_dir or tempfile.mkdtemp()
        self.use_gpt = use_gpt
        self.api_key = api_key
        
        logger.info(f"Initializing LLMSProcessor with use_gpt={use_gpt}")
        
        # Initialize components
        self.csv_processor = None
        self.url_processor = None
        self.categorizer = Categorizer(use_gpt=use_gpt, api_key=api_key)
        self.generator = LLMSGenerator(output_dir=self.output_dir)
        
        # Store results for access
        self.results = {}
        
        logger.info(f"LLMSProcessor initialized successfully")
    
    def process_file(self, 
                    csv_path: str,
                    preview_only: bool = False,
                    custom_filename: Optional[str] = None,
                    force_processing: bool = False) -> Dict:
        """
        Original processing method for backwards compatibility
        """
        return self.process_file_with_progress(
            csv_path=csv_path,
            preview_only=preview_only,
            custom_filename=custom_filename,
            force_processing=force_processing,
            progress_callback=None,
            row_limit=None
        )
    
    def process_file_with_progress(self, 
                                  csv_path: str,
                                  preview_only: bool = False,
                                  custom_filename: Optional[str] = None,
                                  force_processing: bool = False,
                                  progress_callback: Optional[Callable[[int, int, str], None]] = None,
                                  row_limit: Optional[int] = None) -> Dict:
        """
        Main processing pipeline with progress tracking and row limits
        
        Args:
            csv_path: Path to CSV export
            preview_only: If True, only generate preview without saving
            custom_filename: Custom output filename (without extension)
            force_processing: If True, process even with quality issues
            progress_callback: Function to call with progress updates (current, total, status)
            row_limit: Maximum number of rows to process (for freemium limits)
            
        Returns:
            Dictionary with results and status
        """
        def update_progress(current: int, total: int, status: str):
            """Helper to update progress"""
            if progress_callback:
                progress_callback(current, total, status)
            logger.info(f"Progress: {current}/{total} - {status}")
        
        try:
            # Step 1: Initialize CSV processor
            update_progress(1, 8, "Initializing CSV processor...")
            self.csv_processor = CSVProcessor(csv_path)
            time.sleep(0.1)  # Small delay for UI feedback
            
            # Step 2: Process CSV
            update_progress(2, 8, "Loading and validating CSV...")
            processed_data = self.csv_processor.process()
            time.sleep(0.1)
            
            pages = processed_data['pages']
            site_metadata = processed_data['site_metadata']
            stats = processed_data['stats']
            
            # Apply row limit if specified
            if row_limit and len(pages) > row_limit:
                logger.info(f"Applying row limit: {row_limit} (original: {len(pages)})")
                pages = pages[:row_limit]
                
                # Update stats to reflect the limit
                stats['unique_pages'] = len(pages)
                stats['row_limit_applied'] = row_limit
                stats['original_page_count'] = len(processed_data['pages'])
                
                update_progress(3, 8, f"Applied row limit: processing {row_limit} pages...")
            else:
                update_progress(3, 8, f"Processing {len(pages)} pages...")
            
            time.sleep(0.1)
            
            # Step 3: Start categorization
            update_progress(4, 8, "Categorizing pages...")
            logger.info(f"Found {len(pages)} pages to categorize")
            
            # Step 4: Pattern-based categorization
            update_progress(5, 8, "Applying categorization patterns...")
            categorized = self.categorizer.categorize_pages(pages, site_metadata)
            time.sleep(0.1)
            
            # Step 5: AI Enhancement (if enabled)
            if self.use_gpt:
                update_progress(6, 8, "Enhancing content with AI...")
                # The AI enhancement happens inside categorize_pages
                # This is just for progress feedback
                time.sleep(0.5)  # Give time for AI processing
            else:
                update_progress(6, 8, "Skipping AI enhancement...")
                time.sleep(0.1)
            
            # Log category distribution
            for category, items in categorized.items():
                enhanced_count = sum(1 for page in items if page.get('enhanced', False))
                logger.info(f"  {category}: {len(items)} pages ({enhanced_count} enhanced)")
            
            # Step 7: Generate output
            update_progress(7, 8, "Generating LLMS.txt output...")
            
            if preview_only:
                preview = self.generator.preview(site_metadata, categorized)
                update_progress(8, 8, "Preview generated successfully!")
                
                self.results = {
                    'success': True,
                    'preview': preview,
                    'stats': stats,
                    'categories': {k: len(v) for k, v in categorized.items()}
                }
            else:
                # Determine filename
                filename = custom_filename or Path(csv_path).stem
                
                # Save files
                save_results = self.generator.save_files(
                    site_metadata,
                    categorized,
                    stats,
                    filename_prefix=filename
                )
                
                update_progress(8, 8, "Files saved successfully!")
                
                self.results = {
                    'success': True,
                    'files': save_results,
                    'stats': stats,
                    'categories': {k: len(v) for k, v in categorized.items()},
                    'validation_issues': save_results.get('validation_issues', [])
                }
            
            return self.results
            
        except Exception as e:
            logger.error(f"Processing failed: {str(e)}")
            
            # Update progress with error
            if progress_callback:
                progress_callback(0, 8, f"Error: {str(e)}")
            
            self.results = {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__
            }
            return self.results
    
    def get_sample_data(self, n: int = 5) -> Optional[Dict]:
        """Get sample of processed data"""
        if self.csv_processor and self.csv_processor.processed_data:
            return {
                'sample_pages': self.csv_processor.get_sample_data(n),
                'site_metadata': self.csv_processor.processed_data.get('site_metadata', {})
            }
        return None
    
    def validate_csv(self, csv_path: str) -> Dict:
        """Validate CSV file before processing"""
        try:
            processor = CSVProcessor(csv_path)
            
            # Check file
            valid, error = processor.validate_file()
            if not valid:
                return {'valid': False, 'error': error}
            
            # Load and check columns
            processor.load_csv()
            valid, missing = processor.validate_columns()
            
            if not valid:
                return {
                    'valid': False,
                    'error': f"Missing columns: {', '.join(missing)}",
                    'available_columns': list(processor.df.columns)
                }
            
            # Get quality analysis
            analysis = processor.analyze_csv_quality(processor.df)
            
            return {
                'valid': True,
                'total_rows': len(processor.df),
                'file_size_mb': Path(csv_path).stat().st_size / (1024 * 1024),
                'analysis': analysis
            }
            
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    def estimate_processing_time(self, row_count: int, use_gpt: bool = False) -> str:
        """Estimate processing time based on row count"""
        if use_gpt:
            # With AI enhancement: ~0.5 seconds per page
            seconds = row_count * 0.5
        else:
            # Without AI: ~0.1 seconds per page
            seconds = row_count * 0.1
        
        if seconds < 60:
            return f"~{int(seconds)} seconds"
        elif seconds < 3600:
            return f"~{int(seconds/60)} minutes"
        else:
            return f"~{int(seconds/3600)} hours"
    
    # NEW URL PROCESSING METHODS
    
    def validate_url(self, url: str) -> Dict:
        """Validate URL format and accessibility"""
        try:
            from urllib.parse import urlparse
            import requests
            
            parsed = urlparse(url)
            
            if not parsed.scheme in ['http', 'https']:
                return {'valid': False, 'error': 'URL must start with http:// or https://'}
            
            if not parsed.netloc:
                return {'valid': False, 'error': 'Invalid URL format'}
            
            # Quick accessibility check
            try:
                response = requests.head(url, timeout=10, allow_redirects=True)
                if response.status_code >= 400:
                    return {'valid': False, 'error': f'Website returned status code {response.status_code}'}
            except requests.exceptions.RequestException as e:
                return {'valid': False, 'error': f'Cannot access website: {str(e)}'}
            
            return {'valid': True}
            
        except Exception as e:
            return {'valid': False, 'error': f'URL validation error: {str(e)}'}
    
    def process_url(self, 
                   url: str, 
                   max_pages: int = 100,
                   custom_filename: str = "LLMS",
                   progress_callback: Optional[Callable] = None) -> Dict:
        """Main processing method for URL input"""
        
        def update_progress(current: int, total: int, status: str):
            """Helper to update progress"""
            if progress_callback:
                progress_callback(current, total, status)
            logger.info(f"Progress: {current}/{total} - {status}")
        
        try:
            # Validate URL first
            update_progress(1, 8, "Validating URL...")
            validation = self.validate_url(url)
            if not validation['valid']:
                return {'success': False, 'error': validation['error']}
            
            # Initialize URL processor
            update_progress(2, 8, "Initializing website crawler...")
            self.url_processor = URLProcessor(url, max_pages=max_pages, delay=1.0)
            
            # Process website
            update_progress(3, 8, "Crawling website...")
            
            def crawler_progress(current, total, status):
                # Map crawler progress to steps 3-5
                progress = 3 + int((current / total) * 2) if total > 0 else 3
                update_progress(progress, 8, status)
            
            processed_data = self.url_processor.process_website(progress_callback=crawler_progress)
            
            if not processed_data['pages']:
                return {'success': False, 'error': 'No valid pages found on the website'}
            
            # Categorize pages
            update_progress(6, 8, "Categorizing pages...")
            categorized_pages = self.categorizer.categorize_pages(
                processed_data['pages'], 
                processed_data['site_metadata']
            )
            
            # Generate LLMS files
            update_progress(7, 8, "Generating LLMS.txt files...")
            files = self.generator.save_files(
                processed_data['site_metadata'],
                categorized_pages,
                processed_data['stats'],
                filename_prefix=custom_filename
            )
            
            # Calculate category counts
            categories = {category: len(pages) for category, pages in categorized_pages.items()}
            
            update_progress(8, 8, "Complete!")
            
            self.results = {
                'success': True,
                'files': files,
                'stats': processed_data['stats'],
                'categories': categories,
                'site_metadata': processed_data['site_metadata'],
                'validation_issues': files.get('validation_issues', [])
            }
            
            return self.results
            
        except Exception as e:
            logger.error(f"URL processing failed: {str(e)}")
            
            if progress_callback:
                progress_callback(0, 8, f"Error: {str(e)}")
            
            return {'success': False, 'error': str(e)}
    
    def preview_url(self, url: str, max_pages: int = 20) -> Dict:
        """Generate a preview of what would be processed from URL"""
        try:
            validation = self.validate_url(url)
            if not validation['valid']:
                return {'success': False, 'error': validation['error']}
            
            # Quick preview with limited pages
            url_processor = URLProcessor(url, max_pages=max_pages, delay=0.5)
            processed_data = url_processor.process_website()
            
            if not processed_data['pages']:
                return {'success': False, 'error': 'No valid pages found'}
            
            # Quick categorization without GPT
            categorizer = Categorizer(use_gpt=False)
            categorized_pages = categorizer.categorize_pages(
                processed_data['pages'][:10],  # Limit for preview
                processed_data['site_metadata']
            )
            
            # Generate preview
            preview_content = self.generator.preview(
                processed_data['site_metadata'],
                categorized_pages,
                max_lines=30
            )
            
            return {
                'success': True,
                'preview': preview_content,
                'stats': {
                    'total_pages_found': len(processed_data['pages']),
                    'preview_pages': min(10, len(processed_data['pages']))
                },
                'categories': {cat: len(pages) for cat, pages in categorized_pages.items()}
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}