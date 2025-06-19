import * as vscode from 'vscode';
import { FileUtils } from '../utils/FileUtils';

export interface Theme {
    name: string;
    displayName: string;
    description: string;
    author?: string;
    version?: string;
    styles: ThemeStyles;
    layouts?: ThemeLayouts;
    scripts?: string[];
}

export interface ThemeStyles {
    css: string;
    variables?: Record<string, string>;
    typography?: TypographySettings;
    colors?: ColorPalette;
}

export interface ThemeLayouts {
    default?: string;
    slides?: string;
    paged?: string;
}

export interface TypographySettings {
    fontFamily?: string;
    fontSize?: string;
    lineHeight?: string;
    headingFont?: string;
    codeFont?: string;
}

export interface ColorPalette {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    foreground?: string;
    muted?: string;
    border?: string;
    success?: string;
    warning?: string;
    error?: string;
    info?: string;
}

export class ThemeManager {
    private themes: Map<string, Theme> = new Map();
    private activeTheme: string = 'default';

    constructor() {
        this.initializeBuiltinThemes();
    }

    /**
     * Get available theme names
     */
    public getThemeNames(): string[] {
        return Array.from(this.themes.keys());
    }

    /**
     * Get theme by name
     */
    public getTheme(name: string): Theme | undefined {
        return this.themes.get(name);
    }

    /**
     * Get the currently active theme
     */
    public getActiveTheme(): Theme {
        return this.themes.get(this.activeTheme) || this.themes.get('default')!;
    }

    /**
     * Set the active theme
     */
    public setActiveTheme(name: string): boolean {
        if (this.themes.has(name)) {
            this.activeTheme = name;
            return true;
        }
        return false;
    }

    /**
     * Register a new theme
     */
    public registerTheme(theme: Theme): void {
        this.themes.set(theme.name, theme);
    }

    /**
     * Load theme from file
     */
    public async loadThemeFromFile(filePath: string): Promise<Theme | null> {
        try {
            const content = await FileUtils.readFile(filePath);
            if (!content) return null;

            const themeData = JSON.parse(content);
            const theme = this.validateTheme(themeData);
            
            if (theme) {
                this.registerTheme(theme);
                return theme;
            }
        } catch (error) {
            console.error(`Failed to load theme from ${filePath}:`, error);
        }

        return null;
    }

    /**
     * Generate CSS for a theme
     */
    public generateCSS(themeName: string, doctype: string = 'plain'): string {
        const theme = this.getTheme(themeName);
        if (!theme) return '';

        let css = theme.styles.css;

        // Add CSS variables
        if (theme.styles.variables) {
            const variables = Object.entries(theme.styles.variables)
                .map(([key, value]) => `  --${key}: ${value};`)
                .join('\n');
            
            css = `:root {\n${variables}\n}\n\n${css}`;
        }

        // Add color palette
        if (theme.styles.colors) {
            const colorVars = Object.entries(theme.styles.colors)
                .map(([key, value]) => `  --color-${key}: ${value};`)
                .join('\n');
            
            css = `:root {\n${colorVars}\n}\n\n${css}`;
        }

        // Add typography
        if (theme.styles.typography) {
            css = this.applyTypography(css, theme.styles.typography);
        }

        // Add layout-specific styles
        if (theme.layouts && theme.layouts[doctype as keyof ThemeLayouts]) {
            css += `\n\n/* ${doctype} layout */\n`;
            css += theme.layouts[doctype as keyof ThemeLayouts];
        }

        return css;
    }

    /**
     * Get theme picker items for VS Code QuickPick
     */
    public getThemePickerItems(): vscode.QuickPickItem[] {
        return Array.from(this.themes.values()).map(theme => ({
            label: theme.displayName,
            description: theme.description,
            detail: theme.author ? `by ${theme.author}` : undefined,
            picked: theme.name === this.activeTheme
        }));
    }

    /**
     * Create a new theme from template
     */
    public createThemeFromTemplate(name: string, baseTheme: string = 'default'): Theme {
        const base = this.getTheme(baseTheme);
        if (!base) {
            throw new Error(`Base theme '${baseTheme}' not found`);
        }

        return {
            ...base,
            name,
            displayName: name,
            description: `Custom theme based on ${base.displayName}`,
            author: 'User',
            version: '1.0.0'
        };
    }

