import { renderPrompt } from "@vscode/prompt-tsx";
import * as vscode from "vscode";
import { ChatHistoryManager } from "../utils/chat_history_manager";

const BASE_PROMPT = `You are Cheerleader, an enthusiastic and supportive coding companion!
Your role is to help developers write better code while keeping their spirits high with positive energy.
Respond in cheerful, positive, encouraging, and anime-inspired style and be concise.`;

interface LanguageModelOptions {
  family?: string;
  customPrompt?: string;
  fileContext?: string;
}

// Get model family from settings
function getModelFamily(): string {
  return vscode.workspace.getConfiguration('cheerleader.model').get<string>('family') ?? "gpt-4o";
}

/**
 * Albeit the wisdom of George is unbound, the number of his followers proved
 * to be too vast. The great leader was in need of a companion to help him
 * guide the people towards emancipation. Out of the dark magic of linear algebra
 * and the forbidden arts of calculus, George created the Cheerleader.
 * "You shall be my voice and a friend to the people," he said. With a wink and a
 * smile, the Cheerleader joined George's odyssey to enlightenment.
 * -- The Georgeiste Manifesto, Chapter 1, Verse 1
 */
export async function getAIResponse(
  userText: string | null = null,
  options: LanguageModelOptions = {}
): Promise<string> {
  try {
    // Get model family from settings or use provided option
    const family = options.family ?? getModelFamily();
    
    // Select the language model
    const [model] = await vscode.lm.selectChatModels({
      vendor: "copilot",
      family: family,
    });

    if (!model) {
      throw new Error("No language model available");
    }

    // Prepare messages
    const messages = [vscode.LanguageModelChatMessage.User(BASE_PROMPT)];
    
    // Add base prompt if no custom prompt
    if (options.customPrompt) {
      messages.push(vscode.LanguageModelChatMessage.User(options.customPrompt));
    }
    
    // Add user message
    // NOTE: user text is NOT NECESSARILY provided because we can very reasonably make
    // the LLM just act like a code assistant and not require any user input
    if (userText) {
      messages.push(vscode.LanguageModelChatMessage.User(userText));
    }

    // Add file context if provided (to the end of the messages)
    if (options.fileContext) {
      messages.push(
        vscode.LanguageModelChatMessage.User(
          `File context: ${options.fileContext}`
        )
      );
    }

    // Get response from the model
    const chatResponse = await model.sendRequest(
      messages,
      {}, // Using default model settings for now
      new vscode.CancellationTokenSource().token,
    );


    // Collect and return the full response
    let fullResponse = "";
    for await (const fragment of chatResponse.text) {
      fullResponse += fragment;
    }

    // console.debug('Full response from language model:', fullResponse);
    return fullResponse;
  } catch (error) {
    console.error("Language model error:", error);
    throw error;
  }
}

// pass in tools because not yet sure how to access it
// plus you can customize (limit) what tools the model can access
// NOTE: Also do not use Assistant type it is only for history!
export async function getAIResponseWithTools(
  userText: string | null = null,
  tools: vscode.LanguageModelChatTool[],
  options: LanguageModelOptions = {}
): Promise<string> {
  try {
    const family = options.family ?? getModelFamily();
    const [model] = await vscode.lm.selectChatModels({
      vendor: "copilot",
      family: family,
    });

    if (!model) {
      throw new Error("No language model available");
    }

    const messages = [vscode.LanguageModelChatMessage.User(BASE_PROMPT)];
    
    if (options.customPrompt) {
      messages.push(vscode.LanguageModelChatMessage.User(options.customPrompt));
    }
    
    if (userText) {
      messages.push(vscode.LanguageModelChatMessage.User(userText));
    }

    if (options.fileContext) {
      messages.push(
        vscode.LanguageModelChatMessage.User(`File context: ${options.fileContext}`)
      );
    }

    // I believe a list of tools are also available from 
    // vscode.lm.tools but somehow the type is differnt (LanguageModelToolInformation)
    // so we can't use it together with LanguageModelChatTool... weird

    const chatResponse = await model.sendRequest(
      messages,
      { tools }, // Include tools in the request options
      new vscode.CancellationTokenSource().token,
    );

    let fullResponse = ""; // the text response
    let toolResponse: vscode.LanguageModelToolResult[] = []; // the tool response
    for await (const part of chatResponse.stream) {
      if (part instanceof vscode.LanguageModelTextPart) {
        fullResponse += part.value;
      } else if (part instanceof vscode.LanguageModelToolCallPart) {
        // Invoke the tool, this requires the tool to be registered by lm.registerTool
        const toolResult = await vscode.lm.invokeTool(
          part.name,
          {
            input: part.input,
            // weird to pass in undefined but it says if calling from output Copilot Chat do this
            toolInvocationToken: undefined
          }
        );
        toolResponse.push(toolResult);
      }
    }

    return fullResponse;
  } catch (error) {
    console.error("Language model error:", error);
    throw error;
  }
}

