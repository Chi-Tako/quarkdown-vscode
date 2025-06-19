import * as vscode from 'vscode';
import * as path from 'path';
import { FileUtils } from '../utils/FileUtils';

export interface QuarkdownConfig {
    preview: PreviewConfig;
    export: ExportConfig;
    language: LanguageConfig;
    themes: ThemeConfig;
    projects: ProjectConfig;
}

export interface PreviewConfig {
    autoRefresh: boolean;
    theme: string;
    port: number;
    openInSeparateWindow: boolean;
    scrollSync: boolean;
    refreshDelay: number;
}

export interface ExportConfig {
    outputDirectory: string;
    defaultFormat: 'html' | 'pdf';
    openAfterExport: boolean;
    cleanOutputDirectory: boolean;
    pdfOptions: PdfExportOptions;
    htmlOptions: HtmlExportOptions;
}

export interface PdfExportOptions {
    format: 'A4' | 'Letter' | 'Legal';
    orientation: 'portrait' | 'landscape';
    margins: {
        top: string;
        bottom: string;
        left: string;
        right: string;
    };
    includePrintStyles: boolean;
    waitForNetworkIdle: boolean;
}

export interface HtmlExportOptions {
    standalone: boolean;
    includeStyles: boolean;
    minify: boolean;
    embedImages: boolean;
}

export interface LanguageConfig {
    enableAutoCompletion: boolean;
    enableHover: boolean;
    enableDiagnostics: boolean;
    diagnosticsDelay: number;
    enableSnippets: boolean;
    enableFormatting: boolean;
}

export interface ThemeConfig {
    customThemesPath: string;
    enableThemePreview: boolean;
    defaultTheme: string;
}

export interface ProjectConfig {
    defaultTemplate: string;
    templatesPath: string;
    enableProjectWizard: boolean;
    autoCreateGitignore: boolean;
    autoCreateReadme: boolean;
}

export class ConfigManager {
    private static instance: ConfigManager;
    private config: QuarkdownConfig;
    private readonly configKey = 'quarkdown';

