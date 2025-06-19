import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ProjectTemplate {
    name: string;
    description: string;
    doctype: 'plain' | 'slides' | 'paged';
    files: ProjectFile[];
}

export interface ProjectFile {
    path: string;
    content: string;
    description?: string;
}

export class ProjectCreator {
    private templates: ProjectTemplate[] = [];

    constructor() {
        this.initializeTemplates();
    }

    public async createProject(): Promise<void> {
        try {
            // Step 1: Choose template
            const template = await this.selectTemplate();
            if (!template) {
                return;
            }

            // Step 2: Choose location
            const projectPath = await this.selectProjectLocation();
            if (!projectPath) {
                return;
            }

            // Step 3: Get project details
            const projectDetails = await this.getProjectDetails(template);
            if (!projectDetails) {
                return;
            }

            // Step 4: Create project
            await this.generateProject(template, projectPath, projectDetails);

            // Step 5: Open project
            const openChoice = await vscode.window.showInformationMessage(
                `Project "${projectDetails.name}" created successfully!`,
                'Open Project',
                'Open Main File'
            );

            if (openChoice === 'Open Project') {
                await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath));
            } else if (openChoice === 'Open Main File') {
                const mainFile = path.join(projectPath, 'main.qmd');
                await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(mainFile));
            }

        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to create project: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    private async selectTemplate(): Promise<ProjectTemplate | undefined> {
        const items = this.templates.map(template => ({
            label: template.name,
            description: template.description,
            detail: `Document type: ${template.doctype}`,
            template
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a project template',
            ignoreFocusOut: true
        });

        return selected?.template;
    }

    private async selectProjectLocation(): Promise<string | undefined> {
        const options: vscode.OpenDialogOptions = {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Folder',
            title: 'Select Project Location'
        };

        const result = await vscode.window.showOpenDialog(options);
        if (!result || result.length === 0) {
            return undefined;
        }

        return result[0].fsPath;
    }

    private async getProjectDetails(template: ProjectTemplate): Promise<ProjectDetails | undefined> {
        const projectName = await vscode.window.showInputBox({
            prompt: 'Enter project name',
            placeHolder: 'my-quarkdown-project',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Project name is required';
                }
                if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
                    return 'Project name can only contain letters, numbers, hyphens, and underscores';
                }
                return null;
            }
        });

        if (!projectName) {
            return undefined;
        }

        const title = await vscode.window.showInputBox({
            prompt: 'Enter document title',
            placeHolder: 'My Document Title',
            value: this.titleCase(projectName.replace(/[-_]/g, ' '))
        });

        if (title === undefined) {
            return undefined;
        }

        const author = await vscode.window.showInputBox({
            prompt: 'Enter author name (optional)',
            placeHolder: 'Your Name'
        });

        if (author === undefined) {
            return undefined;
        }

        const theme = await vscode.window.showQuickPick([
            { label: 'default', description: 'Standard theme' },
            { label: 'darko', description: 'Dark theme with gradients' },
            { label: 'minimal', description: 'Clean and minimal theme' }
        ], {
            placeHolder: 'Select theme',
            ignoreFocusOut: true
        });

        if (!theme) {
            return undefined;
        }

        return {
            name: projectName,
            title: title || this.titleCase(projectName.replace(/[-_]/g, ' ')),
            author: author || '',
            theme: theme.label,
            doctype: template.doctype
        };
    }

    private async generateProject(
        template: ProjectTemplate,
        projectPath: string,
        details: ProjectDetails
    ): Promise<void> {
        const fullProjectPath = path.join(projectPath, details.name);

        // Create project directory
        await fs.mkdir(fullProjectPath, { recursive: true });

        // Create subdirectories
        const subdirs = ['content', 'assets', 'img', 'data', 'output'];
        for (const subdir of subdirs) {
            await fs.mkdir(path.join(fullProjectPath, subdir), { recursive: true });
        }

        // Generate files from template
        for (const file of template.files) {
            const filePath = path.join(fullProjectPath, file.path);
            const processedContent = this.processTemplate(file.content, details);
            
            // Ensure directory exists
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            
            // Write file
            await fs.writeFile(filePath, processedContent, 'utf8');
        }

        // Create additional configuration files
        await this.createConfigFiles(fullProjectPath, details);
        await this.createGitignore(fullProjectPath);
        await this.createReadme(fullProjectPath, details);
    }

    private processTemplate(content: string, details: ProjectDetails): string {
        return content
            .replace(/\{\{PROJECT_NAME\}\}/g, details.name)
            .replace(/\{\{TITLE\}\}/g, details.title)
            .replace(/\{\{AUTHOR\}\}/g, details.author)
            .replace(/\{\{THEME\}\}/g, details.theme)
            .replace(/\{\{DOCTYPE\}\}/g, details.doctype)
            .replace(/\{\{DATE\}\}/g, new Date().toLocaleDateString())
            .replace(/\{\{YEAR\}\}/g, new Date().getFullYear().toString());
    }

    private async createConfigFiles(projectPath: string, details: ProjectDetails): Promise<void> {
        // Create VS Code settings
        const vscodeDir = path.join(projectPath, '.vscode');
        await fs.mkdir(vscodeDir, { recursive: true });

        const settings = {
            "quarkdown.preview.theme": details.theme,
            "quarkdown.export.outputDirectory": "./output",
            "files.associations": {
                "*.qmd": "quarkdown"
            }
        };

        await fs.writeFile(
            path.join(vscodeDir, 'settings.json'),
            JSON.stringify(settings, null, 2)
        );

        // Create export configuration
        const quarkdownDir = path.join(projectPath, '.quarkdown');
        await fs.mkdir(quarkdownDir, { recursive: true });

        const exportConfig = {
            "main.qmd": {
                format: "html",
                doctype: details.doctype,
                theme: details.theme,
                openAfterExport: true
            }
        };

        await fs.writeFile(
            path.join(quarkdownDir, 'export.json'),
            JSON.stringify(exportConfig, null, 2)
        );
    }

    private async createGitignore(projectPath: string): Promise<void> {
        const gitignoreContent = `# Output files
output/
*.pdf
*.html

# Temporary files
.DS_Store
Thumbs.db
*.tmp
*.temp

# Node modules (if using any npm packages)
node_modules/

# VS Code settings (optional)
.vscode/
!.vscode/settings.json

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
`;

        await fs.writeFile(path.join(projectPath, '.gitignore'), gitignoreContent);
    }

    private async createReadme(projectPath: string, details: ProjectDetails): Promise<void> {
        const readmeContent = `# ${details.title}

${details.author ? `Author: ${details.author}` : ''}

## About

This is a Quarkdown project created for ${details.doctype} documents using the ${details.theme} theme.

## Getting Started

1. Open \`main.qmd\` to start editing your document
2. Use the Quarkdown preview to see your changes in real-time
3. Export to HTML or PDF when ready

## Project Structure

\`\`\`
${details.name}/
├── main.qmd           # Main document file
├── content/           # Additional content files
├── assets/            # Stylesheets and scripts
├── img/               # Images and media
├── data/              # Data files (CSV, JSON, etc.)
├── output/            # Generated output files
└── README.md          # This file
\`\`\`

## Quarkdown Features

- **Turing-complete functions**: Define custom functions with \`.function\`
- **Layout system**: Use \`.row\`, \`.column\`, \`.grid\` for complex layouts
- **Math support**: LaTeX-style math with \`$...$\` and \`$$...$$\`
- **Enhanced images**: Specify dimensions with \`!(width*height)[alt](src)\`
- **Conditional content**: Use \`.if\` for conditional rendering
- **Variables**: Define and use variables with \`.var\`

## Quick Commands

- **Preview**: \`Ctrl+Shift+P\` → "Quarkdown: Open Preview"
- **Export HTML**: \`Ctrl+Shift+P\` → "Quarkdown: Export to HTML"
- **Export PDF**: \`Ctrl+Shift+P\` → "Quarkdown: Export to PDF"

## Learn More

- [Quarkdown Documentation](https://github.com/iamgio/quarkdown)
- [Function Reference](https://github.com/iamgio/quarkdown/wiki)
- [Examples and Tutorials](https://github.com/iamgio/quarkdown/examples)
`;

        await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent);
    }

    private titleCase(str: string): string {
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    private initializeTemplates(): void {
        this.templates = [
            {
                name: 'Basic Document',
                description: 'Simple document template for general writing',
                doctype: 'plain',
                files: [
                    {
                        path: 'main.qmd',
                        content: `
.docname {{{TITLE}}}
.docauthor {{{AUTHOR}}}
.doctype {{{DOCTYPE}}}
.theme {{{THEME}}}

# {{TITLE}}

Welcome to your new Quarkdown document! This template provides a basic structure for general writing.

## Getting Started

You can use all standard Markdown features plus Quarkdown's powerful extensions:

### Functions and Variables

.var {greeting} {Hello, World!}

The greeting variable contains: .greeting

### Layout

.row alignment:{center} gap:{2cm}
    **Column 1**
    
    **Column 2**

### Math

Here's an inline equation: $ E = mc^2 $

And a display equation:

$$
\\sum_{i=1}^{n} x_i = x_1 + x_2 + \\cdots + x_n
$$

## What's Next?

- Explore the Quarkdown function library
- Add images and media to the \`img/\` folder
- Include additional content from the \`content/\` folder
- Export your document to HTML or PDF

Happy writing!
                        `.trim()
                    }
                ]
            },
            {
                name: 'Presentation',
                description: 'Interactive slide presentation template',
                doctype: 'slides',
                files: [
                    {
                        path: 'main.qmd',
                        content: `
.docname {{{TITLE}}}
.docauthor {{{AUTHOR}}}
.doctype {slides}
.theme {{{THEME}}}

# {{TITLE}}

{{AUTHOR}}

---

## Agenda

- Introduction
- Main Content
- Conclusion
- Questions

---

## Introduction

.center
Welcome to your Quarkdown presentation!

This template provides a starting point for creating interactive slide presentations.

---

## Features

.row alignment:{center} gap:{2cm}
    ### 🎨 Theming
    Multiple themes available
    
    ### 📱 Responsive
    Works on all devices
    
    ### 🔧 Customizable
    Full control over layout

---

## Math Support

Complex equations are fully supported:

$$
f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi) e^{2\\pi i \\xi x} d\\xi
$$

---

## Code Examples

\`\`\`javascript
function greet(name) {
    return \`Hello, \${name}!\`;
}

console.log(greet('Quarkdown'));
\`\`\`

---

## Thank You!

.center
Questions?

{{AUTHOR}}
                        `.trim()
                    }
                ]
            },
            {
                name: 'Academic Paper',
                description: 'Template for academic papers and theses',
                doctype: 'paged',
                files: [
                    {
                        path: 'main.qmd',
                        content: `
.docname {{{TITLE}}}
.docauthor {{{AUTHOR}}}
.doctype {paged}
.theme {minimal}

.include {content/abstract.qmd}
.include {content/introduction.qmd}
.include {content/methodology.qmd}
.include {content/results.qmd}
.include {content/conclusion.qmd}
.include {content/references.qmd}
                        `.trim()
                    },
                    {
                        path: 'content/abstract.qmd',
                        content: `
# Abstract

.center
**{{TITLE}}**

{{AUTHOR}}

---

This paper presents... [Write your abstract here]

**Keywords:** keyword1, keyword2, keyword3
                        `.trim()
                    },
                    {
                        path: 'content/introduction.qmd',
                        content: `
# 1. Introduction

This section introduces the research problem and provides background context.

## 1.1 Problem Statement

[Describe the problem your research addresses]

## 1.2 Research Questions

1. [Research question 1]
2. [Research question 2]
3. [Research question 3]

## 1.3 Contributions

This paper makes the following contributions:

- [Contribution 1]
- [Contribution 2]
- [Contribution 3]
                        `.trim()
                    },
                    {
                        path: 'content/methodology.qmd',
                        content: `
# 2. Methodology

## 2.1 Research Design

[Describe your research methodology]

## 2.2 Data Collection

[Describe how data was collected]

## 2.3 Analysis

[Describe your analysis approach]

.var {sample_size} {100}
.var {confidence_level} {95}

Our study included .sample_size participants with a .confidence_level% confidence level.
                        `.trim()
                    },
                    {
                        path: 'content/results.qmd',
                        content: `
# 3. Results

## 3.1 Descriptive Statistics

[Present your findings]

## 3.2 Statistical Analysis

The results show that... [Describe your results]

### 3.2.1 Hypothesis Testing

.if {.significance_level < 0.05}
    The results are statistically significant.

## 3.3 Visualizations

![Sample Data](../img/sample-chart.png)
                        `.trim()
                    },
                    {
                        path: 'content/conclusion.qmd',
                        content: `
# 4. Conclusion

## 4.1 Summary of Findings

[Summarize your key findings]

## 4.2 Implications

[Discuss the implications of your research]

## 4.3 Limitations

[Acknowledge limitations of your study]

## 4.4 Future Work

[Suggest areas for future research]
                        `.trim()
                    },
                    {
                        path: 'content/references.qmd',
                        content: `
# References

1. Author, A. ({{YEAR}}). *Title of Paper*. Journal Name, 1(1), 1-10.

2. Author, B. ({{YEAR}}). *Book Title*. Publisher.

3. Author, C. ({{YEAR}}). Conference Paper. In *Proceedings of Conference* (pp. 1-10).

> Note: Replace with your actual references in your preferred citation style
                        `.trim()
                    }
                ]
            },
            {
                name: 'Documentation',
                description: 'Technical documentation template',
                doctype: 'plain',
                files: [
                    {
                        path: 'main.qmd',
                        content: `
.docname {{{TITLE}} Documentation}
.docauthor {{{AUTHOR}}}
.doctype {plain}
.theme {{{THEME}}}

# {{TITLE}} Documentation

.var {version} {1.0.0}
.var {last_updated} {.today}

**Version:** .version  
**Last Updated:** .last_updated  
**Author:** {{AUTHOR}}

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Installation](#installation)
3. [Usage](#usage)
4. [API Reference](#api-reference)
5. [Examples](#examples)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started

> Tip: This documentation template helps you create comprehensive technical documentation using Quarkdown's powerful features.

### Prerequisites

- [List prerequisites here]

### Quick Start

\`\`\`bash
# Quick start commands
git clone https://github.com/user/project.git
cd project
npm install
npm start
\`\`\`

---

## Installation

### System Requirements

.grid columns:{2} gap:{2cm}
    **Minimum Requirements**
    - OS: Windows 10+
    - RAM: 4GB
    - Storage: 1GB

    **Recommended Requirements**
    - OS: Latest version
    - RAM: 8GB+
    - Storage: 2GB+

### Installation Steps

1. Download the installer
2. Run the installation wizard
3. Follow the prompts
4. Verify installation

---

## Usage

### Basic Usage

[Provide basic usage examples]

### Advanced Features

[Document advanced features]

---

## API Reference

### Functions

#### \`functionName(param1, param2)\`

**Description:** [Function description]

**Parameters:**
- \`param1\` (string): [Description]
- \`param2\` (number): [Description]

**Returns:** [Return type and description]

**Example:**
\`\`\`javascript
const result = functionName('hello', 42);
console.log(result); // Expected output
\`\`\`

---

## Examples

### Example 1: Basic Implementation

\`\`\`javascript
// Example code here
\`\`\`

### Example 2: Advanced Usage

\`\`\`javascript
// More complex example
\`\`\`

---

## Troubleshooting

### Common Issues

> Warning: Always backup your data before making changes.

#### Issue 1: [Problem description]

**Solution:** [Step-by-step solution]

#### Issue 2: [Problem description]

**Solution:** [Step-by-step solution]

### Getting Help

- [Support channels]
- [Community forums]
- [Issue tracker]

---

## Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md).

## License

[License information]
                        `.trim()
                    }
                ]
            }
        ];
    }
}

interface ProjectDetails {
    name: string;
    title: string;
    author: string;
    theme: string;
    doctype: string;
}