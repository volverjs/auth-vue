# @volverjs/auth-vue — Claude Code skills

This repository ships an installable [Claude Code](https://docs.claude.com/en/docs/claude-code)
plugin that helps agents integrate `@volverjs/auth-vue` into a Vue 3 application.

## Available skills

| Skill | Invoke | What it does |
| ----- | ------ | ------------ |
| [`volverjs-auth-vue`](./volverjs-auth-vue/SKILL.md) | `/volverjs-auth-vue:volverjs-auth-vue` (auto-loads on relevant requests) | Guides setup (plugin & standalone), the authorize → initialize → handle-code → refresh → logout flow, the options/API reference, common patterns (API auth header, router guard, confidential clients), storage & security, gotchas and the 0.0.x migration. |

## Install

The repo is its own plugin marketplace. From Claude Code:

```text
/plugin marketplace add volverjs/auth-vue
/plugin install volverjs-auth-vue@volverjs-auth-vue
```

The skill then loads automatically when you ask things like "add OAuth login to
my Vue app with @volverjs/auth-vue" or "wire up the auth code flow".

## Manual install (without the plugin manager)

Copy the skill into your project or user skills directory:

```bash
# project-local
cp -r skills/volverjs-auth-vue .claude/skills/volverjs-auth-vue
# or user-wide
cp -r skills/volverjs-auth-vue ~/.claude/skills/volverjs-auth-vue
```

## Layout

```text
.claude-plugin/
  plugin.json        # plugin manifest
  marketplace.json   # marketplace catalog (the repo hosts itself)
skills/
  volverjs-auth-vue/
    SKILL.md         # the skill
```
