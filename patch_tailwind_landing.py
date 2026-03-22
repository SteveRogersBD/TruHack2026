import re
import json

colors = {
    "secondary-fixed": "#cbceff",
    "surface-variant": "#192540",
    "surface-dim": "#060e20",
    "surface-container-lowest": "#000000",
    "tertiary-dim": "#f271b5",
    "on-primary": "#00374d",
    "inverse-primary": "#00668b",
    "primary-fixed-dim": "#05a9e3",
    "primary": "#3bbffa",
    "surface-bright": "#1f2b49",
    "surface-tint": "#3bbffa",
    "outline": "#6d758c",
    "on-secondary-fixed": "#192490",
    "surface-container": "#0f1930",
    "error-container": "#9f0519",
    "error": "#ff716c",
    "on-primary-fixed": "#00121d",
    "on-tertiary-fixed-variant": "#73004b",
    "surface-container-high": "#141f38",
    "primary-container": "#22b1ec",
    "on-primary-container": "#002b3d",
    "secondary-container": "#2f3aa3",
    "surface-container-highest": "#192540",
    "on-tertiary-fixed": "#360021",
    "outline-variant": "#40485d",
    "inverse-on-surface": "#4d556b",
    "tertiary-container": "#f673b7",
    "surface": "#060e20",
    "on-primary-fixed-variant": "#003a50",
    "primary-fixed": "#2db7f2",
    "tertiary-fixed-dim": "#f976ba",
    "background": "#060e20",
    "on-background": "#dee5ff",
    "on-secondary-fixed-variant": "#3a45ad",
    "on-secondary": "#000974",
    "secondary-dim": "#8a95ff",
    "on-surface": "#dee5ff",
    "secondary-fixed-dim": "#babfff",
    "on-tertiary": "#5f003e",
    "tertiary-fixed": "#ff8bc5",
    "error-dim": "#d7383b",
    "on-error-container": "#ffa8a3",
    "on-secondary-container": "#c9cdff",
    "on-error": "#490006",
    "on-surface-variant": "#a3aac4",
    "on-tertiary-container": "#4a002f",
    "secondary": "#8a95ff",
    "tertiary": "#ff86c3",
    "inverse-surface": "#faf8ff",
    "surface-container-low": "#091328"
}

# 1. Patch LandingPage.jsx to add 'landing-' prefix to color keys
with open(r'd:\TruHack2026\frontend\src\pages\LandingPage.jsx', 'r', encoding='utf-8') as f:
    landing = f.read()

def repl_color(m):
    prefix = m.group(1)   # e.g., 'text-', 'bg-', 'border-'
    color_name = m.group(2) # e.g., 'primary', 'surface'
    if color_name in colors:
        return f"{prefix}landing-{color_name}"
    return m.group(0)

# Match things like text-primary, bg-surface, border-outline-variant
# and text-primary/20 bg-surface-container/50 etc but only replace the color name
landing = re.sub(r'\b(text-|bg-|border-|ring-|shadow-)([a-z-]+)\b', repl_color, landing)

with open(r'd:\TruHack2026\frontend\src\pages\LandingPage.jsx', 'w', encoding='utf-8') as f:
    f.write(landing)

# 2. Patch tailwind.config.js
with open(r'd:\TruHack2026\frontend\tailwind.config.js', 'r', encoding='utf-8') as f:
    tw_config = f.read()

# Add our landing colors block in colors section
insert_idx = tw_config.find('colors: {') + len('colors: {')
colors_str = "\n        // --- Landing Page Specific Colors ---\n"
for k, v in colors.items():
    colors_str += f"        'landing-{k}': '{v}',\n"

tw_config = tw_config[:insert_idx] + colors_str + tw_config[insert_idx:]

with open(r'd:\TruHack2026\frontend\tailwind.config.js', 'w', encoding='utf-8') as f:
    f.write(tw_config)
