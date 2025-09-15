/**
 * Input validation utilities
 */

import { ZodSchema, ZodError } from 'zod';

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
        const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
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
        error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

export function isValidGeneratorName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  // Rails generator names can contain letters, numbers, underscores, slashes, and colons
  const generatorNameRegex = /^[a-zA-Z0-9_/:]{1,100}$/;
  return generatorNameRegex.test(name);
}

export function sanitizeGeneratorName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name.trim().slice(0, 100);
}

export function validateBoolean(
  value: unknown,
  defaultValue: boolean = false
): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return true;
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return false;
    }
  }

  return defaultValue;
}