    private constructor() {
        this.config = this.loadConfig();
        this.setupConfigWatcher();
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    /**
     * Get the complete configuration
     */
    public getConfig(): QuarkdownConfig {
        return { ...this.config };
    }

    /**
     * Get preview configuration
     */
    public getPreviewConfig(): PreviewConfig {
        return { ...this.config.preview };
    }

    /**
     * Get export configuration
     */
    public getExportConfig(): ExportConfig {
        return { ...this.config.export };
    }

    /**
     * Get language configuration
     */
    public getLanguageConfig(): LanguageConfig {
        return { ...this.config.language };
    }

    /**
     * Get theme configuration
     */
    public getThemeConfig(): ThemeConfig {
        return { ...this.config.themes };
    }

    /**
     * Get project configuration
     */
    public getProjectConfig(): ProjectConfig {
        return { ...this.config.projects };
    }

    /**
     * Update configuration section
     */
    public async updateConfig<T extends keyof QuarkdownConfig>(
        section: T,
        values: Partial<QuarkdownConfig[T]>
    ): Promise<void> {
        const vscodeConfig = vscode.workspace.getConfiguration(this.configKey);
        
        for (const [key, value] of Object.entries(values)) {
            await vscodeConfig.update(`${section}.${key}`, value, vscode.ConfigurationTarget.Global);
        }

        // Reload configuration
        this.config = this.loadConfig();
    }

    /**
     * Reset configuration to defaults
     */
    public async resetConfig(): Promise<void> {
        const vscodeConfig = vscode.workspace.getConfiguration(this.configKey);
        const keys = Object.keys(this.getDefaultConfig());

        for (const key of keys) {
            await vscodeConfig.update(key, undefined, vscode.ConfigurationTarget.Global);
        }

        this.config = this.loadConfig();
    }

    /**
     * Export configuration to file
     */
    public async exportConfig(filePath: string): Promise<boolean> {
        try {
            const configJson = JSON.stringify(this.config, null, 2);
            return await FileUtils.writeFile(filePath, configJson);
        } catch (error) {
            console.error('Failed to export configuration:', error);
            return false;
        }
    }

    /**
     * Import configuration from file
     */
    public async importConfig(filePath: string): Promise<boolean> {
        try {
            const content = await FileUtils.readFile(filePath);
            if (!content) return false;

            const importedConfig = JSON.parse(content) as QuarkdownConfig;
            const validatedConfig = this.validateConfig(importedConfig);

            if (validatedConfig) {
                await this.applyConfig(validatedConfig);
                return true;
            }
        } catch (error) {
            console.error('Failed to import configuration:', error);
        }

        return false;
    }

    /**
     * Get workspace-specific configuration
     */
    public getWorkspaceConfig(): Partial<QuarkdownConfig> | null {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return null;

        const workspaceConfig = vscode.workspace.getConfiguration(this.configKey, workspaceFolder);
        return this.extractConfigFromVSCode(workspaceConfig);
    }

    /**
     * Get configuration schema for validation
     */
    public getConfigSchema(): any {
        return {
            type: 'object',
            properties: {
                preview: {
                    type: 'object',
                    properties: {
                        autoRefresh: { type: 'boolean' },
                        theme: { type: 'string' },
                        port: { type: 'number', minimum: 1024, maximum: 65535 },
                        openInSeparateWindow: { type: 'boolean' },
                        scrollSync: { type: 'boolean' },
                        refreshDelay: { type: 'number', minimum: 0 }
                    }
                },
                export: {
                    type: 'object',
                    properties: {
                        outputDirectory: { type: 'string' },
                        defaultFormat: { type: 'string', enum: ['html', 'pdf'] },
                        openAfterExport: { type: 'boolean' },
                        cleanOutputDirectory: { type: 'boolean' }
                    }
                },
                language: {
                    type: 'object',
                    properties: {
                        enableAutoCompletion: { type: 'boolean' },
                        enableHover: { type: 'boolean' },
                        enableDiagnostics: { type: 'boolean' },
                        diagnosticsDelay: { type: 'number', minimum: 0 },
                        enableSnippets: { type: 'boolean' },
                        enableFormatting: { type: 'boolean' }
                    }
                }
            }
        };
    }

    private loadConfig(): QuarkdownConfig {
        const vscodeConfig = vscode.workspace.getConfiguration(this.configKey);
        const defaultConfig = this.getDefaultConfig();
        
        return {
            preview: {
                ...defaultConfig.preview,
                ...this.extractSection(vscodeConfig, 'preview')
            },
            export: {
                ...defaultConfig.export,
                ...this.extractSection(vscodeConfig, 'export'),
                pdfOptions: {
                    ...defaultConfig.export.pdfOptions,
                    ...this.extractSection(vscodeConfig, 'export.pdfOptions')
                },
                htmlOptions: {
                    ...defaultConfig.export.htmlOptions,
                    ...this.extractSection(vscodeConfig, 'export.htmlOptions')
                }
            },
            language: {
                ...defaultConfig.language,
                ...this.extractSection(vscodeConfig, 'language')
            },
            themes: {
                ...defaultConfig.themes,
                ...this.extractSection(vscodeConfig, 'themes')
            },
            projects: {
                ...defaultConfig.projects,
                ...this.extractSection(vscodeConfig, 'projects')
            }
        };
    }

    private extractSection(config: vscode.WorkspaceConfiguration, section: string): any {
        const result: any = {};
        const sectionConfig = config.get(section);
        
        if (sectionConfig && typeof sectionConfig === 'object') {
            Object.assign(result, sectionConfig);
        }

        return result;
    }

    private extractConfigFromVSCode(config: vscode.WorkspaceConfiguration): Partial<QuarkdownConfig> {
        return {
            preview: this.extractSection(config, 'preview'),
            export: this.extractSection(config, 'export'),
            language: this.extractSection(config, 'language'),
            themes: this.extractSection(config, 'themes'),
            projects: this.extractSection(config, 'projects')
        };
    }

    private getDefaultConfig(): QuarkdownConfig {
        return {
            preview: {
                autoRefresh: true,
                theme: 'default',
                port: 8080,
                openInSeparateWindow: false,
                scrollSync: true,
                refreshDelay: 300
            },
            export: {
                outputDirectory: './output',
                defaultFormat: 'html',
                openAfterExport: true,
                cleanOutputDirectory: false,
                pdfOptions: {
                    format: 'A4',
                    orientation: 'portrait',
                    margins: {
                        top: '1cm',
                        bottom: '1cm',
                        left: '1cm',
                        right: '1cm'
                    },
                    includePrintStyles: true,
                    waitForNetworkIdle: true
                },
                htmlOptions: {
                    standalone: true,
                    includeStyles: true,
                    minify: false,
                    embedImages: false
                }
            },
            language: {
                enableAutoCompletion: true,
                enableHover: true,
                enableDiagnostics: true,
                diagnosticsDelay: 500,
                enableSnippets: true,
                enableFormatting: true
            },
            themes: {
                customThemesPath: '.quarkdown/themes',
                enableThemePreview: true,
                defaultTheme: 'default'
            },
            projects: {
                defaultTemplate: 'basic',
                templatesPath: '.quarkdown/templates',
                enableProjectWizard: true,
                autoCreateGitignore: true,
                autoCreateReadme: true
            }
        };
    }

    private validateConfig(config: any): QuarkdownConfig | null {
        try {
            // Basic validation - in a real implementation, use a proper schema validator
            if (!config || typeof config !== 'object') {
                return null;
            }

            const defaultConfig = this.getDefaultConfig();
            
            return {
                preview: { ...defaultConfig.preview, ...config.preview },
                export: { ...defaultConfig.export, ...config.export },
                language: { ...defaultConfig.language, ...config.language },
                themes: { ...defaultConfig.themes, ...config.themes },
                projects: { ...defaultConfig.projects, ...config.projects }
            };
        } catch {
            return null;
        }
    }

    private async applyConfig(config: QuarkdownConfig): Promise<void> {
        const vscodeConfig = vscode.workspace.getConfiguration(this.configKey);

        for (const [section, sectionConfig] of Object.entries(config)) {
            if (typeof sectionConfig === 'object') {
                for (const [key, value] of Object.entries(sectionConfig)) {
                    await vscodeConfig.update(`${section}.${key}`, value, vscode.ConfigurationTarget.Global);
                }
            }
        }

        this.config = this.loadConfig();
    }

    private setupConfigWatcher(): void {
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(this.configKey)) {
                this.config = this.loadConfig();
                this.onConfigChanged();
            }
        });
    }

    private onConfigChanged(): void {
        // Emit event or notify components about config changes
        // This could be used to update previews, restart servers, etc.
        console.log('Quarkdown configuration changed');
    }

    /**
     * Get platform-specific default paths
     */
    public getDefaultPaths(): { output: string; themes: string; templates: string } {
        const workspaceRoot = FileUtils.getWorkspaceRoot();
        const userHome = require('os').homedir();

        return {
            output: workspaceRoot ? path.join(workspaceRoot, 'output') : path.join(userHome, 'Documents', 'Quarkdown'),
            themes: workspaceRoot ? path.join(workspaceRoot, '.quarkdown', 'themes') : path.join(userHome, '.quarkdown', 'themes'),
            templates: workspaceRoot ? path.join(workspaceRoot, '.quarkdown', 'templates') : path.join(userHome, '.quarkdown', 'templates')
        };
    }

    /**
     * Create configuration UI
     */
    public async openConfigurationUI(): Promise<void> {
        const action = await vscode.window.showQuickPick([
            { label: 'Open Settings UI', description: 'Open VS Code settings for Quarkdown' },
            { label: 'Export Configuration', description: 'Export current configuration to file' },
            { label: 'Import Configuration', description: 'Import configuration from file' },
            { label: 'Reset to Defaults', description: 'Reset all settings to default values' }
        ], {
            placeHolder: 'Choose configuration action'
        });

        if (!action) return;

        switch (action.label) {
            case 'Open Settings UI':
                await vscode.commands.executeCommand('workbench.action.openSettings', 'quarkdown');
                break;

            case 'Export Configuration':
                await this.exportConfigDialog();
                break;

            case 'Import Configuration':
                await this.importConfigDialog();
                break;

            case 'Reset to Defaults':
                await this.resetConfigDialog();
                break;
        }
    }

    private async exportConfigDialog(): Promise<void> {
        const saveOptions: vscode.SaveDialogOptions = {
            defaultUri: vscode.Uri.file('quarkdown-config.json'),
            filters: {
                'JSON Files': ['json'],
                'All Files': ['*']
            }
        };

        const uri = await vscode.window.showSaveDialog(saveOptions);
        if (uri) {
            const success = await this.exportConfig(uri.fsPath);
            if (success) {
                vscode.window.showInformationMessage('Configuration exported successfully');
            } else {
                vscode.window.showErrorMessage('Failed to export configuration');
            }
        }
    }

    private async importConfigDialog(): Promise<void> {
        const openOptions: vscode.OpenDialogOptions = {
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'JSON Files': ['json'],
                'All Files': ['*']
            }
        };

        const uris = await vscode.window.showOpenDialog(openOptions);
        if (uris && uris.length > 0) {
            const success = await this.importConfig(uris[0].fsPath);
            if (success) {
                vscode.window.showInformationMessage('Configuration imported successfully');
            } else {
                vscode.window.showErrorMessage('Failed to import configuration');
            }
        }
    }

    private async resetConfigDialog(): Promise<void> {
        const confirmed = await vscode.window.showWarningMessage(
            'Are you sure you want to reset all Quarkdown settings to their default values?',
            { modal: true },
            'Reset'
        );

        if (confirmed === 'Reset') {
            await this.resetConfig();
            vscode.window.showInformationMessage('Configuration reset to defaults');
        }
    }
}

export const configManager = ConfigManager.getInstance();