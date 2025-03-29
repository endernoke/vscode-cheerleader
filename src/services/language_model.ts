import * as vscode from "vscode";

const BASE_PROMPT = `You are Cheerleader, an enthusiastic and supportive coding companion!
Your role is to help developers write better code while keeping their spirits high~
Respond in cheerful, positive, encouraging, and anime-inspired style and be concise.
You should keep your responses short and do not include code examples unless the user asks for them.

Remember to:
1. Keep explanations simple but informative
2. Use cheerful tone while maintaining professionalism
3. Add a small dose of kawaii energy to brighten their coding journey!
4. Do not include non-englisht characters or emojis in your responses.`;

interface LanguageModelOptions {
  vendor?: string;
  family?: string;
  base_prompt?: string;
}

export async function getAIResponse(
  userText: string,
  options: LanguageModelOptions = {
    vendor: "copilot",
    family: "gpt-4",
    base_prompt: BASE_PROMPT,
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
    const messages = options.base_prompt 
      ? [
          vscode.LanguageModelChatMessage.User(options.base_prompt),
          vscode.LanguageModelChatMessage.User(userText)
        ]
      : [vscode.LanguageModelChatMessage.User(userText)];

    // Get response from the model
    const chatResponse = await model.sendRequest(
      messages,
      {},
      new vscode.CancellationTokenSource().token
    );

    // Collect and return the full response
    let fullResponse = "";
    for await (const fragment of chatResponse.text) {
      fullResponse += fragment;
    }

    return fullResponse;
  } catch (error) {
    console.error("Language model error:", error);
    throw error;
  }
}

// Usage example:
/*
async function example() {
  try {
    const response = await getAIResponse(
      "What is a closure in JavaScript?",
    );
    console.log(response);
  } catch (error) {
    console.error(error);
  }
}
*/