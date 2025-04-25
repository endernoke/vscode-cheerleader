import * as fs from "fs";
import { ElevenLabsClient } from "elevenlabs";
import { APIManager } from "../utils/api_manager";
import { pipeline } from "@huggingface/transformers";
import { WaveFile } from "wavefile";

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

/**
 * Convert an audio file to text using Hugging Face's local Whisper model
 * This is kept as a fallback option but not actively used since API is faster
 * @param audioData Buffer containing the WAV audio data to transcribe
 * @returns Promise with the transcribed text
 */
async function transcribeWithLocalWhisper(audioData: Buffer) {
  const transcriber = await pipeline(
    "automatic-speech-recognition",
    "Xenova/whisper-tiny.en"
  );

  // WARNING: GEORGE FORBIDS YOU FROM ATTEMPTING TO MODIFY THIS CODE
  // This is a direct copy from the Hugging Face documentation
  // Apparently it requires some weird manipulation of the audio data
  // to work with the ASR pipeline, it will not work if you pass in raw audio buffer
  let wav = new WaveFile(audioData);
  wav.toBitDepth("32f");
  wav.toSampleRate(16000);
  let data = wav.getSamples();
  if (Array.isArray(data)) {
    if (data.length > 1) {
      const SCALING_FACTOR = Math.sqrt(2);

      // Merge channels (into first channel to save memory)
      for (let i = 0; i < data[0].length; ++i) {
        data[0][i] = (SCALING_FACTOR * (data[0][i] + data[1][i])) / 2;
      }
    }

    // Select first channel
    data = data[0];
  }

  let output = transcriber(data);
  return output;
}
