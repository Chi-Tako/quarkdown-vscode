import { ASTNode, RowNode, ColumnNode, GridNode, CenterNode, TextNode, ConditionalNode, LoopNode } from '../compiler/ast/ASTNodes';
import { ExecutionContext } from '../compiler/ExecutionContext';

export interface FunctionSignature {
    name: string;
    parameters: string[];
    namedParameters?: Record<string, string>;
    description: string;
    examples?: string[];
}

export type FunctionImplementation = (
    args: ASTNode[], 
    body: ASTNode[], 
    context: ExecutionContext
) => Promise<ASTNode | ASTNode[] | null>;

export class StandardLibrary {
    private functions: Map<string, FunctionImplementation> = new Map();
    private signatures: Map<string, FunctionSignature> = new Map();

    constructor() {
        this.registerStandardFunctions();
    }

    private registerStandardFunctions(): void {
        // Layout functions
        this.register('row', this.row.bind(this), {
            name: 'row',
            parameters: [],
            namedParameters: {
                'alignment': 'Horizontal alignment: start, center, end, stretch',
                'gap': 'Gap between items (e.g., 1cm, 10px)'
            },
            description: 'Creates a horizontal row layout',
            examples: ['.row alignment:{center} gap:{1cm}']
        });

        this.register('column', this.column.bind(this), {
            name: 'column',
            parameters: [],
            namedParameters: {
                'cross': 'Cross-axis alignment: start, center, end, stretch',
                'gap': 'Gap between items'
            },
            description: 'Creates a vertical column layout',
            examples: ['.column cross:{start} gap:{0.5cm}']
        });

        this.register('grid', this.grid.bind(this), {
            name: 'grid',
            parameters: [],
            namedParameters: {
                'columns': 'Number of columns',
                'gap': 'Gap between grid items'
            },
            description: 'Creates a grid layout',
            examples: ['.grid columns:{3} gap:{1em}']
        });

        this.register('center', this.center.bind(this), {
            name: 'center',
            parameters: [],
            description: 'Centers content horizontally and vertically',
            examples: ['.center']
        });

        // Math functions
        this.register('add', this.add.bind(this), {
            name: 'add',
            parameters: ['value'],
            namedParameters: { 'to': 'Value to add to' },
            description: 'Adds two numbers',
            examples: ['.add {5} to:{3}']
        });

        this.register('multiply', this.multiply.bind(this), {
            name: 'multiply',
            parameters: ['value'],
            namedParameters: { 'by': 'Multiplier' },
            description: 'Multiplies two numbers',
            examples: ['.multiply {6} by:{3}']
        });

        this.register('pow', this.pow.bind(this), {
            name: 'pow',
            parameters: ['base'],
            namedParameters: { 'to': 'Exponent' },
            description: 'Raises base to the power of exponent',
            examples: ['.pow {2} to:{3}']
        });

        this.register('truncate', this.truncate.bind(this), {
            name: 'truncate',
            parameters: ['decimals'],
            description: 'Truncates a number to specified decimal places',
            examples: ['.truncate {2}']
        });

        // Control flow
        this.register('if', this.if.bind(this), {
            name: 'if',
            parameters: ['condition'],
            description: 'Conditional execution',
            examples: ['.if {.n::iseven}']
        });

        this.register('repeat', this.repeat.bind(this), {
            name: 'repeat',
            parameters: ['count'],
            description: 'Repeats content a specified number of times',
            examples: ['.repeat {10}']
        });

        // Variables
        this.register('var', this.var.bind(this), {
            name: 'var',
            parameters: ['name', 'value'],
            description: 'Defines a variable',
            examples: ['.var {pi} {3.14159}']
        });

        // String operations
        this.register('upper', this.upper.bind(this), {
            name: 'upper',
            parameters: [],
            description: 'Converts text to uppercase',
            examples: ['.upper']
        });

        this.register('lower', this.lower.bind(this), {
            name: 'lower',
            parameters: [],
            description: 'Converts text to lowercase',
            examples: ['.lower']
        });

        // Document metadata
        this.register('docname', this.docname.bind(this), {
            name: 'docname',
            parameters: ['title'],
            description: 'Sets document title',
            examples: ['.docname {My Document}']
        });

        this.register('docauthor', this.docauthor.bind(this), {
            name: 'docauthor',
            parameters: ['author'],
            description: 'Sets document author',
            examples: ['.docauthor {John Doe}']
        });

        this.register('doctype', this.doctype.bind(this), {
            name: 'doctype',
            parameters: ['type'],
            description: 'Sets document type: slides, paged, or plain',
            examples: ['.doctype {slides}']
        });

        this.register('theme', this.theme.bind(this), {
            name: 'theme',
            parameters: ['themeName'],
            namedParameters: { 'layout': 'Layout variant' },
            description: 'Sets document theme',
            examples: ['.theme {darko} layout:{minimal}']
        });

        // I/O operations
        this.register('include', this.include.bind(this), {
            name: 'include',
            parameters: ['path'],
            description: 'Includes content from another file',
            examples: ['.include {content/introduction.qmd}']
        });

        // Function definition
        this.register('function', this.function.bind(this), {
            name: 'function',
            parameters: ['name'],
            description: 'Defines a custom function',
            examples: ['.function {greet}\\n    to from:\\n    **Hello, .to** from .from!']
        });
    }

