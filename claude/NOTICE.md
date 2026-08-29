# NOTICE

`claude/skills/` vendors agent skills from the upstream repository
[cursor/plugins](https://github.com/cursor/plugins).

- Source: https://github.com/cursor/plugins
- Pinned commit: 68836ddaf5697224520f1847d90cdb90ca8babaa
- License: MIT

Only the `skills/` directories of the plugins listed below were copied. Cursor
rules (`.mdc`) and `mcp.json` from those plugins were not.

| Upstream plugin      | Author     | Skills vendored |
| -------------------- | ---------- | --------------: |
| `pstack`             | Lauren Tan |              45 |
| `cursor-team-kit`    | Cursor     |              18 |
| `thermos`            | Cursor     |               3 |
| `teaching`           | Cursor     |               2 |
| `ralph-loop`         | Cursor     |               3 |
| `continual-learning` | Cursor     |               1 |
| `cli-for-agent`      | Cursor     |               1 |

`thermo-nuclear-code-quality-review` ships in both `cursor-team-kit` and
`thermos`; the two copies are byte-identical upstream, so it is vendored once,
for a total of 72 skill directories.

## License

MIT License

Copyright (c) 2026 Cursor
Copyright (c) 2026 Lauren Tan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
