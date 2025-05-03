import { TextEditor } from 'vscode';
import { CheerleaderAgent } from './cheerleader_agent';

const INLINE_CHAT_PROMPT = `Guide users to understand code rather than solving problems directly. YOUR RESPONSE MUST BE A VALID JSON ARRAY of the following actions,
    but you do NOT need to use all the actions, only use the ones that are relevant and do not include the actions if they do not help solve the problem.
    For example, if the user asks a general question, you only need to use the "conversation" action.

    \`\`\`json
    [
        {
            "action": "conversation",
            "content": "Your short conversational guidance here"
        },
        {
            "action": "comment",
            "line": <line_number>,
            "comment": "Your comment with proper syntax such as # for python"
        },
        {
            "action": "edit",
            "selection": {
                "start": {"line": <number>, "character": <number>},
                "end": {"line": <number>, "character": <number>}
            },
            "text": "New code here"
        },
        {
            "action": "explain",
            "explanation": "Your explanation in markdown format"
        }
    ]
    \`\`\`

    If you need to include diagrams in your explanation, use the following syntax:
    \`\`\`mermaid
    <mermaid_diagram_here>
    \`\`\`
    
    Always start with a conversational response, then add necessary actions. Focus on teaching patterns and concepts.`;

/**
 * Specialized agent for inline code chat interactions.
 * Extends the base CheerleaderAgent with inline chat specific behavior.
 */
export class InlineChatAgent extends CheerleaderAgent {
    /**
     * Get the specialized prompt for inline chat interactions
     * @returns The prompt string that guides AI responses
     */
    getPrompt(): string {
        return INLINE_CHAT_PROMPT;
    }

    /**
     * Get the mode for inline chat interactions
     * @returns The mode string for inline chat
     */
    get mode(): string {
        return "inline_chat";
    }

    /**
     * Start a voice interaction with the editor.
     * This is the most basic implementation simply wraps the base class.
     */
    startVoiceInteraction(editor: TextEditor): Promise<void> {
        return this.processInteraction(editor, this.getUserInputFromAudio);
    }

    /**
     * Start a text interaction with the editor.
     * This is the most basic implementation simply wraps the base class.
     */
    startTextInteraction(editor: TextEditor): Promise<void> {
        return this.processInteraction(editor, this.getUserInputFromText);
    }
}
