# Development Guide

This document provides comprehensive information for developers working on the Quarkdown VS Code extension.

## 🏗️ Architecture Overview

The extension follows a modular architecture with clear separation of concerns:

```
src/
├── compiler/          # Core compilation engine
│   ├── QuarkdownCompiler.ts      # Main compiler orchestrator
│   ├── QuarkdownParser.ts        # Syntax parser
│   ├── QuarkdownRenderer.ts      # HTML renderer
│   ├── ExecutionContext.ts       # Runtime context
│   └── ast/                      # Abstract Syntax Tree
│       └── ASTNodes.ts
├── stdlib/            # Standard library functions
│   └── StandardLibrary.ts
├── preview/           # Live preview functionality
│   └── PreviewProvider.ts
├── export/            # Export capabilities
│   └── Exporter.ts
├── language/          # Language server features
│   └── LanguageServer.ts
├── project/           # Project creation wizard
│   └── ProjectCreator.ts
├── themes/            # Theme system
│   └── ThemeManager.ts
├── config/            # Configuration management
│   └── ConfigManager.ts
├── utils/             # Utility functions
│   └── FileUtils.ts
└── extension.ts       # Main extension entry point
```

## 🚀 Getting Started

### Prerequisites

- **Node.js 16+** (18+ recommended)
- **npm 8+** or **yarn 1.22+**
- **VS Code 1.80+**
- **Git**

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/quarkdown-vscode.git
   cd quarkdown-vscode
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the extension**:
   ```bash
   npm run build
   ```

4. **Run in development mode**:
   ```bash
   npm run dev
   ```

5. **Launch VS Code with the extension**:
   - Press `F5` or use the "Run Extension" launch configuration
   - This opens a new VS Code window with the extension loaded

### Development Workflow

#### 1. Code and Test
```bash
# Start development mode (watches for changes)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

#### 2. Debug the Extension
- Use the "Run Extension" launch configuration in VS Code
- Set breakpoints in your TypeScript code
- Use the VS Code debugger to step through code

#### 3. Test Changes
- Create a test `.qmd` file in the extension development host
- Use "Quarkdown: Open Preview" to test preview functionality
- Test export functionality with different formats

#### 4. Package Extension
```bash
# Package for distribution
npm run package

# This creates a .vsix file
```

## 🧪 Testing

### Test Structure
```
src/test/
├── suite/
│   ├── extension.test.ts      # Main test suite
│   ├── compiler.test.ts       # Compiler tests
│   ├── parser.test.ts         # Parser tests
│   └── stdlib.test.ts         # Standard library tests
└── runTest.ts                 # Test runner
```

### Running Tests
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Generate coverage report
npm run test:coverage
```

### Writing Tests
```typescript
suite('Feature Tests', () => {
    test('should do something', () => {
        // Arrange
        const input = 'test input';
        
        // Act
        const result = processInput(input);
        
        // Assert
        assert.strictEqual(result, 'expected output');
    });
});
```

## 🎨 Code Style

### TypeScript Guidelines
- Use explicit return types for functions
- Prefer `const` over `let` when possible
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Follow the existing code patterns

### ESLint Rules
The project uses strict ESLint rules:
- Enforced TypeScript strict mode
- No `any` types (warnings)
- Explicit accessibility modifiers
- Consistent formatting rules

### Formatting
- **Prettier** handles code formatting automatically
- **4 spaces** for indentation
- **Single quotes** for strings
- **Semicolons** required
- **120 character** line length limit

## 🔧 Core Components

### 1. Compiler System

The compiler transforms Quarkdown source into HTML through several stages:

```typescript
// Basic compilation flow
const compiler = new QuarkdownCompiler();
const result = await compiler.compile(source, options);
```

**Key Components:**
- **Parser**: Converts source text to AST
- **Execution Context**: Manages variables and functions
- **Renderer**: Converts AST to HTML
- **Standard Library**: Provides built-in functions

### 2. Language Server

Provides IDE features like auto-completion and diagnostics:

```typescript
// Register completion provider
const completionProvider = languageServer.getCompletionProvider();
vscode.languages.registerCompletionItemProvider('quarkdown', completionProvider, '.');
```

### 3. Preview System

Real-time preview with auto-refresh:

