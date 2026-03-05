# Next.js Demo UI + LLM-Native Copy Assistant

A demonstration of **safe, constrained AI content generation** using a Next.js App Router application. The system forces an LLM to generate marketing headlines using **only pre-approved claims**, then validates every response through a strict safety boundary before rendering.

---

## Quick Start

### Prerequisites

- **Node.js** 18+ installed ([download](https://nodejs.org/))
- **npm** (comes with Node.js)

### Installation & Run

```bash
# 1. Clone the repository
git clone <repo-url>
cd llm-copy-demo

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The app will be available at **http://localhost:3000**.

> **Note:** No API keys are required. The LLM is simulated — the system demonstrates the architectural pattern (claim-based validation, retry, fallback) without requiring an external AI service.

---

## Pages

| Page | URL | Purpose |
|------|-----|---------|
| **Landing Page** | `http://localhost:3000` | Simulates a real visitor landing on the site. Calls the decision API automatically and renders LLM-generated headlines. |
| **Admin Panel** | `http://localhost:3000/admin` | Control panel to test different visitor profiles and rule combinations. Shows both a friendly summary and raw JSON output. |

---

## How to Test — Step by Step

### Test 1: Landing Page (Default Visitor)

1. Open **http://localhost:3000** in your browser.
2. The page automatically sends a request with `visitorProfile: "General Visitor"` and default rules.
3. You should see:
   - A headline and subheading in the hero section.
   - A **"What Happened"** summary box explaining (in plain English) what the engine did.
   - A **"Developer Trace Data"** section showing which claim IDs were used, along with the actual claim text.
4. Check the terminal/server console — you will see structured `[DECIDE]` log entries tracing the full pipeline.

### Test 2: Admin Panel — Rule Variations

1. Open **http://localhost:3000/admin**.
2. Select **"Default (General)"** visitor, pick different rule combinations:
   - **Tone: Playful** → headlines become casual with emoji.
   - **Emphasis: Urgency** → claims shift from security/support to speed/price.
   - **Length: Detailed** → headlines get extra contextual detail appended.
3. Click **"Run Decision Engine"** after each change.
4. Observe:
   - The **green summary card** explaining what happened in plain language.
   - The **"Claims Referenced"** card showing each claim ID → claim text mapping.
   - The **raw JSON** output in the dark panel below.

### Test 3: Hallucination → Retry → Success

1. In the Admin Panel, select **"Startup (Forces Retry)"** from the visitor dropdown.
2. Click **"Run Decision Engine"**.
3. This triggers a deliberate hallucination on the first attempt (`claim-ai-fake`).
4. You should see:
   - The **friendly summary** explains that the model initially failed and self-corrected on retry.
   - The **Debug Execution Trace** shows: Attempt 1 (with `claim-ai-fake`) → Validation FAILED → Attempt 2 (corrected) → Validation PASSED.
5. In the server console, you will see:
   ```
   [DECIDE] Attempt 1 — VALIDATION FAILED. Invalid claims: ["claim-ai-fake"]
   [DECIDE] Attempt 2 — Raw LLM Output: ...
   [DECIDE] Validation PASSED.
   ```

### Test 4: All Visitor Presets

Try each preset to see different behaviours:

| Preset | What Happens |
|--------|-------------|
| **Mobile Egypt** | Adds `claim-mobile` to the claim selection. Headlines target mobile users. |
| **Google Visitor** | Prioritises speed + price claims — conversion-focused copy for search visitors. |
| **Startup (Forces Retry)** | Deliberately hallucinates on first attempt, self-corrects on retry. |
| **Default (General)** | Clean generation based on the selected rules. |

### Test 5: Verify Server-Side Logging

1. Run any of the tests above.
2. Look at the terminal where `npm run dev` is running.
3. Every request produces a structured trace:
   ```
   [DECIDE] === New Request ===
   [DECIDE] Visitor Profile: Mobile Egypt
   [DECIDE] Rules: {"tone":"Professional","length":"Short","emphasis":"Trust"}
   [DECIDE] Allowed Claim IDs: ["claim-speed","claim-price","claim-security","claim-mobile","claim-support"]
   [DECIDE] Attempt 1 — Raw LLM Output: { ... }
   [DECIDE] Validation PASSED. Used claims: ["claim-security","claim-support","claim-mobile"]
   [DECIDE] === Response Sent ===
   ```

---

## Logging and Safety

The application logs **all LLM interactions and validation outcomes** to the server console.

Each generation trace includes:
- The allowed claims provided to the model
- The raw model output (before validation)
- The validation result (PASSED or FAILED with specific invalid claim IDs)
- Retry attempts if validation failed

If the validation boundary detects that `usedClaimIds` contains values not present in `allowedClaims`, the payload is rejected and the system **automatically retries once** with error feedback. If the retry also fails, the system falls back to a **safe default response** — the UI never renders unvalidated AI output.

---

## Architecture Overview

```
User opens page
      ↓
Frontend sends visitor context + rules → POST /api/decide
      ↓
Backend loads allowedClaims (pre-approved facts)
      ↓
LLM generates { headline1, headline2, usedClaimIds }
      ↓
Validation Boundary: usedClaimIds ⊆ allowedClaims?
      ↓
YES → Return safe response with friendly summary
NO  → Retry once with error feedback → Still no? → Safe fallback
```

### The Validation Rule

```
usedClaimIds ⊆ allowedClaims
```

Every claim ID the model returns must exist in the pre-approved claims list. If any claim is missing, the entire response is rejected.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              ← Landing Page (renders LLM copy)
│   ├── layout.tsx            ← Root layout with metadata
│   ├── admin/
│   │   └── page.tsx          ← Admin Preview Panel
│   └── api/
│       └── decide/
│           └── route.ts      ← POST /api/decide handler (orchestrator)
├── lib/
│   ├── llm.ts                ← LLM simulation, prompt logic, validation boundary
│   ├── claims.ts             ← Allowed claims database (mock)
│   └── types.ts              ← Shared TypeScript interfaces
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS |
| LLM | Simulated (architecture ready for OpenAI/Anthropic SDK integration) |
