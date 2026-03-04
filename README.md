# Next.js Demo UI + LLM-Native Copy Assistant

A lightweight full-stack demo of **safe AI personalization** in Next.js.

The app shows how to generate dynamic copy while enforcing a strict validation boundary:

- LLM-style generator returns `headline1`, `headline2`, and `usedClaimIds`
- Backend checks `usedClaimIds ⊆ allowedClaims`
- Invalid output triggers **one retry**, then a **safe fallback**

## Implemented Architecture

- `POST /api/decide` orchestrates claims loading, generation, validation, retry, and fallback.
- Landing page (`/`) calls `/api/decide` on load and renders validated output.
- Admin page (`/admin`) supports visitor presets and rule tweaking (tone, length, emphasis).
- Shared `lib/` modules isolate claims, orchestration logic, and types.

## Logging and Safety

The server logs a full trace for each generation cycle, including:

1. Allowed claims sent to the generator
2. Raw generator output per attempt
3. Validation result for each attempt
4. Retry/fallback activation if validation fails

If `usedClaimIds` contains any value outside `allowedClaims`, the payload is rejected immediately. The system retries once; if still invalid, it returns a hardcoded safe fallback.

## Project Structure

```text
src/
├── app/
│   ├── page.tsx
│   ├── admin/page.tsx
│   └── api/decide/route.ts
└── lib/
    ├── claims.ts
    ├── llm.ts
    └── types.ts
```

## Run Locally

```bash
npm install
npm run dev
```

Then open:

- `http://localhost:3000/` (landing)
- `http://localhost:3000/admin` (admin preview)

## Notes

- Current generator is a deterministic mock implementation to demonstrate architecture behavior.
- You can replace `mockLlmCall` in `src/lib/llm.ts` with a vendor SDK call while keeping the same validation boundary.
