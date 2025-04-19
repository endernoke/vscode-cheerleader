import * as fs from 'fs';
import { pipeline } from '@huggingface/transformers';
import { WaveFile } from 'wavefile';
import { APIManager } from './api_manager';

/**
 * Convert an audio file to text using Hugging Face's Whisper model
 * @param audioData Buffer containing the WAV audio data to transcribe
 * @returns Promise with the transcribed text
 * @throws Error if the transcription fails
 * @example
 * const audioBuffer = fs.readFileSync('path/to/audio.wav');
 * const text = await transcribe_api(audioBuffer);
 * console.log(text); // Transcribed text
 */
async function transcribe_api(audioData: Buffer) {
    const apiManager = APIManager.getInstance();
    const client = apiManager.getClient<{ apiKey: string }>('huggingface');

    if (!client) {
        throw new Error("Hugging Face API key is not set. Please set your API key in the sidebar.");
    }

    const response = await fetch(
        "https://router.huggingface.co/hf-inference/models/openai/whisper-small",
        {
            headers: {
                Authorization: `Bearer ${client.apiKey}`,
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

    return result;
}

/**
 * Convert an audio file to text using Hugging Face's Whisper model
 * Exact same function as transcribe_api but using local pipeline
 * Requires installation of the transformers.js library
 */
async function transcribe_local(audioData: Buffer) {
    const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');

    // WARNING: GEORGE FORBIDS YOU FORM ATTEMPTING TO MODIFY THIS CODE
    // This is a direct copy from the Hugging Face documentations
    // Apparently it requires some weird manipulation of the audio data
    // to work with the ASR pipeline, it will not work if you pass in raw audio buffer
    let wav = new WaveFile(audioData);
    wav.toBitDepth('32f');
    wav.toSampleRate(16000);
    let data = wav.getSamples();
    if (Array.isArray(data)) {
        if (data.length > 1) {
            const SCALING_FACTOR = Math.sqrt(2);

            // Merge channels (into first channel to save memory)
            for (let i = 0; i < data[0].length; ++i) {
                data[0][i] = SCALING_FACTOR * (data[0][i] + data[1][i]) / 2;
            }
        }

        // Select first channel
        data = data[0];
    }

    let output = transcriber(data);
    return output;
}

/**
 * Convert an audio file to text using Hugging Face's Whisper model
 * @param audioFilePath Path to the WAV audio file to transcribe
 * @param useLocal Whether to use the local pipeline or the API
 * @returns Promise with the transcribed text
 * @note This is different from the ElevenLabs speech-to-text
 * We have experimentally determined that the Inference API is faster than local on CPU.
 * Inference API: 157 ms vs local: 2.16s, thus the default option goes with the API
 */
export const convertSpeechToText = async (
    audioFilePath: string,
    useLocal: boolean = false
): Promise<string> => {
    try {
        console.log(`Starting local speech-to-text conversion for file: ${audioFilePath}`);

        const audioData = fs.readFileSync(audioFilePath);
        const result = await (useLocal ? transcribe_local(audioData) : transcribe_api(audioData));

        console.log("Local speech-to-text conversion completed successfully");
        return result.text || '';
    } catch (error) {
        console.error("Error in local speech-to-text service:", error);
        throw error;
    }
};