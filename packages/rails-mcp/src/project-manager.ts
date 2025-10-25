/**
 * Project manager for handling multiple project directories
 */

import { promises as fs } from "node:fs";
import { join, resolve } from "node:path";

export interface ProjectConfig {
  name: string;
  path: string;
}

export class ProjectManager {
  private projects: Map<string, string> = new Map();
  private defaultProject: string;

  constructor(projects: ProjectConfig[] = [], defaultPath?: string) {
    this.defaultProject = defaultPath || process.cwd();

    // Add default project if not explicitly provided
    if (!projects.some((p) => p.name === "default")) {
      this.projects.set("default", this.defaultProject);
    }

    // Add configured projects
    for (const project of projects) {
      this.projects.set(project.name, resolve(project.path));
    }
  }

  /**
   * Add a project to the manager
   */
  async addProject(name: string, path: string): Promise<void> {
    const resolvedPath = resolve(path);

    // Validate project directory exists and is accessible
    try {
      const stats = await fs.stat(resolvedPath);
      if (!stats.isDirectory()) {
        throw new Error(`Project path is not a directory: ${resolvedPath}`);
      }

      // Check read/write permissions
      await fs.access(resolvedPath, fs.constants.R_OK);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("ENOENT")) {
          throw new Error(`Project directory does not exist: ${resolvedPath}`);
        }
        if (error.message.includes("EACCES")) {
          throw new Error(
            `Permission denied accessing project directory: ${resolvedPath}`
          );
        }
      }
      throw error;
    }

    this.projects.set(name, resolvedPath);
  }

  /**
   * Get project path by name, or return default if not found
   */
  getProjectPath(name?: string): string {
    if (!name) {
      return this.defaultProject;
    }

    const path = this.projects.get(name);
    if (!path) {
      throw new Error(
        `Project not found: ${name}. Available projects: ${Array.from(this.projects.keys()).join(", ")}`
      );
    }

    return path;
  }

  /**
   * Resolve a file path within a project
   */
  resolveFilePath(filePath: string, projectName?: string): string {
    const projectPath = this.getProjectPath(projectName);

    // If file path is already absolute, return it as-is
    if (resolve(filePath) === filePath) {
      return filePath;
    }

    // Otherwise, resolve relative to project path
    return join(projectPath, filePath);
  }

  /**
   * Get list of all project names
   */
  getProjectNames(): string[] {
    return Array.from(this.projects.keys());
  }

  /**
   * Check if a project exists
   */
  hasProject(name: string): boolean {
    return this.projects.has(name);
  }

  /**
   * Get the default project path
   */
  getDefaultProjectPath(): string {
    return this.defaultProject;
  }

  /**
   * Validate that all configured projects are accessible
   */
  async validateProjects(): Promise<void> {
    const errors: string[] = [];

    for (const [name, path] of this.projects.entries()) {
      try {
        const stats = await fs.stat(path);
        if (!stats.isDirectory()) {
          errors.push(`Project '${name}' path is not a directory: ${path}`);
          continue;
        }

        await fs.access(path, fs.constants.R_OK);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("ENOENT")) {
            errors.push(`Project '${name}' directory does not exist: ${path}`);
          } else if (error.message.includes("EACCES")) {
            errors.push(
              `Permission denied accessing project '${name}' directory: ${path}`
            );
          } else {
            errors.push(
              `Error accessing project '${name}' at ${path}: ${error.message}`
            );
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Project validation failed:\n${errors.join("\n")}`);
    }
  }
}
