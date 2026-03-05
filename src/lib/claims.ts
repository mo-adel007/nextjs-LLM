// src/lib/claims.ts
// This module acts as the "mock database" of pre-approved claims.
// In production, these would come from a CMS, legal review tool, or database.
// The LLM is ONLY allowed to reference claims that appear in this list.
// Removing a claim here instantly prevents the LLM from using it — this is the
// marketing team's kill switch described in the Architecture Document (Section 5.3).

/**
 * Represents a single allowed claim — a fact the LLM is permitted to cite.
 * `id` is the unique key the model references in its `usedClaimIds` output.
 * `text` is the human-readable fact used in the prompt and shown in the admin UI.
 */
export interface AllowedClaim {
  id: string;   // Unique identifier (e.g. "claim-speed") — must match exactly in LLM output
  text: string;  // The actual approved fact (e.g. "Our product is 10x faster than competitors.")
}

/**
 * Returns the complete list of claims the LLM is allowed to use.
 * The validation boundary (in llm.ts) checks that every `usedClaimId`
 * returned by the model exists in this array — the subset rule.
 *
 * To simulate removing a claim (Section 5.3 demo), simply comment out
 * or delete an entry here and restart the server.
 */
export function getAllowedClaims(): AllowedClaim[] {
  // Each claim is a single fact pre-approved by the marketing/legal team
  return [
    { id: 'claim-speed', text: 'Our product is 10x faster than competitors.' },       // Performance claim
    { id: 'claim-price', text: 'Pricing starts at $9/month.' },                        // Pricing claim
    { id: 'claim-security', text: 'We are SOC2 Type II Certified.' },                  // Security/compliance claim
    { id: 'claim-mobile', text: 'Seamless mobile experience for iOS and Android.' },   // Mobile platform claim
    { id: 'claim-support', text: '24/7 dedicated customer support.' },                 // Support claim
  ];
}
