import { 
    ASTNode, 
    DocumentNode, 
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
    RowNode,
    ColumnNode,
    GridNode,
    CenterNode,
    SlideNode,
    TableNode,
    MermaidNode
} from './ast/ASTNodes';

export interface RenderOptions {
    doctype?: 'slides' | 'paged' | 'plain';
    theme?: string;
    outputFormat?: 'html' | 'pdf';
    includeStyles?: boolean;
    minify?: boolean;
}

export class QuarkdownRenderer {
    private options: RenderOptions = {};

    public async render(ast: DocumentNode, options: RenderOptions = {}): Promise<string> {
        this.options = { ...options };
        
        const bodyContent = await this.renderChildren(ast.children);
        
        if (options.includeStyles !== false) {
            return this.wrapWithDocument(bodyContent, ast.metadata);
        }
        
        return bodyContent;
    }

    private async renderChildren(nodes: ASTNode[]): Promise<string> {
        const rendered = await Promise.all(nodes.map(node => this.renderNode(node)));
        return rendered.filter(html => html).join('\n');
    }

    private async renderNode(node: ASTNode): Promise<string> {
        switch (node.type) {
            case 'text':
                return this.renderText(node as TextNode);
            
            case 'paragraph':
                return this.renderParagraph(node as ParagraphNode);
            
            case 'heading':
                return this.renderHeading(node as HeadingNode);
            
            case 'list':
                return this.renderList(node as ListNode);
            
            case 'list_item':
                return this.renderListItem(node as ListItemNode);
            
            case 'blockquote':
                return this.renderBlockquote(node as BlockquoteNode);
            
            case 'code':
                return this.renderCode(node as CodeNode);
            
            case 'math':
                return this.renderMath(node as MathNode);
            
            case 'image':
                return this.renderImage(node as ImageNode);
            
            case 'link':
                return this.renderLink(node as LinkNode);
            
            case 'emphasis':
                return this.renderEmphasis(node as EmphasisNode);
            
            case 'row':
                return this.renderRow(node as RowNode);
            
            case 'column':
                return this.renderColumn(node as ColumnNode);
            
            case 'grid':
                return this.renderGrid(node as GridNode);
            
            case 'center':
                return this.renderCenter(node as CenterNode);
            
            case 'slide':
                return this.renderSlide(node as SlideNode);
            
            case 'table':
                return this.renderTable(node as TableNode);
            
            case 'mermaid':
                return this.renderMermaid(node as MermaidNode);
            
            default:
                console.warn(`Unknown node type: ${node.type}`);
                return '';
        }
    }

    private renderText(node: TextNode): string {
        return this.escapeHtml(node.content || '');
    }

    private async renderParagraph(node: ParagraphNode): Promise<string> {
        const content = await this.renderChildren(node.children);
        return `<p>${content}</p>`;
    }

    private async renderHeading(node: HeadingNode): Promise<string> {
        const content = await this.renderChildren(node.children);
        const id = this.generateId(content);
        return `<h${node.level} id="${id}">${content}</h${node.level}>`;
    }

    private async renderList(node: ListNode): Promise<string> {
        const tag = node.ordered ? 'ol' : 'ul';
        const content = await this.renderChildren(node.children);
        return `<${tag}>\n${content}\n</${tag}>`;
    }

    private async renderListItem(node: ListItemNode): Promise<string> {
        const content = await this.renderChildren(node.children);
        return `<li>${content}</li>`;
    }

    private async renderBlockquote(node: BlockquoteNode): Promise<string> {
        const content = await this.renderChildren(node.children);
        const typeClass = node.quoteType ? ` class="quote-${node.quoteType}"` : '';
        const typeIcon = this.getQuoteTypeIcon(node.quoteType);
        
        return `<blockquote${typeClass}>
            ${typeIcon}
            ${content}
        </blockquote>`;
    }

    private renderCode(node: CodeNode): string {
        const content = this.escapeHtml(node.content || '');
        
        if (node.inline) {
            return `<code>${content}</code>`;
        }
        
        const languageClass = node.language ? ` class="language-${node.language}"` : '';
        return `<pre><code${languageClass}>${content}</code></pre>`;
    }

    private renderMath(node: MathNode): string {
        const content = this.escapeHtml(node.content || '');
        const className = node.inline ? 'math math-inline' : 'math math-display';
        return `<span class="${className}">${content}</span>`;
    }