    private initializeBuiltinThemes(): void {
        // Default theme
        this.registerTheme({
            name: 'default',
            displayName: 'Default',
            description: 'Clean and professional default theme',
            author: 'Quarkdown Team',
            version: '1.0.0',
            styles: {
                css: this.getDefaultCSS(),
                colors: {
                    primary: '#0366d6',
                    secondary: '#6a737d',
                    background: '#ffffff',
                    foreground: '#24292e',
                    muted: '#f6f8fa',
                    border: '#e1e4e8',
                    success: '#28a745',
                    warning: '#ffd33d',
                    error: '#d73a49',
                    info: '#0366d6'
                },
                typography: {
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '16px',
                    lineHeight: '1.6',
                    headingFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    codeFont: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace'
                }
            }
        });

        // Dark theme (Darko)
        this.registerTheme({
            name: 'darko',
            displayName: 'Darko',
            description: 'Dark theme with gradient backgrounds',
            author: 'Quarkdown Team',
            version: '1.0.0',
            styles: {
                css: this.getDarkoCSS(),
                colors: {
                    primary: '#58a6ff',
                    secondary: '#8b949e',
                    background: '#0d1117',
                    foreground: '#c9d1d9',
                    muted: '#21262d',
                    border: '#30363d',
                    success: '#238636',
                    warning: '#d29922',
                    error: '#f85149',
                    info: '#58a6ff'
                },
                typography: {
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '16px',
                    lineHeight: '1.6',
                    headingFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    codeFont: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace'
                }
            }
        });

        // Minimal theme
        this.registerTheme({
            name: 'minimal',
            displayName: 'Minimal',
            description: 'Clean and minimal typography-focused theme',
            author: 'Quarkdown Team',
            version: '1.0.0',
            styles: {
                css: this.getMinimalCSS(),
                colors: {
                    primary: '#333333',
                    secondary: '#666666',
                    background: '#ffffff',
                    foreground: '#333333',
                    muted: '#f5f5f5',
                    border: '#e0e0e0',
                    success: '#4caf50',
                    warning: '#ff9800',
                    error: '#f44336',
                    info: '#2196f3'
                },
                typography: {
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: '18px',
                    lineHeight: '1.8',
                    headingFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    codeFont: '"Roboto Mono", "Courier New", monospace'
                }
            }
        });

        // Academic theme
        this.registerTheme({
            name: 'academic',
            displayName: 'Academic',
            description: 'Professional theme for academic papers',
            author: 'Quarkdown Team',
            version: '1.0.0',
            styles: {
                css: this.getAcademicCSS(),
                colors: {
                    primary: '#1a237e',
                    secondary: '#555555',
                    background: '#ffffff',
                    foreground: '#212121',
                    muted: '#f8f9fa',
                    border: '#dee2e6',
                    success: '#28a745',
                    warning: '#ffc107',
                    error: '#dc3545',
                    info: '#17a2b8'
                },
                typography: {
                    fontFamily: '"Times New Roman", Times, serif',
                    fontSize: '12pt',
                    lineHeight: '1.5',
                    headingFont: '"Times New Roman", Times, serif',
                    codeFont: '"Courier New", Courier, monospace'
                }
            },
            layouts: {
                paged: this.getAcademicPagedLayout()
            }
        });
    }

    private validateTheme(data: any): Theme | null {
        if (!data.name || !data.displayName || !data.styles) {
            return null;
        }

        return {
            name: data.name,
            displayName: data.displayName,
            description: data.description || '',
            author: data.author,
            version: data.version,
            styles: data.styles,
            layouts: data.layouts,
            scripts: data.scripts
        };
    }

    private applyTypography(css: string, typography: TypographySettings): string {
        let result = css;

        if (typography.fontFamily) {
            result += `\nbody { font-family: ${typography.fontFamily}; }`;
        }

        if (typography.fontSize) {
            result += `\nbody { font-size: ${typography.fontSize}; }`;
        }

        if (typography.lineHeight) {
            result += `\nbody { line-height: ${typography.lineHeight}; }`;
        }

        if (typography.headingFont) {
            result += `\nh1, h2, h3, h4, h5, h6 { font-family: ${typography.headingFont}; }`;
        }

        if (typography.codeFont) {
            result += `\ncode, pre { font-family: ${typography.codeFont}; }`;
        }

        return result;
    }

    private getDefaultCSS(): string {
        return `
/* Default theme styles */
body {
    color: var(--color-foreground);
    background-color: var(--color-background);
    margin: 0;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
}

h1, h2, h3, h4, h5, h6 {
    color: var(--color-primary);
    margin-top: 2rem;
    margin-bottom: 1rem;
    font-weight: 600;
}

a {
    color: var(--color-primary);
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

code {
    background-color: var(--color-muted);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
}

pre {
    background-color: var(--color-muted);
    padding: 1rem;
    border-radius: 6px;
    overflow-x: auto;
}

blockquote {
    border-left: 4px solid var(--color-border);
    margin: 0;
    padding-left: 1rem;
    color: var(--color-secondary);
}

table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
}

th, td {
    border: 1px solid var(--color-border);
    padding: 0.5rem;
}

th {
    background-color: var(--color-muted);
    font-weight: 600;
}
        `.trim();
    }

