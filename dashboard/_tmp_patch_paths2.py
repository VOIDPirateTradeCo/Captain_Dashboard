from pathlib import Path

# 1. generate_moon_phases.py - use script's own directory
p = Path('Obsidian_Vault/16_Cosmos_Library/08_Moon_Phase/generate_moon_phases.py')
text = p.read_text(encoding='utf-8')
old = "OUT_DIR = Path(r'C:\\Users\\kidsm\\Documents\\My docs\\VOID Pirate Trading Co\\Obsidian_Vault\\Developer_Brain\\16_Cosmos_Library\\08_Moon_Phase')"
new = "OUT_DIR = Path(__file__).resolve().parent"
text = text.replace(old, new)
p.write_text(text, encoding='utf-8')
print('Patched generate_moon_phases.py')

# 2-3. relay scripts - use vault root from script location
for rel in [
    'Obsidian_Vault/16_Cosmos_Library/Relay_Queues/discord_relay_bridge.py',
    'Obsidian_Vault/16_Cosmos_Library/Relay_Queues/relay_watcher.py',
]:
    p = Path(rel)
    text = p.read_text(encoding='utf-8')
    text = text.replace('BASE = Path("/c/Users/VOID_PIRATE/Documents/My Docs/VOID Pirate Trading Co/Obsidian_Vault/Developer_Brain")', 'BASE = Path(__file__).resolve().parent.parent.parent')
    p.write_text(text, encoding='utf-8')
    print(f'Patched {rel}')

# 4. ooda_loop_automation.py
p = Path('Obsidian_Vault/_Hub/scripts/ooda_loop_automation.py')
text = p.read_text(encoding='utf-8')
text = text.replace('    VAULT_PATH, "Developer_Brain", "04_Business_Operations",\n', '    VAULT_PATH, "04_Business_Operations",\n')
p.write_text(text, encoding='utf-8')
print('Patched ooda_loop_automation.py')

# 5. p2_priority_notifier.py
p = Path('Obsidian_Vault/_Hub/scripts/p2_priority_notifier.py')
text = p.read_text(encoding='utf-8')
text = text.replace("load_dotenv(VAULT / 'Developer_Brain/04_Business_Operations/Communications/Discord/.env')", "load_dotenv(VAULT / '04_Business_Operations/Communications/Discord/.env')")
text = text.replace("load_dotenv(VAULT / 'Developer_Brain/04_Business_Operations/_Hub/_KEY_VAULT/secrets.env', override=False)", "load_dotenv(VAULT / '04_Business_Operations/_Hub/_KEY_VAULT/secrets.env', override=False)")
p.write_text(text, encoding='utf-8')
print('Patched p2_priority_notifier.py')
