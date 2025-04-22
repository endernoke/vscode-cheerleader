import {
    AssistantMessage,
    BasePromptElementProps,
    PrioritizedList,
    PromptElement,
    PromptPiece,
    SystemMessage,
    UserMessage,
} from "@vscode/prompt-tsx";
import {
    ChatContext,
    ChatRequestTurn,
    ChatResponseTurn,
    ChatResponseMarkdownPart
} from "vscode";
import { ChatHistoryManager, ChatTurn } from "./chat_history_manager";

interface PrioritizedChatTurn extends ChatTurn {
    priority: number;
}

interface ChatHistoryPromptProps extends BasePromptElementProps {
    history: ChatTurn[];
    userQuery?: string;
    fileContext?: string[];
    customInstructions?: string;
    baseInstructions: string;
    mode: string;
}

/**
 * Enhanced chat history prompt that integrates VSCode's Prompt TSX framework
 * with our existing ChatHistoryManager. This provides prioritized message handling
 * and proper context management.
 */
export class ChatHistoryPrompt extends PromptElement<ChatHistoryPromptProps> {
    private static readonly PRIORITY = {
        BASE_INSTRUCTIONS: 100,
        USER_QUERY: 90,
        FILE_CONTEXT: 85,
        RECENT_HISTORY: 80,
        CUSTOM_INSTRUCTIONS: 70,
        OLD_HISTORY: 0
    };

    private prioritizeHistory(history: ChatTurn[]): PrioritizedChatTurn[] {
        const recentCount = 2; // Keep last 2 messages at higher priority
        return history.map((turn, index) => ({
            ...turn,
            priority: index >= history.length - recentCount 
                ? ChatHistoryPrompt.PRIORITY.RECENT_HISTORY 
                : ChatHistoryPrompt.PRIORITY.OLD_HISTORY
        }));
    }

    private renderHistoryMessages(turns: PrioritizedChatTurn[]): PromptPiece[] {
        return turns.map(turn => {
            const content = turn.content;
            switch (turn.role) {
                case 'system':
                    return <SystemMessage priority={turn.priority}>{content}</SystemMessage>;
                case 'assistant':
                    return <AssistantMessage priority={turn.priority}>{content}</AssistantMessage>;
                case 'user':
                default:
                    return <UserMessage priority={turn.priority}>{content}</UserMessage>;
            }
        });
    }

    render(): PromptPiece {
        const { baseInstructions, userQuery, fileContext, customInstructions, history } = this.props;
        const prioritizedHistory = this.prioritizeHistory(history);

        return (
            <>
                <SystemMessage priority={ChatHistoryPrompt.PRIORITY.BASE_INSTRUCTIONS}>
                    {baseInstructions}
                </SystemMessage>

                {/* File context gets medium-high priority */}
                {fileContext && fileContext.length > 0 && (
                    <UserMessage priority={ChatHistoryPrompt.PRIORITY.FILE_CONTEXT}>
                        Here are the relevant files for context:
                        {fileContext.map(file => `\n\n${file}`)}
                    </UserMessage>
                )}

                {/* Custom instructions with medium priority */}
                {customInstructions && (
                    <SystemMessage priority={ChatHistoryPrompt.PRIORITY.CUSTOM_INSTRUCTIONS}>
                        {customInstructions}
                    </SystemMessage>
                )}

                {/* History messages with prioritization */}
                <PrioritizedList priority={0} descending={false}>
                    {this.renderHistoryMessages(prioritizedHistory)}
                </PrioritizedList>

                {/* Current user query gets high priority */}
                {userQuery && (
                    <UserMessage priority={ChatHistoryPrompt.PRIORITY.USER_QUERY}>
                        {userQuery}
                    </UserMessage>
                )}
            </>
        );
    }

    /**
     * Factory method to create a ChatHistoryPrompt from existing ChatHistoryManager
     */
    static fromManager(
        manager: ChatHistoryManager,
        baseInstructions: string,
        userQuery?: string,
        fileContext?: string[],
        customInstructions?: string
    ): ChatHistoryPrompt {
        const history = manager.getHistory();
        const mode = manager.getCurrentMode();

        return new ChatHistoryPrompt({
            history,
            userQuery,
            fileContext,
            customInstructions,
            baseInstructions,
            mode
        });
    }
}

/**
 * Helper function to convert VSCode ChatContext history to ChatTurn array
 */
export function convertChatContextHistory(history: ChatContext['history']): ChatTurn[] {
    return history.map(turn => {
        if (turn instanceof ChatRequestTurn) {
            return {
                role: 'user',
                content: turn.prompt,
                timestamp: new Date()
            };
        } else if (turn instanceof ChatResponseTurn) {
            return {
                role: 'assistant',
                content: chatResponseToMarkdown(turn),
                timestamp: new Date()
            };
        } else {
            return {
                role: 'system',
                content: String(turn),
                timestamp: new Date()
            };
        }
    });
}

/**
 * Helper function to convert ChatResponseTurn to markdown string
 */
export function chatResponseToMarkdown(response: ChatResponseTurn): string {
    return response.response
        .filter((part): part is ChatResponseMarkdownPart => part instanceof ChatResponseMarkdownPart)
        .map(part => part.value)
        .join('');
}