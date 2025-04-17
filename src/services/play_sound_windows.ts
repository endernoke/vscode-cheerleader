/*
 * This is simplified from the sound-play npm package (without the deprecated dependencies)
 * Original package: https://github.com/nomadhoc/sound-play
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/* WINDOWS PLAY COMMANDS */
const addPresentationCore: string = `Add-Type -AssemblyName presentationCore;`;
const createMediaPlayer: string = `$player = New-Object system.windows.media.mediaplayer;`;
const loadAudioFile = (path: string): string => `$player.open('${path}');`;
const playAudio: string = `$player.Play();`;
const stopAudio: string = `Start-Sleep 1; Start-Sleep -s $player.NaturalDuration.TimeSpan.TotalSeconds;Exit;`;

const windowPlayCommand = (path: string, volume: number): string =>
    `powershell -c ${addPresentationCore} ${createMediaPlayer} ${loadAudioFile(
        path,
    )} $player.Volume = ${volume}; ${playAudio} ${stopAudio}`;

interface AudioPlayer {
    play(path: string, volume?: number): Promise<void>;
}

const audioPlayer: AudioPlayer = {
    play: async (path: string, volume: number = 0.5): Promise<void> => {
        if (process.platform !== 'win32') {
            throw new Error('This function only works on Windows. Use the play-sound package for other platforms.');
        }
        const volumeAdjustedByOS = volume;

        const playCommand = windowPlayCommand(path, volumeAdjustedByOS);
        try {
            await execPromise(playCommand, { windowsHide: true });
        } catch (err) {
            throw err;
        }
    },
};

export default audioPlayer;