    private register(name: string, impl: FunctionImplementation, signature: FunctionSignature): void {
        this.functions.set(name, impl);
        this.signatures.set(name, signature);
    }

    public hasFunction(name: string): boolean {
        return this.functions.has(name);
    }

    public async executeFunction(
        name: string, 
        args: ASTNode[], 
        body: ASTNode[], 
        context: ExecutionContext
    ): Promise<ASTNode | ASTNode[] | null> {
        const impl = this.functions.get(name);
        if (!impl) {
            throw new Error(`Unknown function: ${name}`);
        }
        return await impl(args, body, context);
    }

    public getFunctionNames(): string[] {
        return Array.from(this.functions.keys());
    }

    public getFunctionSignature(name: string): string {
        const sig = this.signatures.get(name);
        return sig ? `${sig.name}(${sig.parameters.join(', ')})` : '';
    }

    public getFunctionDocumentation(name: string): string {
        const sig = this.signatures.get(name);
        return sig ? sig.description : '';
    }

    // Layout function implementations
    private async row(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<RowNode> {
        const namedArgs = context.getNamedArgs();
        return {
            type: 'row',
            alignment: this.getStringArg(namedArgs, 'alignment') as any,
            gap: this.getStringArg(namedArgs, 'gap'),
            children: body
        };
    }

    private async column(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<ColumnNode> {
        const namedArgs = context.getNamedArgs();
        return {
            type: 'column',
            crossAlignment: this.getStringArg(namedArgs, 'cross') as any,
            gap: this.getStringArg(namedArgs, 'gap'),
            children: body
        };
    }

    private async grid(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<GridNode> {
        const namedArgs = context.getNamedArgs();
        return {
            type: 'grid',
            columns: this.getNumberArg(namedArgs, 'columns'),
            gap: this.getStringArg(namedArgs, 'gap'),
            children: body
        };
    }

    private async center(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<CenterNode> {
        return {
            type: 'center',
            children: body
        };
    }

    // Math function implementations
    private async add(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<TextNode> {
        const value = this.getNumberFromNode(args[0]) || 0;
        const toValue = this.getNumberArg(context.getNamedArgs(), 'to') || 0;
        return {
            type: 'text',
            content: String(value + toValue)
        };
    }

    private async multiply(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<TextNode> {
        const value = this.getNumberFromNode(args[0]) || 0;
        const byValue = this.getNumberArg(context.getNamedArgs(), 'by') || 1;
        return {
            type: 'text',
            content: String(value * byValue)
        };
    }

    private async pow(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<TextNode> {
        const base = this.getNumberFromNode(args[0]) || 0;
        const exponent = this.getNumberArg(context.getNamedArgs(), 'to') || 1;
        return {
            type: 'text',
            content: String(Math.pow(base, exponent))
        };
    }

    private async truncate(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<TextNode> {
        const decimals = this.getNumberFromNode(args[0]) || 0;
        const content = body.map(node => this.getTextFromNode(node)).join('');
        const number = parseFloat(content);
        if (isNaN(number)) {
            return { type: 'text', content };
        }
        return {
            type: 'text',
            content: number.toFixed(decimals)
        };
    }

    // Control flow implementations
    private async if(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<ASTNode[] | null> {
        const condition = this.evaluateCondition(args[0], context);
        return condition ? body : null;
    }

    private async repeat(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<ASTNode[]> {
        const count = this.getNumberFromNode(args[0]) || 1;
        const result: ASTNode[] = [];
        
        for (let i = 0; i < count; i++) {
            // Set loop variable if body contains it
            context.setVariable('_index', i);
            result.push(...body);
        }
        
        return result;
    }

    // Variable implementation
    private async var(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<null> {
        const name = this.getTextFromNode(args[0]);
        const value = args.length > 1 ? this.getTextFromNode(args[1]) : '';
        context.setVariable(name, value);
        return null;
    }

    // String operations
    private async upper(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<ASTNode[]> {
        return body.map(node => {
            if (node.type === 'text') {
                return { ...node, content: (node.content || '').toUpperCase() };
            }
            return node;
        });
    }

    private async lower(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<ASTNode[]> {
        return body.map(node => {
            if (node.type === 'text') {
                return { ...node, content: (node.content || '').toLowerCase() };
            }
            return node;
        });
    }

    // Document metadata (these typically don't return content)
    private async docname(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<null> {
        const title = this.getTextFromNode(args[0]);
        context.setMetadata('title', title);
        return null;
    }

    private async docauthor(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<null> {
        const author = this.getTextFromNode(args[0]);
        context.setMetadata('author', author);
        return null;
    }

    private async doctype(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<null> {
        const doctype = this.getTextFromNode(args[0]);
        context.setMetadata('doctype', doctype);
        return null;
    }

    private async theme(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<null> {
        const themeName = this.getTextFromNode(args[0]);
        const namedArgs = context.getNamedArgs();
        const layout = this.getStringArg(namedArgs, 'layout');
        
        context.setMetadata('theme', themeName);
        if (layout) {
            context.setMetadata('layout', layout);
        }
        return null;
    }

    // I/O operations
    private async include(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<ASTNode[]> {
        const path = this.getTextFromNode(args[0]);
        // This would need to be implemented to actually read and parse the file
        // For now, return a placeholder
        return [{
            type: 'text',
            content: `[Included: ${path}]`
        }];
    }

    // Function definition
    private async function(args: ASTNode[], body: ASTNode[], context: ExecutionContext): Promise<null> {
        const functionName = this.getTextFromNode(args[0]);
        // Extract parameter names from body (simplified implementation)
        const parameters: string[] = [];
        
        context.defineFunction(functionName, parameters, body);
        return null;
    }

    // Helper methods
    private getStringArg(namedArgs: Record<string, ASTNode>, name: string): string | undefined {
        const arg = namedArgs[name];
        return arg ? this.getTextFromNode(arg) : undefined;
    }

    private getNumberArg(namedArgs: Record<string, ASTNode>, name: string): number | undefined {
        const arg = namedArgs[name];
        if (!arg) return undefined;
        const text = this.getTextFromNode(arg);
        const num = parseFloat(text);
        return isNaN(num) ? undefined : num;
    }

    private getTextFromNode(node: ASTNode): string {
        if (node.type === 'text') {
            return node.content || '';
        }
        if (node.children) {
            return node.children.map(child => this.getTextFromNode(child)).join('');
        }
        return '';
    }

    private getNumberFromNode(node: ASTNode): number | undefined {
        const text = this.getTextFromNode(node);
        const num = parseFloat(text);
        return isNaN(num) ? undefined : num;
    }

    private evaluateCondition(node: ASTNode, context: ExecutionContext): boolean {
        // Simplified condition evaluation
        // In a full implementation, this would handle complex expressions
        const text = this.getTextFromNode(node);
        
        // Handle simple variable checks
        if (text.startsWith('.')) {
            const varName = text.slice(1);
            const value = context.getVariable(varName);
            return !!value;
        }
        
        // Handle boolean literals
        if (text === 'true') return true;
        if (text === 'false') return false;
        
        // Handle numeric comparisons (simplified)
        const num = parseFloat(text);
        return !isNaN(num) && num !== 0;
    }
}