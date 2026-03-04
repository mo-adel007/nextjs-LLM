import type { AllowedClaim } from "@/lib/types";

// Canonical approved claims used by the validation boundary.
const STATIC_ALLOWED_CLAIMS: AllowedClaim[] = [
  { id: "claim-speed", text: "Our product is 10x faster than competitors." },
  { id: "claim-price", text: "Starts at $9/month." },
  { id: "claim-security", text: "SOC2 Type II Certified." },
  { id: "claim-support", text: "Live support available 24/7." },
];

// Exposes approved claims through a single async boundary.
export async function getAllowedClaims(): Promise<AllowedClaim[]> {
  // Async shape mirrors a future DB/service call while remaining deterministic in demo mode.
  return STATIC_ALLOWED_CLAIMS;
}
