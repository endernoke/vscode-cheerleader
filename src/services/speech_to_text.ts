import * as fs from "fs";
import { ElevenLabsClient } from "elevenlabs";
import { APIManager } from "../utils/api_manager";

type HuggingFaceClient = { apiKey: string };

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
    const elevenlabsClient = apiManager.getClient<ElevenLabsClient>('elevenlabs');
    const huggingfaceClient = apiManager.getClient<HuggingFaceClient>('huggingface');

    if (elevenlabsClient) {
      const result = await elevenlabsClient.speechToText.convert({
        file: fs.createReadStream(audioFilePath),
        model_id: "scribe_v1",
      });
      console.log("Speech-to-text conversion completed successfully");
      return result.text;
    }

    if (huggingfaceClient) {
      const audioData = fs.readFileSync(audioFilePath);
      const response = await fetch(
        "https://router.huggingface.co/hf-inference/models/openai/whisper-small",
        {
          headers: {
            Authorization: `Bearer ${huggingfaceClient.apiKey}`,
            "Content-Type": "audio/wav",
          },
          method: "POST",
          body: audioData,
        }
      );
      const result = await response.json();

      if (result.error) {
        throw new Error(`Hugging Face API error: ${result.error}`);
      }

      console.log("Speech-to-text conversion completed successfully");
      return result.text || "";
    }

    throw new Error("No speech-to-text provider is initialized. Please set your API key in the sidebar.");
  } catch (error) {
    console.error("Error in speech-to-text service:", error);
    throw error;
  }
};
