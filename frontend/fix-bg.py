import re

filepath = 'src/pages/BeginnerGrammar.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# I will find the exact duplicate block and remove it.
# The error was caused by the `targetContent` matching both the top and some other part, or the replacement duplicating stuff.
# Actually, the file has a duplicated block:
#     return null;
#   }, [renderCategories]);
#     ...category,
#     topics: category.topics.map((topic) => {

bad_block = """    return null;
  }, [renderCategories]);
    ...category,
    topics: category.topics.map((topic) => {
      const isCompleted = completedTopics.includes(topic.id);
      return {
        ...topic,
        progress: isCompleted ? 100 : 0,
        isLocked: false, // For demo, let's unlock all or keep original logic
      };
    }),
  }));"""

good_block = """    return null;
  }, [renderCategories]);"""

if bad_block in content:
    content = content.replace(bad_block, good_block)
else:
    print("bad_block not found precisely, using regex")
    content = re.sub(
        r'return null;\s*\}, \[renderCategories\]\);\s*\.\.\.category,[\s\S]*?\}\),\s*\}\)\);',
        'return null;\n  }, [renderCategories]);',
        content
    )

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
