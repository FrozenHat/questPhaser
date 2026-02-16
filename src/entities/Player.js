import Phaser from 'phaser';
import PlayerStateMachine from '../systems/PlayerStateMachine.js';

export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        
        // Create player sprite (using a simple circle as placeholder)
        this.sprite = scene.add.circle(x, y, 20, 0x00ff00);
        scene.physics.add.existing(this.sprite);
        
        // Player properties
        this.sprite.body.setCollideWorldBounds(true);
        this.speed = 200;
        
        // Initialize state machine
        this.stateMachine = new PlayerStateMachine(this);
        
        // Movement target
        this.targetX = null;
        this.targetY = null;
    }

    moveTo(x, y) {
        this.targetX = x;
        this.targetY = y;
        this.stateMachine.setState('moving');
    }

    stopMovement() {
        this.targetX = null;
        this.targetY = null;
        this.sprite.body.setVelocity(0, 0);
        this.stateMachine.setState('idle');
    }

    update() {
        // Update state machine
        this.stateMachine.update();
        
        // Handle movement
        if (this.targetX !== null && this.targetY !== null) {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x,
                this.sprite.y,
                this.targetX,
                this.targetY
            );

            if (distance < 5) {
                this.stopMovement();
            } else {
                // Calculate velocity towards target
                const angle = Phaser.Math.Angle.Between(
                    this.sprite.x,
                    this.sprite.y,
                    this.targetX,
                    this.targetY
                );
                
                this.sprite.body.setVelocity(
                    Math.cos(angle) * this.speed,
                    Math.sin(angle) * this.speed
                );
            }
        }
    }

    getPosition() {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    destroy() {
        this.sprite.destroy();
    }
}