    private renderImage(node: ImageNode): string {
        const alt = node.alt ? ` alt="${this.escapeHtml(node.alt)}"` : '';
        const title = node.title ? ` title="${this.escapeHtml(node.title)}"` : '';
        
        let style = '';
        if (node.width || node.height) {
            const styleProps = [];
            if (node.width) styleProps.push(`width: ${node.width}`);
            if (node.height) styleProps.push(`height: ${node.height}`);
            style = ` style="${styleProps.join('; ')}"`;
        }
        
        return `<img src="${this.escapeHtml(node.src)}"${alt}${title}${style}>`;
    }

    private async renderLink(node: LinkNode): Promise<string> {
        const content = await this.renderChildren(node.children);
        const title = node.title ? ` title="${this.escapeHtml(node.title)}"` : '';
        return `<a href="${this.escapeHtml(node.url)}"${title}>${content}</a>`;
    }

    private async renderEmphasis(node: EmphasisNode): Promise<string> {
        const content = await this.renderChildren(node.children);
        const tag = node.strong ? 'strong' : 'em';
        return `<${tag}>${content}</${tag}>`;
    }

    private async renderRow(node: RowNode): Promise<string> {
        const content = await this.renderChildren(node.children);
        const alignmentClass = node.alignment ? ` alignment-${node.alignment}` : '';
        const gapStyle = node.gap ? ` style="--gap: ${node.gap}"` : '';
        
        return `<div class="qmd-row${alignmentClass}"${gapStyle}>${content}</div>`;
    }

    private async renderColumn(node: ColumnNode): Promise<string> {
        const content = await this.renderChildren(node.children);
        const crossClass = node.crossAlignment ? ` cross-${node.crossAlignment}` : '';
        const gapStyle = node.gap ? ` style="--gap: ${node.gap}"` : '';
        
        return `<div class="qmd-column${crossClass}"${gapStyle}>${content}</div>`;
    }

    private async renderGrid(node: GridNode): Promise<string> {
        const content = await this.renderChildren(node.children);
        const columnsStyle = node.columns ? `--columns: ${node.columns}` : '';
        const gapStyle = node.gap ? `--gap: ${node.gap}` : '';
        const styles = [columnsStyle, gapStyle].filter(s => s).join('; ');
        const styleAttr = styles ? ` style="${styles}"` : '';
        
        return `<div class="qmd-grid"${styleAttr}>${content}</div>`;
    }

    private async renderCenter(node: CenterNode): Promise<string> {
        const content = await this.renderChildren(node.children);
        return `<div class="qmd-center">${content}</div>`;
    }

    private async renderSlide(node: SlideNode): Promise<string> {
        const content = await this.renderChildren(node.children);
        const titleHtml = node.title ? `<h1 class="slide-title">${this.escapeHtml(node.title)}</h1>` : '';
        const transitionAttr = node.transition ? ` data-transition="${node.transition}"` : '';
        const backgroundAttr = node.background ? ` data-background="${node.background}"` : '';
        
        return `<section class="slide"${transitionAttr}${backgroundAttr}>
            ${titleHtml}
            <div class="slide-content">
                ${content}
            </div>
        </section>`;
    }

    private async renderTable(node: TableNode): Promise<string> {
        let html = '<table>\n';
        
        // Render headers
        if (node.headers && node.headers.length > 0) {
            html += '<thead>\n<tr>\n';
            for (let i = 0; i < node.headers.length; i++) {
                const cellContent = await this.renderChildren(node.headers[i]);
                const align = node.alignment?.[i];
                const alignClass = align ? ` class="text-${align}"` : '';
                html += `<th${alignClass}>${cellContent}</th>\n`;
            }
            html += '</tr>\n</thead>\n';
        }
        
        // Render rows
        if (node.rows && node.rows.length > 0) {
            html += '<tbody>\n';
            for (const row of node.rows) {
                html += '<tr>\n';
                for (let i = 0; i < row.length; i++) {
                    const cellContent = await this.renderChildren(row[i]);
                    const align = node.alignment?.[i];
                    const alignClass = align ? ` class="text-${align}"` : '';
                    html += `<td${alignClass}>${cellContent}</td>\n`;
                }
                html += '</tr>\n';
            }
            html += '</tbody>\n';
        }
        
        html += '</table>';
        return html;
    }

