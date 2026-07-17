import re

filepath = 'src/services/flashcardService.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add axiosInstance import if not exists
if 'import axiosInstance' not in content:
    content = content.replace('import toastService from "@/src/services/toastService";', 
                              'import toastService from "@/src/services/toastService";\nimport axiosInstance from "./axiosConfig";')

# Replace get fetch calls
# `const res = await fetch(`${API_URL}/api/...`, { credentials: "include" });`
# to `const res = await axiosInstance.get(`/api/...`);`
content = re.sub(
    r'await fetch\(`\$\{API_URL\}(.*?)`, \{.*?credentials: "include".*?\}\)',
    r'await axiosInstance.get(`\1`)',
    content, flags=re.DOTALL
)

# Replace fetch calls with methods
# POST/PUT/PATCH/DELETE
def repl_method(m):
    url = m.group(1)
    opts = m.group(2)
    # Extract method
    method_match = re.search(r'method:\s*"([^"]+)"', opts)
    method = method_match.group(1).lower() if method_match else 'get'
    
    # Extract body
    body_match = re.search(r'body:\s*JSON\.stringify\((.*?)\)', opts)
    body = body_match.group(1) if body_match else None
    
    if body:
        return f'await axiosInstance.{method}(`{url}`, {body})'
    else:
        return f'await axiosInstance.{method}(`{url}`)'

content = re.sub(
    r'await fetch\(`\$\{API_URL\}(.*?)`, \{(.*?)\}\)',
    repl_method,
    content, flags=re.DOTALL
)

# Replace `await res.json()` with `res.data`
content = re.sub(
    r'await res\.json\(\)',
    r'res.data',
    content
)

# Replace `if (res.ok) { ... }` with just `{ ... }` or remove `if (res.ok)`
# Actually, we can just replace `if (res.ok)` with `if (res.data)` or just remove the if entirely if it's single line.
# Let's replace `if (!res.ok) throw new Error(...)` with nothing since axios throws automatically
content = re.sub(
    r'if \(!res\.ok\)\s*(?:return.*?|throw new Error\(.*?\));\n?',
    '',
    content
)

# Replace `if (res.ok) {` with `if (res) {`
content = content.replace('if (res.ok) {', 'if (res) {')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
