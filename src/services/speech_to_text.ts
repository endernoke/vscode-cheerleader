import * as fs from "fs";
import { ElevenLabsClient } from "elevenlabs";
import { APIManager } from "../utils/api_manager";

/**
 * Convert an audio file to text using the configured speech-to-text provider
 * @param audioFilePath Path to the audio file to transcribe
 * @returns Promise with the transcribed text
 * @throws Error if the client is not initialized or if the transcription fails
 */
export const convertSpeechToText = async (
  audioFilePath: string
): Promise<string> => {
  try {
    console.log(
      `Starting speech-to-text conversion for file: ${audioFilePath}`
    );

    const apiManager = APIManager.getInstance();
    if (apiManager.getAudioProvider() !== 'elevenlabs') {
      throw new Error("ElevenLabs is the only supported speech-to-text provider.");
    }

    const elevenlabsClient = apiManager.getClient<ElevenLabsClient>('elevenlabs');
    if (!elevenlabsClient) {
      throw new Error("ElevenLabs client is not initialized. Please set your API key in the sidebar.");
    }

    const result = await elevenlabsClient.speechToText.convert({
      file: fs.createReadStream(audioFilePath),
      model_id: "scribe_v1",
    });
    console.log("Speech-to-text conversion completed successfully");
    return result.text;

  } catch (error) {
    console.error("Error in speech-to-text service:", error);
    throw error;
  }
};
