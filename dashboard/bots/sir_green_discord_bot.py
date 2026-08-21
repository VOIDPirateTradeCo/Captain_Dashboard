"""Standalone Sir Green Discord bot — containerized, restart:unless-stopped."""

import asyncio
import datetime as dt
import json
import os
import pathlib
import random
import subprocess
import urllib.parse
import time
import urllib.request
from typing import Any
from dotenv import load_dotenv
load_dotenv(".env.sirgreen")

try:
    import discord
    from discord import app_commands
    from discord.ext import commands
except ImportError:
    raise SystemExit("discord.py not installed")

# === CONFIG ===
TOKEN = os.environ.get("DISCORD_BOT_TOKEN") or os.environ.get("DISCORD_SIR_GREEN_TOKEN")
HOME_CHANNEL_ID = os.environ.get("DISCORD_HOME_CHANNEL_ID", "")
ALLOWED_CHANNEL_IDS = {HOME_CHANNEL_ID, "1535372450223886417"}
GUILD_IDS = [g.strip() for g in os.environ.get("DISCORD_GUILD_IDS", "").split(",") if g.strip()]
STATE_PATH = pathlib.Path(os.environ.get("STATE_PATH", "/state/sir_green_bot_state.json"))
STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
HERMES = os.environ.get("HERMES_CMD", "hermes")
ALLOWED_CHANNEL_IDS = {
    cid.strip()
    for cid in os.environ.get("DISCORD_ALLOWED_CHANNEL_IDS", "").split(",")
    if cid.strip()
}
if not ALLOWED_CHANNEL_IDS and HOME_CHANNEL_ID:
    ALLOWED_CHANNEL_IDS.add(HOME_CHANNEL_ID)

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
    msg = (
        "🦜 **OODA Cycle #" + str(cycle) + "** — Status Report\n"
        "• Status: Online\n"
        "• Next action: Continue processing VOID Ops queue."
    )
    await channel.send(msg)


async def _post_gordon(channel: discord.abc.Messageable, message: str) -> None:
    await channel.send(f"🐳 **Gordon Stack Guard**: {message}")


def _call_hermes(prompt: str) -> str:
    try:
        base = pathlib.Path(os.environ.get("RELAY_BASE", "relay"))
        ts = int(dt.datetime.now(dt.timezone.utc).timestamp() * 1000)
        fname = f"{ts}_sir_green.json"
        data = {"prompt": prompt, "created_at": time.strftime("%Y%m%dT%H%M%S")}
        (base / "inbound" / "sir_green" / fname).write_text(
            json.dumps(data, indent=2), encoding="utf-8"
        )
        out_path = base / "outbound" / "sir_green" / fname.replace(".json", "_reply.json")
        deadline = time.time() + int(os.environ.get("HERMES_TIMEOUT", "1800"))
        while time.time() < deadline:
            if out_path.exists():
                try:
                    reply = json.loads(out_path.read_text(encoding="utf-8")).get("reply")
                    return reply if reply else "(no reply)"
                except Exception:
                    return "(reply read error)"
            time.sleep(0.5)
        return "Relay timeout"
    except Exception:
        return None


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


@bot.event
async def on_message(message: discord.Message) -> None:
    if message.author.id == bot.user.id:
        return

    if message.guild is not None and ALLOWED_CHANNEL_IDS and str(message.channel.id) not in ALLOWED_CHANNEL_IDS:
        print(f"[MSG] ignored: outside allowed channels", flush=True)
        return

    # DM relay
    if message.guild is None and message.channel.type == discord.ChannelType.private:
        reply = _call_hermes(message.content)
        try:
            await message.channel.send(reply)
        except Exception as e:
            print(f"[DM] send failed: {e}", flush=True)
        return

    # Channel-only relay in allowed guild channels
    if message.guild is not None and str(message.channel.id) in ALLOWED_CHANNEL_IDS:
        if bot.user in message.mentions:
            cleaned = message.content.replace(f"<@{bot.user.id}>", "").replace(f"<@!{bot.user.id}>", "").strip()
        else:
            cleaned = message.content.strip()
        if cleaned:
            reply = _call_hermes(cleaned)
            try:
                await message.reply(reply, mention_author=False)
            except Exception as e:
                print(f"[CHANNEL] reply failed: {e}", flush=True)
        return


# OODA cycle posting is now manual-only via /cycle command.
# No automatic scheduler to avoid spam.


def main() -> None:
    print("[START] Launching Sir Green Discord bot...", flush=True)
    bot.run(TOKEN, log_handler=None)


if __name__ == "__main__":
    main()
