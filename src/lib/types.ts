// Shared TypeScript types for the copy-assistant runtime.

// Represents one approved fact/feature that the model is allowed to use.
export type AllowedClaim = {
  // Stable identifier that the model cites in `usedClaimIds`.
  id: string;
  // Human-readable claim text approved for generation.
  text: string;
};

// Demo controls that influence copy style.
export type DemoRules = {
  // Desired writing tone.
  tone?: "Professional" | "Playful";
  // Desired output verbosity.
  length?: "Short" | "Detailed";
  // Main persuasion direction.
  emphasis?: "Urgency" | "Trust";
};

// Visitor context used to personalize output.
export type VisitorContext = {
  // High-level profile selected by UI.
  visitorProfile?: string;
  // Country signal (if known).
  country?: string;
  // Device signal (if known).
  deviceType?: "mobile" | "desktop";
  // Referrer signal (if known).
  referrerDomain?: string;
};

// Request payload accepted by POST /api/decide.
export type DecideRequest = {
  // Visitor data used by the generator.
  visitor: VisitorContext;
  // Optional style controls used by the generator.
  rules?: DemoRules;
};

// Strict model output contract.
export type LlmCopyResult = {
  // Primary hero headline.
  headline1: string;
  // Secondary support line.
  headline2: string;
  // IDs of claims used while generating output.
  usedClaimIds: string[];
};

// Final API response contract (includes fallback metadata).
export type DecideResponse = LlmCopyResult & {
  // True when retry also failed and system returned safe static copy.
  isFallback: boolean;
  // Number of model attempts used for this response.
  attempts: number;
};
