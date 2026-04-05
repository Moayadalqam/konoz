import { logger } from "./logger";

const SUPABASE_ERROR_MAP: Record<string, string> = {
  "23505": "This record already exists.",
  "23503": "This record is referenced by other data and cannot be modified.",
  "23514": "The provided data does not meet the required constraints.",
  "42501": "You do not have permission to perform this action.",
  "PGRST116": "Record not found.",
  "PGRST301": "Request too large.",
};

export function handleActionError(
  error: unknown,
  action: string,
  context?: Record<string, unknown>,
): never {
  const raw = error instanceof Error ? error.message : String(error);

  logger.error(action, raw, context);

  // Check for known Supabase/PostgreSQL error codes in the message
  for (const [code, friendly] of Object.entries(SUPABASE_ERROR_MAP)) {
    if (raw.includes(code)) {
      throw new Error(friendly);
    }
  }

  // Generic fallback — never leak raw DB message
  if (raw.includes("duplicate key")) {
    throw new Error("This record already exists.");
  }
  if (raw.includes("violates foreign key")) {
    throw new Error("This record references data that no longer exists.");
  }
  if (raw.includes("permission denied") || raw.includes("RLS")) {
    throw new Error("You do not have permission to perform this action.");
  }

  throw new Error("Something went wrong. Please try again.");
}
