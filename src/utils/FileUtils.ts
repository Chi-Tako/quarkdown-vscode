import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

export class FileUtils {
    /**
     * Safely read a file with error handling
     */
    public static async readFile(filePath: string): Promise<string | null> {
        try {
            return await fs.readFile(filePath, 'utf8');
        } catch (error) {
            console.warn(`Failed to read file: ${filePath}`, error);
            return null;
        }
    }

    /**
     * Safely write a file with directory creation
     */
    public static async writeFile(filePath: string, content: string): Promise<boolean> {
        try {
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, content, 'utf8');
            return true;
        } catch (error) {
            console.error(`Failed to write file: ${filePath}`, error);
            return false;
        }
    }

    /**
     * Check if a file exists
     */
    public static async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get all Quarkdown files in a directory recursively
     */
    public static async findQuarkdownFiles(dirPath: string): Promise<string[]> {
        const files: string[] = [];

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    const subFiles = await this.findQuarkdownFiles(fullPath);
                    files.push(...subFiles);
                } else if (entry.isFile() && entry.name.endsWith('.qmd')) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            console.warn(`Failed to read directory: ${dirPath}`, error);
        }

        return files;
    }

    /**
     * Resolve include paths relative to the current document
     */
    public static resolveIncludePath(includePath: string, currentDocumentPath: string): string {
        if (path.isAbsolute(includePath)) {
            return includePath;
        }

        const currentDir = path.dirname(currentDocumentPath);
        return path.resolve(currentDir, includePath);
    }

    /**
     * Get workspace root path
     */
    public static getWorkspaceRoot(): string | undefined {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            return vscode.workspace.workspaceFolders[0].uri.fsPath;
        }
        return undefined;
    }

    /**
     * Create a relative path from workspace root
     */
    public static getRelativePathFromWorkspace(filePath: string): string {
        const workspaceRoot = this.getWorkspaceRoot();
        if (workspaceRoot) {
            return path.relative(workspaceRoot, filePath);
        }
        return filePath;
    }

    /**
     * Normalize path separators for cross-platform compatibility
     */
    public static normalizePath(filePath: string): string {
        return filePath.replace(/\\/g, '/');
    }

    /**
     * Get file extension without the dot
     */
    public static getFileExtension(filePath: string): string {
        return path.extname(filePath).slice(1).toLowerCase();
    }

    /**
     * Generate a unique filename if the target already exists
     */
    public static async generateUniqueFilename(basePath: string): Promise<string> {
        let counter = 1;
        let uniquePath = basePath;

        while (await this.fileExists(uniquePath)) {
            const ext = path.extname(basePath);
            const nameWithoutExt = path.basename(basePath, ext);
            const dir = path.dirname(basePath);
            uniquePath = path.join(dir, `${nameWithoutExt}-${counter}${ext}`);
            counter++;
        }

        return uniquePath;
    }

    /**
     * Watch for file changes
     */
    public static createFileWatcher(
        pattern: string,
        onChange: (uri: vscode.Uri) => void
    ): vscode.FileSystemWatcher {
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        watcher.onDidChange(onChange);
        watcher.onDidCreate(onChange);
        watcher.onDidDelete(onChange);

        return watcher;
    }

    /**
     * Copy file from source to destination
     */
    public static async copyFile(source: string, destination: string): Promise<boolean> {
        try {
            await fs.mkdir(path.dirname(destination), { recursive: true });
            await fs.copyFile(source, destination);
            return true;
        } catch (error) {
            console.error(`Failed to copy file from ${source} to ${destination}`, error);
            return false;
        }
    }

    /**
     * Delete file safely
     */
    public static async deleteFile(filePath: string): Promise<boolean> {
        try {
            await fs.unlink(filePath);
            return true;
        } catch (error) {
            console.warn(`Failed to delete file: ${filePath}`, error);
            return false;
        }
    }

    /**
     * Get file stats
     */
    public static async getFileStats(filePath: string): Promise<fs.Stats | null> {
        try {
            return await fs.stat(filePath);
        } catch {
            return null;
        }
    }

    /**
     * Check if path is a directory
     */
    public static async isDirectory(filePath: string): Promise<boolean> {
        const stats = await this.getFileStats(filePath);
        return stats?.isDirectory() ?? false;
    }

    /**
     * Ensure directory exists
     */
    public static async ensureDirectory(dirPath: string): Promise<boolean> {
        try {
            await fs.mkdir(dirPath, { recursive: true });
            return true;
        } catch (error) {
            console.error(`Failed to create directory: ${dirPath}`, error);
            return false;
        }
    }

    /**
     * Get temporary file path
     */
    public static getTempFilePath(filename: string): string {
        const tempDir = require('os').tmpdir();
        return path.join(tempDir, 'quarkdown', filename);
    }

    /**
     * Clean up temporary files
     */
    public static async cleanupTempFiles(): Promise<void> {
        const tempDir = path.join(require('os').tmpdir(), 'quarkdown');
        
        try {
            if (await this.fileExists(tempDir)) {
                await fs.rm(tempDir, { recursive: true, force: true });
            }
        } catch (error) {
            console.warn('Failed to cleanup temp files', error);
        }
    }
}

export class PathUtils {
    /**
     * Convert Windows paths to Unix-style paths
     */
    public static toUnixPath(windowsPath: string): string {
        return windowsPath.replace(/\\/g, '/');
    }

    /**
     * Join paths with Unix-style separators
     */
    public static joinUnix(...paths: string[]): string {
        return paths.join('/').replace(/\/+/g, '/');
    }

    /**
     * Get the common base path of multiple paths
     */
    public static getCommonBasePath(paths: string[]): string {
        if (paths.length === 0) return '';
        if (paths.length === 1) return path.dirname(paths[0]);

        const normalizedPaths = paths.map(p => path.normalize(p));
        const segments = normalizedPaths.map(p => p.split(path.sep));
        
        let commonSegments: string[] = [];
        const minLength = Math.min(...segments.map(s => s.length));

        for (let i = 0; i < minLength; i++) {
            const segment = segments[0][i];
            if (segments.every(s => s[i] === segment)) {
                commonSegments.push(segment);
            } else {
                break;
            }
        }

        return commonSegments.join(path.sep);
    }

    /**
     * Check if a path is within another path
     */
    public static isWithinPath(childPath: string, parentPath: string): boolean {
        const relative = path.relative(parentPath, childPath);
        return !relative.startsWith('..') && !path.isAbsolute(relative);
    }

    /**
     * Generate a safe filename from a string
     */
    public static sanitizeFilename(filename: string): string {
        return filename
            .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
            .toLowerCase();
    }

    /**
     * Get a human-readable file size
     */
    public static formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
}

export class TemplateUtils {
    /**
     * Replace template variables in content
     */
    public static replaceVariables(content: string, variables: Record<string, string>): string {
        let result = content;

        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            result = result.replace(regex, value);
        }

        return result;
    }

    /**
     * Extract template variables from content
     */
    public static extractVariables(content: string): string[] {
        const matches = content.match(/\{\{([^}]+)\}\}/g);
        if (!matches) return [];

        return matches.map(match => match.slice(2, -2));
    }

    /**
     * Create template from content by replacing values with variables
     */
    public static createTemplate(content: string, replacements: Record<string, string>): string {
        let template = content;

        for (const [variable, value] of Object.entries(replacements)) {
            const regex = new RegExp(escapeRegExp(value), 'g');
            template = template.replace(regex, `{{${variable}}}`);
        }

        return template;
    }
}

function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}