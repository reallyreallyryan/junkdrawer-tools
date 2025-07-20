# backend/csv_processor.py
"""
CSV processing for generic websites
Based on the working medical tool, adapted for any industry
"""
import pandas as pd
import os
import re
from typing import Dict, List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class CSVProcessor:
    """Process and validate website CSV exports"""
    
    REQUIRED_COLUMNS = [
        'Address', 
        'Status Code', 
        'Indexability',
        'Title 1',
        'Meta Description 1'
    ]
    
    OPTIONAL_COLUMNS = [
        'H1-1',
        'Word Count',
        'Crawl Depth',
        'Content Type'
    ]
    
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.df = None
        self.processed_data = None
        
    def validate_file(self) -> Tuple[bool, Optional[str]]:
        """Validate CSV file exists and is readable"""
        if not os.path.exists(self.csv_path):
            return False, f"File not found: {self.csv_path}"
        
        if not self.csv_path.lower().endswith('.csv'):
            return False, "File must be a CSV"
        
        # Check file size (warn if > 200MB)
        file_size_mb = os.path.getsize(self.csv_path) / (1024 * 1024)
        if file_size_mb > 200:
            logger.warning(f"Large file detected: {file_size_mb:.1f}MB. Processing may be slow.")
        
        return True, None
    
    def load_csv(self, chunk_size: Optional[int] = None) -> pd.DataFrame:
        """Load CSV with proper error handling"""
        try:
            if chunk_size:
                # For very large files, return an iterator
                return pd.read_csv(
                    self.csv_path,
                    chunksize=chunk_size,
                    encoding='utf-8',
                    low_memory=False
                )
            else:
                self.df = pd.read_csv(
                    self.csv_path,
                    encoding='utf-8',
                    low_memory=False
                )
                return self.df
        except UnicodeDecodeError:
            # Try with different encoding
            self.df = pd.read_csv(
                self.csv_path,
                encoding='latin-1',
                low_memory=False
            )
            return self.df
        except pd.errors.EmptyDataError:
            raise ValueError("CSV file is empty")
        except Exception as e:
            raise ValueError(f"Error reading CSV: {str(e)}")
    
    def validate_columns(self) -> Tuple[bool, List[str]]:
        """Check if required columns exist"""
        if self.df is None:
            return False, ["DataFrame not loaded"]
        
        missing_columns = []
        for col in self.REQUIRED_COLUMNS:
            if col not in self.df.columns:
                missing_columns.append(col)
        
        if missing_columns:
            return False, missing_columns
        
        return True, []
    
    def analyze_csv_quality(self, df: pd.DataFrame) -> Dict:
        """Analyze if the CSV appears to be properly filtered"""
        
        total_rows = len(df)
        
        # Pattern for non-content files
        non_content_pattern = r'\.(jpg|jpeg|png|gif|webp|svg|ico|css|js|json|xml|pdf|woff|woff2|ttf|eot|mp4|mp3|zip)(\?|$)'
        
        non_content_count = df['Address'].str.contains(non_content_pattern, regex=True, na=False, case=False).sum()
        empty_titles = (df['Title 1'].isna() | (df['Title 1'].str.strip() == '')).sum()
        
        non_content_percentage = (non_content_count / total_rows * 100) if total_rows > 0 else 0
        
        issues = []
        if non_content_count > 0:
            issues.append(f"{non_content_count} non-content files found")
        if empty_titles > total_rows * 0.2:
            issues.append(f"{empty_titles} pages with empty titles")
        
        # Quality score
        quality_score = 100
        quality_score -= min(50, non_content_percentage)
        quality_score -= min(30, (empty_titles / total_rows * 30)) if total_rows > 0 else 0
        
        return {
            'total_urls': total_rows,
            'non_content_count': non_content_count,
            'empty_titles': empty_titles,
            'non_content_percentage': non_content_percentage,
            'quality_score': max(0, quality_score),
            'issues': issues,
            'appears_filtered': non_content_percentage < 5
        }
    
    def filter_content_pages(self, df: pd.DataFrame) -> pd.DataFrame:
        """Filter out non-content pages like images, CSS, JS files"""
        
        # Define file extensions to exclude
        non_content_extensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
            '.css', '.js', '.json', '.xml', '.pdf', 
            '.woff', '.woff2', '.ttf', '.eot',
            '.mp4', '.mp3', '.avi', '.mov',
            '.zip', '.tar', '.gz'
        ]
        
        # Create pattern for exclusion
        pattern = '|'.join([f'{ext}' for ext in non_content_extensions])
        
        # Filter out URLs ending with these extensions
        mask = ~df['Address'].str.lower().str.contains(pattern, regex=True, na=False)
        
        # Filter out common CMS junk pages
        cms_junk_patterns = [
            r'/tag/',
            r'/category/', 
            r'/author/',
            r'/page/\d+',  # Pagination
            r'/\d{4}/\d{2}/',  # Date archives like /2024/05/
            r'/feed/',
            r'/wp-',  # WordPress system pages
            r'/admin/',  # Admin pages
            r'/api/',    # API endpoints
        ]
        
        # Apply CMS filters
        for pattern in cms_junk_patterns:
            mask = mask & ~df['Address'].str.contains(pattern, regex=True, na=False)
        
        filtered_df = df[mask].copy()
        
        # Also filter out pages with empty titles (likely non-content)
        filtered_df = filtered_df[
            (filtered_df['Title 1'].notna()) & 
            (filtered_df['Title 1'].str.strip() != '')
        ]
        
        logger.info(f"Filtered from {len(df)} to {len(filtered_df)} content pages")
        
        return filtered_df
    
    def filter_indexable_pages(self) -> pd.DataFrame:
        """Filter to only indexable, 200-status pages"""
        if self.df is None:
            raise ValueError("DataFrame not loaded")
        
        # Apply filters
        filtered = self.df[
            (self.df['Status Code'] == 200) &
            (self.df['Indexability'] == 'Indexable')
        ].copy()
        
        # Fill NaN values
        filtered = filtered.fillna("")
        
        logger.info(f"Filtered from {len(self.df)} to {len(filtered)} indexable pages")
        
        return filtered
    
    def deduplicate_urls(self, df: pd.DataFrame) -> pd.DataFrame:
        """Remove duplicate URLs and duplicate titles, keeping best version"""
        # First, normalize URLs (remove trailing slashes)
        df['normalized_url'] = df['Address'].str.rstrip('/').str.strip()
        
        # Drop URL duplicates
        df = df.drop_duplicates(subset=['normalized_url'], keep='first')
        logger.info(f"After URL deduplication: {len(df)} pages")
        
        # Handle title duplicates more intelligently
        title_duplicates = df[df.duplicated(subset=['Title 1'], keep=False)].copy()
        
        if len(title_duplicates) > 0:
            # Group by title
            title_groups = title_duplicates.groupby('Title 1')
            
            indices_to_drop = []
            
            for title, group in title_groups:
                if len(group) > 1:
                    # Sort by criteria to keep the best page:
                    # 1. Prefer service pages over location pages
                    # 2. Prefer pages with longer, more specific URLs
                    # 3. Prefer pages with meta descriptions
                    
                    group['priority'] = 0
                    
                    # Scoring system
                    for idx, row in group.iterrows():
                        url = row['Address'].lower()
                        
                        # Service pages get highest priority
                        if '/services/' in url:
                            group.at[idx, 'priority'] = 10
                        # Product pages also get high priority
                        elif '/products/' in url:
                            group.at[idx, 'priority'] = 9
                        # Resource pages get medium priority
                        elif '/resources/' in url or '/blog/' in url:
                            group.at[idx, 'priority'] = 8
                        # About pages get medium priority
                        elif '/about/' in url:
                            group.at[idx, 'priority'] = 7
                        
                        # Add points for having a description
                        if row['Meta Description 1']:
                            group.at[idx, 'priority'] += 2
                        
                        # Add points for URL specificity (more segments = more specific)
                        url_depth = len([s for s in url.split('/') if s])
                        group.at[idx, 'priority'] += url_depth * 0.5
                    
                    # Keep the highest priority page
                    best_idx = group['priority'].idxmax()
                    drop_indices = [idx for idx in group.index if idx != best_idx]
                    indices_to_drop.extend(drop_indices)
                    
                    logger.info(f"Duplicate '{title}': keeping {group.loc[best_idx, 'Address']}")
            
            # Drop the duplicates
            if indices_to_drop:
                df = df.drop(indices_to_drop)
                logger.info(f"Removed {len(indices_to_drop)} duplicate titles")
        
        logger.info(f"After title deduplication: {len(df)} pages")
        
        return df
    
    def extract_site_metadata(self, df: pd.DataFrame) -> Dict[str, str]:
        """Extract site-level metadata from homepage"""
        # Look for homepage
        homepage_candidates = df[df['Address'].str.match(r'^https?://[^/]+/?$')]
        
        if not homepage_candidates.empty:
            homepage = homepage_candidates.iloc[0]
        else:
            # Fallback to first row
            homepage = df.iloc[0]
        
        return {
            'site_title': homepage.get('Title 1', 'Website').strip(),
            'site_summary': homepage.get('Meta Description 1', '').strip(),
            'site_url': homepage.get('Address', '').strip()
        }
    
    def process(self) -> Dict:
        """Main processing pipeline"""
        # Validate file
        valid, error = self.validate_file()
        if not valid:
            raise ValueError(error)
        
        # Load CSV
        self.load_csv()
        
        # Validate columns
        valid, missing = self.validate_columns()
        if not valid:
            raise ValueError(f"Missing required columns: {', '.join(missing)}")
        
        # Analyze quality before filtering
        quality_analysis = self.analyze_csv_quality(self.df)
        
        # Filter and clean
        filtered_df = self.filter_indexable_pages()
        
        # Additional content filtering
        filtered_df = self.filter_content_pages(filtered_df)
        
        # Remove duplicates (both URL and title based)
        deduped_df = self.deduplicate_urls(filtered_df)
        
        # Extract metadata
        site_metadata = self.extract_site_metadata(deduped_df)
        
        # Prepare processed data
        self.processed_data = {
            'pages': deduped_df.to_dict('records'),
            'site_metadata': site_metadata,
            'stats': {
                'total_rows': len(self.df),
                'indexable_pages': len(filtered_df),
                'unique_pages': len(deduped_df),
                'quality_analysis': quality_analysis
            }
        }
        
        return self.processed_data
    
    def get_sample_data(self, n: int = 5) -> List[Dict]:
        """Get sample of processed pages for preview"""
        if not self.processed_data:
            raise ValueError("Data not processed yet")
        
        pages = self.processed_data['pages']
        return pages[:min(n, len(pages))]