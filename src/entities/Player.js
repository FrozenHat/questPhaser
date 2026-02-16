import Phaser from 'phaser';
import PlayerStateMachine from '../systems/PlayerStateMachine.js';

export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        
        // Create player sprite using spritesheet
        this.sprite = scene.physics.add.sprite(x, y, 'player');
        
        // Player properties
        this.sprite.body.setCollideWorldBounds(true);
        this.speed = 200;
        
        // Current direction for animation
        this.currentDirection = 'Down';
        
        // Initialize state machine
        this.stateMachine = new PlayerStateMachine(this);
        
        // Movement target
        this.targetX = null;
        this.targetY = null;
        
        // Path following
        this.path = [];
        this.currentPathIndex = 0;
        
        // Play initial idle animation
        this.sprite.play('idle_Down');
    }

    moveTo(x, y) {
        this.targetX = x;
        this.targetY = y;
        this.stateMachine.setState('moving');
    }
    
    setPath(path) {
        if (path && path.length > 0) {
            this.path = path;
            this.currentPathIndex = 0;
            if (path.length > 0) {
                const firstPoint = path[0];
                this.targetX = firstPoint.x;
                this.targetY = firstPoint.y;
                this.stateMachine.setState('moving');
            }
        }
    }
    
    getDirectionFromAngle(angle) {
        // angle in radians from -PI to PI
        // Divide into 8 sectors (each 45°)
        
        const deg = Phaser.Math.RadToDeg(angle);
        
        if (deg >= -22.5 && deg < 22.5) return 'Right';
        else if (deg >= 22.5 && deg < 67.5) return 'DownRight';
        else if (deg >= 67.5 && deg < 112.5) return 'Down';
        else if (deg >= 112.5 && deg < 157.5) return 'DownLeft';
        else if (deg >= 157.5 || deg < -157.5) return 'Left';
        else if (deg >= -157.5 && deg < -112.5) return 'UpLeft';
        else if (deg >= -112.5 && deg < -67.5) return 'Up';
        else if (deg >= -67.5 && deg < -22.5) return 'UpRight';
        
        return 'Down'; // default
    }
    
    playDirectionalAnimation(animationType) {
        // animationType: 'walk' or 'idle'
        
        if (!this.targetX || !this.targetY) return;
        
        // Calculate angle to target
        const angle = Phaser.Math.Angle.Between(
            this.sprite.x,
            this.sprite.y,
            this.targetX,
            this.targetY
        );
        
        // Determine direction
        const direction = this.getDirectionFromAngle(angle);
        
        // For left directions, flip sprite
        if (direction.includes('Left')) {
            this.sprite.setFlipX(true);
            // Use corresponding right animation
            const rightDirection = direction.replace('Left', 'Right');
            this.sprite.play(`${animationType}_${rightDirection}`, true);
        } else {
            this.sprite.setFlipX(false);
            this.sprite.play(`${animationType}_${direction}`, true);
        }
        
        // Save current direction for idle
        this.currentDirection = direction;
    }
    
    playIdleAnimation() {
        if (this.currentDirection) {
            const animKey = this.currentDirection.includes('Left') 
                ? `idle_${this.currentDirection.replace('Left', 'Right')}`
                : `idle_${this.currentDirection}`;
            
            if (this.currentDirection.includes('Left')) {
                this.sprite.setFlipX(true);
            } else {
                this.sprite.setFlipX(false);
            }
            
            this.sprite.play(animKey, true);
        }
    }

    stopMovement() {
        this.sprite.body.setVelocity(0, 0);
        
        // Play idle animation in last direction
        this.playIdleAnimation();
        
        this.targetX = null;
        this.targetY = null;
        this.path = [];
        this.currentPathIndex = 0;
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
                // Reached current waypoint
                if (this.path.length > 0 && this.currentPathIndex < this.path.length - 1) {
                    // Move to next waypoint
                    this.currentPathIndex++;
                    const nextPoint = this.path[this.currentPathIndex];
                    this.targetX = nextPoint.x;
                    this.targetY = nextPoint.y;
                } else {
                    // Reached final destination
                    this.stopMovement();
                }
            } else {
                // Play walk animation towards target
                this.playDirectionalAnimation('walk');
                
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
