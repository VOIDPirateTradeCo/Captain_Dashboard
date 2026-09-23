from pathlib import Path

p = Path(r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault\Developer_Brain\01_Projects\capta1n_orchestrat0r\dashboard\pirate_dashboard.html")
lines = p.read_text(encoding='utf-8', errors='ignore').splitlines()

# Remove duplicate/extra closing style tags and orphaned style content
# Line 181: first </style> - keep this
# Line 182: stray "        }" after first </style> - remove
# Lines 183-297: orphaned CSS outside style block - remove
# Line 298: second </style> - remove
remove_lines = set()

# Find the first </style> (line 181)
# Find the second </style> (line 298)
# Remove everything between them and the stray } on line 182

for i, line in enumerate(lines):
    stripped = line.strip()
    # Remove stray closing brace after first </style>
    if i == 181 and stripped == '}':
        remove_lines.add(i + 1)
    # Remove orphaned CSS lines between the two </style> tags
    if 182 <= i <= 296:
        remove_lines.add(i + 1)
    # Remove second </style>
    if i == 297 and stripped == '</style>':
        remove_lines.add(i + 1)

fixed = [line for idx, line in enumerate(lines, 1) if idx not in remove_lines]
p.write_text('\n'.join(fixed), encoding='utf-8')
print(f'Fixed: removed {len(remove_lines)} lines, {len(lines)} -> {len(fixed)}')
