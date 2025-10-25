/**
 * Zod validation schemas for MCP tool inputs
 */

import { z } from "zod";

// Schema for listing generators
export const ListGeneratorsSchema = z.object({
  project: z.string().max(100).optional(),
});

// Schema for getting generator help
export const GetGeneratorHelpSchema = z.object({
  generator_name: z
    .string()
    .min(1, "Generator name cannot be empty")
    .max(100, "Generator name too long"),
  project: z.string().max(100).optional(),
});

// Schema for executing generators
export const GenerateSchema = z.object({
  generator_name: z
    .string()
    .min(1, "Generator name cannot be empty")
    .max(100, "Generator name too long"),
  arguments: z.array(z.string()).optional().default([]),
  options: z
    .record(z.string(), z.union([z.string(), z.boolean(), z.array(z.string())]))
    .optional()
    .default({}),
  project: z.string().max(100).optional(),
});

// Schema for executing destroy commands
export const DestroySchema = z.object({
  generator_name: z
    .string()
    .min(1, "Generator name cannot be empty")
    .max(100, "Generator name too long"),
  arguments: z.array(z.string()).optional().default([]),
  options: z
    .record(z.string(), z.union([z.string(), z.boolean(), z.array(z.string())]))
    .optional()
    .default({}),
  project: z.string().max(100).optional(),
});

// Type exports for use in tools
export type ListGeneratorsInput = z.infer<typeof ListGeneratorsSchema>;
export type GetGeneratorHelpInput = z.infer<typeof GetGeneratorHelpSchema>;
export type GenerateInput = z.infer<typeof GenerateSchema>;
export type DestroyInput = z.infer<typeof DestroySchema>;
