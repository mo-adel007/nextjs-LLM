// src/lib/types.ts
// Shared TypeScript interfaces used across the backend API and frontend components.
// These enforce strict typing so the LLM output, API contract, and UI all stay aligned.

// --- Request Body ---
// The shape of the JSON payload the frontend sends to POST /api/decide.
// `visitorProfile` identifies who this visitor is (e.g. "Startup", "Mobile Egypt").
// `rules` are optional demo controls the admin panel exposes to tweak LLM behaviour.
export interface DecideRequestBody {
  visitorProfile: string;  // Required — identifies the visitor persona
  rules?: {
    tone?: string;         // "Professional" | "Playful" — controls copy voice
    length?: string;       // "Short" | "Detailed" — controls headline verbosity
    emphasis?: string;     // "Trust" | "Urgency" — controls which claims get prioritised
  };
}

// --- LLM Output Schema ---
// The exact JSON structure the LLM is prompted to return.
// `usedClaimIds` is the critical field — it declares which pre-approved claims
// the model referenced, enabling the validation boundary to verify safety.
export interface LLMOutput {
  headline1: string;        // Primary generated headline
  headline2: string;        // Secondary generated headline / subheading
  usedClaimIds: string[];   // Claim IDs the model says it used (must be a subset of allowedClaims)
}

// --- Debug Trace Entry ---
// A single step in the server-side execution trace.
// Each entry captures what happened at that stage of the pipeline.
// This replaces untyped `any[]` with a structured, discriminated record.
export interface TraceEntry {
  step: string;             // Human-readable stage label (e.g. "Attempt 1", "Validation Result")
  visitorProfile?: string;  // Present in the START step — which visitor profile was requested
  rules?: DecideRequestBody["rules"];  // Present in the START step — which demo rules were sent
  allowedClaimIds?: string[];          // Present in the START step — which claims were available
  output?: LLMOutput;       // Present in attempt steps — raw LLM output before validation
  status?: string;          // Present in validation steps — "PASSED" or failure reason
  error?: string;           // Present only when a fatal exception occurred
  failedClaimIds?: string[];  // Present on validation failure — which claim IDs were invalid
}

// --- Claim Detail ---
// Enriched claim info returned to the frontend so the UI can display
// both the technical ID and the human-readable text of each used claim.
export interface ClaimDetail {
  id: string;    // The claim ID (e.g. "claim-speed")
  text: string;  // The approved fact text (e.g. "Our product is 10x faster than competitors.")
}

// --- API Response ---
// The final JSON payload returned by POST /api/decide to the frontend.
// Contains TWO views of the same result:
//   1. Structured JSON fields (headline1, headline2, usedClaimIds) for programmatic use
//   2. A `friendlySummary` string — a human-readable explanation of what the engine did
// `isFallback` is true when the LLM failed validation twice and safe defaults were used.
// `debugTrace` gives full pipeline visibility for the admin panel and developer tools.
export interface DecideResponse {
  headline1: string;                // The safe headline to render (LLM-generated or fallback)
  headline2: string;                // The safe subheading to render (LLM-generated or fallback)
  usedClaimIds: string[];           // Which claim IDs were used (empty array on fallback)
  usedClaimsDetail: ClaimDetail[];  // Enriched claim objects with ID + text for UI display
  isFallback: boolean;              // true = LLM generation failed, safe defaults returned
  friendlySummary: string;          // Human-readable explanation of the generation outcome
  debugTrace?: TraceEntry[];        // Full server-side execution trace for debugging
}
