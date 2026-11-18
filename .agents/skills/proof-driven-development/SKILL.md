---
name: proof-driven-development
description: |
  Proof-driven development (PDD) for agent-written code: agree on a formal specification with the developer first, then write the implementation together with a machine-checked proof that it meets the spec, and open a PR that states exactly what was proven. Use when the user asks for verified or provably correct code, mentions Verus, formal verification, proofs, or "PDD", or when correctness of security-sensitive logic (auth, access control, parsing, money) matters more than speed.
---

Tests show that an implementation works for the inputs someone thought of. A proof shows it works for every input the spec covers. When an agent writes the code, the reviewer can no longer rely on knowing how it was written, so the spec and the proof become the things to review instead of the code.

Based on GitHub Next's PDD Kit (Rust + [Verus](https://github.com/verus-lang/verus)), as reported in https://gihyo.jp/article/2026/11/pdd-kit.

## 1. Specification first

- Turn the developer's requirements into a formal spec before writing any implementation. For Rust, write it as Verus `requires` / `ensures` clauses on the function signature.
- Keep each condition small and name it in plain language next to the formal clause, so the developer can review the spec without reading proof syntax.
- Show the spec to the developer and get agreement before implementing. Treat the agreed spec as the requirements; do not change it silently later.

## 2. Check the spec for vacuous satisfaction

A spec that only forbids bad outcomes is satisfied by code that does nothing.

- Example: "never issue a token for a wrong password" is satisfied by a login handler that never issues tokens. Add the positive requirement: "issue a token for a correct password".
- For every "must not" condition, ask what the trivial implementation (always reject, always return empty, always panic) would satisfy, and add the missing "must" condition.
- Raise these gaps with the developer as questions rather than deciding them yourself.

## 3. Implementation and proof

- Write the implementation and its proof together. Do not weaken the spec to make the proof go through; if the spec cannot be proven, report why and ask.
- Run the verifier (`verus <file>.rs`) and iterate until it passes with no `assume` or `admit` left in the code. If an assumption cannot be removed, keep it and list it explicitly (see below).
- Still write ordinary tests for behavior outside the spec (I/O, integration, performance).

## 4. Pull request

State the guarantee precisely so the reviewer knows what not to re-check:

- **Proven**: each spec condition, in plain language, that the verifier checked.
- **Assumptions**: everything the proof relies on but does not prove (external crates, unverified functions, `assume` clauses, environment).
- **Tests**: what was run and the result.
- **Scope**: which functions and modules the guarantee covers, and what is explicitly outside it.

Add the verifier to CI so later changes cannot break the proof unnoticed.

## When not to use

- The language has no practical verifier for the target code, or the spec cannot be stated formally (UI, prompts, heuristics). Fall back to property-based tests and say so.
- Throwaway scripts and prototypes, where the cost of a proof exceeds the cost of a bug.