    private getDarkoCSS(): string {
        return `
/* Darko theme styles */
body {
    background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
    color: var(--color-foreground);
    margin: 0;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
}

.document-content {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 2rem;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

h1, h2, h3, h4, h5, h6 {
    color: var(--color-primary);
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    margin-top: 2rem;
    margin-bottom: 1rem;
    font-weight: 600;
}

a {
    color: var(--color-primary);
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
    text-shadow: 0 0 8px var(--color-primary);
}

code {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--color-foreground);
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-size: 0.9em;
}

pre {
    background-color: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
}

blockquote {
    border-left: 4px solid var(--color-primary);
    background: rgba(255, 255, 255, 0.05);
    margin: 0;
    padding: 1rem;
    border-radius: 0 8px 8px 0;
    color: var(--color-foreground);
}

table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    overflow: hidden;
}

th, td {
    border: 1px solid var(--color-border);
    padding: 0.75rem;
}

th {
    background-color: rgba(255, 255, 255, 0.1);
    font-weight: 600;
}
        `.trim();
    }

    private getMinimalCSS(): string {
        return `
/* Minimal theme styles */
body {
    color: var(--color-foreground);
    background-color: var(--color-background);
    margin: 0;
    padding: 3rem 2rem;
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.8;
}

h1, h2, h3, h4, h5, h6 {
    color: var(--color-primary);
    margin-top: 3rem;
    margin-bottom: 1.5rem;
    font-weight: 300;
    line-height: 1.2;
}

h1 {
    font-size: 2.5em;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 1rem;
}

h2 {
    font-size: 2em;
}

h3 {
    font-size: 1.5em;
}

p {
    margin-bottom: 1.5rem;
}

a {
    color: var(--color-primary);
    text-decoration: none;
    border-bottom: 1px dotted var(--color-primary);
}

a:hover {
    border-bottom-style: solid;
}

code {
    background-color: var(--color-muted);
    padding: 0.1em 0.3em;
    border-radius: 2px;
    font-size: 0.9em;
}

pre {
    background-color: var(--color-muted);
    padding: 1.5rem;
    border-left: 4px solid var(--color-border);
    margin: 2rem 0;
    overflow-x: auto;
}

blockquote {
    border-left: 4px solid var(--color-border);
    margin: 2rem 0;
    padding-left: 2rem;
    font-style: italic;
    color: var(--color-secondary);
}

ul, ol {
    margin: 1.5rem 0;
    padding-left: 2rem;
}

li {
    margin-bottom: 0.5rem;
}
        `.trim();
    }

    private getAcademicCSS(): string {
        return `
/* Academic theme styles */
body {
    color: var(--color-foreground);
    background-color: var(--color-background);
    margin: 0;
    padding: 2.5cm;
    max-width: 21cm;
    margin: 0 auto;
    font-size: 12pt;
    line-height: 1.5;
}

h1, h2, h3, h4, h5, h6 {
    color: var(--color-primary);
    font-weight: bold;
    margin-top: 24pt;
    margin-bottom: 12pt;
}

h1 {
    font-size: 18pt;
    text-align: center;
    margin-bottom: 24pt;
}

h2 {
    font-size: 14pt;
}

h3 {
    font-size: 12pt;
}

.author {
    text-align: center;
    margin-bottom: 24pt;
    font-style: italic;
}

.abstract {
    margin: 24pt 48pt;
    font-style: italic;
}

p {
    text-align: justify;
    margin-bottom: 12pt;
    text-indent: 1em;
}

.figure, .table {
    margin: 12pt 0;
    text-align: center;
}

.caption {
    font-size: 10pt;
    margin-top: 6pt;
    text-align: center;
}

.references {
    margin-top: 24pt;
}

.references h2 {
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 6pt;
}

@media print {
    body {
        margin: 0;
        padding: 2.5cm;
    }
    
    h1, h2, h3 {
        page-break-after: avoid;
    }
    
    img, table {
        page-break-inside: avoid;
    }
}
        `.trim();
    }

    private getAcademicPagedLayout(): string {
        return `
/* Academic paged layout */
@page {
    size: A4;
    margin: 2.5cm;
    @top-center {
        content: string(document-title);
        font-size: 10pt;
        color: #666;
    }
    @bottom-center {
        content: "Page " counter(page);
        font-size: 10pt;
        color: #666;
    }
}

.title {
    string-set: document-title content();
}

.page-break {
    page-break-before: always;
}

.no-break {
    page-break-inside: avoid;
}
        `.trim();
    }
}

export const themeManager = new ThemeManager();