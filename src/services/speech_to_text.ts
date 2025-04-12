import * as dotenv from "dotenv";
import { ElevenLabsClient } from "elevenlabs";
import * as fs from "fs";
import path from "path";

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  throw new Error("Missing ELEVENLABS_API_KEY in environment variables");
}

const client = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

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
