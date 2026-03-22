import re

with open(r'd:\TruHack2026\screen.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract inner body tag
body_match = re.search(r'<body[^>]*>(.*?)</body>', html, re.DOTALL)
if body_match:
    body_content = body_match.group(1)
else:
    body_content = html

# Replace class= with className=
jsx = body_content.replace('class=', 'className=')

# Replace inline style objects correctly
jsx = jsx.replace('style="font-variation-settings: \'FILL\' 1;"', "style={{ fontVariationSettings: \"'FILL' 1\" }}")

# Ensure self-closing tags are closed
# In regex, we find tags like <input ... > and replace with <input ... />
tags_to_close = ['input', 'img', 'hr', 'br', 'source']
for t in tags_to_close:
    jsx = re.sub(r'<(%s)\b([^>]*?)(?<!/)>' % t, r'<\1\2 />', jsx, flags=re.IGNORECASE)

# Remove HTML comments to avoid JSX parsing issues
jsx = re.sub(r'<!--(.*?)-->', '', jsx, flags=re.DOTALL)

# Create the top level react component
react_code = f"""import React from 'react';

export default function LandingPage() {{
  return (
    <div className="bg-[#060e20] text-[#dee5ff] w-full h-screen overflow-hidden">
      {{/* The converted output from screen.html */}}
      {jsx}
    </div>
  );
}}
"""

with open(r'd:\TruHack2026\frontend\src\pages\LandingPage.jsx', 'w', encoding='utf-8') as f:
    f.write(react_code)