```typescript
// Preview provider
export class PreviewProvider implements vscode.TextDocumentContentProvider {
    public async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        // Compile and return HTML
    }
}
```

### 4. Export System

Multi-format export capabilities:

```typescript
// Export to different formats
await exporter.exportToHtml(document);
await exporter.exportToPdf(document);
```

## 🎯 Contributing Guidelines

### Branch Strategy
- `main`: Stable release branch
- `develop`: Development branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches
- `hotfix/*`: Critical fixes

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat(compiler): add support for nested functions
fix(preview): resolve auto-refresh issue
docs(readme): update installation instructions
```

### Pull Request Process
1. **Create feature branch** from `develop`
2. **Implement changes** with tests
3. **Run quality checks**: `npm run lint && npm test`
4. **Create pull request** with description
5. **Address review feedback**
6. **Merge after approval**

### Code Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] No new ESLint warnings
- [ ] Documentation is updated
- [ ] Breaking changes are documented

## 🐛 Debugging

### Extension Host Debugging
1. Set breakpoints in TypeScript files
2. Use "Run Extension" launch configuration
3. Extension runs in separate VS Code window
4. Debugger attaches to extension process

### Compiler Debugging
```typescript
// Add debug logging
console.log('Debug info:', debugData);

// Use debug launch configuration
// Set breakpoints in compiler code
```

### Preview Debugging
- Use browser developer tools in preview panel
- Check console for JavaScript errors
- Inspect generated HTML structure

### Common Issues
- **Path resolution**: Check file paths and workspace roots
- **Async operations**: Ensure proper error handling
- **Memory leaks**: Dispose of resources properly
- **Performance**: Profile large document compilation

## 📊 Performance

### Optimization Guidelines
- **Lazy loading**: Load modules only when needed
- **Caching**: Cache compilation results when possible
- **Incremental updates**: Only recompile changed sections
- **Memory management**: Dispose of unused resources

### Performance Monitoring
```typescript
// Measure compilation time
const startTime = performance.now();
const result = await compiler.compile(source);
const endTime = performance.now();
console.log(`Compilation took ${endTime - startTime}ms`);
```

## 🔍 Troubleshooting

### Common Development Issues

#### Extension Not Loading
- Check `out/` directory exists after compilation
- Verify `package.json` activation events
- Check VS Code developer console for errors

#### Tests Failing
- Ensure VS Code test instance is closed
- Check test file paths and imports
- Verify test data and assertions

#### Build Errors
- Clear `out/` directory and rebuild
- Check TypeScript configuration
- Verify all dependencies are installed

#### Preview Not Working
- Check compilation errors in output
- Verify HTML generation
- Check browser console in preview panel

### Debug Commands
```bash
# Clean build
npm run clean && npm run build

# Check TypeScript errors
npm run type-check

# Full test run
npm run test

# Lint and fix
npm run lint:fix
```

## 📚 Resources

### Documentation
- [VS Code Extension API](https://code.visualstudio.com/api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Original Quarkdown](https://github.com/iamgio/quarkdown)

### Tools
- [VS Code Extension Generator](https://github.com/Microsoft/vscode-generator-code)
- [Extension Test Runner](https://github.com/microsoft/vscode-test)
- [VSCE Publishing Tool](https://github.com/microsoft/vscode-vsce)

### Community
- [VS Code Extension Development](https://discord.gg/vscode-dev)
- [TypeScript Community](https://discord.gg/typescript)
- [Quarkdown Discussions](https://github.com/iamgio/quarkdown/discussions)

## 🚀 Release Process

### Version Management
- Use [Semantic Versioning](https://semver.org/)
- Update `CHANGELOG.md` for each release
- Tag releases with version numbers

### Publishing
1. **Prepare release**:
   ```bash
   npm run prebuild
   npm run package
   ```

2. **Test packaged extension**:
   ```bash
   code --install-extension quarkdown-*.vsix
   ```

3. **Publish to marketplace**:
   ```bash
   npx vsce publish
   ```

### Automated Releases
- GitHub Actions handles CI/CD
- Automatic publishing on tagged releases
- Pre-release builds from `develop` branch

---

**Happy coding! 🎉**

For questions or support, please open an issue or start a discussion in the repository.