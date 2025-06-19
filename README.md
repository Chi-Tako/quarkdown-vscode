# Quarkdown for VS Code

A powerful VS Code extension that brings the full capabilities of Quarkdown - a Turing-complete Markdown extension system - directly to your editor.

![Quarkdown Logo](https://via.placeholder.com/600x200/4CAF50/white?text=Quarkdown+for+VS+Code)

## 🌟 Features

### 🚀 Turing-Complete Markdown
- **Custom Functions**: Define and use custom functions with `.function`
- **Variables**: Dynamic content with `.var` and variable references
- **Control Flow**: Conditional content with `.if` and loops with `.repeat`
- **Math Operations**: Built-in mathematical functions and expressions

### 🎨 Advanced Layout System
- **Flexible Layouts**: Create rows, columns, and grids
- **Responsive Design**: Automatic adaptation to different screen sizes
- **Centering**: Easy content centering with `.center`

### 📊 Rich Content Support
- **LaTeX Math**: Full mathematical notation support with `$...$` and `$$...$$`
- **Enhanced Images**: Specify dimensions with `!(width*height)[alt](src)`
- **Mermaid Diagrams**: Integrated diagram support
- **Typed Blockquotes**: Special quote types (Note, Tip, Warning, Info)

### 🎯 Multi-Format Export
- **HTML Export**: Clean, responsive HTML output
- **PDF Export**: Professional PDF generation
- **Presentation Mode**: Create interactive slideshows
- **Print-Ready**: Optimized for print layouts

### 🛠️ Developer Experience
- **Live Preview**: Real-time preview with auto-refresh
- **Syntax Highlighting**: Full syntax support for Quarkdown
- **Auto-Completion**: Intelligent code completion for functions and variables
- **Error Diagnostics**: Real-time error checking and warnings
- **Hover Documentation**: Inline documentation for functions

## 📦 Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Quarkdown"
4. Click Install

### From Source
1. Clone this repository
2. Run `npm install`
3. Run `npm run compile`
4. Press F5 to launch a new VS Code window with the extension

## 🚀 Quick Start

### Create Your First Document

1. **Create a new file** with `.qmd` extension
2. **Start with document metadata**:
   ```markdown
   .docname {My First Document}
   .docauthor {Your Name}
   .doctype {plain}
   .theme {default}
   ```

3. **Add some content**:
   ```markdown
   # Welcome to Quarkdown!
   
   .var {greeting} {Hello, World!}
   
   ## Dynamic Content
   
   This is a dynamic greeting: **.greeting**
   
   .row alignment:{center} gap:{2cm}
       **Column 1**
       Content here
       
       **Column 2**
       More content
   ```

4. **Preview your document**: Press `Ctrl+Shift+P` and run "Quarkdown: Open Preview"

### Project Creation Wizard

Use the built-in project wizard to get started quickly:

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run "Quarkdown: Create Project"
3. Choose from templates:
   - **Basic Document**: Simple document template
   - **Presentation**: Interactive slideshow template
   - **Academic Paper**: Multi-section academic template
   - **Documentation**: Technical documentation template

## 📚 Core Concepts

### Functions

Quarkdown functions use the syntax `.functionname {arg1} {arg2} Body content`:

```markdown
.row alignment:{center} gap:{1cm}
    This content will be in a centered row

.multiply {6} by:{7}  // Results in: 42

.if {.showAdvanced}
    This content appears only if showAdvanced is true
```

### Variables

Define and use variables for dynamic content:

```markdown
.var {author} {Giorgio Garofalo}
.var {version} {1.5.1}

Created by **.author** - Version **.version**
```

### Layout System

Create sophisticated layouts:

```markdown
.grid columns:{3} gap:{1em}
    **Feature 1**
    Description here
    
    **Feature 2** 
    Another description
    
    **Feature 3**
    Final description
```

### Math Support

Use LaTeX-style mathematical expressions:

```markdown
Inline math: $ E = mc^2 $

Display math:
$$
\sum_{i=1}^{n} x_i = \frac{1}{n} \sum_{i=1}^{n} (x_i - \bar{x})^2
$$
```

## 🎨 Themes

Choose from built-in themes or create custom ones:

- **Default**: Clean and professional
- **Darko**: Dark theme with gradients
- **Minimal**: Typography-focused minimal design
- **Academic**: Professional academic paper styling

Change theme with:
```markdown
.theme {darko} layout:{minimal}
```

## ⚙️ Configuration

### Preview Settings
- **Auto Refresh**: Automatically update preview on file changes
- **Theme**: Default preview theme
- **Scroll Sync**: Synchronize preview scrolling with editor

### Export Settings
- **Output Directory**: Where exported files are saved
- **Default Format**: HTML or PDF
- **PDF Options**: Page size, margins, orientation
- **HTML Options**: Standalone files, embedded styles

### Language Features
- **Auto Completion**: Enable/disable function completion
- **Diagnostics**: Real-time error checking
- **Hover Documentation**: Function documentation on hover

## 🔧 Commands

| Command | Description | Keybinding |
|---------|-------------|------------|
| `Quarkdown: Open Preview` | Open preview panel | - |
| `Quarkdown: Open Preview to Side` | Open preview in split view | - |
| `Quarkdown: Export to HTML` | Export current document to HTML | - |
| `Quarkdown: Export to PDF` | Export current document to PDF | - |
| `Quarkdown: Create Project` | Launch project creation wizard | - |
| `Quarkdown: Configure` | Open extension settings | - |

## 📖 Standard Library Reference

### Layout Functions
- `.row alignment:{center|start|end} gap:{size}` - Horizontal layout
- `.column cross:{start|center|end} gap:{size}` - Vertical layout  
- `.grid columns:{number} gap:{size}` - Grid layout
- `.center` - Center content

### Math Functions
- `.add {value} to:{value}` - Addition
- `.multiply {value} by:{value}` - Multiplication
- `.pow {base} to:{exponent}` - Exponentiation
- `.truncate {decimals}` - Number truncation

### Control Flow
- `.if {condition}` - Conditional content
- `.repeat {count}` - Repeat content
- `.var {name} {value}` - Variable definition

### Text Operations
- `.upper` - Convert to uppercase
- `.lower` - Convert to lowercase

### Document Metadata
- `.docname {title}` - Set document title
- `.docauthor {author}` - Set document author
- `.doctype {slides|paged|plain}` - Set document type
- `.theme {name} layout:{variant}` - Set theme

## 🔗 File Operations
- `.include {path}` - Include another file
- `.function {name}` - Define custom function

## 🏗️ Architecture

This extension is built with TypeScript and follows a modular architecture:

```
src/
├── compiler/          # Core compilation engine
│   ├── QuarkdownCompiler.ts
│   ├── QuarkdownParser.ts
│   ├── QuarkdownRenderer.ts
│   └── ast/           # Abstract Syntax Tree definitions
├── stdlib/            # Standard library functions
├── preview/           # Live preview functionality
├── export/            # Export capabilities
├── language/          # Language server features
├── themes/            # Theme system
├── utils/             # Utility functions
└── extension.ts       # Main extension entry point
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests
4. **Run tests**: `npm test`
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-username/quarkdown-vscode.git
cd quarkdown-vscode

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Launch extension development host
npm run dev
```

### Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Generate coverage report
npm run test:coverage
```

## 📄 Examples

### Basic Document
```markdown
.docname {Project Report}
.docauthor {Team Alpha}
.doctype {plain}

# Executive Summary

.var {project_name} {Alpha Initiative}
.var {completion_rate} {85}

The **.project_name** project has achieved **.completion_rate**% completion.

.if {.completion_rate > 80}
    🎉 **Project is on track for successful completion!**
```

### Presentation
```markdown
.docname {Company Presentation}
.doctype {slides}
.theme {darko}

# Welcome
## Company Overview

---

## Our Team

.grid columns:{3} gap:{2cm}
    **Engineering**
    50 developers
    
    **Design**
    15 designers
    
    **Sales**
    25 sales reps

---

## Thank You
Questions?
```

### Academic Paper
```markdown
.docname {Research Paper}
.docauthor {Dr. Jane Smith}
.doctype {paged}
.theme {academic}

# Abstract

.center
**Research Title**
Dr. Jane Smith, University Name

This paper presents...

# 1. Introduction

The quadratic formula is given by:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$
```

## 🐛 Known Issues

- PDF export requires Puppeteer installation
- Large documents may experience slower preview updates
- Some complex nested layouts may not render correctly in all themes

## 🗺️ Roadmap

- [ ] **Plugin System**: Support for custom extensions
- [ ] **Cloud Integration**: Sync documents across devices  
- [ ] **Collaborative Editing**: Real-time collaboration features
- [ ] **Template Marketplace**: Community-driven template sharing
- [ ] **Advanced Charts**: Built-in charting capabilities
- [ ] **Table Editor**: Visual table editing interface

## 📞 Support

- **Documentation**: [GitHub Wiki](https://github.com/your-username/quarkdown-vscode/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/quarkdown-vscode/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/quarkdown-vscode/discussions)
- **Original Quarkdown**: [iamgio/quarkdown](https://github.com/iamgio/quarkdown)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Giorgio Garofalo** (@iamgio) - Creator of the original Quarkdown
- **VS Code Team** - For the excellent extension API
- **Community Contributors** - For feedback and contributions

---

**Made with ❤️ for the Quarkdown community**

*Transform your Markdown workflow with the power of programming!*