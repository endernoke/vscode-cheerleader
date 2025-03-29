import * as dotenv from "dotenv";
import { ElevenLabsClient } from "elevenlabs";
import { createWriteStream } from "fs";
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
export const createAudioFileFromText = async (
  text: string,
  filePath: string
): Promise<string> => {
  return new Promise<string>(async (resolve, reject) => {
    try {
      const audio = await client.textToSpeech.convert("JBFqnCBsd6RMkjVDRZzb", {
        model_id: "eleven_flash_v2",
        text,
        output_format: "mp3_44100_128",
        // voice_settings: {
        //   stability: 0,
        //   similarity_boost: 0,
        //   use_speaker_boost: true,
        //   speed: 1.0,
        // },
      });

      const fileStream = createWriteStream(filePath);

      audio.pipe(fileStream);
      fileStream.on("finish", () => resolve(filePath)); // Resolve with the fileName
      fileStream.on("error", reject);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Convert text to speech using ElevenLabs API and return as a Buffer
 * @param text The text to convert to speech
 * @returns A promise that resolves to a Buffer containing the audio data
 */
export const createAudioStreamFromText = async (
  text: string
): Promise<Buffer> => {
  console.log(`Starting TTS conversion for text: "${text.substring(0, 50)}..."`);
  
  try {
    const audioStream = await client.textToSpeech.convertAsStream(
      "JBFqnCBsd6RMkjVDRZzb",
      {
        model_id: "eleven_multilingual_v2",
        text,
        output_format: "mp3_44100_128",
        // Optional voice settings that allow you to customize the output
        voice_settings: {
          stability: 0,
          similarity_boost: 1.0,
          use_speaker_boost: true,
          speed: 1.0,
        },
      }
    );
    
    console.log("Received audio stream, collecting chunks...");
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
      console.log(`Received chunk of size: ${chunk.length}`);
    }

    const content = Buffer.concat(chunks);
    console.log(`Total audio size: ${content.length} bytes`);
    
    if (content.length === 0) {
      throw new Error("Generated audio content is empty");
    }
    
    return content;
  } catch (error) {
    console.error("Error in TTS service:", error);
    throw error; // Re-throw to be handled by the caller
  }
};
