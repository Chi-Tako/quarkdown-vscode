import * as assert from 'assert';
import * as vscode from 'vscode';
import { QuarkdownCompiler } from '../../compiler/QuarkdownCompiler';
import { StandardLibrary } from '../../stdlib/StandardLibrary';
import { QuarkdownParser } from '../../compiler/QuarkdownParser';
import { QuarkdownRenderer } from '../../compiler/QuarkdownRenderer';
import { FileUtils } from '../../utils/FileUtils';

suite('Quarkdown Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    suite('Compiler Tests', () => {
        let compiler: QuarkdownCompiler;

        setup(() => {
            compiler = new QuarkdownCompiler();
        });

        test('Basic compilation', async () => {
            const source = `
.docname {Test Document}
.docauthor {Test Author}

# Hello World

This is a test document.
            `.trim();

            const result = await compiler.compile(source);
            
            assert.strictEqual(result.errors.length, 0, 'Should have no errors');
            assert.ok(result.html.includes('Hello World'), 'Should contain heading');
            assert.strictEqual(result.metadata.title, 'Test Document');
            assert.strictEqual(result.metadata.author, 'Test Author');
        });

        test('Variable substitution', async () => {
            const source = `
.var {greeting} {Hello}
.var {name} {World}

# .greeting, .name!
            `.trim();

            const result = await compiler.compile(source);
            
            assert.strictEqual(result.errors.length, 0, 'Should have no errors');
            assert.ok(result.html.includes('Hello, World!'), 'Should substitute variables');
        });

        test('Math operations', async () => {
            const source = `
The result is: .add {5} to:{3}
            `.trim();

            const result = await compiler.compile(source);
            
            assert.strictEqual(result.errors.length, 0, 'Should have no errors');
            assert.ok(result.html.includes('8'), 'Should calculate math correctly');
        });

        test('Layout functions', async () => {
            const source = `
.row alignment:{center} gap:{1cm}
    Column 1
    Column 2
            `.trim();

            const result = await compiler.compile(source);
            
            assert.strictEqual(result.errors.length, 0, 'Should have no errors');
            assert.ok(result.html.includes('qmd-row'), 'Should contain row class');
            assert.ok(result.html.includes('alignment-center'), 'Should include alignment');
        });

        test('Conditional content', async () => {
            const source = `
.var {show_content} {true}

.if {.show_content}
    This content should appear
            `.trim();

            const result = await compiler.compile(source);
            
            assert.strictEqual(result.errors.length, 0, 'Should have no errors');
            assert.ok(result.html.includes('This content should appear'), 'Should show conditional content');
        });

        test('Custom function definition', async () => {
            const source = `
.function {greet}
    name:
    Hello, **.name**!

.greet {World}
            `.trim();

            const result = await compiler.compile(source);
            
            assert.strictEqual(result.errors.length, 0, 'Should have no errors');
            assert.ok(result.html.includes('Hello, <strong>World</strong>!'), 'Should execute custom function');
        });

        test('Error handling', async () => {
            const source = `
.unknown_function {arg}
            `.trim();

            const result = await compiler.compile(source, { strict: false });
            
            assert.ok(result.warnings.length > 0, 'Should have warnings for unknown function');
        });
    });

    suite('Parser Tests', () => {
        let parser: QuarkdownParser;

        setup(() => {
            parser = new QuarkdownParser();
        });

        test('Parse basic markdown', () => {
            const source = `# Heading\n\nParagraph text.`;
            const result = parser.parse(source);
            
            assert.strictEqual(result.errors.length, 0, 'Should parse without errors');
            assert.ok(result.ast.children.length > 0, 'Should have AST nodes');
        });

        test('Parse function calls', () => {
            const source = `.functionname {arg1} {arg2}`;
            const result = parser.parse(source);
            
            assert.strictEqual(result.errors.length, 0, 'Should parse function calls');
            // More specific AST tests would go here
        });

        test('Parse variables', () => {
            const source = `Text with .variable reference`;
            const result = parser.parse(source);
            
            assert.strictEqual(result.errors.length, 0, 'Should parse variables');
        });

        test('Parse math expressions', () => {
            const source = `Inline $ x = 1 $ and display $$x = 2$$`;
            const result = parser.parse(source);
            
            assert.strictEqual(result.errors.length, 0, 'Should parse math expressions');
        });
    });

    suite('Renderer Tests', () => {
        let renderer: QuarkdownRenderer;

        setup(() => {
            renderer = new QuarkdownRenderer();
        });

        test('Render basic HTML', async () => {
            const ast = {
                type: 'document' as const,
                children: [
                    {
                        type: 'heading' as const,
                        level: 1,
                        children: [
                            { type: 'text' as const, content: 'Test Heading' }
                        ]
                    }
                ]
            };

            const html = await renderer.render(ast);
            
            assert.ok(html.includes('<h1'), 'Should render heading');
            assert.ok(html.includes('Test Heading'), 'Should include heading text');
        });

        test('Render with theme', async () => {
            const ast = {
                type: 'document' as const,
                children: []
            };

            const html = await renderer.render(ast, { 
                theme: 'darko',
                includeStyles: true 
            });
            
            assert.ok(html.includes('theme-darko'), 'Should include theme class');
        });

        test('Render slides doctype', async () => {
            const ast = {
                type: 'document' as const,
                children: []
            };

            const html = await renderer.render(ast, { 
                doctype: 'slides',
                includeStyles: true 
            });
            
            assert.ok(html.includes('reveal'), 'Should include reveal.js for slides');
        });
    });

    suite('Standard Library Tests', () => {
        let stdlib: StandardLibrary;

        setup(() => {
            stdlib = new StandardLibrary();
        });

        test('Has standard functions', () => {
            const functions = stdlib.getFunctionNames();
            
            assert.ok(functions.includes('add'), 'Should have add function');
            assert.ok(functions.includes('multiply'), 'Should have multiply function');
            assert.ok(functions.includes('row'), 'Should have row function');
            assert.ok(functions.includes('if'), 'Should have if function');
        });

        test('Function signatures', () => {
            const signature = stdlib.getFunctionSignature('add');
            assert.ok(signature.length > 0, 'Should have function signature');
        });

        test('Function documentation', () => {
            const docs = stdlib.getFunctionDocumentation('add');
            assert.ok(docs.length > 0, 'Should have function documentation');
        });
    });

    suite('File Utils Tests', () => {
        test('Path normalization', () => {
            const windowsPath = 'C:\\Users\\test\\document.qmd';
            const normalized = FileUtils.normalizePath(windowsPath);
            
            assert.strictEqual(normalized, 'C:/Users/test/document.qmd');
        });

        test('File extension extraction', () => {
            const extension = FileUtils.getFileExtension('test.qmd');
            assert.strictEqual(extension, 'qmd');
        });

        test('Relative path from workspace', () => {
            // Mock workspace root
            const originalMethod = FileUtils.getWorkspaceRoot;
            FileUtils.getWorkspaceRoot = () => '/workspace';
            
            const relative = FileUtils.getRelativePathFromWorkspace('/workspace/docs/test.qmd');
            assert.strictEqual(relative, 'docs/test.qmd');
            
            // Restore original method
            FileUtils.getWorkspaceRoot = originalMethod;
        });
    });

    suite('Integration Tests', () => {
        test('End-to-end compilation', async () => {
            const source = `
.docname {Integration Test}
.docauthor {Test Suite}
.doctype {plain}
.theme {default}

# Integration Test

.var {test_var} {success}

## Variables
Test variable: **.test_var**

## Math
Result: .add {10} to:{5}

## Layout
.row alignment:{center}
    Left side
    Right side

## Conditional
.var {show_section} {true}

.if {.show_section}
    This section is shown because show_section is true.
            `.trim();

            const compiler = new QuarkdownCompiler();
            const result = await compiler.compile(source);
            
            assert.strictEqual(result.errors.length, 0, 'Integration test should compile without errors');
            assert.ok(result.html.includes('Integration Test'), 'Should include document title');
            assert.ok(result.html.includes('success'), 'Should substitute variables');
            assert.ok(result.html.includes('15'), 'Should calculate math');
            assert.ok(result.html.includes('qmd-row'), 'Should render layout');
            assert.ok(result.html.includes('This section is shown'), 'Should show conditional content');
        });

        test('Complex document structure', async () => {
            const source = `
.docname {Complex Document}

.function {emphasis}
    text color:
    **🎯 .text** (.color)

# Main Section

.emphasis {Important Point} color:{red}

## Subsection

.grid columns:{2} gap:{1em}
    ### Left Column
    Content here
    
    ### Right Column
    More content

.repeat {3}
    - Repeated item
            `.trim();

            const compiler = new QuarkdownCompiler();
            const result = await compiler.compile(source);
            
            assert.strictEqual(result.errors.length, 0, 'Complex document should compile');
            assert.ok(result.html.includes('Important Point'), 'Should execute custom function');
            assert.ok(result.html.includes('qmd-grid'), 'Should render grid');
            assert.ok(result.html.includes('Repeated item'), 'Should repeat content');
        });
    });

    suite('Error Recovery Tests', () => {
        test('Graceful handling of malformed functions', async () => {
            const source = `
.incomplete_function {
            `.trim();

            const compiler = new QuarkdownCompiler();
            const result = await compiler.compile(source, { strict: false });
            
            // Should not crash, might have warnings
            assert.ok(true, 'Should handle malformed input gracefully');
        });

        test('Unknown function warnings', async () => {
            const source = `.nonexistent_function {arg}`;

            const compiler = new QuarkdownCompiler();
            const result = await compiler.compile(source, { strict: false });
            
            assert.ok(result.warnings.length > 0, 'Should warn about unknown functions');
        });
    });

    suite('Performance Tests', () => {
        test('Large document compilation', async function() {
            this.timeout(5000); // 5 second timeout

            // Generate a large document
            const sections = [];
            for (let i = 0; i < 100; i++) {
                sections.push(`
## Section ${i}

.var {section_num} {${i}}

This is section number **.section_num**.

.row
    Column A
    Column B

.add {${i}} to:{1}
                `);
            }

            const source = `
.docname {Large Document}

# Performance Test

${sections.join('\n')}
            `;

            const compiler = new QuarkdownCompiler();
            const startTime = Date.now();
            const result = await compiler.compile(source);
            const endTime = Date.now();

            assert.strictEqual(result.errors.length, 0, 'Large document should compile without errors');
            
            const compilationTime = endTime - startTime;
            console.log(`Compilation time for large document: ${compilationTime}ms`);
            
            // Should compile in reasonable time (less than 2 seconds)
            assert.ok(compilationTime < 2000, `Compilation should be fast (was ${compilationTime}ms)`);
        });
    });
});