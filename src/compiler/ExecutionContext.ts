import { ASTNode } from './ast/ASTNodes';
import { CompileOptions, CompileWarning } from './QuarkdownCompiler';
import { StandardLibrary } from '../stdlib/StandardLibrary';

export interface UserDefinedFunction {
    name: string;
    parameters: string[];
    namedParameters?: string[];
    body: ASTNode[];
}

export class ExecutionContext {
    private variables: Map<string, any> = new Map();
    private metadata: Map<string, any> = new Map();
    private userFunctions: Map<string, UserDefinedFunction> = new Map();
    private warnings: CompileWarning[] = [];
    private namedArgs: Record<string, ASTNode> = {};
    private stdlib: StandardLibrary;
    private options: CompileOptions;
    private scopeStack: Map<string, any>[] = [];

    constructor(stdlib: StandardLibrary, options: CompileOptions) {
        this.stdlib = stdlib;
        this.options = options;
        this.initializeBuiltinVariables();
    }

    private initializeBuiltinVariables(): void {
        // Mathematical constants
        this.variables.set('pi', Math.PI);
        this.variables.set('e', Math.E);
        
        // Date and time
        const now = new Date();
        this.variables.set('today', now.toLocaleDateString());
        this.variables.set('now', now.toLocaleString());
        this.variables.set('year', now.getFullYear());
        this.variables.set('month', now.getMonth() + 1);
        this.variables.set('day', now.getDate());
    }

    // Variable management
    public setVariable(name: string, value: any): void {
        this.variables.set(name, value);
    }

    public getVariable(name: string): any {
        // Check current scope first
        if (this.scopeStack.length > 0) {
            const currentScope = this.scopeStack[this.scopeStack.length - 1];
            if (currentScope.has(name)) {
                return currentScope.get(name);
            }
        }
        
        // Then check global variables
        return this.variables.get(name);
    }

    public hasVariable(name: string): boolean {
        if (this.scopeStack.length > 0) {
            const currentScope = this.scopeStack[this.scopeStack.length - 1];
            if (currentScope.has(name)) {
                return true;
            }
        }
        return this.variables.has(name);
    }

    public deleteVariable(name: string): void {
        this.variables.delete(name);
    }

    // Scope management
    public pushScope(): void {
        this.scopeStack.push(new Map());
    }

    public popScope(): void {
        this.scopeStack.pop();
    }

    public setScopedVariable(name: string, value: any): void {
        if (this.scopeStack.length > 0) {
            const currentScope = this.scopeStack[this.scopeStack.length - 1];
            currentScope.set(name, value);
        } else {
            this.setVariable(name, value);
        }
    }

    // Metadata management
    public setMetadata(key: string, value: any): void {
        this.metadata.set(key, value);
    }

    public getMetadata(key: string): any {
        return this.metadata.get(key);
    }

    public getAllMetadata(): Record<string, any> {
        const result: Record<string, any> = {};
        for (const [key, value] of this.metadata.entries()) {
            result[key] = value;
        }
        return result;
    }

    // User-defined function management
    public defineFunction(name: string, parameters: string[], body: ASTNode[], namedParameters?: string[]): void {
        this.userFunctions.set(name, {
            name,
            parameters,
            namedParameters,
            body
        });
    }

    public hasFunction(name: string): boolean {
        return this.userFunctions.has(name) || this.stdlib.hasFunction(name);
    }

    public async executeFunction(name: string, args: ASTNode[], body: ASTNode[]): Promise<ASTNode | ASTNode[] | null> {
        // Check if it's a user-defined function
        const userFunc = this.userFunctions.get(name);
        if (userFunc) {
            return await this.executeUserFunction(userFunc, args, body);
        }

        // Check if it's a standard library function
        if (this.stdlib.hasFunction(name)) {
            return await this.stdlib.executeFunction(name, args, body, this);
        }

        throw new Error(`Unknown function: ${name}`);
    }

    private async executeUserFunction(
        func: UserDefinedFunction, 
        args: ASTNode[], 
        body: ASTNode[]
    ): Promise<ASTNode | ASTNode[] | null> {
        // Create new scope for function execution
        this.pushScope();

        try {
            // Bind positional parameters
            for (let i = 0; i < func.parameters.length && i < args.length; i++) {
                const paramName = func.parameters[i];
                const argValue = this.nodeToValue(args[i]);
                this.setScopedVariable(paramName, argValue);
            }

            // Bind named parameters
            for (const [name, value] of Object.entries(this.namedArgs)) {
                if (func.namedParameters?.includes(name)) {
                    this.setScopedVariable(name, this.nodeToValue(value));
                }
            }

            // Execute function body
            const result: ASTNode[] = [];
            for (const node of func.body) {
                // This would need to recursively execute the function body
                // For now, return the body as-is
                result.push(...(Array.isArray(node) ? node : [node]));
            }

            return result;

        } finally {
            // Clean up scope
            this.popScope();
        }
    }

