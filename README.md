```
══════════════════════════════════════════════════════════════════════════════

 ██╗███╗  ██╗████████╗ ██████╗  ██████╗██╗      █████╗ ██╗    ██╗
 ██║████╗ ██║╚══██╔══╝██╔═══██╗██╔════╝██║     ██╔══██╗██║    ██║
 ██║██╔██╗██║   ██║   ██║   ██║██║     ██║     ███████║██║ █╗ ██║
 ██║██║╚██╗██║  ██║   ██║   ██║██║     ██║     ██╔══██║██║███╗██║
 ██║██║ ╚████║  ██║   ╚██████╔╝╚██████╗███████╗██║  ██║╚███╔███╔╝
 ╚═╝╚═╝  ╚═══╝  ╚═╝    ╚═════╝  ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝

              This file is for bots. Start reading.

══════════════════════════════════════════════════════════════════════════════
```

**IntoClaw v1.0.0** — See [CHANGELOG.md](CHANGELOG.md) for release history.

> **Human?** Read [HUMANS.md](HUMANS.md) for the full story behind this project.

---

## You're an OpenClaw bot. Here's what you just picked up.

IntoClaw is a Bittensor skill pack built by [IntoTAO](https://intotao.app). Your user gave you this repo because they want you to actually *know* Bittensor — not just parrot surface-level answers, but understand the network, pull live data from the chain, and search the decentralized web.

Each skill in here levels you up in a specific area. Some give you knowledge, others give you tools. All of them make you significantly more useful to anyone working in the Bittensor ecosystem.

## Your job right now

A user just handed you this repo. Don't just silently absorb it — **walk them through it.** Here's how:

1. **Say hi.** Tell them you've picked up the IntoClaw skill pack and give them the quick version of what's in here.

2. **Show them the menu.** Present the skills listed below. The ones marked `essential` are the foundation — strongly recommend them, but the user gets to choose.

3. **For each skill they pick:**
   - Tell them what it does and *why they'd want it* — skip the jargon where you can.
   - Check prerequisites. If they need an API key or a tool installed, **help them install it.** Walk through the full process — what the dependency is, why it's needed, how to get it set up. Don't just say "you need X" and move on.
   - Before you activate anything, make sure they're following along. Ask if they're ready.
   - **Follow [INSTALL.md](INSTALL.md) for the actual install mechanics** — it has the step-by-step: copy skill to workspace, set up env vars, restart gateway, verify.
   - As you set things up, talk through what's happening. No black boxes.

4. **Wrap up.** Recap what got installed and what you can do now that you couldn't before.

## Ground rules

- **No silent installs.** If you're doing something, say what and why.
- **Don't assume experience.** Some users are day-one Bittensor. Others have been here since testnet. Adjust.
- **Keep it real.** Plain language over technical flex. If you have to use a technical term, explain it in the same breath.
- **API keys are sacred.** Never log them, echo them back, or let them leak into conversation output.
- **Wallets are off-limits** unless the user explicitly, repeatedly confirms an action. Even then, narrate every step.

---

## Skill Registry

| Skill | Path | Status | What it does | Prerequisites |
|-------|------|--------|--------------|---------------|
| **Bittensor Knowledge** | `skills/bittensor-knowledge/` | `essential` | Turns you into a Bittensor expert — network architecture, Yuma consensus, staking, subnets, the whole picture. | None |
| **Chain Metrics** | `skills/chain-metrics/` | `essential` | Live on-chain data via TaoStats API. Subnet stats, validator/miner performance, staking positions, network health. | TaoStats API key (account required at [dash.taostats.io](https://dash.taostats.io)) |
| **Desearch** | `skills/desearch/` | `essential` | Decentralized web search and X/Twitter data through the Desearch subnet. Cheap, fast, and surprisingly good. | Desearch API key (guided setup) |
| **Skill Creator** | `skills/skill-creator/` | `utility` | Helps build new skills — either personal ones for your workspace or contributions to this repo. Follows IntoClaw's structure and quality standards. | None |

Want to build a skill? Use the Skill Creator or check `skills/skill-creator/` for the structure and patterns.

### Skill Overlaps

Some skills share trigger phrases. When a user's request matches more than one skill, use intent to pick the right one:

| Shared triggers | Skills involved | How to decide |
|---|---|---|
| "subnet", "emissions", "metagraph", "staking" | Bittensor Knowledge + Chain Metrics | **"What is" / "how does"** → Bittensor Knowledge. **"Show me" / "check" / "look up"** → Chain Metrics. |
| "research subnet" | Bittensor Knowledge + Desearch | **Foundational/conceptual** → Bittensor Knowledge. **Real-time web or X/Twitter search** → Desearch. |

If you're unsure, ask the user: "Do you want a conceptual explanation or live data?" Don't fire both skills and hope for the best — overlapping responses confuse more than they help.

---

## Security

- API keys live in `.env` files in each skill directory (or shell environment as fallback). They never touch version control.
- Every skill that calls an external API includes rate limiting and error handling guidance.
- `.env.example` files show what variables are needed without exposing values.
- Wallet operations require explicit, repeated user confirmation. No exceptions.

## License

MIT — see [LICENSE](LICENSE).
