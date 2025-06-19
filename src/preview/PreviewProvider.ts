import * as vscode from 'vscode';
import * as path from 'path';
import { QuarkdownCompiler } from '../compiler/QuarkdownCompiler';

export class QuarkdownPreviewProvider implements vscode.TextDocumentContentProvider {
    private static readonly scheme = 'quarkdown-preview';
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private compiler: QuarkdownCompiler;
    private context: vscode.ExtensionContext;

    public readonly onDidChange = this._onDidChange.event;

    constructor(context: vscode.ExtensionContext, compiler: QuarkdownCompiler) {
        this.context = context;
        this.compiler = compiler;
    }

    public async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        // Get the original document URI
        const originalUri = vscode.Uri.parse(uri.query);
        
        try {
            const document = await vscode.workspace.openTextDocument(originalUri);
            const source = document.getText();
            
            // Get configuration
            const config = vscode.workspace.getConfiguration('quarkdown');
            const theme = config.get('preview.theme', 'default');
            
            // Compile the document
            const result = await this.compiler.compile(source, {
                doctype: 'plain',
                theme: theme,
                outputFormat: 'html'
            });

            if (result.errors.length > 0) {
                return this.generateErrorPage(result.errors, result.warnings);
            }

            return this.generatePreviewPage(result.html, result.metadata, result.warnings);

        } catch (error) {
            return this.generateErrorPage([{
                message: `Failed to generate preview: ${error instanceof Error ? error.message : String(error)}`,
                type: 'runtime'
            }], []);
        }
    }

    public showPreview(documentUri: vscode.Uri): void {
        const previewUri = this.getPreviewUri(documentUri);
        vscode.commands.executeCommand('vscode.open', previewUri, vscode.ViewColumn.One);
    }

    public showPreviewToSide(documentUri: vscode.Uri): void {
        const previewUri = this.getPreviewUri(documentUri);
        vscode.commands.executeCommand('vscode.open', previewUri, vscode.ViewColumn.Beside);
    }

    public updatePreview(documentUri: vscode.Uri): void {
        const previewUri = this.getPreviewUri(documentUri);
        this._onDidChange.fire(previewUri);
    }

    private getPreviewUri(documentUri: vscode.Uri): vscode.Uri {
        return vscode.Uri.parse(`${QuarkdownPreviewProvider.scheme}://preview?${documentUri.toString()}`);
    }

    private generatePreviewPage(content: string, metadata: any, warnings: any[]): string {
        const theme = this.getThemeCSS(metadata.theme || 'default');
        const warningsHtml = warnings.length > 0 ? this.generateWarningsPanel(warnings) : '';
        
        return `<!DOCTYPE html>
<html lang="${metadata.language || 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metadata.title || 'Quarkdown Preview'}</title>
    <style>
        ${this.getBaseCSS()}
        ${theme}
        ${this.getLayoutCSS()}
        ${this.getMathCSS()}
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.6.1/mermaid.min.js"></script>
</head>
<body class="quarkdown-preview doctype-${metadata.doctype || 'plain'}">
    <div class="preview-container">
        ${warningsHtml}
        <main class="content">
            ${content}
        </main>
    </div>
    <script>
        ${this.getPreviewScript()}
    </script>
</body>
</html>`;
    }

    private generateErrorPage(errors: any[], warnings: any[]): string {
        const errorItems = errors.map(error => `
            <div class="error-item">
                <div class="error-type">${error.type}</div>
                <div class="error-message">${this.escapeHtml(error.message)}</div>
                ${error.line ? `<div class="error-location">Line ${error.line}${error.column ? `, Column ${error.column}` : ''}</div>` : ''}
            </div>
        `).join('');

        const warningItems = warnings.map(warning => `
            <div class="warning-item">
                <div class="warning-type">${warning.type}</div>
                <div class="warning-message">${this.escapeHtml(warning.message)}</div>
                ${warning.line ? `<div class="warning-location">Line ${warning.line}${warning.column ? `, Column ${warning.column}` : ''}</div>` : ''}
            </div>
        `).join('');

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Quarkdown - Compilation Errors</title>
    <style>
        ${this.getBaseCSS()}
        ${this.getErrorCSS()}
    </style>
</head>
<body class="error-page">
    <div class="error-container">
        <h1>Compilation Errors</h1>
        <div class="errors">
            ${errorItems}
        </div>
        ${warnings.length > 0 ? `
            <h2>Warnings</h2>
            <div class="warnings">
                ${warningItems}
            </div>
        ` : ''}
    </div>
</body>
</html>`;
    }

    private generateWarningsPanel(warnings: any[]): string {
        if (warnings.length === 0) return '';

        const warningItems = warnings.map(warning => `
            <div class="warning-item">
                <span class="warning-type">${warning.type}</span>
                <span class="warning-message">${this.escapeHtml(warning.message)}</span>
            </div>
        `).join('');

        return `
            <div class="warnings-panel">
                <div class="warnings-header">
                    <span class="warnings-title">⚠️ Warnings (${warnings.length})</span>
                    <button class="warnings-toggle" onclick="toggleWarnings()">Hide</button>
                </div>
                <div class="warnings-content">
                    ${warningItems}
                </div>
            </div>
        `;
    }

    private getBaseCSS(): string {
        return `
            * {
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                line-height: 1.6;
                color: var(--vscode-editor-foreground, #333);
                background-color: var(--vscode-editor-background, #fff);
                margin: 0;
                padding: 20px;
            }
            
            .preview-container {
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .content {
                margin-top: 20px;
            }
            
            h1, h2, h3, h4, h5, h6 {
                color: var(--vscode-editor-foreground, #333);
                margin-top: 24px;
                margin-bottom: 16px;
                font-weight: 600;
                line-height: 1.25;
            }
            
            h1 { font-size: 2em; }
            h2 { font-size: 1.5em; }
            h3 { font-size: 1.25em; }
            h4 { font-size: 1em; }
            h5 { font-size: 0.875em; }
            h6 { font-size: 0.85em; }
            
            p {
                margin-bottom: 16px;
            }
            
            code {
                background-color: var(--vscode-textCodeBlock-background, #f6f8fa);
                border-radius: 3px;
                font-size: 85%;
                margin: 0;
                padding: 2px 4px;
            }
            
            pre {
                background-color: var(--vscode-textCodeBlock-background, #f6f8fa);
                border-radius: 6px;
                font-size: 85%;
                line-height: 1.45;
                overflow: auto;
                padding: 16px;
            }
            
            pre code {
                background-color: transparent;
                border: 0;
                display: inline;
                line-height: inherit;
                margin: 0;
                max-width: auto;
                overflow: visible;
                padding: 0;
                word-wrap: normal;
            }
            
            blockquote {
                border-left: 4px solid var(--vscode-textBlockQuote-border, #dfe2e5);
                color: var(--vscode-textBlockQuote-foreground, #6a737d);
                margin: 0 0 16px 0;
                padding: 0 16px;
            }
            
            ul, ol {
                margin-bottom: 16px;
                padding-left: 2em;
            }
            
            li {
                margin-bottom: 0.25em;
            }
            
            table {
                border-collapse: collapse;
                border-spacing: 0;
                margin-bottom: 16px;
                width: 100%;
            }
            
            th, td {
                border: 1px solid var(--vscode-editor-foreground, #dfe2e5);
                padding: 6px 13px;
            }
            
            th {
                background-color: var(--vscode-textCodeBlock-background, #f6f8fa);
                font-weight: 600;
            }
            
            img {
                max-width: 100%;
                height: auto;
            }
            
            a {
                color: var(--vscode-textLink-foreground, #0366d6);
                text-decoration: none;
            }
            
            a:hover {
                text-decoration: underline;
            }
        `;
    }

    private getThemeCSS(theme: string): string {
        switch (theme) {
            case 'darko':
                return `
                    body {
                        background: linear-gradient(135deg, #1e1e1e 0%, #2d2d30 100%);
                        color: #ffffff;
                    }
                    
                    h1, h2, h3, h4, h5, h6 {
                        color: #ffffff;
                        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                    }
                    
                    code {
                        background-color: rgba(255,255,255,0.1);
                        color: #ffffff;
                    }
                    
                    pre {
                        background-color: rgba(0,0,0,0.3);
                        border: 1px solid rgba(255,255,255,0.1);
                    }
                `;
            case 'minimal':
                return `
                    body {
                        font-family: 'Georgia', serif;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 40px 20px;
                        line-height: 1.8;
                    }
                    
                    h1, h2, h3, h4, h5, h6 {
                        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                        font-weight: 300;
                    }
                    
                    h1 {
                        border-bottom: 1px solid #eee;
                        padding-bottom: 10px;
                    }
                `;
            default:
                return '';
        }
    }

    private getLayoutCSS(): string {
        return `
            .qmd-row {
                display: flex;
                flex-wrap: wrap;
                gap: var(--gap, 1rem);
                align-items: var(--alignment, flex-start);
            }
            
            .qmd-column {
                display: flex;
                flex-direction: column;
                gap: var(--gap, 1rem);
                align-items: var(--cross-alignment, flex-start);
            }
            
            .qmd-grid {
                display: grid;
                grid-template-columns: repeat(var(--columns, auto-fit), 1fr);
                gap: var(--gap, 1rem);
            }
            
            .qmd-center {
                display: flex;
                justify-content: center;
                align-items: center;
                text-align: center;
            }
            
            .qmd-row.alignment-center { align-items: center; }
            .qmd-row.alignment-end { align-items: flex-end; }
            .qmd-row.alignment-stretch { align-items: stretch; }
            
            .qmd-column.cross-start { align-items: flex-start; }
            .qmd-column.cross-center { align-items: center; }
            .qmd-column.cross-end { align-items: flex-end; }
            .qmd-column.cross-stretch { align-items: stretch; }
        `;
    }

    private getMathCSS(): string {
        return `
            .katex {
                font-size: 1.1em;
            }
            
            .katex-display {
                margin: 1em 0;
            }
        `;
    }

    private getErrorCSS(): string {
        return `
            .error-page {
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            }
            
            .error-container {
                max-width: 800px;
                margin: 0 auto;
            }
            
            .error-item, .warning-item {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                margin-bottom: 10px;
                padding: 12px;
            }
            
            .error-item {
                background: #f8d7da;
                border-color: #f5c6cb;
            }
            
            .error-type, .warning-type {
                font-size: 12px;
                text-transform: uppercase;
                font-weight: bold;
                color: #721c24;
                margin-bottom: 4px;
            }
            
            .warning-type {
                color: #856404;
            }
            
            .error-message, .warning-message {
                font-size: 14px;
                margin-bottom: 4px;
            }
            
            .error-location, .warning-location {
                font-size: 12px;
                color: #6c757d;
            }
            
            .warnings-panel {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                margin-bottom: 20px;
                overflow: hidden;
            }
            
            .warnings-header {
                background: #ffeaa7;
                padding: 8px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .warnings-title {
                font-weight: bold;
                font-size: 14px;
            }
            
            .warnings-toggle {
                background: none;
                border: none;
                color: #856404;
                cursor: pointer;
                font-size: 12px;
                text-decoration: underline;
            }
            
            .warnings-content {
                padding: 12px;
            }
            
            .warnings-content .warning-item {
                background: transparent;
                border: none;
                margin-bottom: 8px;
                padding: 4px 0;
            }
        `;
    }

    private getPreviewScript(): string {
        return `
            // Initialize KaTeX for math rendering
            document.addEventListener('DOMContentLoaded', function() {
                const mathElements = document.querySelectorAll('.math');
                mathElements.forEach(function(element) {
                    const isDisplay = element.classList.contains('math-display');
                    try {
                        katex.render(element.textContent, element, {
                            displayMode: isDisplay,
                            throwOnError: false
                        });
                    } catch (e) {
                        console.warn('KaTeX rendering error:', e);
                    }
                });
                
                // Initialize Mermaid
                mermaid.initialize({ 
                    startOnLoad: true,
                    theme: 'default'
                });
            });
            
            function toggleWarnings() {
                const content = document.querySelector('.warnings-content');
                const toggle = document.querySelector('.warnings-toggle');
                
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    toggle.textContent = 'Hide';
                } else {
                    content.style.display = 'none';
                    toggle.textContent = 'Show';
                }
            }
            
            // Auto-scroll to errors/warnings if they exist
            const errors = document.querySelector('.errors');
            if (errors) {
                errors.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        `;
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}