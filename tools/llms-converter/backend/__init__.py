# backend/__init__.py
"""
LLMS File Builder Backend
Based on the working medical tool, adapted for generic use
"""
from .llms_processor import LLMSProcessor
from .csv_processor import CSVProcessor
from .categorizer import Categorizer
from .llms_generator import LLMSGenerator

__all__ = [
    'LLMSProcessor',
    'CSVProcessor', 
    'Categorizer',
    'LLMSGenerator'
]

__version__ = "1.0.0"