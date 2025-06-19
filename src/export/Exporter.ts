import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { QuarkdownCompiler, CompileOptions } from '../compiler/QuarkdownCompiler';

// Puppeteer might not be available in browser environment, so we'll use dynamic imports
let puppeteer: any;

export interface ExportOptions {
    outputPath?: string;
    format: 'html' | 'pdf';
    doctype?: 'slides' | 'paged' | 'plain';
    theme?: string;
    openAfterExport?: boolean;
}

export interface ExportResult {
    success: boolean;
    outputPath?: string;
    error?: string;
    warnings: string[];
}

export class QuarkdownExporter {
    private compiler: QuarkdownCompiler;

    constructor(compiler: QuarkdownCompiler) {
        this.compiler = compiler;
    }

    public async exportToHtml(document: vscode.TextDocument, options: Partial<ExportOptions> = {}): Promise<ExportResult> {
        return this.export(document, { ...options, format: 'html' });
    }

    public async exportToPdf(document: vscode.TextDocument, options: Partial<ExportOptions> = {}): Promise<ExportResult> {
        return this.export(document, { ...options, format: 'pdf' });
    }

    private async export(document: vscode.TextDocument, options: ExportOptions): Promise<ExportResult> {
        const warnings: string[] = [];

        try {
            // Get configuration
            const config = vscode.workspace.getConfiguration('quarkdown');
            const outputDir = options.outputPath || config.get('export.outputDirectory', './output');
            
            // Ensure output directory exists
            await this.ensureDirectoryExists(outputDir);

            // Determine output file path
            const fileName = path.basename(document.fileName, '.qmd');
            const extension = options.format === 'pdf' ? '.pdf' : '.html';
            const outputPath = path.join(outputDir, `${fileName}${extension}`);

            // Compile the document
            const source = document.getText();
            const compileOptions: CompileOptions = {
                doctype: options.doctype,
                theme: options.theme,
                outputFormat: options.format,
                strict: false
            };

            const compileResult = await this.compiler.compile(source, compileOptions);

            if (compileResult.errors.length > 0) {
                const errorMessages = compileResult.errors.map(e => e.message).join('\n');
                return {
                    success: false,
                    error: `Compilation failed:\n${errorMessages}`,
                    warnings: compileResult.warnings.map(w => w.message)
                };
            }

            // Add compilation warnings
            warnings.push(...compileResult.warnings.map(w => w.message));

            // Export based on format
            if (options.format === 'pdf') {
                await this.exportToPdfFile(compileResult.html, outputPath, compileOptions);
            } else {
                await this.exportToHtmlFile(compileResult.html, outputPath);
            }

            // Show success message
            const action = options.openAfterExport !== false ? 'Open' : 'Show in Explorer';
            const choice = await vscode.window.showInformationMessage(
                `Successfully exported to ${path.basename(outputPath)}`,
                action
            );

            if (choice === 'Open') {
                if (options.format === 'pdf') {
                    await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(outputPath));
                } else {
                    await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(outputPath));
                }
            } else if (choice === 'Show in Explorer') {
                await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
            }

