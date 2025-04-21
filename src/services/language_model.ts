import * as vscode from "vscode";

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
  return vscode.workspace.getConfiguration('cheerleader.model').get<string>('family') ?? "gpt-4";
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
    const messages = [vscode.LanguageModelChatMessage.Assistant(BASE_PROMPT)];
    
    // Add base prompt if no custom prompt
    if (options.customPrompt) {
      messages.push(vscode.LanguageModelChatMessage.Assistant(options.customPrompt));
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
      new vscode.CancellationTokenSource().token
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
