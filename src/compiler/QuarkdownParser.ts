import * as MarkdownIt from 'markdown-it';
import { 
    ASTNode, 
    DocumentNode, 
    FunctionCallNode, 
    VariableNode, 
    TextNode,
    ParagraphNode,
    HeadingNode,
    ListNode,
    ListItemNode,
    BlockquoteNode,
    CodeNode,
    MathNode,
    ImageNode,
    LinkNode,
    EmphasisNode,
    SourceLocation
} from './ast/ASTNodes';

export interface ParseResult {
    ast: DocumentNode;
    errors: ParseError[];
}

export interface ParseError {
    message: string;
    line?: number;
    column?: number;
    type: 'syntax' | 'semantic';
}

export class QuarkdownParser {
    private md: MarkdownIt;
    private currentLine: number = 1;
    private currentColumn: number = 1;
    
    constructor() {
        this.md = new MarkdownIt({
            html: true,
            linkify: true,
            typographer: true
        });
        
        // Add custom rules for Quarkdown syntax
        this.setupQuarkdownRules();
    }

    public parse(source: string): ParseResult {
        const errors: ParseError[] = [];
        
        try {
            // First pass: handle Quarkdown-specific syntax
            const preprocessed = this.preprocessQuarkdownSyntax(source);
            
            // Second pass: parse with markdown-it
            const tokens = this.md.parse(preprocessed, {});
            
            // Third pass: convert to AST
            const ast = this.tokensToAST(tokens, errors);
            
            return { ast, errors };
        } catch (error) {
            errors.push({
                message: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
                type: 'syntax'
            });
            
            return {
                ast: { type: 'document', children: [] },
                errors
            };
        }
    }

    private setupQuarkdownRules(): void {
        // Add rule for function calls: .functionname {arg1} {arg2} body
        this.md.inline.ruler.before('text', 'quarkdown_function', (state, silent) => {
            return this.parseFunctionCall(state, silent);
        });

        // Add rule for variables: .variablename
        this.md.inline.ruler.before('text', 'quarkdown_variable', (state, silent) => {
            return this.parseVariable(state, silent);
        });

        // Add rule for math expressions: $ ... $ and $$ ... $$
        this.md.inline.ruler.before('text', 'quarkdown_math', (state, silent) => {
            return this.parseMath(state, silent);
        });

        // Add rule for enhanced images: !(width*height)[alt](src)
        this.md.inline.ruler.before('image', 'quarkdown_image', (state, silent) => {
            return this.parseEnhancedImage(state, silent);
        });
    }

    private parseFunctionCall(state: any, silent: boolean): boolean {
        const start = state.pos;
        const max = state.posMax;
        
        // Check for function call pattern: .functionname
        if (state.src.charAt(start) !== '.') {
            return false;
        }
        
        let pos = start + 1;
        
        // Parse function name
        const nameMatch = state.src.slice(pos).match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (!nameMatch) {
            return false;
        }
        
        const functionName = nameMatch[1];
        pos += functionName.length;
        
        if (!silent) {
            const token = state.push('quarkdown_function_open', '', 0);
            token.markup = '.';
            token.info = functionName;
            token.map = [state.line, state.line];
        }
        
        state.pos = pos;
        return true;
    }

    private parseVariable(state: any, silent: boolean): boolean {
        const start = state.pos;
        
        // Check for variable pattern: .variablename (when not followed by function syntax)
        if (state.src.charAt(start) !== '.') {
            return false;
        }
        
        let pos = start + 1;
        const nameMatch = state.src.slice(pos).match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (!nameMatch) {
            return false;
        }
        
        const variableName = nameMatch[1];
        pos += variableName.length;
        
        // Check that it's not followed by function call syntax
        if (state.src.charAt(pos) === '{' || state.src.charAt(pos) === ' ') {
            return false;
        }
        
        if (!silent) {
            const token = state.push('quarkdown_variable', '', 0);
            token.content = variableName;
            token.map = [state.line, state.line];
        }
        
        state.pos = pos;
        return true;
    }

    private parseMath(state: any, silent: boolean): boolean {
        const start = state.pos;
        const marker = state.src.charAt(start);
        
        if (marker !== '$') {
            return false;
        }
        
        // Check for display math ($$)
        const isDisplay = state.src.charAt(start + 1) === '$';
        const markerLen = isDisplay ? 2 : 1;
        
        let pos = start + markerLen;
        let found = false;
        
        // Find closing marker
        while (pos < state.posMax) {
            if (state.src.charAt(pos) === '$') {
                if (isDisplay && state.src.charAt(pos + 1) === '$') {
                    found = true;
                    pos += 2;
                    break;
                } else if (!isDisplay) {
                    found = true;
                    pos += 1;
                    break;
                }
            }
            pos++;
        }
        
        if (!found) {
            return false;
        }
        
        if (!silent) {
            const content = state.src.slice(start + markerLen, pos - markerLen);
            const token = state.push('quarkdown_math', '', 0);
            token.content = content;
            token.markup = isDisplay ? '$$' : '$';
            token.info = isDisplay ? 'display' : 'inline';
        }
        
        state.pos = pos;
        return true;
    }

