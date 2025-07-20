"""
Debug script for LLMS AI Enhancement Issues
Run this to find exactly where your AI enhancement is breaking
"""
import os
import json
import re
from dotenv import load_dotenv
from openai import OpenAI

# Load environment
load_dotenv()

def test_1_environment():
    """Test if environment is set up correctly"""
    print("🔍 TEST 1: Environment Setup")
    print("-" * 40)
    
    # Check for .env file
    if os.path.exists('.env'):
        print("✅ .env file found")
    else:
        print("❌ .env file not found")
        return False
    
    # Check API key
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        print(f"✅ OPENAI_API_KEY found: {api_key[:10]}...")
        return api_key
    else:
        print("❌ OPENAI_API_KEY not found in environment")
        return False

def test_2_openai_connection(api_key):
    """Test basic OpenAI connection"""
    print("\n🔍 TEST 2: OpenAI Connection")
    print("-" * 40)
    
    try:
        client = OpenAI(api_key=api_key)
        
        # Simple test call
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": "Say 'Connection successful'"}
            ],
            max_tokens=10
        )
        
        result = response.choices[0].message.content
        print(f"✅ API Response: {result}")
        return client
        
    except Exception as e:
        print(f"❌ API Error: {e}")
        return False

def test_3_enhancement_prompt(client):
    """Test the enhancement prompt with sample medical data"""
    print("\n🔍 TEST 3: Enhancement Prompt Test")
    print("-" * 40)
    
    # Sample medical pages like your tool would process
    sample_pages = [
        {
            'url': 'https://surgicalcenter.com/services/hernia-repair',
            'title': 'Hernia Repair',
            'description': 'We fix hernias at our center',
            'h1': 'Hernia Repair Surgery'
        },
        {
            'url': 'https://surgicalcenter.com/providers/dr-smith',
            'title': 'Dr. Smith | Surgeon',
            'description': 'Dr. Smith is a surgeon who does surgery',
            'h1': 'Dr. John Smith, MD'
        }
    ]
    
    site_metadata = {
        'site_title': 'Advanced Surgical Center',
        'site_summary': 'Leading surgical practice specializing in minimally invasive procedures'
    }
    
    # Use your exact prompt structure
    section = "Services"
    prompt = f"""You are optimizing content for AI search engines (ChatGPT, Claude, Perplexity) and LLMS.txt files.
Site: {site_metadata.get('site_title', '')}
Section: {section}

For each page below, provide an optimized title and description.

TITLE requirements:
- Clear and specific about the service/solution offered
- Optimized for AI search understanding  
- Concise but descriptive (under 60 characters when possible)
- Remove generic site branding or unnecessary words

DESCRIPTION requirements:
- 15-25 words stating the specific benefit or outcome
- Includes keywords AI would search for
- Specific, not generic

Pages:

1. Current Title: {sample_pages[0]['title']}
   Current Description: {sample_pages[0]['description']}
   URL: {sample_pages[0]['url']}

2. Current Title: {sample_pages[1]['title']}
   Current Description: {sample_pages[1]['description']}
   URL: {sample_pages[1]['url']}

Return ONLY a JSON array with enhanced titles and descriptions:
[{{"index": 1, "title": "...", "description": "..."}}, {{"index": 2, "title": "...", "description": "..."}}]

NO other text, NO trailing commas, NO truncation marks."""

    try:
        print("📝 Sending prompt to GPT...")
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an AI search optimization expert. Write complete, natural titles and descriptions without truncation marks."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=800
        )
        
        content = response.choices[0].message.content.strip()
        print(f"✅ Raw GPT Response:\n{content}")
        
        return content
        
    except Exception as e:
        print(f"❌ Enhancement prompt failed: {e}")
        return False

def test_4_json_parsing(gpt_response):
    """Test JSON parsing logic"""
    print("\n🔍 TEST 4: JSON Parsing")
    print("-" * 40)
    
    if not gpt_response:
        print("❌ No GPT response to parse")
        return False
    
    try:
        # Your exact parsing logic
        content = gpt_response.replace('```json', '').replace('```', '')
        
        # Find the JSON array
        start = content.find('[')
        end = content.rfind(']') + 1
        
        if start == -1 or end <= start:
            print("❌ No JSON array found in response")
            print(f"Content preview: {content[:200]}...")
            return False
        
        json_str = content[start:end]
        print(f"📋 Extracted JSON: {json_str}")
        
        # Clean common issues
        json_str = re.sub(r',\s*]', ']', json_str)
        json_str = re.sub(r',\s*}', '}', json_str)
        
        # Parse JSON
        parsed = json.loads(json_str)
        print(f"✅ Successfully parsed {len(parsed)} enhancements:")
        
        for item in parsed:
            print(f"  Index {item.get('index')}: {item.get('title')} - {item.get('description')}")
        
        return parsed
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing error: {e}")
        print(f"Problematic JSON: {json_str if 'json_str' in locals() else 'N/A'}")
        return False
    except Exception as e:
        print(f"❌ Parsing error: {e}")
        return False

