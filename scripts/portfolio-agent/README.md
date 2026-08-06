# Portfolio agent

Weekly (and on-demand) GitHub Actions pipeline that:

1. Collects recent GitHub activity for allowlisted repos
2. Optionally drafts a `resume.json` update + SEO (`imageAlts` / work blurbs) via Groq or Gemini
3. Opens a review PR (never auto-merges)

## Local dry-run

```bash
# Collect last 14 days of activity
node scripts/portfolio-agent/collect.mjs --out artifacts/activity.json

# Propose without LLM (writes drafts/activity-*.md notes only)
node scripts/portfolio-agent/propose.mjs --activity artifacts/activity.json --no-llm

# Propose with Groq (requires GROQ_API_KEY)
LLM_PROVIDER=groq GROQ_API_KEY=... node scripts/portfolio-agent/propose.mjs \
  --activity artifacts/activity.json --apply
```

`--apply` writes `resume.json` and optional work frontmatter changes into the working tree. Without `--apply`, files go under `artifacts/proposal/`.

## Secrets

| Secret | Purpose |
|--------|---------|
| `GROQ_API_KEY` | Preferred free LLM |
| `GEMINI_API_KEY` | Fallback LLM (`LLM_PROVIDER=gemini`) |
| `PORTFOLIO_GH_TOKEN` | Optional PAT if default `GITHUB_TOKEN` cannot read org history |

## SEO

Site SEO ([`src/lib/seo.ts`](../../src/lib/seo.ts)) already derives meta/JSON-LD from `resume.json`. The agent fills gaps by proposing:

- Resume summary / label / skills keywords (feed site keywords)
- Per-project `imageAlts` and blurbs in `content/work/*.md`

Never invents metrics. Human review required.
