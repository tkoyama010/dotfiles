---
name: concise-design-doc
description: |
  Write design docs and PR descriptions that a reviewer can grasp quickly: conclusion first, alternatives in a table, explicit non-goals, no boilerplate sections. Use whenever writing or revising a design doc, ADR, or pull request description.
---

AI-written docs tire readers not because they are wrong, but because they give every point equal weight, save the conclusion for the end, fill template headings even when empty, and write pros/cons for options that were never viable. These rules counter each habit.

Based on: https://qiita.com/take-yoda/items/e5d9ce6618523af1ffc5

## Design doc

- Open with the conclusion (chosen design and why) in 3 lines or fewer. Details follow and only support it.
- Compare alternatives in a table with two columns: option and rejection reason. Do not write pros/cons prose for each one.
- Keep each rejected option to the minimum needed to convey why it was rejected. An option the requirements already rule out gets one line.
- Write a "Non-goals" section. Do not list general best practices or speculative future extensions.
- Include boilerplate sections (glossary, background, purpose, audience) only when the reader is unlikely to know the terms. Otherwise omit them.
- Create a heading only for a meaningful unit. Never repeat the same content under multiple headings.
- When in doubt, cut. After writing, ask for each section: "Can the reviewer still understand the decision without this?" If yes, delete it.

## PR description

- Start with what changed and why, in a few lines.
- Link the design doc or issue instead of repeating it.
- Do not list every changed file; the diff already shows that. Point out only the files or spots the reviewer should look at first.
- Mention verification (tests run, manual checks) in one or two lines.
