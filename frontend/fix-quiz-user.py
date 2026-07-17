import os

def fix_quiz():
    filepath = 'src/services/quizService.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    target = """const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_URL}/api${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};"""
    replacement = """const fetchApi = async (endpoint: string, options: any = {}) => {
  const method = options.method || "GET";
  const data = options.body ? JSON.parse(options.body) : undefined;
  
  const response = await axiosInstance({
    url: `/api${endpoint}`,
    method,
    data,
  });

  return response.data;
};"""

    content = content.replace(target, replacement)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)


def fix_user():
    filepath = 'src/services/userService.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    target = """const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};"""
    replacement = """const fetchApi = async (endpoint: string, options: any = {}) => {
  const method = options.method || "GET";
  const data = options.body ? JSON.parse(options.body) : undefined;
  
  const response = await axiosInstance({
    url: `/api${endpoint}`,
    method,
    data,
  });

  return response.data;
};"""

    if "import axiosInstance" not in content:
        content = 'import axiosInstance from "./axiosConfig";\n' + content

    content = content.replace(target, replacement)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_quiz()
fix_user()
print("Fixed quizService and userService")
