"""Standalone Sir Green Discord bot — containerized, restart:always."""

import asyncio
import datetime as dt
import json
import os
import pathlib
import random
import urllib.parse
import urllib.request
from typing import Any

try:
    import discord
    from discord import app_commands
    from discord.ext import commands
except ImportError:
    raise SystemExit("discord.py not installed")

# === CONFIG ===
TOKEN = os.environ.get("DISCORD_BOT_TOKEN") or os.environ.get("DISCORD_SIR_GREEN_TOKEN")
HOME_CHANNEL_ID = os.environ.get("DISCORD_HOME_CHANNEL_ID", "")
GUILD_IDS = [g.strip() for g in os.environ.get("DISCORD_GUILD_IDS", "").split(",") if g.strip()]
STATE_PATH = pathlib.Path(os.environ.get("STATE_PATH", "/state/sir_green_bot_state.json"))
STATE_PATH.parent.mkdir(parents=True, exist_ok=True)

if not TOKEN:
    raise SystemExit("Missing DISCORD_BOT_TOKEN or DISCORD_SIR_GREEN_TOKEN")

# === INTENTS ===
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents, tree_cls=app_commands.CommandTree)


def _load_state() -> dict[str, Any]:
    if STATE_PATH.exists():
        try:
            return json.loads(STATE_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"last_cycle": 0, "cycle_count": 0}


def _save_state(state: dict[str, Any]) -> None:
    try:
        STATE_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")
    except Exception:
        pass


async def _post_cycle(channel: discord.abc.Messageable) -> None:
    state = _load_state()
    state["last_cycle"] = int(dt.datetime.now(dt.timezone.utc).timestamp())
    state["cycle_count"] = int(state.get("cycle_count", 0)) + 1
    _save_state(state)

    cycle = state["cycle_count"]
    await channel.send(
        f"🦜 **OODA Cycle #{cycle}** — Status Report\n"
        f"• Status: Online\n"
        f"• Next action: Continue processing VOID Ops queue."
    )


async def _post_gordon(channel: discord.abc.Messageable, message: str) -> None:
    await channel.send(f"🐳 **Gordon Stack Guard**: {message}")


@bot.event
async def on_ready() -> None:
    print(f"[READY] Sir Green bot online as {bot.user}", flush=True)
    try:
        synced = await bot.tree.sync()
        print(f"[SYNC] Slash commands synced: {len(synced)}", flush=True)
    except Exception as e:
        print(f"[SYNC] Failed: {e}", flush=True)


@bot.tree.command(name="ping", description="Check Sir Green bot latency")
async def ping(interaction: discord.Interaction) -> None:
    await interaction.response.send_message(f"Pong! {round(bot.latency*1000)}ms")


@bot.tree.command(name="cycle", description="Force an OODA cycle report")
async def cycle(interaction: discord.Interaction) -> None:
    await interaction.response.defer()
    await _post_cycle(interaction.channel)
    await interaction.followup.send("Report posted.")


@bot.tree.command(name="repair", description="Post a Gordon Stack Guard repair notice")
@app_commands.describe(message="Repair message")
async def repair(interaction: discord.Interaction, message: str) -> None:
    await interaction.response.defer()
    await _post_gordon(interaction.channel, message)
    await interaction.followup.send("Repair notice posted.")


async def _scheduler() -> None:
    await bot.wait_until_ready()
    channel = None
    if HOME_CHANNEL_ID:
        try:
            channel = bot.get_channel(int(HOME_CHANNEL_ID)) or await bot.fetch_channel(int(HOME_CHANNEL_ID))
        except Exception as e:
            print(f"[SCHEDULER] Cannot resolve home channel: {e}", flush=True)

    while not bot.is_closed():
        try:
            if channel:
                await _post_cycle(channel)
        except Exception as e:
            print(f"[SCHEDULER] Cycle error: {e}", flush=True)
        await asyncio.sleep(int(os.environ.get("CYCLE_SECONDS", "1800")))


@bot.event
async def setup_hook() -> None:
    bot.loop.create_task(_scheduler())


def main() -> None:
    print("[START] Launching Sir Green Discord bot...")
    bot.run(TOKEN, log_handler=None)


if __name__ == "__main__":
    main()
