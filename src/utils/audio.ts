import fs from "fs";
var mp3Duration = require("mp3-duration");
const WaveFile = require('wavefile').WaveFile;

/**
 * Get the duration of an audio file in ms
 * Abstracts the logic from play_voice.ts
 * These functionalities often break across platform or dependency stuff so this makes it easier to manage
 * @param filePath The path to the audio file
 * @returns The duration of the audio file in milliseconds
 */
export async function getAudioDuration(filePath: string): Promise<number> {
    let duration = 3; // Default duration in seconds

    if (filePath.endsWith(".mp3")) {
        try {
            duration = await new Promise((resolve, reject) => {
                mp3Duration(filePath, (err: any, duration: number) => {
                    if (err) {
                        console.error("Error getting audio duration:", err);
                        reject(err);
                    } else {
                        resolve(duration);
                    }
                });
            });
        } catch (error) {
            console.error("[getAudioDuration] Error getting MP3 duration:", error);
        }
    } else if (filePath.endsWith(".wav")) {
        try {
            const buffer = fs.readFileSync(filePath);
            const wav = new WaveFile(buffer);
            duration = wav.getSamples().length / (wav.fmt.sampleRate * wav.fmt.numChannels);
        } catch (error) {
            console.error("[getAudioDuration] Error getting WAV duration:", error);
        }
    }

    return Math.ceil(duration * 1000); // Convert to milliseconds
}
