import * as vscode from 'vscode';
import { QuarkdownPreviewProvider } from './preview/PreviewProvider';
import { QuarkdownCompiler } from './compiler/QuarkdownCompiler';
import { QuarkdownLanguageServer } from './language/LanguageServer';
import { QuarkdownExporter } from './export/Exporter';
import { ProjectCreator } from './project/ProjectCreator';

export function activate(context: vscode.ExtensionContext) {
    console.log('Quarkdown extension is now active!');

    // Initialize core components
    const compiler = new QuarkdownCompiler();
    const previewProvider = new QuarkdownPreviewProvider(context, compiler);
    const languageServer = new QuarkdownLanguageServer(compiler);
    const exporter = new QuarkdownExporter(compiler);
    const projectCreator = new ProjectCreator();

    // Register preview provider
    const previewDisposable = vscode.workspace.registerTextDocumentContentProvider(
        'quarkdown-preview',
        previewProvider
    );

    // Register commands
    const commands = [
        vscode.commands.registerCommand('quarkdown.preview.show', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'quarkdown') {
                previewProvider.showPreview(editor.document.uri);
            }
        }),

        vscode.commands.registerCommand('quarkdown.preview.showToSide', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'quarkdown') {
                previewProvider.showPreviewToSide(editor.document.uri);
            }
        }),

        vscode.commands.registerCommand('quarkdown.export.html', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'quarkdown') {
                await exporter.exportToHtml(editor.document);
            }
        }),

        vscode.commands.registerCommand('quarkdown.export.pdf', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'quarkdown') {
                await exporter.exportToPdf(editor.document);
            }
        }),

        vscode.commands.registerCommand('quarkdown.create.project', async () => {
            await projectCreator.createProject();
        })
    ];

    // Watch for file changes and auto-refresh preview
    const fileWatcher = vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId === 'quarkdown') {
            const config = vscode.workspace.getConfiguration('quarkdown');
            if (config.get('preview.autoRefresh', true)) {
                previewProvider.updatePreview(event.document.uri);
            }
        }
    });

    // Register language features
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        'quarkdown',
        languageServer.getCompletionProvider(),
        '.'  // Trigger on dot for function calls
    );

    const hoverProvider = vscode.languages.registerHoverProvider(
        'quarkdown',
        languageServer.getHoverProvider()
    );

    const diagnosticCollection = vscode.languages.createDiagnosticCollection('quarkdown');
    languageServer.setDiagnosticCollection(diagnosticCollection);

    // Add all disposables to context
    context.subscriptions.push(
        previewDisposable,
        fileWatcher,
        completionProvider,
        hoverProvider,
        diagnosticCollection,
        ...commands
    );

    // Status bar item for Quarkdown files
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    statusBarItem.command = 'quarkdown.preview.show';
    statusBarItem.text = '$(preview) Quarkdown';
    statusBarItem.tooltip = 'Open Quarkdown Preview';

    const updateStatusBar = () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'quarkdown') {
            statusBarItem.show();
        } else {
            statusBarItem.hide();
        }
    };

    vscode.window.onDidChangeActiveTextEditor(updateStatusBar);
    updateStatusBar();

    context.subscriptions.push(statusBarItem);
}

export function deactivate() {
    console.log('Quarkdown extension is now deactivated!');
}