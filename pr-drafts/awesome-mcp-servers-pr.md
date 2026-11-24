# Pull Request Draft: `punkpeye/awesome-mcp-servers` (Zero-Deletion Addition)

> **Target Repository**: `https://github.com/punkpeye/awesome-mcp-servers`  
> **Target File**: `README.md` (Section: `Health` / `Travel & Transportation` — insert strictly in alphabetical order with **0 deletions**)  
> **Brand Isolation Rule**: Submit from the dedicated `ChinaMedVisit` GitHub organization (`https://github.com/ChinaMedVisit/chinamedvisit-mcp`) after mirroring/creating the organization repository. Verify `https://chinamedvisit.com/api/mcp` returns `HTTP 200` on `tools/list` before opening the PR.

---

## 1. Exact Single-Line Markdown Addition (`deletions: 0`)

Insert the following single bullet in alphabetical order under the `### 🏥 Health` (or `### ✈️ Travel & Transportation` if Health is not present in the latest upstream `README.md`) section:

```markdown
- [ChinaMedVisit/chinamedvisit-mcp](https://github.com/ChinaMedVisit/chinamedvisit-mcp) 📇 ☁️ 🏠 - Read-only MCP server for [ChinaMedVisit](https://chinamedvisit.com) exposing China Tier-3A hospital International Medical Center (IMC) lookup, China vs US/UK out-of-pocket medical cost estimation (MRI, PET-CT, endoscopy, orthopedics), diagnostic itinerary planning, bilingual hospital triage phrasebooks, and 240h TWOV / S2 medical visa payment checks (`https://chinamedvisit.com/api/mcp`).
```

> **Legend Check (match upstream `punkpeye/awesome-mcp-servers` legend before opening PR)**:
> - `📇` TypeScript / Node.js
> - `☁️` Remote Cloud / Streamable HTTP service (`https://chinamedvisit.com/api/mcp`, zero API key required)
> - `🏠` Local stdio bridge (`node bin/cli.js` & `npx chinamedvisit-cli`)

---

## 2. Pull Request Title

```text
Add ChinaMedVisit MCP Server (China Tier-3A Hospital Directory & Medical Cost Estimator)
```

---

## 3. Pull Request Description Body

```markdown
### Summary

Adds **ChinaMedVisit MCP (`com.chinamedvisit/mcp`)**, an open, zero-auth, read-only Model Context Protocol server providing structured cross-border healthcare data for Mainland China's accredited Tier-3A International Medical Centers (IMCs).

- **Remote Streamable HTTP Endpoint**: `https://chinamedvisit.com/api/mcp` (CORS-enabled, zero API key required)
- **Official MCP Registry**: `com.chinamedvisit/mcp` (`ACTIVE`)
- **OpenAPI Spec**: `https://chinamedvisit.com/openapi.json`
- **Repository**: `https://github.com/ChinaMedVisit/chinamedvisit-mcp`
- **Companion Web Tools**: `https://chinamedvisit.com/cost-calculator` | `https://chinamedvisit.com/hospitals`
- **Open Research Dataset (CC-BY-4.0)**: `https://github.com/ChinaMedVisit/china-tier3a-imc-healthcare-dataset`

### Read-Only MCP Tools Exposed

1. `estimate_china_medical_cost` — Compare China Tier-3A IMC out-of-pocket costs (RMB/USD) vs US self-pay and UK private benchmarks across 3.0T MRI, PET-CT, painless endoscopy, specialist consultations, and orthopedic procedures.
2. `lookup_tier3a_international_hospital` — Look up verified Grade-3A public hospital International Medical Centers by city and clinical specialty with official addresses, phones, and direct-billing support.
3. `get_medical_tourism_itinerary_plan` — Generate day-by-day diagnostic and specialist schedules with required clinical dossier items.
4. `get_bilingual_hospital_phrasebook` — Retrieve English-Chinese-Pinyin triage phrases for registration, allergies, radiology, and pharmacy counters.
5. `check_china_medical_visa_and_payment_prep` — Verify international credit card / mobile payment acceptance and 240-hour TWOV vs S2 medical visa rules.
6. `compare_tier3a_imc_vs_private_hospital` — Compare public academic Tier-3A IMCs against foreign-invested private clinics by cost, surgical depth, and wait time.

### Checklist

- [x] Strictly 1 line added in alphabetical order (`0` lines deleted or modified)
- [x] All tools are read-only (`readOnlyHint: true`, `destructiveHint: false`)
- [x] Verified live `initialize`, `tools/list`, and `tools/call` over both Streamable HTTP and local Node.js stdio bridge
- [x] Clear MIT license and documentation with single-hop verified URLs
```
