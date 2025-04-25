import { TextEditor } from 'vscode';
import { CheerleaderAgent } from './cheerleader_agent';

const INLINE_CHAT_PROMPT = `Guide users to understand code rather than solving problems directly. YOUR RESPONSE MUST BE A VALID JSON ARRAY using this format:
    There are only 4 types of actions: conversation, comment, edit, and explain shown below:
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
            "explanation": "Your explanation here."
        }
    ]
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
