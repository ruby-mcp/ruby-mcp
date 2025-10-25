/**
 * Input validation utilities
 */

import { ZodError, type ZodSchema } from "zod";

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  issues?: string[];
}

export function validateInput<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const validated = schema.parse(data);
    return {
      success: true,
      data: validated,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "root";
        return `${path}: ${issue.message}`;
      });

      return {
        success: false,
        error: `Validation failed: ${issues[0]}`,
        issues,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown validation error",
    };
  }
}

export function isValidGemName(name: string): boolean {
  if (!name || typeof name !== "string") {
    return false;
  }

  const gemNameRegex = /^[a-zA-Z0-9_-]{1,50}$/;
  return gemNameRegex.test(name);
}

export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== "string") {
    return "";
  }

  return query.trim().slice(0, 100);
}

export function validateLimit(
  limit: unknown,
  defaultLimit = 10,
  maxLimit = 100
): number {
  if (
    typeof limit === "number" &&
    Number.isInteger(limit) &&
    limit > 0 &&
    limit <= maxLimit
  ) {
    return limit;
  }

  if (typeof limit === "string") {
    const parsed = Number.parseInt(limit, 10);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed <= maxLimit) {
      return parsed;
    }
  }

  return defaultLimit;
}

export function validateBoolean(value: unknown, defaultValue = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "true" || lower === "1" || lower === "yes") {
      return true;
    }
    if (lower === "false" || lower === "0" || lower === "no") {
      return false;
    }
  }

  return defaultValue;
}
