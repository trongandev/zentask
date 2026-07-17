import re
import sys

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Import
    content = re.sub(r'import toastService from .*?;\s*\nconst API_URL = import\.meta\.env\.VITE_API_BACKEND;', 'import axiosInstance from "./axiosConfig";', content)

    # get requests
    content = re.sub(r'try \{\s*const res = await fetch\(`\$\{API_URL\}(.*?)`, \{.*?credentials: "include".*?\}\);\s*if \(\!res\.ok\) throw new Error\(.*?\);\s*(const data = )?await res\.json\(\);\s*(return data.*?;\s*)?\} catch \(error: any\) \{\s*toastService\.error\(error\.message\);\s*return .*?;\s*\}', 
    lambda m: f'const res = await axiosInstance.get(`{m.group(1)}`);\n    return res.data;', content, flags=re.DOTALL)
    
    # get requests single line options
    content = re.sub(r'try \{\s*const res = await fetch\(`\$\{API_URL\}(.*?)`\);\s*if \(\!res\.ok\) throw new Error\(.*?\);\s*return await res\.json\(\);\s*\} catch \(error: any\) \{\s*toastService\.error\(error\.message\);\s*return .*?;\s*\}', 
    lambda m: f'const res = await axiosInstance.get(`{m.group(1)}`);\n    return res.data;', content, flags=re.DOTALL)
    
    # Delete requests
    content = re.sub(r'try \{\s*const res = await fetch\(`\$\{API_URL\}(.*?)`, \{\s*method: "DELETE",\s*credentials: "include".*?\}\);\s*if \(\!res\.ok\) throw new Error\(.*?\);\s*(toastService\.success\(.*?\);\s*)?return (true|false|await res\.json\(\));\s*\} catch \(error: any\) \{\s*(toastService\.error\(error\.message\);\s*)?return .*?;\s*\}', 
    lambda m: f'await axiosInstance.delete(`{m.group(1)}`);\n    return true;' if m.group(3) in ['true', 'false'] else f'const res = await axiosInstance.delete(`{m.group(1)}`);\n    return res.data;', content, flags=re.DOTALL)
    
    # Put requests
    content = re.sub(r'try \{\s*const res = await fetch\(`\$\{API_URL\}(.*?)`, \{\s*method: "PUT",\s*headers: \{ "Content-Type": "application/json" \},\s*body: JSON\.stringify\((.*?)\),\s*credentials: "include",?\s*\}\);\s*if \(\!res\.ok\) throw new Error\(.*?\);\s*(toastService\.success\(.*?\);\s*)?return (true|false|await res\.json\(\));\s*\} catch \(error: any\) \{\s*(toastService\.error\(error\.message\);\s*)?return .*?;\s*\}', 
    lambda m: f'await axiosInstance.put(`{m.group(1)}`, {m.group(2)});\n    return true;' if m.group(4) in ['true', 'false'] else f'const res = await axiosInstance.put(`{m.group(1)}`, {m.group(2)});\n    return res.data;', content, flags=re.DOTALL)
    
    # Post requests body include
    content = re.sub(r'try \{\s*const res = await fetch\(`\$\{API_URL\}(.*?)`, \{\s*method: "POST",\s*headers: \{ "Content-Type": "application/json" \},\s*credentials: "include",\s*body: JSON\.stringify\((.*?)\),?\s*\}\);\s*if \(\!res\.ok\) throw new Error\(.*?\);\s*(toastService\.success\(.*?\);\s*)?return (true|false|await res\.json\(\));\s*\} catch \(error: any\) \{\s*(toastService\.error\(error\.message\);\s*)?return .*?;\s*\}', 
    lambda m: f'await axiosInstance.post(`{m.group(1)}`, {m.group(2)});\n    return true;' if m.group(4) in ['true', 'false'] else f'const res = await axiosInstance.post(`{m.group(1)}`, {m.group(2)});\n    return res.data;', content, flags=re.DOTALL)
    
    # Post requests body before credentials
    content = re.sub(r'try \{\s*const res = await fetch\(`\$\{API_URL\}(.*?)`, \{\s*method: "POST",\s*headers: \{ "Content-Type": "application/json" \},\s*body: JSON\.stringify\((.*?)\),\s*credentials: "include",?\s*\}\);\s*if \(\!res\.ok\) throw new Error\(.*?\);\s*(toastService\.success\(.*?\);\s*)?return (true|false|await res\.json\(\));\s*\} catch \(error: any\) \{\s*(toastService\.error\(error\.message\);\s*)?return .*?;\s*\}', 
    lambda m: f'await axiosInstance.post(`{m.group(1)}`, {m.group(2)});\n    return true;' if m.group(4) in ['true', 'false'] else f'const res = await axiosInstance.post(`{m.group(1)}`, {m.group(2)});\n    return res.data;', content, flags=re.DOTALL)

    # Post requests trigger without body
    content = re.sub(r'try \{\s*const res = await fetch\(`\$\{API_URL\}(.*?)`, \{\s*method: "POST",\s*credentials: "include",?\s*\}\);\s*if \(\!res\.ok\) \{.*?\throw new Error.*?\};\s*(toastService\.success\(.*?\);\s*)?return (true|false|await res\.json\(\));\s*\} catch \(error: any\) \{\s*(toastService\.error\(error\.message\);\s*)?throw error;\s*\}', 
    lambda m: f'await axiosInstance.post(`{m.group(1)}`);\n    return true;' if m.group(3) in ['true', 'false'] else f'const res = await axiosInstance.post(`{m.group(1)}`);\n    return res.data;', content, flags=re.DOTALL)

    # Save bot config
    content = re.sub(r'saveBotConfig: async \(config: any\) => \{.*?\} catch \(error: any\) \{\s*throw error;\s*\}', 
    'saveBotConfig: async (config: any) => {\n    const id = config.id || config._id;\n    if (id) {\n      const res = await axiosInstance.put(`/api/admin/bot-config/${id}`, config);\n      return res.data;\n    } else {\n      const res = await axiosInstance.post(`/api/admin/bot-config`, config);\n      return res.data;\n    }', content, flags=re.DOTALL)

    # Bot configs missing
    content = re.sub(r'deleteBotConfig: async \(id: string\) => \{.*?\} catch \(error: any\) \{\s*throw error;\s*\}',
    'deleteBotConfig: async (id: string) => {\n    await axiosInstance.delete(`/api/admin/bot-config/${id}`);\n    return true;', content, flags=re.DOTALL)
    
    # Catch stray gets
    content = re.sub(r'try \{\s*let url = `\$\{API_URL\}(.*?)`;\s*if \(level\) url \+= `&level=\$\{level\}`;\s*if \(filter\) url \+= `&filter=\$\{filter\}`;\s*const res = await fetch\(url, \{ credentials: "include" \}\);\s*if \(\!res\.ok\) throw new Error\(.*?\);\s*return await res\.json\(\);\s*\} catch \(error: any\) \{\s*toastService\.error\(error\.message\);\s*return .*?;\s*\}',
    r'''let url = `\1`;
    if (level) url += `&level=${level}`;
    if (filter) url += `&filter=${filter}`;
    const res = await axiosInstance.get(url);
    return res.data;''', content, flags=re.DOTALL)


    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

process_file('src/services/adminService.tsx')
