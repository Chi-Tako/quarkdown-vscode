import { QuarkdownParser } from './QuarkdownParser';
import { QuarkdownRenderer } from './QuarkdownRenderer';
import { ASTNode, DocumentNode, FunctionCallNode, VariableNode } from './ast/ASTNodes';
import { StandardLibrary } from '../stdlib/StandardLibrary';
import { ExecutionContext } from './ExecutionContext';

export interface CompileOptions {
    doctype?: 'slides' | 'paged' | 'plain';
    theme?: string;
    outputFormat?: 'html' | 'pdf';
    strict?: boolean;
    includePaths?: string[];
}

export interface CompileResult {
    html: string;
    metadata: DocumentMetadata;
    errors: CompileError[];
    warnings: CompileWarning[];
}

export interface DocumentMetadata {
    title?: string;
    author?: string;
    language?: string;
    doctype: string;
    theme?: string;
    createdAt: Date;
}

export interface CompileError {
    message: string;
    line?: number;
    column?: number;
    type: 'syntax' | 'semantic' | 'runtime';
}

export interface CompileWarning {
    message: string;
    line?: number;
    column?: number;
    type: 'deprecation' | 'performance' | 'style';
}

export class QuarkdownCompiler {
    private parser: QuarkdownParser;
    private renderer: QuarkdownRenderer;
    private stdlib: StandardLibrary;

    constructor() {
        this.parser = new QuarkdownParser();
        this.renderer = new QuarkdownRenderer();
        this.stdlib = new StandardLibrary();
    }

    async compile(source: string, options: CompileOptions = {}): Promise<CompileResult> {
        const errors: CompileError[] = [];
        const warnings: CompileWarning[] = [];

        try {
            // Step 1: Parse the source into AST
            const parseResult = this.parser.parse(source);
            if (parseResult.errors.length > 0) {
                errors.push(...parseResult.errors);
                if (options.strict) {
                    return { html: '', metadata: this.getDefaultMetadata(), errors, warnings };
                }
            }

            // Step 2: Create execution context
            const context = new ExecutionContext(this.stdlib, options);
            
            // Step 3: Extract metadata from document
            const metadata = this.extractMetadata(parseResult.ast, context);
            
            // Step 4: Execute functions and expand AST
            const expandedAst = await this.executeDocument(parseResult.ast, context);
            
            // Step 5: Render to HTML
            const html = await this.renderer.render(expandedAst, {
                ...options,
                doctype: metadata.doctype as any,
                theme: metadata.theme
            });

            warnings.push(...context.getWarnings());

            return {
                html,
                metadata,
                errors,
                warnings
            };

        } catch (error) {
            errors.push({
                message: `Compilation failed: ${error instanceof Error ? error.message : String(error)}`,
                type: 'runtime'
            });

            return {
                html: '',
                metadata: this.getDefaultMetadata(),
                errors,
                warnings
            };
        }
    }

    private getDefaultMetadata(): DocumentMetadata {
        return {
            doctype: 'plain',
            createdAt: new Date()
        };
    }

    private extractMetadata(ast: DocumentNode, context: ExecutionContext): DocumentMetadata {
        const metadata: DocumentMetadata = this.getDefaultMetadata();

        // Extract metadata from function calls
        for (const node of ast.children) {
            if (node.type === 'function_call') {
                const funcCall = node as FunctionCallNode;
                switch (funcCall.name) {
                    case 'docname':
                        metadata.title = this.extractStringArgument(funcCall, 0);
                        break;
                    case 'docauthor':
                        metadata.author = this.extractStringArgument(funcCall, 0);
                        break;
                    case 'doclang':
                        metadata.language = this.extractStringArgument(funcCall, 0);
                        break;
                    case 'doctype':
                        const doctype = this.extractStringArgument(funcCall, 0);
                        if (doctype && ['slides', 'paged', 'plain'].includes(doctype)) {
                            metadata.doctype = doctype;
                        }
                        break;
                    case 'theme':
                        metadata.theme = this.extractStringArgument(funcCall, 0);
                        break;
                }
            }
        }

        return metadata;
    }

    private extractStringArgument(funcCall: FunctionCallNode, index: number): string | undefined {
        if (funcCall.args.length > index && funcCall.args[index].type === 'text') {
            return funcCall.args[index].content;
        }
        return undefined;
    }

    private async executeDocument(ast: DocumentNode, context: ExecutionContext): Promise<DocumentNode> {
        const executedChildren: ASTNode[] = [];

        for (const node of ast.children) {
            const executedNode = await this.executeNode(node, context);
            if (executedNode) {
                if (Array.isArray(executedNode)) {
                    executedChildren.push(...executedNode);
                } else {
                    executedChildren.push(executedNode);
                }
            }
        }

        return {
            ...ast,
            children: executedChildren
        };
    }

    private async executeNode(node: ASTNode, context: ExecutionContext): Promise<ASTNode | ASTNode[] | null> {
        switch (node.type) {
            case 'function_call':
                return await this.executeFunctionCall(node as FunctionCallNode, context);
            
            case 'variable':
                return this.resolveVariable(node as VariableNode, context);
            
            case 'paragraph':
            case 'heading':
            case 'list':
            case 'blockquote':
                // Process children recursively
                const processedChildren: ASTNode[] = [];
                for (const child of node.children || []) {
                    const processed = await this.executeNode(child, context);
                    if (processed) {
                        if (Array.isArray(processed)) {
                            processedChildren.push(...processed);
                        } else {
                            processedChildren.push(processed);
                        }
                    }
                }
                return { ...node, children: processedChildren };
            
            default:
                return node;
        }
    }

    private async executeFunctionCall(node: FunctionCallNode, context: ExecutionContext): Promise<ASTNode | ASTNode[] | null> {
        // Check if it's a standard library function
        if (this.stdlib.hasFunction(node.name)) {
            return await this.stdlib.executeFunction(node.name, node.args, node.body, context);
        }

        // Check if it's a user-defined function
        if (context.hasFunction(node.name)) {
            return await context.executeFunction(node.name, node.args, node.body);
        }

        // Function not found - add warning
        context.addWarning({
            message: `Unknown function: ${node.name}`,
            type: 'style'
        });

        return null;
    }

    private resolveVariable(node: VariableNode, context: ExecutionContext): ASTNode {
        const value = context.getVariable(node.name);
        if (value !== undefined) {
            return {
                type: 'text',
                content: String(value)
            };
        }

        context.addWarning({
            message: `Undefined variable: ${node.name}`,
            type: 'style'
        });

        return {
            type: 'text',
            content: `{{${node.name}}}`
        };
    }

    // Public API for language server features
    public async getCompletions(source: string, position: { line: number; character: number }): Promise<any[]> {
        // Return available functions and variables for auto-completion
        const completions = [];
        
        // Add standard library functions
        for (const funcName of this.stdlib.getFunctionNames()) {
            completions.push({
                label: funcName,
                kind: 3, // Function
                detail: this.stdlib.getFunctionSignature(funcName),
                documentation: this.stdlib.getFunctionDocumentation(funcName)
            });
        }

        return completions;
    }

    public async getDiagnostics(source: string): Promise<any[]> {
        const result = await this.compile(source, { strict: false });
        return [...result.errors, ...result.warnings].map(issue => ({
            range: {
                start: { line: issue.line || 0, character: issue.column || 0 },
                end: { line: issue.line || 0, character: (issue.column || 0) + 10 }
            },
            message: issue.message,
            severity: issue.type === 'syntax' || issue.type === 'semantic' ? 1 : 2, // Error : Warning
            source: 'quarkdown'
        }));
    }
}