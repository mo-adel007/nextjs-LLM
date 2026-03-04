import type {
  AllowedClaim,
  DecideRequest,
  DecideResponse,
  LlmCopyResult,
} from "@/lib/types";

// Hard fallback that is always safe to display.
const FALLBACK_RESPONSE: LlmCopyResult = {
  headline1: "Welcome to our platform.",
  headline2: "Discover what we can do for you.",
  usedClaimIds: [],
};

// Converts title-like strings into sentence case for readable copy fragments.
function normalizeFragment(value: string | undefined): string | undefined {
  return value ? value.toLowerCase() : undefined;
}

// Guards unknown values as non-empty strings.
function toNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

// Normalizes any candidate output to the strict schema expected by the app.
function sanitizeModelOutput(value: unknown): LlmCopyResult | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const headline1 = toNonEmptyString(record.headline1);
  const headline2 = toNonEmptyString(record.headline2);
  const claimIds = Array.isArray(record.usedClaimIds)
    ? Array.from(
        new Set(
          record.usedClaimIds
            .map((id) => toNonEmptyString(id))
            .filter((id): id is string => id !== null),
        ),
      )
    : null;

  if (!headline1 || !headline2 || !claimIds) {
    return null;
  }

  return {
    headline1,
    headline2,
    usedClaimIds: claimIds,
  };
}

// Validates that every claim id returned by the model exists in the approved set.
export function validateClaimSubset(
  result: LlmCopyResult,
  allowedClaims: AllowedClaim[],
): boolean {
  // Convert approved IDs into a constant-time lookup set.
  const allowedIds = new Set(allowedClaims.map((claim) => claim.id));
  // Return true only when each cited id is approved.
  return result.usedClaimIds.every((id) => allowedIds.has(id));
}

// Deterministic mock model call used for local demo and tests.
async function mockLlmCall(
  input: DecideRequest,
  allowedClaims: AllowedClaim[],
  attempt: number,
): Promise<unknown> {
  // Build a map for quickly reading claim texts by id.
  const claimById = new Map(allowedClaims.map((claim) => [claim.id, claim.text]));
  // Pull frequently used rule fragments for output shaping.
  const tone = normalizeFragment(input.rules?.tone);
  const length = input.rules?.length;

  // Force an invalid first attempt for one profile to prove retry/fallback flow works.
  if (input.visitor.visitorProfile === "Startup" && attempt === 1) {
    return {
      headline1: "Ship AI features with record speed.",
      headline2: "Get startup momentum this quarter.",
      usedClaimIds: ["claim-speed", "claim-ai"],
    };
  }

  // Prefer security-focused copy when trust is requested.
  if (input.rules?.emphasis === "Trust") {
    return {
      headline1: `Enterprise-grade security with a ${tone ?? "professional"} voice.`,
      headline2:
        length === "Detailed"
          ? `${claimById.get("claim-security") ?? "Built with trusted safeguards."} Designed for teams that cannot compromise on compliance.`
          : (claimById.get("claim-security") ?? "Built with trusted safeguards."),
      usedClaimIds: ["claim-security"],
    };
  }

  // Prefer speed-focused copy when urgency is requested.
  if (input.rules?.emphasis === "Urgency") {
    return {
      headline1: "Launch faster with 10x performance gains.",
      headline2:
        length === "Detailed"
          ? `${claimById.get("claim-speed") ?? "Move at startup speed."} Keep every launch cycle short without sacrificing reliability.`
          : (claimById.get("claim-speed") ?? "Move at startup speed."),
      usedClaimIds: ["claim-speed"],
    };
  }

  // Default blend when no strong rule is selected.
  return {
    headline1: "Fast, secure results from day one.",
    headline2:
      length === "Detailed"
        ? "SOC2-backed platform performance with transparent $9/month entry pricing and 24/7 live support."
        : "SOC2-backed platform that starts at $9/month.",
    usedClaimIds: ["claim-security", "claim-price", ...(length === "Detailed" ? ["claim-support"] : [])],
  };
}

// Performs one generation attempt and normalizes output to strict schema.
async function runAttempt(
  input: DecideRequest,
  allowedClaims: AllowedClaim[],
  attempt: number,
): Promise<LlmCopyResult | null> {
  const raw = await mockLlmCall(input, allowedClaims, attempt);
  const normalized = sanitizeModelOutput(raw);
  console.log(`[decide] attempt=${attempt}`, { allowedClaims, output: raw, normalized });
  return normalized;
}

// Orchestrates generation with validation, single retry, and safe fallback.
export async function generateSafeCopy(
  input: DecideRequest,
  allowedClaims: AllowedClaim[],
): Promise<DecideResponse> {
  // First generation attempt.
  const first = await runAttempt(input, allowedClaims, 1);

  // Return immediately when first attempt passes validation.
  if (first && validateClaimSubset(first, allowedClaims)) {
    console.log("[decide] validation=pass attempt=1");
    return { ...first, isFallback: false, attempts: 1 };
  }

  // Mark failed validation and continue to one retry.
  console.warn("[decide] validation=fail attempt=1", { usedClaimIds: first?.usedClaimIds ?? [] });

  // Second generation attempt (single retry).
  const second = await runAttempt(input, allowedClaims, 2);

  // Return retry result when it passes validation.
  if (second && validateClaimSubset(second, allowedClaims)) {
    console.log("[decide] validation=pass attempt=2");
    return { ...second, isFallback: false, attempts: 2 };
  }

  // Final safety line: fallback when both attempts fail.
  console.error("[decide] validation=fail attempt=2 -> fallback", {
    usedClaimIds: second?.usedClaimIds ?? [],
  });
  return { ...FALLBACK_RESPONSE, isFallback: true, attempts: 2 };
}
