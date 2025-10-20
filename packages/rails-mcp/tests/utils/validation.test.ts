import { describe, it, expect } from 'vitest';
import {
  validateInput,
  isValidGeneratorName,
  sanitizeGeneratorName,
  validateBoolean,
} from '../../src/utils/validation.js';
import { z } from 'zod';

describe('validation utils', () => {
  describe('validateInput', () => {
    const simpleSchema = z.object({
      name: z.string().min(1),
      age: z.number().optional(),
    });

    it('should validate correct data successfully', () => {
      const result = validateInput(simpleSchema, { name: 'John', age: 30 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'John', age: 30 });
      expect(result.error).toBeUndefined();
    });

    it('should validate data without optional fields', () => {
      const result = validateInput(simpleSchema, { name: 'Jane' });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'Jane' });
    });

    it('should fail validation for missing required fields', () => {
      const result = validateInput(simpleSchema, { age: 25 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
      expect(result.error).toContain('name');
      expect(result.issues).toBeDefined();
      expect(result.issues?.length).toBeGreaterThan(0);
    });

    it('should fail validation for wrong types', () => {
      const result = validateInput(simpleSchema, { name: 123 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should include path in error message for nested fields', () => {
      const nestedSchema = z.object({
        user: z.object({
          name: z.string(),
        }),
      });

      const result = validateInput(nestedSchema, { user: { name: 123 } });
      expect(result.success).toBe(false);
      expect(result.error).toContain('user.name');
    });

    it('should handle root-level validation errors', () => {
      const result = validateInput(simpleSchema, null);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should handle multiple validation issues', () => {
      const multiSchema = z.object({
        name: z.string().min(3),
        email: z.string().email(),
        age: z.number().min(0),
      });

      const result = validateInput(multiSchema, {
        name: 'AB',
        email: 'invalid',
        age: -1,
      });

      expect(result.success).toBe(false);
      expect(result.issues).toBeDefined();
      expect(result.issues!.length).toBeGreaterThan(0);
    });

    it('should handle non-ZodError exceptions', () => {
      const throwingSchema = {
        parse: () => {
          throw new Error('Custom error');
        },
      } as z.ZodSchema<unknown>;

      const result = validateInput(throwingSchema, {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Custom error');
    });

    it('should handle non-Error exceptions', () => {
      const throwingSchema = {
        parse: () => {
          throw 'String error';
        },
      } as z.ZodSchema<unknown>;

      const result = validateInput(throwingSchema, {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown validation error');
    });
  });

  describe('isValidGeneratorName', () => {
    it('should accept valid generator names', () => {
      expect(isValidGeneratorName('model')).toBe(true);
      expect(isValidGeneratorName('controller')).toBe(true);
      expect(isValidGeneratorName('scaffold')).toBe(true);
      expect(isValidGeneratorName('migration')).toBe(true);
    });

    it('should accept generator names with underscores', () => {
      expect(isValidGeneratorName('active_record')).toBe(true);
      expect(isValidGeneratorName('my_custom_generator')).toBe(true);
    });

    it('should accept generator names with slashes', () => {
      expect(isValidGeneratorName('active_record/model')).toBe(true);
      expect(isValidGeneratorName('rspec/model')).toBe(true);
    });

    it('should accept generator names with colons', () => {
      expect(isValidGeneratorName('rails:model')).toBe(true);
      expect(isValidGeneratorName('my:custom:generator')).toBe(true);
    });

    it('should accept generator names with numbers', () => {
      expect(isValidGeneratorName('model123')).toBe(true);
      expect(isValidGeneratorName('123model')).toBe(true);
    });

    it('should reject empty strings', () => {
      expect(isValidGeneratorName('')).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(isValidGeneratorName(null as any)).toBe(false);
      expect(isValidGeneratorName(undefined as any)).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(isValidGeneratorName(123 as any)).toBe(false);
      expect(isValidGeneratorName({} as any)).toBe(false);
      expect(isValidGeneratorName([] as any)).toBe(false);
    });

    it('should reject names with invalid characters', () => {
      expect(isValidGeneratorName('model@name')).toBe(false);
      expect(isValidGeneratorName('model name')).toBe(false);
      expect(isValidGeneratorName('model-name')).toBe(false);
      expect(isValidGeneratorName('model.name')).toBe(false);
    });

    it('should reject names longer than 100 characters', () => {
      const longName = 'a'.repeat(101);
      expect(isValidGeneratorName(longName)).toBe(false);
    });

    it('should accept names with exactly 100 characters', () => {
      const maxName = 'a'.repeat(100);
      expect(isValidGeneratorName(maxName)).toBe(true);
    });
  });

  describe('sanitizeGeneratorName', () => {
    it('should trim whitespace from generator names', () => {
      expect(sanitizeGeneratorName('  model  ')).toBe('model');
      expect(sanitizeGeneratorName('\tcontroller\n')).toBe('controller');
    });

    it('should truncate names longer than 100 characters', () => {
      const longName = 'a'.repeat(150);
      const result = sanitizeGeneratorName(longName);
      expect(result.length).toBe(100);
      expect(result).toBe('a'.repeat(100));
    });

    it('should preserve valid generator names', () => {
      expect(sanitizeGeneratorName('model')).toBe('model');
      expect(sanitizeGeneratorName('active_record/model')).toBe(
        'active_record/model'
      );
    });

    it('should return empty string for empty input', () => {
      expect(sanitizeGeneratorName('')).toBe('');
    });

    it('should return empty string for null or undefined', () => {
      expect(sanitizeGeneratorName(null as any)).toBe('');
      expect(sanitizeGeneratorName(undefined as any)).toBe('');
    });

    it('should return empty string for non-string values', () => {
      expect(sanitizeGeneratorName(123 as any)).toBe('');
      expect(sanitizeGeneratorName({} as any)).toBe('');
      expect(sanitizeGeneratorName([] as any)).toBe('');
    });

    it('should handle names with both leading/trailing whitespace and length > 100', () => {
      const longName = '  ' + 'a'.repeat(150) + '  ';
      const result = sanitizeGeneratorName(longName);
      expect(result.length).toBe(100);
    });
  });

  describe('validateBoolean', () => {
    it('should return true for boolean true', () => {
      expect(validateBoolean(true)).toBe(true);
    });

    it('should return false for boolean false', () => {
      expect(validateBoolean(false)).toBe(false);
    });

    it('should return true for string "true"', () => {
      expect(validateBoolean('true')).toBe(true);
      expect(validateBoolean('TRUE')).toBe(true);
      expect(validateBoolean('True')).toBe(true);
    });

    it('should return true for string "1"', () => {
      expect(validateBoolean('1')).toBe(true);
    });

    it('should return true for string "yes"', () => {
      expect(validateBoolean('yes')).toBe(true);
      expect(validateBoolean('YES')).toBe(true);
      expect(validateBoolean('Yes')).toBe(true);
    });

    it('should return false for string "false"', () => {
      expect(validateBoolean('false')).toBe(false);
      expect(validateBoolean('FALSE')).toBe(false);
      expect(validateBoolean('False')).toBe(false);
    });

    it('should return false for string "0"', () => {
      expect(validateBoolean('0')).toBe(false);
    });

    it('should return false for string "no"', () => {
      expect(validateBoolean('no')).toBe(false);
      expect(validateBoolean('NO')).toBe(false);
      expect(validateBoolean('No')).toBe(false);
    });

    it('should return default value for unrecognized strings', () => {
      expect(validateBoolean('maybe')).toBe(false);
      expect(validateBoolean('maybe', true)).toBe(true);
      expect(validateBoolean('invalid', false)).toBe(false);
    });

    it('should return default value for numbers', () => {
      expect(validateBoolean(123)).toBe(false);
      expect(validateBoolean(123, true)).toBe(true);
      expect(validateBoolean(0, true)).toBe(true);
    });

    it('should return default value for objects', () => {
      expect(validateBoolean({})).toBe(false);
      expect(validateBoolean({}, true)).toBe(true);
    });

    it('should return default value for null and undefined', () => {
      expect(validateBoolean(null)).toBe(false);
      expect(validateBoolean(null, true)).toBe(true);
      expect(validateBoolean(undefined)).toBe(false);
      expect(validateBoolean(undefined, true)).toBe(true);
    });

    it('should use false as default when no default provided', () => {
      expect(validateBoolean('unknown')).toBe(false);
      expect(validateBoolean(null)).toBe(false);
      expect(validateBoolean(undefined)).toBe(false);
    });
  });
});
