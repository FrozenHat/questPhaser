import Phaser from 'phaser';
import Player from '../entities/Player.js';
import NavigationSystem from '../systems/NavigationSystem.js';

export default class HubScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HubScene' });
    }

    create() {
        console.log('HubScene: Started');

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Add hub background image
        this.add.image(width / 2, height / 2, 'hub_background');

        // Add title
        this.add.text(400, 50, 'Quest Phaser - Hub', {
            font: '32px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Add instructions
        this.add.text(400, 100, 'Click anywhere to move the player', {
            font: '16px Arial',
            fill: '#cccccc'
        }).setOrigin(0.5);

        // Create player
        this.player = new Player(this, 400, 300);

        // Initialize navigation system
        this.navigationSystem = new NavigationSystem(this, this.player);

        // Set up point-and-click interaction
        this.input.on('pointerdown', (pointer) => {
            this.navigationSystem.moveTo(pointer.x, pointer.y);
        });

        // Add some visual areas/zones
        this.createInteractiveZones();
    }

    createInteractiveZones() {
        // Create some example interactive zones
        const zone1 = this.add.rectangle(200, 400, 100, 100, 0x4a90e2, 0.5);
        zone1.setInteractive({ useHandCursor: true });
        zone1.on('pointerdown', () => {
            console.log('Zone 1 clicked');
            this.add.text(200, 350, 'Zone 1!', {
                font: '16px Arial',
                fill: '#ffffff'
            }).setOrigin(0.5);
        });

        const zone2 = this.add.rectangle(600, 400, 100, 100, 0xe24a4a, 0.5);
        zone2.setInteractive({ useHandCursor: true });
        zone2.on('pointerdown', () => {
            console.log('Zone 2 clicked');
            this.add.text(600, 350, 'Zone 2!', {
                font: '16px Arial',
                fill: '#ffffff'
            }).setOrigin(0.5);
        });
    }

    update() {
        // Update game logic
        if (this.player) {
            this.player.update();
        }
    }
}
