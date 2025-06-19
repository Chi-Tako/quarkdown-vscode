// Base AST Node interface
export interface ASTNode {
    type: string;
    content?: string;
    children?: ASTNode[];
    attributes?: Record<string, any>;
    location?: SourceLocation;
}

export interface SourceLocation {
    line: number;
    column: number;
    offset: number;
}

// Document root node
export interface DocumentNode extends ASTNode {
    type: 'document';
    children: ASTNode[];
    metadata?: DocumentMetadata;
}

export interface DocumentMetadata {
    title?: string;
    author?: string;
    language?: string;
    doctype?: string;
    theme?: string;
}

// Text nodes
export interface TextNode extends ASTNode {
    type: 'text';
    content: string;
}

export interface CodeNode extends ASTNode {
    type: 'code';
    content: string;
    language?: string;
    inline?: boolean;
}

// Structure nodes
export interface ParagraphNode extends ASTNode {
    type: 'paragraph';
    children: ASTNode[];
}

export interface HeadingNode extends ASTNode {
    type: 'heading';
    level: number;
    children: ASTNode[];
}

export interface ListNode extends ASTNode {
    type: 'list';
    ordered: boolean;
    children: ListItemNode[];
}

export interface ListItemNode extends ASTNode {
    type: 'list_item';
    children: ASTNode[];
}

export interface BlockquoteNode extends ASTNode {
    type: 'blockquote';
    children: ASTNode[];
    quoteType?: 'note' | 'tip' | 'warning' | 'info';
}

// Formatting nodes
export interface EmphasisNode extends ASTNode {
    type: 'emphasis';
    strong?: boolean;
    children: ASTNode[];
}

export interface LinkNode extends ASTNode {
    type: 'link';
    url: string;
    title?: string;
    children: ASTNode[];
}

export interface ImageNode extends ASTNode {
    type: 'image';
    src: string;
    alt?: string;
    title?: string;
    width?: string;
    height?: string;
}

// Quarkdown-specific nodes
export interface FunctionCallNode extends ASTNode {
    type: 'function_call';
    name: string;
    args: ASTNode[];
    namedArgs?: Record<string, ASTNode>;
    body?: ASTNode[];
}

export interface FunctionDefinitionNode extends ASTNode {
    type: 'function_definition';
    name: string;
    parameters: string[];
    namedParameters?: string[];
    body: ASTNode[];
}

export interface VariableNode extends ASTNode {
    type: 'variable';
    name: string;
}

export interface ConditionalNode extends ASTNode {
    type: 'conditional';
    condition: ASTNode;
    then: ASTNode[];
    else?: ASTNode[];
}

export interface LoopNode extends ASTNode {
    type: 'loop';
    variable?: string;
    count?: number;
    collection?: ASTNode;
    body: ASTNode[];
}

// Layout nodes
export interface RowNode extends ASTNode {
    type: 'row';
    alignment?: 'start' | 'center' | 'end' | 'stretch';
    gap?: string;
    children: ASTNode[];
}

export interface ColumnNode extends ASTNode {
    type: 'column';
    crossAlignment?: 'start' | 'center' | 'end' | 'stretch';
    gap?: string;
    children: ASTNode[];
}

export interface GridNode extends ASTNode {
    type: 'grid';
    columns?: number;
    gap?: string;
    children: ASTNode[];
}

export interface CenterNode extends ASTNode {
    type: 'center';
    children: ASTNode[];
}

// Math and special content
export interface MathNode extends ASTNode {
    type: 'math';
    content: string;
    inline?: boolean;
}

export interface MermaidNode extends ASTNode {
    type: 'mermaid';
    content: string;
    config?: Record<string, any>;
}

export interface TableNode extends ASTNode {
    type: 'table';
    headers: ASTNode[][];
    rows: ASTNode[][];
    alignment?: ('left' | 'center' | 'right')[];
}

// Include and import nodes
export interface IncludeNode extends ASTNode {
    type: 'include';
    path: string;
    resolved?: DocumentNode;
}

export interface ImportNode extends ASTNode {
    type: 'import';
    path: string;
    functions?: string[];
}

// Slide-specific nodes
export interface SlideNode extends ASTNode {
    type: 'slide';
    title?: string;
    children: ASTNode[];
    transition?: string;
    background?: string;
}

export interface SlideBreakNode extends ASTNode {
    type: 'slide_break';
}

// Helper functions for working with AST
export class ASTUtils {
    static isTextContent(node: ASTNode): boolean {
        return node.type === 'text' || node.type === 'code';
    }

    static isContainerNode(node: ASTNode): boolean {
        return ['paragraph', 'heading', 'list', 'blockquote', 'row', 'column', 'grid'].includes(node.type);
    }

    static isFunctionNode(node: ASTNode): boolean {
        return node.type === 'function_call' || node.type === 'function_definition';
    }

    static findNodes(root: ASTNode, predicate: (node: ASTNode) => boolean): ASTNode[] {
        const results: ASTNode[] = [];
        
        function traverse(node: ASTNode) {
            if (predicate(node)) {
                results.push(node);
            }
            
            if (node.children) {
                for (const child of node.children) {
                    traverse(child);
                }
            }
        }
        
        traverse(root);
        return results;
    }

    static findNodesByType(root: ASTNode, type: string): ASTNode[] {
        return ASTUtils.findNodes(root, node => node.type === type);
    }

    static findFunctionCalls(root: ASTNode, functionName?: string): FunctionCallNode[] {
        const calls = ASTUtils.findNodesByType(root, 'function_call') as FunctionCallNode[];
        return functionName ? calls.filter(call => call.name === functionName) : calls;
    }

    static replaceNode(root: ASTNode, target: ASTNode, replacement: ASTNode | ASTNode[]): void {
        function traverse(node: ASTNode, parent?: ASTNode, index?: number) {
            if (node === target && parent && parent.children && typeof index === 'number') {
                if (Array.isArray(replacement)) {
                    parent.children.splice(index, 1, ...replacement);
                } else {
                    parent.children[index] = replacement;
                }
                return;
            }
            
            if (node.children) {
                for (let i = 0; i < node.children.length; i++) {
                    traverse(node.children[i], node, i);
                }
            }
        }
        
        traverse(root);
    }

    static cloneNode(node: ASTNode): ASTNode {
        const cloned: ASTNode = {
            ...node,
            children: node.children ? node.children.map(child => ASTUtils.cloneNode(child)) : undefined
        };
        return cloned;
    }

    static getTextContent(node: ASTNode): string {
        if (node.type === 'text') {
            return node.content || '';
        }
        
        if (node.children) {
            return node.children.map(child => ASTUtils.getTextContent(child)).join('');
        }
        
        return '';
    }
}