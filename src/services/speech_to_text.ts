import * as fs from "fs";
import { ElevenLabsClient } from "elevenlabs";
import { APIManager } from "../utils/api_manager";

/**
 * Convert an audio file to text using ElevenLabs speech-to-text API
 * @param audioFilePath Path to the audio file to transcribe
 * @param modelId Optional model ID to use for transcription
 * @returns Promise with the transcribed text
 */
export const convertSpeechToText = async (
  audioFilePath: string,
  modelId: string = "scribe_v1"
): Promise<string> => {
  try {
    console.log(
      `Starting speech-to-text conversion for file: ${audioFilePath}`
    );

    const client = APIManager.getInstance().getClient<ElevenLabsClient>('elevenlabs');
    
    if (!client) {
      throw new Error("ElevenLabs client is not initialized. Please set your API key in the sidebar.");
    }

    // const url = "https://api.elevenlabs.io/v1/speech-to-text"

    const result = await client.speechToText.convert({
      file: fs.createReadStream(audioFilePath),
      model_id: modelId,
    });

    console.log("Speech-to-text conversion completed successfully");
    return result.text;
  } catch (error) {
    console.error("Error in speech-to-text service:", error);
    throw error;
  }
};
