import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Load all assets
        this.load.image('preload_bg', '/assets/preload_bg.png');
        this.load.image('logo', '/assets/logo.png');
        this.load.image('hub_background', '/assets/hub_background.png');
        this.load.image('hub_navmap', '/assets/hub_navmap.png');
        
        // Load player spritesheet (64x64 frames, 8 frames per row)
        this.load.spritesheet('player', '/assets/player_spritesheet.png', {
            frameWidth: 64,
            frameHeight: 64
        });

        // Create UI after first few assets load
        this.load.once('filecomplete-image-preload_bg', () => {
            // Add background
            this.add.image(width / 2, height / 2, 'preload_bg');
        });

        this.load.once('filecomplete-image-logo', () => {
            // Add logo
            this.add.image(width / 2, height / 2 - 150, 'logo');
        });

        // Create progress bar UI immediately
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 + 100, 320, 50);

        const progressBar = this.add.graphics();

        const loadingText = this.add.text(width / 2, height / 2 + 50, 'Loading...', {
            font: '20px monospace',
            fill: '#ffffff'
        });
        loadingText.setOrigin(0.5, 0.5);

        const percentText = this.add.text(width / 2, height / 2 + 125, '0%', {
            font: '18px monospace',
            fill: '#ffffff'
        });
        percentText.setOrigin(0.5, 0.5);

        // Progress event
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 + 110, 300 * value, 30);
            percentText.setText(parseInt(value * 100) + '%');
        });

        // Complete event - clean up UI elements
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });

        // Error handling for failed asset loads
        this.load.on('loaderror', (file) => {
            console.error(`Failed to load asset: ${file.key}`);
        });
    }

    create() {
        console.log('PreloadScene: Assets loaded');
        this.scene.start('HubScene');
    }
}