def test_5_integration(client):
    """Test integration with your actual categorizer"""
    print("\n🔍 TEST 5: Integration Test")
    print("-" * 40)
    
    try:
        # Import your categorizer
        import sys
        sys.path.append('backend')
        from categorizer import Categorizer
        
        print("✅ Successfully imported Categorizer")
        
        # Create categorizer with GPT enabled
        categorizer = Categorizer(use_gpt=True, api_key=os.getenv("OPENAI_API_KEY"))
        print("✅ Categorizer initialized with GPT")
        
        # Test sample data
        sample_pages = [
            {
                'Address': 'https://surgicalcenter.com/services/hernia-repair',
                'Title 1': 'Hernia Repair',
                'Meta Description 1': 'We fix hernias at our center',
                'H1-1': 'Hernia Repair Surgery'
            }
        ]
        
        site_metadata = {
            'site_title': 'Advanced Surgical Center',
            'site_summary': 'Leading surgical practice'
        }
        
        print("📊 Testing categorization...")
        result = categorizer.categorize_pages(sample_pages, site_metadata)
        
        print(f"✅ Categorization completed!")
        print(f"Categories found: {list(result.keys())}")
        
        # Check if enhancement happened
        for category, pages in result.items():
            for page in pages:
                if page.get('enhanced', False):
                    print(f"✅ Found enhanced page: {page['title']}")
                    return True
        
        print("⚠️ No enhanced pages found - AI enhancement may not be working")
        return False
        
    except ImportError as e:
        print(f"❌ Cannot import categorizer: {e}")
        return False
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        return False

def test_6_streamlit_flags():
    """Check if Streamlit is passing the right flags"""
    print("\n🔍 TEST 6: Streamlit Configuration")
    print("-" * 40)
    
    print("🔍 Checking common issues:")
    print("1. In your Streamlit app, make sure use_gpt checkbox is checked")
    print("2. Verify the LLMSProcessor is initialized with use_gpt=True")
    print("3. Check that the API key is being passed correctly")
    
    # Show them exactly what to check
    print("\n📋 What to verify in app.py:")
    print("```python")
    print("use_gpt = st.checkbox('✨ Enhance with AI', value=True)  # Should be True")
    print("processor = LLMSProcessor(use_gpt=use_gpt)  # Should pass the flag")
    print("```")

def run_all_tests():
    """Run all debug tests"""
    print("🚀 LLMS AI Enhancement Debug Tool")
    print("=" * 50)
    
    # Test 1: Environment
    api_key = test_1_environment()
    if not api_key:
        print("\n❌ Environment setup failed. Fix your .env file first.")
        return
    
    # Test 2: OpenAI Connection
    client = test_2_openai_connection(api_key)
    if not client:
        print("\n❌ OpenAI connection failed. Check your API key and credits.")
        return
    
    # Test 3: Enhancement Prompt
    gpt_response = test_3_enhancement_prompt(client)
    if not gpt_response:
        print("\n❌ Enhancement prompt failed.")
        return
    
    # Test 4: JSON Parsing
    parsed_result = test_4_json_parsing(gpt_response)
    if not parsed_result:
        print("\n❌ JSON parsing failed.")
        return
    
    # Test 5: Integration
    integration_success = test_5_integration(client)
    
    # Test 6: Streamlit Config
    test_6_streamlit_flags()
    
    # Summary
    print("\n" + "=" * 50)
    print("🎯 DEBUG SUMMARY")
    print("=" * 50)
    
    if integration_success:
        print("✅ All tests passed! Your AI enhancement should be working.")
        print("If it's not working in Streamlit, check the configuration flags.")
    else:
        print("⚠️ Basic GPT functionality works, but integration has issues.")
        print("Check your Streamlit app configuration and error handling.")
    
    print("\n💡 Next steps:")
    print("1. Fix any failed tests above")
    print("2. Run your Streamlit app with enhanced debugging")
    print("3. Check the browser console for errors")
    print("4. Verify the 'Enhance with AI' checkbox is checked")

if __name__ == "__main__":
    run_all_tests()