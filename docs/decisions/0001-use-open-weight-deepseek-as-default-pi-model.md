---
status: accepted
date: 2026-11-17
---

# Use open-weight DeepSeek as the default pi model

## Context and Problem Statement

pi is the coding agent configured by this repository. Its default model changed three times in November 2026:

- [#378](https://github.com/tkoyama010/dotfiles/pull/378) switched the default from `glm-5.3-flash` to `deepseek-v4.1-flash` on the `opencode` provider.
- [#379](https://github.com/tkoyama010/dotfiles/pull/379) restricted OpenRouter routing to a single upstream provider, DeepInfra.
- [#380](https://github.com/tkoyama010/dotfiles/pull/380) moved the default to `openrouter` with `deepseek/deepseek-v4.1-flash`, which DeepInfra serves.

Those PRs record what changed, not why an open-weight model is the default.
Shortly after, WIRED reported a benchmark that compares open-weight and closed models on multi-step intrusion tasks.
The results bear directly on that choice, both on capability and on cost.
This record keeps the evidence next to the configuration it applies to.

Source: [中国のオープンウェイトAIモデル、ハッキング能力で最先端のクローズドモデルに迫る](https://wired.jp/article/free-chinese-ai-models-are-getting-scary-good-at-hacking/) (WIRED.jp, 2026-11-13; originally published on wired.com).

## Decision Drivers

- Capability on complex, multi-step agent tasks.
- Cost per task.
- Security risks that come with the model's availability.

## Considered Options

- Open-weight DeepSeek via OpenRouter, routed only to DeepInfra
- A closed frontier model

## Decision Outcome

Chosen option: "Open-weight DeepSeek via OpenRouter, routed only to DeepInfra", because the article reports that its capability on multi-step tasks is close to the best closed model, at a fraction of the cost.

### Consequences

- Good, because, in Vals' benchmark, DeepSeek completed 73% of the tasks on average, against 81% for OpenAI's Daybreak, the best performer. On some tasks the two scored the same.
- Good, because, in the same benchmark, one run cost about $2–3 in tokens with DeepSeek, against $17–46 with GPT-6-Sol.
- Neutral, because routing is pinned to DeepInfra: if DeepInfra cannot serve the model, requests fail instead of falling back (see #379 and #380).
- Bad, because the article warns that the same capability is available to anyone who downloads the weights. In "abliterated" variants, the refusals learned in safety training are removed by editing the weights.

Note that the article does not name the DeepSeek version that Vals tested. These numbers are evidence for the model family, not measurements of `deepseek-v4.1-flash`.

### Confirmation

- `modules/home-manager/pi/settings.json` sets `defaultProvider` to `openrouter` and `defaultModel` to `deepseek/deepseek-v4.1-flash`.
- `modules/home-manager/pi/models.json` sets `openRouterRouting.only` to `["deepinfra"]`.

## Pros and Cons of the Options

### Open-weight DeepSeek via OpenRouter, routed only to DeepInfra

- Good, because its benchmark score is close to the best closed model (73% against 81%).
- Good, because its cost per run is much lower ($2–3 against $17–46).
- Bad, because its capability is not gated by access controls.

### A closed frontier model

- Good, because the best performer in the benchmark was a closed model (Daybreak, 81%).
- Bad, because Daybreak is offered only to trusted partners.
- Bad, because its cost per run is higher (GPT-6-Sol: $17–46).