    private parseEnhancedImage(state: any, silent: boolean): boolean {
        const start = state.pos;
        const max = state.posMax;
        
        // Check for enhanced image pattern: !(dimensions)[alt](src)
        if (state.src.charAt(start) !== '!' || 
            state.src.charAt(start + 1) !== '(') {
            return false;
        }
        
        let pos = start + 2;
        let dimensionsEnd = -1;
        
        // Find end of dimensions
        while (pos < max && state.src.charAt(pos) !== ')') {
            if (state.src.charAt(pos) === '\\') {
                pos++; // Skip escaped character
            }
            pos++;
        }
        
        if (pos >= max) {
            return false;
        }
        
        const dimensions = state.src.slice(start + 2, pos);
        pos++; // Skip ')'
        
        // Continue with standard image parsing for [alt](src)
        if (state.src.charAt(pos) !== '[') {
            return false;
        }
        
        // This is a simplified version - in reality, we'd need to properly parse the image
        if (!silent) {
            const token = state.push('quarkdown_enhanced_image', '', 0);
            token.info = dimensions;
            token.map = [state.line, state.line];
        }
        
        return true;
    }

    private preprocessQuarkdownSyntax(source: string): string {
        let processed = source;
        
        // Handle function calls with more complex parsing
        processed = this.preprocessFunctionCalls(processed);
        
        // Handle blockquote types (> Note:, > Tip:, etc.)
        processed = processed.replace(/^>\s*(Note|Tip|Warning|Info):\s*/gm, 
            (match, type) => `> [!${type.toUpperCase()}]\n> `);
        
        return processed;
    }

    private preprocessFunctionCalls(source: string): string {
        // This is a simplified preprocessing step
        // In a full implementation, we'd need more sophisticated parsing
        return source.replace(
            /\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\{([^}]*)\}/g,
            (match, funcName, args) => {
                return `{{FUNCTION:${funcName}:${args}}}`;
            }
        );
    }

    private tokensToAST(tokens: any[], errors: ParseError[]): DocumentNode {
        const children: ASTNode[] = [];
        
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const node = this.tokenToASTNode(token, errors);
            if (node) {
                children.push(node);
            }
        }
        
        return {
            type: 'document',
            children
        };
    }

    private tokenToASTNode(token: any, errors: ParseError[]): ASTNode | null {
        const location: SourceLocation = {
            line: token.map ? token.map[0] : 0,
            column: 0,
            offset: 0
        };

        switch (token.type) {
            case 'paragraph_open':
                return null; // Handle in paragraph_close
            
            case 'paragraph_close':
                return null; // Handled by parent
            
            case 'heading_open':
                return {
                    type: 'heading',
                    level: parseInt(token.tag.slice(1)), // h1 -> 1, h2 -> 2, etc.
                    children: [],
                    location
                } as HeadingNode;
            
            case 'text':
                return {
                    type: 'text',
                    content: token.content,
                    location
                } as TextNode;
            
            case 'code_inline':
                return {
                    type: 'code',
                    content: token.content,
                    inline: true,
                    location
                } as CodeNode;
            
            case 'code_block':
            case 'fence':
                return {
                    type: 'code',
                    content: token.content,
                    language: token.info || undefined,
                    inline: false,
                    location
                } as CodeNode;
            
            case 'quarkdown_function_open':
                return this.parseFunctionCallToken(token, errors);
            
            case 'quarkdown_variable':
                return {
                    type: 'variable',
                    name: token.content,
                    location
                } as VariableNode;
            
            case 'quarkdown_math':
                return {
                    type: 'math',
                    content: token.content,
                    inline: token.info === 'inline',
                    location
                } as MathNode;
            
            case 'image':
                return this.parseImageToken(token);
            
            case 'link_open':
                return {
                    type: 'link',
                    url: token.attrGet('href') || '',
                    title: token.attrGet('title') || undefined,
                    children: [],
                    location
                } as LinkNode;
            
            case 'strong_open':
            case 'em_open':
                return {
                    type: 'emphasis',
                    strong: token.type === 'strong_open',
                    children: [],
                    location
                } as EmphasisNode;
            
            default:
                // For unhandled token types, convert to text
                if (token.content) {
                    return {
                        type: 'text',
                        content: token.content,
                        location
                    } as TextNode;
                }
                return null;
        }
    }

    private parseFunctionCallToken(token: any, errors: ParseError[]): FunctionCallNode {
        const functionName = token.info;
        
        // This is a simplified implementation
        // In reality, we'd need to parse arguments and body content
        return {
            type: 'function_call',
            name: functionName,
            args: [],
            namedArgs: {},
            body: [],
            location: {
                line: token.map ? token.map[0] : 0,
                column: 0,
                offset: 0
            }
        };
    }

    private parseImageToken(token: any): ImageNode {
        const src = token.attrGet('src') || '';
        const alt = token.content || '';
        const title = token.attrGet('title') || undefined;
        
        return {
            type: 'image',
            src,
            alt,
            title,
            location: {
                line: token.map ? token.map[0] : 0,
                column: 0,
                offset: 0
            }
        };
    }
}