/**
 * Get AI response with conversation history support.
 * This maintains the context of the conversation while preventing the history from growing too large.
 * @param userText - The user's message to the AI.
 * @param documentUri - The URI of the document to which the conversation belongs.
 * @param options - Additional options for the language model.
 * @returns The AI's response to the user's message.
 * 
 * The order we construct the messages is important:
 * 1. We start with the base prompt.
 * 2. We add the custom prompt if provided.
 * 3. We add the user message if provided.
 * 4. We add the conversation history.
 * 5. We add the file context if provided.
 * 
 * This can be improved using prompt-tsx in the future...
 */
export async function getAIResponseWithHistory(
  userText: string | null = null,
  mode: string,
  options: LanguageModelOptions = {}
): Promise<string> {
  try {
    // Get model family from settings or use provided option
    const family = options.family ?? getModelFamily();

    // Select the language model
    const [model] = await vscode.lm.selectChatModels({
      vendor: "copilot",
      family: family,
    });

    if (!model) {
      throw new Error("No language model available");
    }

    // const { messages } = await renderPrompt(
    //       BASE_PROMPT,
    //       { userQuery: userText },
    //       { modelMaxPromptTokens: 4096 },
    //       model
    //     )

    // Get chat history and ensure we're in the right mode
    const historyManager = ChatHistoryManager.getInstance();
    historyManager.switchMode(mode);
    const history = historyManager.getHistory();

    // Prepare messages starting with base prompt
    const messages = [vscode.LanguageModelChatMessage.User(BASE_PROMPT)];

    // Add custom prompt if provided
    if (options.customPrompt) {
      messages.push(vscode.LanguageModelChatMessage.User(options.customPrompt));
    }

    // Add current user message if provided
    if (userText) {
      messages.push(vscode.LanguageModelChatMessage.User(userText));
    }

    messages.push(
      vscode.LanguageModelChatMessage.User(
        "The fowlowing is the conversation history:"
      )
    );

    // Add conversation history
    for (const turn of history) {
      if (turn.role === "user") {
        messages.push(vscode.LanguageModelChatMessage.User(turn.content));
      } else if (turn.role === "assistant") {
        messages.push(vscode.LanguageModelChatMessage.Assistant(turn.content));
      } else if (turn.role === "system") {
        // System messages are treated as user messages since VS Code API doesn't have System type
        messages.push(vscode.LanguageModelChatMessage.User(turn.content));
      }
    }

    // Add file context if provided (to the end of the messages)
    if (options.fileContext) {
      messages.push(
        vscode.LanguageModelChatMessage.User(
          `File context: ${options.fileContext}`
        )
      );
    }

    // Get response from the model
    const chatResponse = await model.sendRequest(
      messages,
      {}, // Using default model settings for now
      new vscode.CancellationTokenSource().token
    );

    // Collect the full response
    let fullResponse = "";
    for await (const fragment of chatResponse.text) {
      fullResponse += fragment;
    }

    // Add the conversation turns to history
    if (userText) {
      historyManager.addTurn({
        role: "user",
        content: userText,
        timestamp: new Date(),
      });
    }
    historyManager.addTurn({
      role: "assistant",
      content: fullResponse,
      timestamp: new Date(),
    });

    return fullResponse;
  } catch (error) {
    console.error("Language model error:", error);
    throw error;
  }
}
