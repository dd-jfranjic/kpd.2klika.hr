# CLAUDE.md - KPD 2klika

**Domain**: kpd.2klika.hr
**Path**: `/var/www/vhosts/kpd.2klika.hr/httpdocs/`
**System User**: `kpd.2klika.hr_cjfmg3wnf4u`
**Status**: New project - configuration pending

---

## PREMIUM STANDARD - Work Philosophy

**Pristup svakom zadatku mora biti:**
- **Profesionalno** - kao da radiš za enterprise klijenta
- **Metodično** - korak po korak, ništa ne preskači
- **Studiozno** - istraži prije nego što implementiraš
- **Logički** - svaka odluka ima razlog
- **Premium razina** - kvaliteta iznad svega

### Obavezni Alati:
- **Jina MCP** - UVIJEK koristi za svježe informacije s weba
- **frontend-design plugin** - za sve UI/dizajn zadatke (`Skill: frontend-design`)

---

## MASTER WORKFLOW - Follow This Every Time!

### Step 0: Read Guidelines First
- **READ THIS FILE** (`CLAUDE.md`) before any work
- Check reference files for project context
- Understand existing architecture before making changes

### Step 1: Understand the Prompt
- Tell the user what you understood from their request
- Summarize the task in your own words
- Identify the core requirements

### Step 2: Clarify If Needed
- If anything is unclear, **ASK** before proceeding
- Suggest improvements to the prompt if it's ambiguous
- Better to ask than to assume wrong

### Step 3: Identify Files to Check
- List which files you should review before making changes
- Understand dependencies and impacts
- Check existing implementations for patterns

### Step 4: Make Changes (KISS & DRY)
- **KISS**: Keep It Simple, Stupid - simplest solution that works
- **DRY**: Don't Repeat Yourself - reuse existing code/components
- **NO hardcoding** - everything configurable or in database
- **NO mock data** - always use real database storage

### Step 5: Git Workflow
- **Every big feature = its own branch**
- Test thoroughly before merging
- Merge to `main` only when tests pass
- Clean commit messages

### Step 6: Report Changes
- List every file you modified
- Explain what changed in each file
- Document any new dependencies or configs

---

## Context Management - CRITICAL!

### Use Subagents to Preserve Context
**You have 200K context window - use it to ORCHESTRATE other 200K agents!**

- **EVERY coding task** → delegate to a subagent
- Main context = orchestration & decision making
- Subagents = implementation & exploration
- This preserves your main context for the big picture

### Available Subagent Types:
- `@explorer` - Research, find files, understand codebase (Haiku - fast)
- `@planner` - Design architecture, create implementation plans (Sonnet)
- `general-purpose` - Complex multi-step coding tasks

---

## MCP Tools - USE THEM!

You have powerful MCP tools at your disposal. **USE THEM** to be better:

### Browser Testing
- **Chrome DevTools MCP**: `mcp__chrome-devtools__*`
- **IMPORTANT**: Close older browser instances before opening new ones!

### Research & Documentation
- **Jina Reader**: For fetching web pages and documentation
- **Jina Search**: For finding resources
- Always look for `llms.txt` when implementing third-party services

### Research Protocol (Jina)
```bash
# Read a webpage
curl "https://r.jina.ai/https://www.example.com" \
  -H "Authorization: Bearer jina_db539c74a0c046b9bd7307c38a042809H-c8gFGa6pNMBfg43XKn6C4sHWc"

# Search for resources
curl "https://s.jina.ai/?q=Your+Search+Query" \
  -H "Authorization: Bearer jina_db539c74a0c046b9bd7307c38a042809H-c8gFGa6pNMBfg43XKn6C4sHWc" \
  -H "X-Respond-With: no-content"
```

### Third-Party Integration Protocol
When implementing services (Stripe, etc.):
1. Find their `llms.txt` (e.g., `https://docs.stripe.com/llms.txt`)
2. Use Jina to read relevant documentation pages
3. Look for implementation specific to YOUR tech stack
4. If not specific, ask user and advise on best approach
5. Don't use internal web fetch for specific research - use Jina!

### UI Components
- **shadcn-ui**: `mcp__shadcn-ui__get_component`
- **TweakCN Themes**: `mcp__tweakcn-themes__list_themes`

---

## Docker Protocol

### All Projects Run in Docker!
- Use `docker logs` for debugging
- After any rebuild, **ALWAYS clean up leftovers**

### Cleanup Commands
```bash
# Check for dangling images
docker images -f "dangling=true"

# Remove dangling images (safe)
docker image prune -f

# Check build cache
docker builder prune --dry-run

# Clean build cache (careful!)
docker builder prune -f

# Check disk usage
docker system df
```

### After Every Rebuild:
1. Check for leftover images: `docker images -f "dangling=true"`
2. If any exist, remove them: `docker image prune -f`
3. **BE CAREFUL**: Don't delete images that are in use!
4. Verify with: `docker system df`

---

## Project Overview

*To be filled in after project setup*

---

## Tech Stack

*To be defined*

---

## Important Files

*To be documented*

---

## Commands

*To be documented*

---

## Notes

- Virtual host created: 2025-12-11
- SSH access configured with keys from malaodlavande.com
- Added to sshd AllowUsers

---

**Last Updated**: 2025-12-11
**Maintained by**: Claude Code
