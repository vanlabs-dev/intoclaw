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

## The core skills

These three are the foundation. You can skip them, but you probably shouldn't.

**Bittensor Knowledge** — Everything the bot needs to actually understand Bittensor. Network architecture, Yuma consensus, staking, subnet mechanics, ecosystem context. No API keys, no dependencies. Just knowledge.

**Chain Metrics** — Plugs your bot into live on-chain data using BTCLI and the TaoStats API. Subnet performance, validator and miner stats, staking positions, real-time network health. Has dependencies (BTCLI, TaoStats API key) — the bot walks you through installing and configuring all of it.

**Desearch** — Gives your bot decentralized web search and X/Twitter data through the Desearch subnet. Fast, cheap, and surprisingly powerful. Requires a Desearch API key — the bot helps you get one and set it up.

## Utility skills

**Skill Creator** — A meta-skill for building more skills. Whether you want to create a personal skill for your own bot or contribute one to the IntoClaw repo, this skill guides the process and makes sure the result follows the same structure and quality bar as everything else in here. It's also a good reference if you just want to understand how skills are built.

## Contributing

IntoClaw is MIT licensed and contributions are welcome.

Want to add a skill? The Skill Creator (`skills/skill-creator/`) has the full structure and patterns. Use it to build your skill, then open a PR. Good skills are focused, well-explained, and don't assume the user knows everything already.

## Links

- [IntoTAO](https://intotao.app) — Bittensor learning and resource platform
- [OpenClaw](https://openclaw.ai) — Personal AI bot framework
- [Bittensor](https://bittensor.com) — Decentralized AI network
- [TaoStats](https://taostats.io) — Bittensor chain analytics and API
- [Desearch](https://desearch.ai) — Decentralized web search and X/Twitter data