    private renderMermaid(node: MermaidNode): string {
        const content = this.escapeHtml(node.content || '');
        const configAttr = node.config ? ` data-config='${JSON.stringify(node.config)}'` : '';
        
        return `<div class="mermaid"${configAttr}>${content}</div>`;
    }

    private wrapWithDocument(content: string, metadata: any = {}): string {
        const title = metadata.title || 'Quarkdown Document';
        const author = metadata.author || '';
        const language = metadata.language || 'en';
        const theme = metadata.theme || this.options.theme || 'default';
        const doctype = metadata.doctype || this.options.doctype || 'plain';

        return `<!DOCTYPE html>
<html lang="${language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(title)}</title>
    ${author ? `<meta name="author" content="${this.escapeHtml(author)}">` : ''}
    <style>
        ${this.getBaseStyles()}
        ${this.getThemeStyles(theme)}
        ${this.getLayoutStyles()}
        ${this.getDoctypeStyles(doctype)}
    </style>
    ${this.getExternalDependencies()}
</head>
<body class="quarkdown-document doctype-${doctype} theme-${theme}">
    ${this.getDocumentWrapper(content, doctype)}
    ${this.getScripts()}
</body>
</html>`;
    }

    private getDocumentWrapper(content: string, doctype: string): string {
        switch (doctype) {
            case 'slides':
                return `<div class="reveal">
                    <div class="slides">
                        ${content}
                    </div>
                </div>`;
            
            case 'paged':
                return `<article class="paged-document">
                    ${content}
                </article>`;
            
            default:
                return `<main class="document-content">
                    ${content}
                </main>`;
        }
    }

    private getExternalDependencies(): string {
        const deps = [];
        
        // KaTeX for math rendering
        deps.push('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.css">');
        deps.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.js"></script>');
        
        // Mermaid for diagrams
        deps.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.6.1/mermaid.min.js"></script>');
        
        // Highlight.js for code syntax highlighting
        deps.push('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css">');
        deps.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>');
        
        // Reveal.js for presentations
        if (this.options.doctype === 'slides') {
            deps.push('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.6.1/reveal.min.css">');
            deps.push('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.6.1/theme/white.min.css">');
            deps.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.6.1/reveal.min.js"></script>');
        }
        
        return deps.join('\n    ');
    }

    private getScripts(): string {
        let scripts = `
        <script>
            // Initialize syntax highlighting
            hljs.highlightAll();
            
            // Initialize KaTeX
            document.querySelectorAll('.math').forEach(function(element) {
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
                theme: 'default',
                securityLevel: 'loose'
            });
        `;

        if (this.options.doctype === 'slides') {
            scripts += `
            // Initialize Reveal.js
            Reveal.initialize({
                hash: true,
                controls: true,
                progress: true,
                center: true,
                transition: 'slide'
            });
            `;
        }

        scripts += '</script>';
        return scripts;
    }

    private getBaseStyles(): string {
        return `
            * {
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
            }
            
            .document-content {
                max-width: 1200px;
                margin: 0 auto;
                padding: 2rem;
            }
            
            h1, h2, h3, h4, h5, h6 {
                margin-top: 2rem;
                margin-bottom: 1rem;
                font-weight: 600;
                line-height: 1.25;
            }
            
            h1 { font-size: 2.5rem; }
            h2 { font-size: 2rem; }
            h3 { font-size: 1.5rem; }
            h4 { font-size: 1.25rem; }
            h5 { font-size: 1rem; }
            h6 { font-size: 0.875rem; }
            
            p {
                margin-bottom: 1rem;
            }
            
            code {
                background-color: #f6f8fa;
                border-radius: 3px;
                font-size: 85%;
                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                padding: 0.2em 0.4em;
            }
            
            pre {
                background-color: #f6f8fa;
                border-radius: 6px;
                font-size: 85%;
                line-height: 1.45;
                overflow: auto;
                padding: 1rem;
                margin: 1rem 0;
            }
            
            pre code {
                background-color: transparent;
                border: 0;
                padding: 0;
            }
            
            blockquote {
                border-left: 4px solid #dfe2e5;
                color: #6a737d;
                margin: 0 0 1rem 0;
                padding: 0 1rem;
            }
            
            .quote-note {
                border-left-color: #0969da;
                background-color: #f6f8ff;
            }
            
            .quote-tip {
                border-left-color: #1f883d;
                background-color: #f6ffed;
            }
            
            .quote-warning {
                border-left-color: #d1242f;
                background-color: #fff8f0;
            }
            
            .quote-info {
                border-left-color: #8250df;
                background-color: #fbf0ff;
            }
            
            ul, ol {
                margin-bottom: 1rem;
                padding-left: 2em;
            }
            
            li {
                margin-bottom: 0.25em;
            }
            
            table {
                border-collapse: collapse;
                border-spacing: 0;
                margin-bottom: 1rem;
                width: 100%;
            }
            
            th, td {
                border: 1px solid #d0d7de;
                padding: 6px 13px;
            }
            
            th {
                background-color: #f6f8fa;
                font-weight: 600;
            }
            
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            
            img {
                max-width: 100%;
                height: auto;
            }
            
            a {
                color: #0969da;
                text-decoration: none;
            }
            
            a:hover {
                text-decoration: underline;
            }
        `;
    }

