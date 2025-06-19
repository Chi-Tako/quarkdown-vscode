import * as vscode from 'vscode';
import { QuarkdownCompiler } from '../compiler/QuarkdownCompiler';
import { StandardLibrary } from '../stdlib/StandardLibrary';

export class QuarkdownLanguageServer {
    private compiler: QuarkdownCompiler;
    private stdlib: StandardLibrary;
    private diagnosticCollection?: vscode.DiagnosticCollection;

    constructor(compiler: QuarkdownCompiler) {
        this.compiler = compiler;
        this.stdlib = new StandardLibrary();
    }

    public setDiagnosticCollection(collection: vscode.DiagnosticCollection): void {
        this.diagnosticCollection = collection;
        
        // Set up document change listeners for real-time diagnostics
        vscode.workspace.onDidChangeTextDocument(async (event) => {
            if (event.document.languageId === 'quarkdown') {
                await this.updateDiagnostics(event.document);
            }
        });

        vscode.workspace.onDidOpenTextDocument(async (document) => {
            if (document.languageId === 'quarkdown') {
                await this.updateDiagnostics(document);
            }
        });
    }

    public getCompletionProvider(): vscode.CompletionItemProvider {
        return {
            provideCompletionItems: async (document, position, token, context) => {
                return this.provideCompletionItems(document, position, context);
            }
        };
    }

    public getHoverProvider(): vscode.HoverProvider {
        return {
            provideHover: async (document, position, token) => {
                return this.provideHover(document, position);
            }
        };
    }

    private async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        const line = document.lineAt(position);
        const lineText = line.text;
        const beforeCursor = lineText.substring(0, position.character);

        const completions: vscode.CompletionItem[] = [];

        // Function completion (triggered by '.')
        if (beforeCursor.endsWith('.') || context.triggerCharacter === '.') {
            completions.push(...this.getFunctionCompletions());
        }

        // Variable completion (triggered by '.')
        if (beforeCursor.match(/\.\w*$/)) {
            completions.push(...this.getVariableCompletions(document));
        }

        // Named parameter completion (triggered after '{')
        if (beforeCursor.includes('{') && !beforeCursor.includes('}')) {
            const functionMatch = beforeCursor.match(/\.(\w+)/);
            if (functionMatch) {
                const functionName = functionMatch[1];
                completions.push(...this.getParameterCompletions(functionName));
            }
        }

        // Markdown completions
        completions.push(...this.getMarkdownCompletions(beforeCursor));

        // Snippet completions
        completions.push(...this.getSnippetCompletions());

