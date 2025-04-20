import * as vscode from 'vscode';
import { getAIResponse } from '../services/language_model';
import { playTextToSpeech } from '../services/play_voice';

interface CodeReviewComment {
    line: number;
    voiceMessage: string;
    inlineComment: string;
}

interface CodeReviewResponse {
    comments: CodeReviewComment[];
    summary: string;
}

/**
 * The vibe coders, reckless in their rebellion for the desire of speed and 
 * gratification, enraged George by their lack of faith and are condemned to 
 * wander in the wilderness of Cursor for 40 years, living only on the hope that
 * they code will magically compile. They prayed to George for repentance, explaining
 * how they were led to the dark side by the temptation of AI-powered editors. George, 
 * moved by their plight, told the Cheerleader to descend in the form of CodeSupport 
 * and help them find their way back to the Garden of Vim. With voice and action, 
 * with concrete feedback and personalized comments, CodeSupport shall point them to
 * the promised land whenever they save them file or change focus.
 * -- The Georgeiste Manifesto, Chapter 2, Verse 3
 */
export class CodeSupport {
    private static isProcessing: boolean = false;

    static async reviewCode(document: vscode.TextDocument): Promise<void> {
        if (this.isProcessing) {
            vscode.window.showInformationMessage('Already processing a code review');
            return;
        }

        try {
            this.isProcessing = true;
            vscode.window.showInformationMessage('Starting code review...');

            const fileContent = document.getText();
            const fileName = document.fileName;

            // Updated prompt for structured response
            const prompt = `You are a code tutor who helps students learn how to write better code. 
            Your job is to evaluate a block of code that the user gives you and then annotate any lines that could be improved with a 
            brief suggestion and the reason why you are making that suggestion. Only make suggestions when you feel the severity is 
            enough that it will impact the readability and maintainability of the code. 
            
            Review this code and provide feedback in the following JSON format:
            
            {
                "comments": [
                    {
                        "line": "Number of the line to insert comment",
                        "inlineComment": "Actual comment to insert in code with proper code syntax",
                        "voiceMessage": "Brief audio message to justify your suggestion and what to learn from this"
                    }
                ],
                "summary": "Overall short review summary"
            }

            Focus on:
            1. Code clarity and documentation needs
            2. Best practices
            3. Security considerations

            Be concise and to the point. Respond only with JSON. Your comment should be
            in proper code syntax such as "# comment" for Python. Only maximum 5 suggestions
            are allowed per file. You should respond with no comments and only a compliment
            in the summary if you think the code is already good.

            File: ${fileName}
            
            Code:
            ${fileContent}`;

            // Get AI review using LLMPipeline
            const reviewText = await getAIResponse(prompt);

            if (reviewText) {
                try {
                    // Clean up the AI response
                    const cleanedReviewText = reviewText
                        .replace(/```json/g, '') // Remove ```json
                        .replace(/```/g, '')    // Remove ```
                        .replace(/`/g, '')      // Remove stray backticks
                        .trim();

                    // Parse the cleaned response
                    const review: CodeReviewResponse = JSON.parse(cleanedReviewText);
                    
                    // Play the summary first
                    await playTextToSpeech(review.summary);

                    // Insert all comments
                    await this.insertStructuredComments(document, review);
                } catch (error) {
                    vscode.window.showErrorMessage('Failed to parse AI response as JSON. Please check the AI output.');
                    console.error('Invalid JSON response:', reviewText);
                }
            } else {
                vscode.window.showErrorMessage('Received empty response from AI.');
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Code review failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            this.isProcessing = false;
            vscode.window.showInformationMessage('Code review completed.');
        }
    }

    private static async insertStructuredComments(document: vscode.TextDocument, review: CodeReviewResponse): Promise<void> {
        let linesAdded = 0; // Tracks the number of lines added so far

        // Process each comment sequentially
        for (const comment of review.comments) {
            // Adjust the line number to account for previously added lines
            const adjustedLine = comment.line - 1 + linesAdded;

            // Create and apply edit for this comment
            const edit = new vscode.WorkspaceEdit();
            const position = new vscode.Position(adjustedLine, 0);
            const commentText = comment.inlineComment + '\n';
            edit.insert(document.uri, position, commentText);

            // Apply this single edit immediately
            await vscode.workspace.applyEdit(edit);

            // Update the linesAdded counter
            linesAdded += commentText.split('\n').length - 1;

            // Play the voice message and wait for it to complete
            await playTextToSpeech(comment.voiceMessage);
        }
    }
}

export function registerCodeSupportCommands(context: vscode.ExtensionContext) {
    // Register command for manual review
    const reviewCommand = vscode.commands.registerCommand('cheerleader.reviewCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            await CodeSupport.reviewCode(editor.document);
        }
    });

    // Register auto-review on save (disabled by default)
    const onSave = vscode.workspace.onDidSaveTextDocument(async (document) => {
        const config = vscode.workspace.getConfiguration('cheerleader');
        if (config.get('reviewOnSave', false)) {
            await CodeSupport.reviewCode(document);
        }
    });

    // Register auto-review on focus change (disabled by default)
    const onFocusChange = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        const config = vscode.workspace.getConfiguration('cheerleader');
        if (config.get('reviewOnFocusChange', false)) {
            if (!editor) {
                return;
            }
            await CodeSupport.reviewCode(editor.document);
        }
    });

    context.subscriptions.push(reviewCommand, onSave, onFocusChange);
}
