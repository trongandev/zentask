import os
import re

def fix_service(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'import axiosInstance' not in content:
        content = 'import axiosInstance from "./axiosConfig";\n' + content
        
    # Find the fetch call to extract the URL pattern
    fetch_match = re.search(r'fetch\(`\$\{API_URL\}([^`]+)`', content)
    url_pattern = fetch_match.group(1) if fetch_match else '/api${endpoint}'
    
    pattern = re.compile(
        r'(const fetchApi|async function request)\s*\(\s*endpoint:\s*string,\s*options:\s*RequestInit\s*=\s*\{\}\s*\)\s*(?:=>)?\s*\{.*?\}',
        re.DOTALL
    )

    def repl(m):
        name = m.group(1)
        is_arrow = '=>' in m.group(0)
        
        replacement = f"""{name}(endpoint: string, options: any = {{}}){" =>" if is_arrow else ""} {{
  const method = options.method || "GET";
  const data = options.body ? JSON.parse(options.body) : undefined;
  
  const response = await axiosInstance({{
    url: `{url_pattern}`,
    method,
    data,
  }});

  return response.data;
}}"""
        return replacement

    content = re.sub(pattern, repl, content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

files = [
    'src/services/notebookService.ts',
    'src/services/onboardingService.ts',
    'src/services/pronunciationService.ts',
    'src/services/friendsService.ts',
]

for file in files:
    if os.path.exists(file):
        fix_service(file)
        print("Fixed", file)
    else:
        print("Not found", file)
