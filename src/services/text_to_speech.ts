import { createWriteStream } from "fs";
import { ElevenLabsClient } from "elevenlabs";
import { APIManager } from "../utils/api_manager";

type HuggingFaceClient = { apiKey: string };

/**
 * Convert text to speech using the configured provider and save to a MP3 file
 * @param text The text to convert to speech
 * @param filePath Path where to save the audio file
 * @returns Promise with the file path of the saved audio
 * @throws Error if no provider is initialized or if the conversion fails
 */
export const createAudioFileFromText = async (
  text: string,
  filePath: string
): Promise<string> => {
  try {
    console.log(`Starting TTS conversion for text: "${text.substring(0, 50)}..."`);
    
    const apiManager = APIManager.getInstance();
    const provider = apiManager.getAudioProvider();
    
    if (provider === 'elevenlabs') {
      const elevenlabsClient = apiManager.getClient<ElevenLabsClient>('elevenlabs');
      if (!elevenlabsClient) {
        throw new Error("ElevenLabs client is not initialized. Please set your API key in the sidebar.");
      }
      return await new Promise<string>((resolve, reject) => {
        try {
          elevenlabsClient.textToSpeech.convert("vGQNBgLaiM3EdZtxIiuY", {
            model_id: "eleven_flash_v2",
            text,
            output_format: "mp3_44100_128",
          }).then(audio => {
            const fileStream = createWriteStream(filePath);
            audio.pipe(fileStream);
            fileStream.on("finish", () => resolve(filePath));
            fileStream.on("error", reject);
          }).catch(reject);
        } catch (error) {
          reject(error);
        }
      });
    }

    throw new Error("ElevenLabs is the only supported text-to-speech provider. Please set your ElevenLabs API key in the sidebar.");
  } catch (error) {
    console.error("Error in TTS service:", error);
    throw error;
  }
};

/**
 * Convert text to speech using ElevenLabs API and return as a Buffer
 * @param text The text to convert to speech
 * @returns A promise that resolves to a Buffer containing the audio data
 * @throws Error if ElevenLabs client is not initialized
 */
export const createAudioStreamFromText = async (
  text: string
): Promise<Buffer> => {
  console.log(`Starting TTS conversion for text: "${text.substring(0, 50)}..."`);
  
  const apiManager = APIManager.getInstance();
  if (apiManager.getAudioProvider() !== 'elevenlabs') {
    throw new Error("ElevenLabs is the only supported text-to-speech provider.");
  }
  
  const client = apiManager.getClient<ElevenLabsClient>('elevenlabs');
  if (!client) {
    throw new Error("ElevenLabs client is not initialized. Please set your API key in the sidebar.");
  }

  try {
    const audioStream = await client.textToSpeech.convertAsStream(
      "JBFqnCBsd6RMkjVDRZzb",
      {
        model_id: "eleven_multilingual_v2",
        text,
        output_format: "mp3_44100_128",
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
    throw error;
  }
};
