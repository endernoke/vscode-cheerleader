/**
 * "The East is Red, the Sun is Rising, a Cheerleader is Born in VSCode."
 * George reminded his followers, "Music is the language of the soul. You
 * shall not forget to sing and dance with the anthem of Cheerleader."
 * -- The Georgeiste Manifesto, Chapter 2, Verse 2
 */
export class MusicPlayer {
    constructor() {
        // Lofi Girl's streaming URL
        this.audioUrl = "https://play.streamafrica.net/lofiradio";
        this.audio = new Audio(this.audioUrl);
        this.isPlaying = false;
        
        // Loop the music
        this.audio.loop = true;
    }

    toggleMusic() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.play();
        }
        return this.isPlaying;
    }

    play() {
        this.audio.play()
            .catch(error => console.error("Error playing music:", error));
        this.isPlaying = true;
    }

    stop() {
        this.audio.pause();
        this.isPlaying = false;
    }
}