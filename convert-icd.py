# Fixed ICD-10 Converter for space-delimited format
# Save as convert-icd-fixed.py and run: python convert-icd-fixed.py

import json
import re

def convert_icd_file():
    codes = []
    
    print("📂 Reading icd10cm-codes-2026.txt...")
    
    with open('icd10cm-codes-2026.txt', 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f):
            # Skip empty lines
            line = line.strip()
            if not line:
                continue
            
            # The format appears to be: CODE[spaces]DESCRIPTION
            # ICD codes follow pattern: Letter + numbers (e.g., A000, M54.5)
            match = re.match(r'^([A-Z]\d+\.?\d*)\s+(.+)$', line)
            
            if match:
                code = match.group(1)
                description = match.group(2).strip()
                
                codes.append({
                    'code': code,
                    'description': description
                })
            
            # Show progress every 5000 lines
            if line_num % 5000 == 0 and line_num > 0:
                print(f"  Processed {line_num} lines... Found {len(codes)} codes so far")
    
    print(f"\n✅ Found {len(codes)} valid ICD-10 codes")
    
    # Show sample
    print("\n📋 Sample codes:")
    for code in codes[:10]:
        print(f"  {code['code']}: {code['description']}")
    
    # Add some fun easter eggs we can highlight
    print("\n🦆 Fun codes found:")
    fun_codes = [
        ('duck', '🦆'),
        ('turkey', '🦃'),
        ('orca', '🐋'),
        ('spacecraft', '🚀'),
        ('chicken', '🐔')
    ]
    
    for keyword, emoji in fun_codes:
        matches = [c for c in codes if keyword in c['description'].lower()]
        if matches:
            print(f"  {emoji} {matches[0]['code']}: {matches[0]['description']}")
    
    # Write JSON
    print("\n💾 Writing icd10-codes.json...")
    with open('icd10-codes.json', 'w', encoding='utf-8') as f:
        json.dump(codes, f, indent=2, ensure_ascii=False)
    
    file_size = len(json.dumps(codes)) / 1024 / 1024
    print(f"\n✨ Success! Created icd10-codes.json ({file_size:.2f} MB)")
    print(f"📊 Total codes: {len(codes)}")
    print(f"\n🚀 Your ICD-10 finder is ready to use!")
    print(f"   Just put icd10-codes.json in the same folder as your HTML file")

if __name__ == "__main__":
    try:
        convert_icd_file()
    except FileNotFoundError:
        print("❌ Error: Could not find icd10cm-codes-2026.txt")
        print("Make sure the file is in the same directory as this script")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()