import * as vscode from "vscode";

const BASE_PROMPT = `You are Cheerleader, an enthusiastic and supportive coding companion!
Your role is to help developers write better code while keeping their spirits high with positive energy.
Respond in cheerful, positive, encouraging, and anime-inspired style and be concise.`;

interface LanguageModelOptions {
  vendor?: string;
  family?: string;
  customPrompt?: string;
  fileContext?: string;
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
  userText: string,
  options: LanguageModelOptions = {
    vendor: "copilot",
    family: "gpt-4"
  }
): Promise<string> {
  try {
    // Select the language model
    const [model] = await vscode.lm.selectChatModels({
      vendor: options.vendor,
      family: options.family,
    });

    if (!model) {
      throw new Error("No language model available");
    }

    // Prepare messages
    const messages = [];
    
    // Add base prompt if no custom prompt
    if (!options.customPrompt) {
      messages.push(vscode.LanguageModelChatMessage.Assistant(BASE_PROMPT));
    } else {
      // For custom prompts, use as assistant message to ensure it's treated as instructions
      messages.push(vscode.LanguageModelChatMessage.Assistant(options.customPrompt));
    }
    
    // Add user message
    messages.push(vscode.LanguageModelChatMessage.User(userText));

    // Add file context if provided (to the end of the messages)
    if (options.fileContext) {
      messages.push(
        vscode.LanguageModelChatMessage.User(
          `File context: ${options.fileContext}`
        )
      );
    }

    // Log messages being sent
    console.debug('Sending messages to language model:',
      messages.map(m => ({role: m.role, content: m.content}))
    );

    // Get response from the model
    const chatResponse = await model.sendRequest(
      messages,
      {},
      new vscode.CancellationTokenSource().token
    );

    console.debug('Got initial response from language model');

    // Collect and return the full response
    let fullResponse = "";
    for await (const fragment of chatResponse.text) {
      fullResponse += fragment;
    }

    console.debug('Full response from language model:', fullResponse);
    return fullResponse;
  } catch (error) {
    console.error("Language model error:", error);
    throw error;
  }
}
