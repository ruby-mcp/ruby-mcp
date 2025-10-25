/**
 * Utility functions for handling quote styles in gem declarations
 */

export type QuoteStyle = "single" | "double";

/**
 * Configuration for quote preferences
 */
export interface QuoteConfig {
  gemfile: QuoteStyle;
  gemspec: QuoteStyle;
}

/**
 * Default quote configuration
 */
export const DEFAULT_QUOTE_CONFIG: QuoteConfig = {
  gemfile: "single",
  gemspec: "double",
};

/**
 * Get the quote character for the specified style
 */
export function getQuoteChar(style: QuoteStyle): string {
  return style === "single" ? "'" : '"';
}

/**
 * Format a gem declaration for Gemfile with the specified quote style
 */
export function formatGemDeclaration(
  gemName: string,
  options: {
    version?: string;
    pinType?: string;
    source?: string;
    require?: boolean | string;
    quoteStyle: QuoteStyle;
  }
): string {
  const quote = getQuoteChar(options.quoteStyle);
  let declaration = `gem ${quote}${gemName}${quote}`;

  // Add version constraint if provided
  if (options.version && options.pinType) {
    declaration += `, ${quote}${options.pinType} ${options.version}${quote}`;
  }

  // Add source if provided
  if (options.source) {
    if (options.source.startsWith("http") || options.source.startsWith("git")) {
      declaration += `, git: ${quote}${options.source}${quote}`;
    } else if (
      options.source.startsWith("/") ||
      options.source.startsWith("./") ||
      options.source.startsWith("../")
    ) {
      declaration += `, path: ${quote}${options.source}${quote}`;
    } else {
      declaration += `, source: ${quote}${options.source}${quote}`;
    }
  }

  // Add require option if provided
  if (options.require !== undefined) {
    if (options.require === false) {
      declaration += ", require: false";
    } else {
      declaration += `, require: ${quote}${options.require}${quote}`;
    }
  }

  return declaration;
}

/**
 * Format a dependency declaration for gemspec with the specified quote style
 */
export function formatDependencyDeclaration(
  gemName: string,
  options: {
    version?: string;
    pinType?: string;
    dependencyType: "runtime" | "development";
    quoteStyle: QuoteStyle;
  }
): string {
  const quote = getQuoteChar(options.quoteStyle);
  const methodName =
    options.dependencyType === "development"
      ? "add_development_dependency"
      : "add_dependency";

  let declaration = `  spec.${methodName} ${quote}${gemName}${quote}`;

  // Add version constraint if provided
  if (options.version && options.pinType) {
    declaration += `, ${quote}${options.pinType} ${options.version}${quote}`;
  }

  return declaration;
}

/**
 * Parse quote style from string value
 */
export function parseQuoteStyle(value: string): QuoteStyle {
  const normalized = value.toLowerCase().trim();
  if (normalized === "single" || normalized === "'") {
    return "single";
  }
  if (normalized === "double" || normalized === '"') {
    return "double";
  }
  throw new Error(
    `Invalid quote style: ${value}. Must be 'single' or 'double'`
  );
}

/**
 * Update version requirement string with proper quote style in existing gem line
 */
export function formatVersionRequirement(
  version: string,
  pinType: string,
  quoteStyle: QuoteStyle
): string {
  const quote = getQuoteChar(quoteStyle);
  return `${quote}${pinType} ${version}${quote}`;
}

/**
 * Detect quote style from existing gem declaration
 */
export function detectQuoteStyle(gemLine: string): QuoteStyle {
  // Look for the first quote after 'gem'
  const match = gemLine.match(/gem\s+(['"])/);
  if (match) {
    return match[1] === "'" ? "single" : "double";
  }
  // Default to single quotes if we can't detect
  return "single";
}

/**
 * Replace gem name in existing line while preserving quote style
 */
export function replaceGemName(
  line: string,
  oldName: string,
  newName: string,
  preserveQuotes = true
): string {
  if (preserveQuotes) {
    // Preserve existing quote style
    const singleQuotePattern = new RegExp(`gem\\s+'${oldName}'`, "g");
    const doubleQuotePattern = new RegExp(`gem\\s+"${oldName}"`, "g");

    if (singleQuotePattern.test(line)) {
      return line.replace(singleQuotePattern, `gem '${newName}'`);
    }
    if (doubleQuotePattern.test(line)) {
      return line.replace(doubleQuotePattern, `gem "${newName}"`);
    }
  }

  // Fallback: replace any quote style
  return line.replace(
    new RegExp(`gem\\s+['"]${oldName}['"]`, "g"),
    `gem '${newName}'`
  );
}
