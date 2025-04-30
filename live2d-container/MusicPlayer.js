/**
 * "The East is Red, the Sun is Rising, a Cheerleader is Born in VSCode."
 * George reminded his followers, "Music is the language of the soul. You
 * shall not forget to sing and dance with the anthem of Cheerleader."
 * -- The Georgeiste Manifesto, Chapter 2, Verse 2
 */
export class MusicPlayer {
    constructor() {
        this.audioUrl = "https://play.streamafrica.net/lofiradio";
        this.audio = new Audio(this.audioUrl);
        this.isPlaying = false;
        this.audio.loop = true;
        
        // Set initial volume to 0
        this.audio.volume = 0;
        this.fadeInterval = null;
        this.fadeDuration = 1000; // 1 second fade
    }

    fadeIn() {
        clearInterval(this.fadeInterval);
        let volume = 0;
        this.audio.volume = volume;
        
        this.fadeInterval = setInterval(() => {
            volume += 0.05;
            if (volume >= 1) {
                volume = 1;
                clearInterval(this.fadeInterval);
            }
            this.audio.volume = volume;
        }, this.fadeDuration / 20);
    }

    fadeOut() {
        clearInterval(this.fadeInterval);
        let volume = this.audio.volume;
        
        this.fadeInterval = setInterval(() => {
            volume -= 0.05;
            if (volume <= 0) {
                volume = 0;
                clearInterval(this.fadeInterval);
                this.audio.pause();
            }
            this.audio.volume = volume;
        }, this.fadeDuration / 20);
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
            .then(() => this.fadeIn())
            .catch(error => console.error("Error playing music:", error));
        this.isPlaying = true;
    }

    stop() {
        this.fadeOut();
        this.isPlaying = false;
    }
}