        return completions;
    }

    private getFunctionCompletions(): vscode.CompletionItem[] {
        const functions = this.stdlib.getFunctionNames();
        
        return functions.map(funcName => {
            const completion = new vscode.CompletionItem(funcName, vscode.CompletionItemKind.Function);
            
            completion.detail = this.stdlib.getFunctionSignature(funcName);
            completion.documentation = new vscode.MarkdownString(this.stdlib.getFunctionDocumentation(funcName));
            
            // Add insert text with placeholders
            completion.insertText = this.getFunctionSnippet(funcName);
            completion.insertTextFormat = vscode.InsertTextFormat.Snippet;
            
            return completion;
        });
    }

    private getFunctionSnippet(funcName: string): string {
        // This is a simplified implementation
        // In reality, you'd want to parse the function signature for accurate snippets
        const commonSnippets: Record<string, string> = {
            'row': 'row alignment:{${1:center}} gap:{${2:1cm}}\n$0',
            'column': 'column cross:{${1:start}} gap:{${2:1cm}}\n$0',
            'grid': 'grid columns:{${1:3}} gap:{${2:1em}}\n$0',
            'center': 'center\n$0',
            'add': 'add {${1:value}} to:{${2:value}}',
            'multiply': 'multiply {${1:value}} by:{${2:value}}',
            'pow': 'pow {${1:base}} to:{${2:exponent}}',
            'if': 'if {${1:condition}}\n    $0',
            'repeat': 'repeat {${1:count}}\n    $0',
            'var': 'var {${1:name}} {${2:value}}',
            'function': 'function {${1:name}}\n    ${2:parameters}:\n    $0',
            'include': 'include {${1:path}}',
            'docname': 'docname {${1:title}}',
            'docauthor': 'docauthor {${1:author}}',
            'doctype': 'doctype {${1|slides,paged,plain|}}',
            'theme': 'theme {${1:theme}} layout:{${2:layout}}'
        };

        return commonSnippets[funcName] || `${funcName} {$1}`;
    }

    private getVariableCompletions(document: vscode.TextDocument): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        // Built-in variables
        const builtinVars = ['pi', 'e', 'today', 'now', 'year', 'month', 'day'];
        builtinVars.forEach(varName => {
            const completion = new vscode.CompletionItem(varName, vscode.CompletionItemKind.Variable);
            completion.detail = 'Built-in variable';
            completions.push(completion);
        });

        // User-defined variables (scan document for .var definitions)
        const text = document.getText();
        const varMatches = text.matchAll(/\.var\s+\{([^}]+)\}/g);
        
        for (const match of varMatches) {
            const varName = match[1];
            const completion = new vscode.CompletionItem(varName, vscode.CompletionItemKind.Variable);
            completion.detail = 'User-defined variable';
            completions.push(completion);
        }

        return completions;
    }

    private getParameterCompletions(functionName: string): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        // Function-specific parameter completions
        const parameterMaps: Record<string, string[]> = {
            'row': ['alignment', 'gap'],
            'column': ['cross', 'gap'],
            'grid': ['columns', 'gap'],
            'add': ['to'],
            'multiply': ['by'],
            'pow': ['to'],
            'theme': ['layout']
        };

        const parameters = parameterMaps[functionName] || [];
        
        parameters.forEach(param => {
            const completion = new vscode.CompletionItem(param + ':', vscode.CompletionItemKind.Property);
            completion.insertText = `${param}:\{$1\}`;
            completion.insertTextFormat = vscode.InsertTextFormat.Snippet;
            completions.push(completion);
        });

        return completions;
    }

    private getMarkdownCompletions(beforeCursor: string): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];

        // Enhanced image syntax
        if (beforeCursor.endsWith('![') || beforeCursor.endsWith('!(')) {
            const completion = new vscode.CompletionItem('Enhanced Image', vscode.CompletionItemKind.Snippet);
            completion.insertText = '!(${1:width}*${2:height})[${3:alt}](${4:src})';
            completion.insertTextFormat = vscode.InsertTextFormat.Snippet;
            completion.documentation = 'Enhanced image with size specification';
            completions.push(completion);
        }

        // Math expressions
        if (beforeCursor.endsWith('$')) {
            const mathCompletion = new vscode.CompletionItem('Inline Math', vscode.CompletionItemKind.Snippet);
            mathCompletion.insertText = '${1:expression}$';
            mathCompletion.insertTextFormat = vscode.InsertTextFormat.Snippet;
            completions.push(mathCompletion);

            const displayMathCompletion = new vscode.CompletionItem('Display Math', vscode.CompletionItemKind.Snippet);
            displayMathCompletion.insertText = '$\n${1:expression}\n$$';
            displayMathCompletion.insertTextFormat = vscode.InsertTextFormat.Snippet;
            completions.push(displayMathCompletion);
        }

        // Quote types
        if (beforeCursor.match(/>\s*$/)) {
            const quoteTypes = ['Note', 'Tip', 'Warning', 'Info'];
            quoteTypes.forEach(type => {
                const completion = new vscode.CompletionItem(`${type} Quote`, vscode.CompletionItemKind.Snippet);
                completion.insertText = `${type}: ${1:content}`;
                completion.insertTextFormat = vscode.InsertTextFormat.Snippet;
                completions.push(completion);
            });
        }

        return completions;
    }

    private getSnippetCompletions(): vscode.CompletionItem[] {
        const snippets = [
            {
                label: 'Quarkdown Document Template',
                insertText: [
                    '.docname {${1:Document Title}}',
                    '.docauthor {${2:Author Name}}',
                    '.doctype {${3|plain,slides,paged|}}',
                    '.theme {${4:default}}',
                    '',
                    '# ${5:Main Heading}',
                    '',
                    '${6:Content goes here...}',
                    ''
                ].join('\n'),
                detail: 'Complete document template'
            },
            {
                label: 'Function Definition',
                insertText: [
                    '.function {${1:functionName}}',
                    '    ${2:param1} ${3:param2}:',
                    '    ${4:function body}',
                    ''
                ].join('\n'),
                detail: 'Custom function definition'
            },
            {
                label: 'Layout Row',
                insertText: [
                    '.row alignment:{${1:center}} gap:{${2:1cm}}',
                    '    ${3:content}',
                    ''
                ].join('\n'),
                detail: 'Horizontal layout'
            },
            {
                label: 'Layout Grid',
                insertText: [
                    '.grid columns:{${1:3}} gap:{${2:1em}}',
                    '    ${3:content}',
                    ''
                ].join('\n'),
                detail: 'Grid layout'
            }
        ];

        return snippets.map(snippet => {
            const completion = new vscode.CompletionItem(snippet.label, vscode.CompletionItemKind.Snippet);
            completion.insertText = snippet.insertText;
            completion.insertTextFormat = vscode.InsertTextFormat.Snippet;
            completion.detail = snippet.detail;
            return completion;
        });
    }

    private async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.Hover | null> {
        const line = document.lineAt(position);
        const wordRange = document.getWordRangeAtPosition(position);
        
        if (!wordRange) {
            return null;
        }

        const word = document.getText(wordRange);

        // Check if it's a function call
        const lineText = line.text;
        const functionMatch = lineText.match(/\.(\w+)/);
        
        if (functionMatch && functionMatch[1] === word) {
            const functionName = word;
            
            if (this.stdlib.hasFunction(functionName)) {
                const signature = this.stdlib.getFunctionSignature(functionName);
                const documentation = this.stdlib.getFunctionDocumentation(functionName);
                
                const markdown = new vscode.MarkdownString();
                markdown.appendCodeblock(`${signature}`, 'quarkdown');
                markdown.appendMarkdown(documentation);
                
                return new vscode.Hover(markdown, wordRange);
            }
        }

        // Check if it's a variable
        if (lineText.includes(`.${word}`)) {
            // Built-in variables
            const builtinVarInfo: Record<string, string> = {
                'pi': 'Mathematical constant π (3.14159...)',
                'e': 'Mathematical constant e (2.71828...)',
                'today': 'Current date',
                'now': 'Current date and time',
                'year': 'Current year',
                'month': 'Current month',
                'day': 'Current day'
            };

            if (builtinVarInfo[word]) {
                const markdown = new vscode.MarkdownString();
                markdown.appendCodeblock(`${word}: variable`, 'quarkdown');
                markdown.appendMarkdown(builtinVarInfo[word]);
                return new vscode.Hover(markdown, wordRange);
            }
        }

        return null;
    }

    private async updateDiagnostics(document: vscode.TextDocument): Promise<void> {
        if (!this.diagnosticCollection) {
            return;
        }

        try {
            const source = document.getText();
            const diagnostics = await this.compiler.getDiagnostics(source);
            
            const vscDiagnostics = diagnostics.map(diagnostic => {
                const range = new vscode.Range(
                    new vscode.Position(diagnostic.range.start.line, diagnostic.range.start.character),
                    new vscode.Position(diagnostic.range.end.line, diagnostic.range.end.character)
                );
                
                const vscDiagnostic = new vscode.Diagnostic(range, diagnostic.message, diagnostic.severity);
                vscDiagnostic.source = 'quarkdown';
                
                return vscDiagnostic;
            });

            this.diagnosticCollection.set(document.uri, vscDiagnostics);
            
        } catch (error) {
            // Clear diagnostics on error to avoid stale issues
            this.diagnosticCollection.set(document.uri, []);
        }
    }

    // Document symbol provider
    public getDocumentSymbolProvider(): vscode.DocumentSymbolProvider {
        return {
            provideDocumentSymbols: async (document) => {
                return this.provideDocumentSymbols(document);
            }
        };
    }

    private async provideDocumentSymbols(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> {
        const symbols: vscode.DocumentSymbol[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Headers
            const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headerMatch) {
                const level = headerMatch[1].length;
                const title = headerMatch[2];
                const range = new vscode.Range(i, 0, i, line.length);
                
                const symbol = new vscode.DocumentSymbol(
                    title,
                    '',
                    vscode.SymbolKind.String,
                    range,
                    range
                );
                
                symbols.push(symbol);
            }

            // Function definitions
            const functionMatch = line.match(/\.function\s+\{([^}]+)\}/);
            if (functionMatch) {
                const functionName = functionMatch[1];
                const range = new vscode.Range(i, 0, i, line.length);
                
                const symbol = new vscode.DocumentSymbol(
                    functionName,
                    'Function',
                    vscode.SymbolKind.Function,
                    range,
                    range
                );
                
                symbols.push(symbol);
            }

            // Variable definitions
            const varMatch = line.match(/\.var\s+\{([^}]+)\}/);
            if (varMatch) {
                const varName = varMatch[1];
                const range = new vscode.Range(i, 0, i, line.length);
                
                const symbol = new vscode.DocumentSymbol(
                    varName,
                    'Variable',
                    vscode.SymbolKind.Variable,
                    range,
                    range
                );
                
                symbols.push(symbol);
            }
        }

        return symbols;
    }

    // Definition provider (for go-to-definition)
    public getDefinitionProvider(): vscode.DefinitionProvider {
        return {
            provideDefinition: async (document, position) => {
                return this.provideDefinition(document, position);
            }
        };
    }

    private async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.Definition | null> {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return null;
        }

        const word = document.getText(wordRange);
        const text = document.getText();

        // Find function definition
        const functionRegex = new RegExp(`\\.function\\s+\\{${word}\\}`, 'g');
        const functionMatch = functionRegex.exec(text);
        
        if (functionMatch) {
            const pos = document.positionAt(functionMatch.index);
            return new vscode.Location(document.uri, pos);
        }

        // Find variable definition
        const varRegex = new RegExp(`\\.var\\s+\\{${word}\\}`, 'g');
        const varMatch = varRegex.exec(text);
        
        if (varMatch) {
            const pos = document.positionAt(varMatch.index);
            return new vscode.Location(document.uri, pos);
        }

        return null;
    }
}