# npm-publish

Publish npm packages from non-interactive shell environments.

Full documentation: [.agents/skills/npm-publish/SKILL.md](https://github.com/tkoyama010/dotfiles/blob/main/.agents/skills/npm-publish/SKILL.md)

## Quick reference

```bash
cd /path/to/package && rm -f /tmp/npm-publish.log && script -q /dev/null npm publish --access public > /tmp/npm-publish.log 2>&1 & sleep 5 && grep -o 'auth/cli/[a-f0-9-]*' /tmp/npm-publish.log | head -1 | tr -d '\r' | xargs -I {} open "https://www.npmjs.com/{}" && echo "Authenticate with Touch ID in browser"
```
