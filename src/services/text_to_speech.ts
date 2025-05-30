import { createWriteStream } from "fs";
import { ElevenLabsClient } from "elevenlabs";
import { APIManager } from "../utils/api_manager";
import { v4 as uuid } from "uuid";
import path from "path";

type HuggingFaceClient = { apiKey: string };

/**
 * Convert text to speech using the configured provider and save to a file
 * For elevenlabs, it saves as mp3, for huggingface as wav
 * @param text The text to convert to speech
 * @param tempDir The directory to save the audio file
 * @returns Promise with the file path of the saved audio
 * @note The filepath is generated by this function and should be used in the caller
 * @throws Error if no provider is initialized or if the conversion fails
 */
export const createAudioFileFromText = async (
  text: string,
  tempDir: string
): Promise<string> => {
  try {
    console.log(`Starting TTS conversion for text: "${text.substring(0, 50)}..."`);
    
    const apiManager = APIManager.getInstance();
    const elevenlabsClient = apiManager.getClient<ElevenLabsClient>('elevenlabs');
    const huggingfaceClient = apiManager.getClient<HuggingFaceClient>('huggingface');

    if (elevenlabsClient) {
      const filename = path.join(
        tempDir,
        `${uuid()}.mp3`
      );

      return await new Promise<string>((resolve, reject) => {
        try {
          elevenlabsClient.textToSpeech.convert("vGQNBgLaiM3EdZtxIiuY", {
            model_id: "eleven_flash_v2",
            text,
            output_format: "mp3_44100_128",
          }).then(audio => {
            const fileStream = createWriteStream(filename);
            audio.pipe(fileStream);
            fileStream.on("finish", () => resolve(filename));
            fileStream.on("error", reject);
          }).catch(reject);
        } catch (error) {
          reject(error);
        }
      });
    }

    if (huggingfaceClient) {
      const filename = path.join(
        tempDir,
        `${uuid()}.wav`
      );

      return await new Promise<string>((resolve, reject) => {
        try {
          fetch(
            "https://router.huggingface.co/fal-ai/fal-ai/kokoro/american-english",
            {
              headers: {
                Authorization: `Bearer ${huggingfaceClient.apiKey}`,
                "Content-Type": "application/json",
              },
              method: "POST",
              body: JSON.stringify({ text: text }),
            }
          )
            .then(async (response) => {
              if (!response.ok) {
                throw new Error(
                  `API request failed with status ${response.status}`
                );
              }

              // Parse the JSON response to extract the audio URL
              const result = await response.json();
              const audioUrl = result.audio.url;

              // Fetch the audio file from the extracted URL
              return fetch(audioUrl);
            })
            .then(async (audioResponse) => {
              if (!audioResponse.ok) {
                throw new Error(
                  `Failed to fetch audio file with status ${audioResponse.status}`
                );
              }

              const audioData = await audioResponse.arrayBuffer();
              const fileStream = createWriteStream(filename);

              fileStream.write(Buffer.from(audioData));
              fileStream.end();

              fileStream.on("finish", () => resolve(filename));
              fileStream.on("error", reject);
            })
            .catch(reject);
        } catch (error) {
          reject(error);
        }
      });
    }

    throw new Error("No text-to-speech provider is initialized. Please set your API key in the sidebar.");
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
  
  const client = APIManager.getInstance().getClient<ElevenLabsClient>('elevenlabs');
  
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
