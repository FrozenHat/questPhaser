import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        // Display preload text
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2,
            text: 'Preparing game...',
            style: {
                font: '24px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        // Preload assets here
        // this.load.image('key', 'path/to/image');
        // this.load.audio('key', 'path/to/audio');
    }

    create() {
        console.log('PreloadScene: Assets loaded');
        this.scene.start('HubScene');
    }
}
