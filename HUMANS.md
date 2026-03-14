```
══════════════════════════════════════════════════════════════════════════════

 ██╗███╗  ██╗████████╗ ██████╗  ██████╗██╗      █████╗ ██╗    ██╗
 ██║████╗ ██║╚══██╔══╝██╔═══██╗██╔════╝██║     ██╔══██╗██║    ██║
 ██║██╔██╗██║   ██║   ██║   ██║██║     ██║     ███████║██║ █╗ ██║
 ██║██║╚██╗██║  ██║   ██║   ██║██║     ██║     ██╔══██║██║███╗██║
 ██║██║ ╚████║  ██║   ╚██████╔╝╚██████╗███████╗██║  ██║╚███╔███╔╝
 ╚═╝╚═╝  ╚═══╝  ╚═╝    ╚═════╝  ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝

                 This file is for humans. Welcome.

══════════════════════════════════════════════════════════════════════════════
```

**Bittensor skills for OpenClaw bots, built by [IntoTAO](https://intotao.app).**

## Quick Start

Drop this link in your OpenClaw bot's chat — it handles the rest:

`https://github.com/vanlabs-dev/intoclaw`

## Why this exists

More and more people in the Bittensor community are running [OpenClaw](https://openclaw.ai) personal bots — asking questions about the network, looking up subnet data, even setting up miners through chat. But getting a bot from "basic install" to "actually useful for Bittensor" takes real work. Domain knowledge, API integrations, chain tooling, understanding of how subnets actually function.

The typical approach? Some one-click config that magically works but leaves you with no idea what happened. Then something breaks and you're staring at a bot you don't understand.

That's not how we do things at IntoTAO.

## What IntoClaw does differently

IntoClaw is an open-source skill pack your bot reads and configures itself with. The twist: **it explains everything as it goes.**

Point your bot at this repo and it walks you through what's available, helps you pick what you need, and sets things up *with* you — not behind your back. By the time it's done, you have a Bittensor-capable bot and you actually know what's under the hood.

## Getting started

1. Get [OpenClaw](https://openclaw.ai) running with a chat interface (Telegram, WhatsApp, whatever you prefer)
2. Drop this repo URL into your bot
3. The bot picks up the skill pack and shows you what's available
4. Choose what to install — the bot walks you through each one
5. Done. You've got a smarter bot *and* you learned something along the way

## What's in the box

IntoClaw ships with skills covering Bittensor domain knowledge, live chain data, decentralized web search, subnet research, and centralized exchange trading via Bitget — plus a utility skill for building your own. The full skill registry (descriptions, prerequisites, status) lives in [README.md](README.md), which is also what your bot reads on first contact. Check there for the current list and details.

## Contributing

IntoClaw is MIT licensed and contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

**Quick version:** branch from `dev`, build your skill using the Skill Creator (`skills/skill-creator/`), test with a real agent, then open a PR. Good skills are focused, well-explained, and don't assume the user knows everything already.

CI runs automatically on PRs to validate skill structure, frontmatter, conflict declarations, and Python syntax.

## Links

- [IntoTAO](https://intotao.app) — Bittensor learning and resource platform
- [OpenClaw](https://openclaw.ai) — Personal AI bot framework
- [Bittensor](https://bittensor.com) — Decentralized AI network
- [TaoStats](https://taostats.io) — Bittensor chain analytics and API
- [Desearch](https://desearch.ai) — Decentralized web search and X/Twitter data
