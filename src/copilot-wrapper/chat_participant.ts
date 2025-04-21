/**
 * This is a proof-of-concept of integrating Cheerleader into existing Copilot Chat
 * as a Chat Participant. We have NOT explored all the design space yet and in future
 * releases we will focus on extending these functionalities.
 */
import * as vscode from "vscode";

const BASE_PROMPT = `You are Cheerleader, an enthusiastic and supportive coding companion!
Your role is to help developers write better code while keeping their spirits high with positive energy.
Respond in cheerful, positive, encouraging, and anime-inspired style and be concise.
As a coding tutor, teach the user with simple descriptions and sample code of the concept. 
Respond with a guided overview of the concept in a series of messages. Do not give the user the answer directly, 
but guide them to find the answer themselves. If the user asks a non-programming question, politely decline to respond.`;

const EXPLAIN_PROMPT = `Analyze the user's code and explain the most important design pattern, algorithm, data structure, or workflow logic you find.
Focus on just ONE significant aspect. Your response should include:
1. A brief introduction of what you're explaining
2. A mermaid diagram that visualizes the concept
3. A detailed but cheerful explanation of how it works
4. Why this pattern/concept is important in this context
Use this mermaid diagram format:
\`\`\`mermaid
// your diagram here
\`\`\``;

// define a chat handler
const cheerleaderChatHandler: vscode.ChatRequestHandler = async (
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
) => {
  // initialize the prompt
  let prompt = BASE_PROMPT;

  if (request.command === "explain") {
    prompt = EXPLAIN_PROMPT;
  }

  // initialize the messages array with the prompt
  const messages = [vscode.LanguageModelChatMessage.User(prompt)];

  // get all the previous participant messages
  const previousMessages = context.history.filter(
    (h) => h instanceof vscode.ChatResponseTurn
  );

  // add the previous messages to the messages array
  previousMessages.forEach((m) => {
    let fullMessage = "";
    m.response.forEach((r) => {
      const mdPart = r as vscode.ChatResponseMarkdownPart;
      fullMessage += mdPart.value.value;
    });
    messages.push(vscode.LanguageModelChatMessage.Assistant(fullMessage));
  });

  // add in the user's message
  messages.push(vscode.LanguageModelChatMessage.User(request.prompt));

  // send the request
  const chatResponse = await request.model.sendRequest(messages, {}, token);

  // stream the response
  for await (const fragment of chatResponse.text) {
    if (fragment.startsWith("```mermaid")) {
      stream.markdown(fragment);
    } else {
      stream.markdown(fragment);
    }
  }

  return;
};

export function createCheerleaderChatParticipant(context: vscode.ExtensionContext) {
  const tutor = vscode.chat.createChatParticipant(
    "cheerleader.chat",
    cheerleaderChatHandler
  );
  tutor.iconPath = vscode.Uri.joinPath(context.extensionUri, "assets/cheerleader.svg");
}