    private nodeToValue(node: ASTNode): any {
        if (node.type === 'text') {
            return node.content || '';
        }
        if (node.type === 'variable') {
            return this.getVariable((node as any).name);
        }
        // For complex nodes, return string representation
        return JSON.stringify(node);
    }

    // Named arguments management
    public setNamedArgs(namedArgs: Record<string, ASTNode>): void {
        this.namedArgs = namedArgs;
    }

    public getNamedArgs(): Record<string, ASTNode> {
        return this.namedArgs;
    }

    public getNamedArg(name: string): ASTNode | undefined {
        return this.namedArgs[name];
    }

    // Warning management
    public addWarning(warning: CompileWarning): void {
        this.warnings.push(warning);
    }

    public getWarnings(): CompileWarning[] {
        return [...this.warnings];
    }

    public clearWarnings(): void {
        this.warnings = [];
    }

    // Options access
    public getOptions(): CompileOptions {
        return this.options;
    }

    public getOption<T>(key: keyof CompileOptions): T | undefined {
        return this.options[key] as T;
    }

    // Utility methods
    public evaluateExpression(expression: string): any {
        // Simple expression evaluator
        // In a full implementation, this would be more sophisticated
        
        // Handle variable references
        if (expression.startsWith('.')) {
            const varName = expression.slice(1);
            return this.getVariable(varName);
        }

        // Handle numeric literals
        const num = parseFloat(expression);
        if (!isNaN(num)) {
            return num;
        }

        // Handle boolean literals
        if (expression === 'true') return true;
        if (expression === 'false') return false;

        // Handle string literals (basic)
        if (expression.startsWith('"') && expression.endsWith('"')) {
            return expression.slice(1, -1);
        }

        // Return as string if nothing else matches
        return expression;
    }

    public clone(): ExecutionContext {
        const cloned = new ExecutionContext(this.stdlib, this.options);
        
        // Copy variables
        for (const [key, value] of this.variables.entries()) {
            cloned.variables.set(key, value);
        }

        // Copy metadata
        for (const [key, value] of this.metadata.entries()) {
            cloned.metadata.set(key, value);
        }

        // Copy user functions
        for (const [key, value] of this.userFunctions.entries()) {
            cloned.userFunctions.set(key, { ...value });
        }

        // Copy warnings
        cloned.warnings = [...this.warnings];

        return cloned;
    }

    // Debugging and introspection
    public dumpState(): any {
        return {
            variables: Object.fromEntries(this.variables.entries()),
            metadata: Object.fromEntries(this.metadata.entries()),
            userFunctions: Array.from(this.userFunctions.keys()),
            warnings: this.warnings,
            scopeDepth: this.scopeStack.length
        };
    }

    public hasConflictingNames(): string[] {
        const conflicts: string[] = [];
        
        for (const varName of this.variables.keys()) {
            if (this.stdlib.hasFunction(varName)) {
                conflicts.push(`Variable '${varName}' conflicts with standard function`);
            }
            if (this.userFunctions.has(varName)) {
                conflicts.push(`Variable '${varName}' conflicts with user function`);
            }
        }

        for (const funcName of this.userFunctions.keys()) {
            if (this.stdlib.hasFunction(funcName)) {
                conflicts.push(`User function '${funcName}' shadows standard function`);
            }
        }

        return conflicts;
    }

    // Math utilities
    public isEven(value: any): boolean {
        const num = typeof value === 'number' ? value : parseFloat(String(value));
        return !isNaN(num) && num % 2 === 0;
    }

    public isOdd(value: any): boolean {
        return !this.isEven(value);
    }

    public isPositive(value: any): boolean {
        const num = typeof value === 'number' ? value : parseFloat(String(value));
        return !isNaN(num) && num > 0;
    }

    public isNegative(value: any): boolean {
        const num = typeof value === 'number' ? value : parseFloat(String(value));
        return !isNaN(num) && num < 0;
    }

    // String utilities
    public capitalize(text: string): string {
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

    public slugify(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    // Collection utilities
    public range(start: number, end?: number, step: number = 1): number[] {
        if (end === undefined) {
            end = start;
            start = 0;
        }

        const result: number[] = [];
        for (let i = start; i < end; i += step) {
            result.push(i);
        }
        return result;
    }
}