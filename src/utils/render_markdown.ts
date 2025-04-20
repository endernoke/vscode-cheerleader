import * as vscode from "vscode";
import MarkdownIt from 'markdown-it';

export class MarkdownRenderer {
    private static webviewPanel: vscode.WebviewPanel | undefined;

    static renderInSidebar(content: string, title: string = 'Markdown View'): void {
        if (!this.webviewPanel) {
            this.webviewPanel = vscode.window.createWebviewPanel(
                'markdownView',
                title,
                vscode.ViewColumn.Beside,
                { enableScripts: true }
            );

            this.webviewPanel.onDidDispose(() => {
                this.webviewPanel = undefined;
            });
        }

        this.webviewPanel.webview.html = this.getWebviewContent(content);
        this.webviewPanel.reveal();
    }

    private static getWebviewContent(markdown: string): string {
        const md = new MarkdownIt({
            html: true,
            linkify: true,
            typographer: true
        });

        return `<!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
                    <style>
                        body {
                            padding: 20px;
                            line-height: 1.6;
                            font-family: var(--vscode-editor-font-family);
                            font-size: var(--vscode-editor-font-size);
                            color: var(--vscode-editor-foreground);
                        }
                        pre {
                            background-color: var(--vscode-editor-background);
                            padding: 1em;
                            border-radius: 4px;
                            overflow: auto;
                        }
                        code {
                            font-family: var(--vscode-editor-font-family);
                            font-size: 0.9em;
                        }
                        .mermaid {
                            background-color: var(--vscode-editor-background);
                            padding: 10px;
                            border-radius: 4px;
                        }
                    </style>
                </head>
                <body>
                    ${md.render(markdown)}
                    <script>
                        mermaid.initialize({ 
                            startOnLoad: true,
                            theme: document.body.classList.contains('vscode-dark') ? 'dark' : 'default',
                            securityLevel: 'loose'
                        });
                        
                        document.addEventListener('DOMContentLoaded', () => {
                            mermaid.init(undefined, document.querySelectorAll('.mermaid'));
                        });
                    </script>
                </body>
            </html>`;
    }
}
