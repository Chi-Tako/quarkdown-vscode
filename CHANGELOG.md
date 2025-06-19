# Changelog

All notable changes to the Quarkdown VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of Quarkdown for VS Code
- Full Quarkdown language support with syntax highlighting
- Live preview with auto-refresh
- HTML and PDF export capabilities
- Project creation wizard with multiple templates
- Comprehensive standard library implementation
- Theme system with built-in themes (Default, Darko, Minimal, Academic)
- Language server features (auto-completion, hover, diagnostics)
- Configuration management system

### Features

#### Core Functionality
- ✅ Turing-complete Markdown with custom functions
- ✅ Variable system with dynamic content
- ✅ Advanced layout system (rows, columns, grids)
- ✅ Mathematical expressions with LaTeX support
- ✅ Enhanced image handling with dimension control
- ✅ Conditional content and loops
- ✅ Custom function definitions

#### Developer Experience
- ✅ Real-time preview with live reload
- ✅ Syntax highlighting for .qmd files
- ✅ Auto-completion for functions and variables
- ✅ Hover documentation
- ✅ Error diagnostics and warnings
- ✅ Document outline and symbol navigation

#### Export & Publishing
- ✅ HTML export with theme support
- ✅ PDF export with Puppeteer integration
- ✅ Multi-format document generation
- ✅ Customizable export settings

#### Project Management
- ✅ Project creation wizard
- ✅ Multiple document templates
- ✅ Workspace configuration
- ✅ File watching and auto-compilation

#### Themes & Customization
- ✅ Built-in theme collection
- ✅ Custom theme support
- ✅ Theme preview functionality
- ✅ Responsive design support

### Technical Implementation
- ✅ TypeScript-based architecture
- ✅ Modular design with clear separation of concerns
- ✅ Comprehensive AST implementation
- ✅ Robust error handling and validation
- ✅ Performance-optimized compilation
- ✅ Cross-platform compatibility

## [0.1.0] - 2025-06-19

### Added
- Initial project structure
- Core compiler implementation
- Basic syntax highlighting
- Preview functionality prototype

## Planned Features

### Version 0.2.0
- [ ] Plugin system for extensions
- [ ] Enhanced math rendering with MathJax
- [ ] Table editor with visual interface
- [ ] Improved error messages and debugging
- [ ] Performance optimizations for large documents

### Version 0.3.0
- [ ] Cloud integration and sync
- [ ] Collaborative editing features
- [ ] Template marketplace
- [ ] Advanced charting capabilities
- [ ] Custom syntax highlighting themes

### Version 0.4.0
- [ ] Mobile preview support
- [ ] Integration with version control systems
- [ ] Advanced export options (EPUB, DocX)
- [ ] Accessibility improvements
- [ ] Internationalization support

### Version 1.0.0
- [ ] Stable API for extensions
- [ ] Complete documentation
- [ ] Performance benchmarks
- [ ] Full test coverage
- [ ] Production-ready release

## Breaking Changes

None yet - this is the initial release.

## Migration Guide

This is the first release, so no migration is needed.

## Known Issues

- PDF export requires manual Puppeteer installation
- Large documents (>1000 lines) may experience slower preview updates
- Complex nested layouts may have rendering issues in some browsers
- Theme switching requires manual preview refresh

## Contributors

- **Initial Development**: Extension development team
- **Original Quarkdown**: Giorgio Garofalo (@iamgio)
- **Testing & Feedback**: Beta user community

## Acknowledgments

Special thanks to:
- Giorgio Garofalo for creating the original Quarkdown
- VS Code extension development community
- Beta testers and early adopters
- Open source contributors

---

For more detailed information about specific features and changes, please refer to the [README](README.md) and [documentation](docs/).

To report issues or request features, please visit our [GitHub repository](https://github.com/your-username/quarkdown-vscode).