    private getThemeStyles(theme: string): string {
        switch (theme) {
            case 'darko':
                return `
                    body {
                        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d30 100%);
                        color: #ffffff;
                    }
                    
                    .document-content {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 8px;
                        backdrop-filter: blur(10px);
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
                    
                    blockquote {
                        border-left-color: rgba(255,255,255,0.3);
                        color: rgba(255,255,255,0.8);
                    }
                    
                    a {
                        color: #58a6ff;
                    }
                `;
            
            case 'minimal':
                return `
                    body {
                        font-family: 'Georgia', 'Times', serif;
                        font-size: 18px;
                        line-height: 1.8;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 3rem 2rem;
                    }
                    
                    h1, h2, h3, h4, h5, h6 {
                        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                        font-weight: 300;
                        margin-top: 3rem;
                    }
                    
                    h1 {
                        border-bottom: 1px solid #eee;
                        padding-bottom: 1rem;
                    }
                    
                    .document-content {
                        padding: 0;
                    }
                `;
            
            default:
                return '';
        }
    }

    private getLayoutStyles(): string {
        return `
            .qmd-row {
                display: flex;
                flex-wrap: wrap;
                gap: var(--gap, 1rem);
                align-items: var(--alignment, flex-start);
                margin: 1rem 0;
            }
            
            .qmd-column {
                display: flex;
                flex-direction: column;
                gap: var(--gap, 1rem);
                align-items: var(--cross-alignment, flex-start);
                margin: 1rem 0;
            }
            
            .qmd-grid {
                display: grid;
                grid-template-columns: repeat(var(--columns, auto-fit), 1fr);
                gap: var(--gap, 1rem);
                margin: 1rem 0;
            }
            
            .qmd-center {
                display: flex;
                justify-content: center;
                align-items: center;
                text-align: center;
                margin: 1rem 0;
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

    private getDoctypeStyles(doctype: string): string {
        switch (doctype) {
            case 'slides':
                return `
                    .reveal .slides section {
                        text-align: left;
                    }
                    
                    .slide-title {
                        margin-bottom: 2rem;
                        border-bottom: 2px solid #333;
                        padding-bottom: 1rem;
                    }
                `;
            
            case 'paged':
                return `
                    @media print {
                        .paged-document {
                            margin: 0;
                            padding: 0;
                        }
                        
                        h1, h2, h3, h4, h5, h6 {
                            page-break-after: avoid;
                        }
                        
                        img, table, pre {
                            page-break-inside: avoid;
                        }
                    }
                    
                    .paged-document {
                        max-width: 210mm;
                        margin: 0 auto;
                        padding: 25mm;
                        background: white;
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    }
                `;
            
            default:
                return '';
        }
    }

    private getQuoteTypeIcon(type?: string): string {
        switch (type) {
            case 'note':
                return '<span class="quote-icon">ℹ️</span> ';
            case 'tip':
                return '<span class="quote-icon">💡</span> ';
            case 'warning':
                return '<span class="quote-icon">⚠️</span> ';
            case 'info':
                return '<span class="quote-icon">📘</span> ';
            default:
                return '';
        }
    }

    private generateId(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}