            return {
                success: true,
                outputPath,
                warnings
            };

        } catch (error) {
            return {
                success: false,
                error: `Export failed: ${error instanceof Error ? error.message : String(error)}`,
                warnings
            };
        }
    }

    private async exportToHtmlFile(html: string, outputPath: string): Promise<void> {
        await fs.writeFile(outputPath, html, 'utf8');
    }

    private async exportToPdfFile(html: string, outputPath: string, options: CompileOptions): Promise<void> {
        try {
            // Dynamic import of puppeteer
            if (!puppeteer) {
                try {
                    puppeteer = await import('puppeteer');
                } catch (importError) {
                    throw new Error('Puppeteer is required for PDF export. Please install it: npm install puppeteer');
                }
            }

            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();

            // Set content and wait for it to load
            await page.setContent(html, { waitUntil: 'networkidle0' });

            // Wait for any dynamic content to render
            await page.waitForTimeout(1000);

            // Configure PDF options based on doctype
            const pdfOptions = this.getPdfOptions(options);

            // Generate PDF
            await page.pdf({
                path: outputPath,
                ...pdfOptions
            });

            await browser.close();

        } catch (error) {
            throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private getPdfOptions(options: CompileOptions): any {
        const baseOptions = {
            format: 'A4' as const,
            printBackground: true,
            margin: {
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm'
            }
        };

        switch (options.doctype) {
            case 'slides':
                return {
                    ...baseOptions,
                    format: 'A4',
                    landscape: true,
                    margin: {
                        top: '0.5cm',
                        right: '0.5cm',
                        bottom: '0.5cm',
                        left: '0.5cm'
                    }
                };

            case 'paged':
                return {
                    ...baseOptions,
                    format: 'A4',
                    margin: {
                        top: '2.5cm',
                        right: '2cm',
                        bottom: '2.5cm',
                        left: '2cm'
                    },
                    displayHeaderFooter: true,
                    headerTemplate: `
                        <div style="font-size: 10px; margin: 0 auto; color: #666;">
                            <span class="title"></span>
                        </div>
                    `,
                    footerTemplate: `
                        <div style="font-size: 10px; margin: 0 auto; color: #666;">
                            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                        </div>
                    `
                };

            default:
                return baseOptions;
        }
    }

    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    // Batch export functionality
    public async exportWorkspace(format: 'html' | 'pdf', options: Partial<ExportOptions> = {}): Promise<ExportResult[]> {
        const results: ExportResult[] = [];
        
        // Find all .qmd files in workspace
        const qmdFiles = await vscode.workspace.findFiles('**/*.qmd', '**/node_modules/**');
        
        if (qmdFiles.length === 0) {
            vscode.window.showWarningMessage('No Quarkdown files found in workspace');
            return results;
        }

        // Show progress
        const progressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: `Exporting ${qmdFiles.length} Quarkdown files to ${format.toUpperCase()}`,
            cancellable: true
        };

        await vscode.window.withProgress(progressOptions, async (progress, token) => {
            const increment = 100 / qmdFiles.length;

            for (let i = 0; i < qmdFiles.length; i++) {
                if (token.isCancellationRequested) {
                    break;
                }

                const file = qmdFiles[i];
                const document = await vscode.workspace.openTextDocument(file);
                
                progress.report({
                    message: `Exporting ${path.basename(file.fsPath)} (${i + 1}/${qmdFiles.length})`,
                    increment
                });

                const result = await this.export(document, { 
                    ...options, 
                    format,
                    openAfterExport: false 
                });
                
                results.push(result);
            }
        });

        // Show summary
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        if (failed === 0) {
            vscode.window.showInformationMessage(`Successfully exported ${successful} files`);
        } else {
            vscode.window.showWarningMessage(
                `Export completed: ${successful} successful, ${failed} failed`
            );
        }

        return results;
    }

    // Export with custom template
    public async exportWithTemplate(
        document: vscode.TextDocument,
        templatePath: string,
        options: Partial<ExportOptions> = {}
    ): Promise<ExportResult> {
        try {
            // Read template file
            const templateContent = await fs.readFile(templatePath, 'utf8');
            
            // Compile document
            const source = document.getText();
            const compileResult = await this.compiler.compile(source, {
                doctype: options.doctype,
                theme: options.theme,
                outputFormat: options.format || 'html'
            });

            if (compileResult.errors.length > 0) {
                const errorMessages = compileResult.errors.map(e => e.message).join('\n');
                return {
                    success: false,
                    error: `Compilation failed:\n${errorMessages}`,
                    warnings: compileResult.warnings.map(w => w.message)
                };
            }

            // Replace placeholders in template
            const processedContent = this.processTemplate(templateContent, {
                content: compileResult.html,
                metadata: compileResult.metadata,
                title: compileResult.metadata.title || 'Untitled',
                author: compileResult.metadata.author || '',
                date: new Date().toLocaleDateString()
            });

            // Determine output path
            const config = vscode.workspace.getConfiguration('quarkdown');
            const outputDir = options.outputPath || config.get('export.outputDirectory', './output');
            await this.ensureDirectoryExists(outputDir);

            const fileName = path.basename(document.fileName, '.qmd');
            const extension = options.format === 'pdf' ? '.pdf' : '.html';
            const outputPath = path.join(outputDir, `${fileName}${extension}`);

            // Export
            if (options.format === 'pdf') {
                await this.exportToPdfFile(processedContent, outputPath, {
                    doctype: options.doctype,
                    theme: options.theme
                });
            } else {
                await this.exportToHtmlFile(processedContent, outputPath);
            }

            return {
                success: true,
                outputPath,
                warnings: compileResult.warnings.map(w => w.message)
            };

        } catch (error) {
            return {
                success: false,
                error: `Template export failed: ${error instanceof Error ? error.message : String(error)}`,
                warnings: []
            };
        }
    }

    private processTemplate(template: string, variables: Record<string, any>): string {
        let processed = template;
        
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            processed = processed.replace(placeholder, String(value));
        }
        
        return processed;
    }

    // Export configuration management
    public async saveExportConfig(document: vscode.TextDocument, options: ExportOptions): Promise<void> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        const configPath = path.join(workspaceFolder.uri.fsPath, '.quarkdown', 'export.json');
        await this.ensureDirectoryExists(path.dirname(configPath));

        const config = {
            [path.relative(workspaceFolder.uri.fsPath, document.fileName)]: options
        };

        try {
            const existingConfig = JSON.parse(await fs.readFile(configPath, 'utf8'));
            Object.assign(existingConfig, config);
            await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2));
        } catch {
            await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        }
    }

    public async loadExportConfig(document: vscode.TextDocument): Promise<ExportOptions | null> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {
            return null;
        }

        const configPath = path.join(workspaceFolder.uri.fsPath, '.quarkdown', 'export.json');
        
        try {
            const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
            const relativePath = path.relative(workspaceFolder.uri.fsPath, document.fileName);
            return config[relativePath] || null;
        } catch {
            return null;
        }
    }
}