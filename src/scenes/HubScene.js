import Phaser from 'phaser';
import Player from '../entities/Player.js';
import NavigationSystem from '../systems/NavigationSystem.js';

export default class HubScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HubScene' });
        this.backgroundImage = null;
    }

    create() {
        console.log('HubScene: Started');

        // Add hub background image
        this.backgroundImage = this.add.image(0, 0, 'hub_background').setOrigin(0, 0);
        
        // Get background dimensions
        const bgWidth = this.backgroundImage.width;
        const bgHeight = this.backgroundImage.height;

        // Set world bounds to background size
        this.physics.world.setBounds(0, 0, bgWidth, bgHeight);

        // Configure camera
        this.setupCamera(bgWidth, bgHeight);

        // Add title (will move with camera)
        this.add.text(bgWidth / 2, 50, 'Quest Phaser - Hub', {
            font: '32px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0);

        // Add instructions (will move with camera)
        this.add.text(bgWidth / 2, 100, 'Click anywhere to move the player', {
            font: '16px Arial',
            fill: '#cccccc'
        }).setOrigin(0.5).setScrollFactor(0);

        // Create player
        this.player = new Player(this, bgWidth / 2, bgHeight / 2);

        // Camera follows player
        this.cameras.main.startFollow(this.player.sprite, false);

        // Initialize navigation system
        this.navigationSystem = new NavigationSystem(this, this.player);

        // Set up point-and-click interaction
        this.input.on('pointerdown', (pointer) => {
            // Convert screen coordinates to world coordinates
            const worldX = pointer.worldX;
            const worldY = pointer.worldY;
            this.navigationSystem.moveTo(worldX, worldY);
        });

        // Add some visual areas/zones
        this.createInteractiveZones(bgWidth, bgHeight);

        // Handle resize
        this.scale.on('resize', this.handleResize, this);
        this.handleResize();
    }

    setupCamera(bgWidth, bgHeight) {
        const camera = this.cameras.main;
        
        // Set camera bounds to background size
        camera.setBounds(0, 0, bgWidth, bgHeight);
        
        // Set deadzone for smoother following
        camera.setDeadzone(100, 100);
        
        // Initial zoom
        camera.setZoom(1);
    }

    handleResize() {
        const camera = this.cameras.main;
        const bgWidth = this.backgroundImage.width;
        const bgHeight = this.backgroundImage.height;
        
        // Update camera viewport size
        const width = this.scale.width;
        const height = this.scale.height;
        
        camera.setViewport(0, 0, width, height);
        
        // If camera height is bigger than background, limit camera bounds
        if (height > bgHeight) {
            // Center vertically
            const offsetY = (height - bgHeight) / 2;
            camera.setBounds(0, -offsetY, bgWidth, height);
        } else {
            camera.setBounds(0, 0, bgWidth, bgHeight);
        }
        
        // Same for width
        if (width > bgWidth) {
            const offsetX = (width - bgWidth) / 2;
            camera.setBounds(-offsetX, camera.scrollY, width, bgHeight);
        }
    }

    createInteractiveZones(bgWidth, bgHeight) {
        // Create some example interactive zones
        const zone1 = this.add.rectangle(bgWidth * 0.25, bgHeight * 0.7, 100, 100, 0x4a90e2, 0.5);
        zone1.setInteractive({ useHandCursor: true });
        zone1.on('pointerdown', () => {
            console.log('Zone 1 clicked');
            this.add.text(zone1.x, zone1.y - 50, 'Zone 1!', {
                font: '16px Arial',
                fill: '#ffffff'
            }).setOrigin(0.5);
        });

        const zone2 = this.add.rectangle(bgWidth * 0.75, bgHeight * 0.7, 100, 100, 0xe24a4a, 0.5);
        zone2.setInteractive({ useHandCursor: true });
        zone2.on('pointerdown', () => {
            console.log('Zone 2 clicked');
            this.add.text(zone2.x, zone2.y - 50, 'Zone 2!', {
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

    shutdown() {
        // Clean up resize listener
        this.scale.off('resize', this.handleResize, this);
    }
}
