import Phaser from 'phaser';
import PlayerStateMachine from '../systems/PlayerStateMachine.js';

export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        
        // Create player sprite with origin at feet
        this.sprite = scene.physics.add.sprite(x, y, 'player');
        this.sprite.setOrigin(0.5, 0.85); // Anchor at feet
        
        // Set smaller physics body
        const bodyWidth = 20;
        const bodyHeight = 30;
        this.sprite.body.setSize(bodyWidth, bodyHeight);
        // Offset body to bottom of sprite
        this.sprite.body.setOffset(
            (this.sprite.width - bodyWidth) / 2,
            this.sprite.height * 0.85 - bodyHeight
        );
        
        // Player properties
        this.sprite.body.setCollideWorldBounds(true);
        this.speed = 180;
        
        // Current direction for animation
        this.currentDirection = 'Down';
        this.currentAnimKey = null;
        this.currentFlip = false;
        this.directionChangeCooldown = 120;
        this.nextDirectionChangeTime = 0;

        this.stuckSamplePos = new Phaser.Math.Vector2(x, y);
        this.nextStuckCheck = 0;
        this.stuckInterval = 400;
        this.stuckThreshold = 2;
        
        // Initialize state machine
        this.stateMachine = new PlayerStateMachine(this);
        
        // Movement target
        this.targetX = null;
        this.targetY = null;
        
        // Path following
        this.path = [];
        this.currentPathIndex = 0;
        this.waypointThreshold = 8;
        
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
            const firstPoint = path[0];
            this.targetX = firstPoint.x;
            this.targetY = firstPoint.y;
            this.stateMachine.setState('moving');
        }
    }
    
    getDirectionFromAngle(angle) {
        // Convert to degrees and normalize to 0-360
        let deg = Phaser.Math.RadToDeg(angle);
        if (deg < 0) deg += 360;
        
        // 8-directional movement with 45-degree sectors
        // 0° = Right, 90° = Down, 180° = Left, 270° = Up
        if (deg >= 337.5 || deg < 22.5) {
            return 'Right';
        } else if (deg >= 22.5 && deg < 67.5) {
            return 'DownRight';
        } else if (deg >= 67.5 && deg < 112.5) {
            return 'Down';
        } else if (deg >= 112.5 && deg < 157.5) {
            return 'DownLeft';
        } else if (deg >= 157.5 && deg < 202.5) {
            return 'Left';
        } else if (deg >= 202.5 && deg < 247.5) {
            return 'UpLeft';
        } else if (deg >= 247.5 && deg < 292.5) {
            return 'Up';
        } else if (deg >= 292.5 && deg < 337.5) {
            return 'UpRight';
        }
        
        return 'Down';
    }
    
    hasAnimation(key) {
        return !!key && this.scene.anims && this.scene.anims.exists(key);
    }

    playDirectionalAnimation(animationType) {
        if (this.targetX === null || this.targetY === null) return;

        const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, this.targetX, this.targetY);
        const rawDirection = this.getDirectionFromAngle(angle);
        const now = this.scene.time.now;

        if (rawDirection !== this.currentDirection) {
            if (now >= this.nextDirectionChangeTime) {
                this.currentDirection = rawDirection;
                this.nextDirectionChangeTime = now + this.directionChangeCooldown;
            }
        }

        const { animKey, needsFlip } = this.resolveAnimation(animationType, this.currentDirection);
        this.applyAnimation(animKey, needsFlip);
    }

    playIdleAnimation(force = false) {
        const direction = this.currentDirection ?? 'Down';
        const { animKey, needsFlip } = this.resolveAnimation('idle', direction);
        this.applyAnimation(animKey, needsFlip, true);
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
        this.stateMachine.update();

        if (this.targetX !== null && this.targetY !== null) {
            const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.targetX, this.targetY);

            if (distance < this.waypointThreshold) {
                if (this.path.length > 0 && this.currentPathIndex < this.path.length - 1) {
                    this.currentPathIndex++;
                    const nextPoint = this.path[this.currentPathIndex];
                    this.targetX = nextPoint.x;
                    this.targetY = nextPoint.y;
                } else {
                    this.stopMovement();
                }
            } else {
                this.playDirectionalAnimation('walk');

                const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, this.targetX, this.targetY);
                this.sprite.body.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);

                this.checkStuck();
            }
        } else {
            this.sprite.body.setVelocity(0, 0);
        }
    }

    resolveAnimation(animationType, direction) {
        const isLeft = direction.includes('Left');
        let animKey = `${animationType}_${direction.replace('Left', 'Right')}`;
        let needsFlip = isLeft;

        if (!this.hasAnimation(animKey)) {
            if (direction.includes('Down')) {
                animKey = `${animationType}_Down`;
                needsFlip = false;
            } else if (direction.includes('Up')) {
                animKey = `${animationType}_Up`;
                needsFlip = false;
            } else {
                animKey = `${animationType}_Right`;
                needsFlip = direction.includes('Left');
            }
        }

        return { animKey, needsFlip };
    }

    applyAnimation(animKey, needsFlip, force = false) {
        if (!this.hasAnimation(animKey)) return;

        const shouldChange =
            force ||
            this.currentAnimKey !== animKey ||
            this.currentFlip !== needsFlip ||
            !this.sprite.anims.isPlaying;

        if (!shouldChange) return;

        this.sprite.setFlipX(needsFlip);
        this.currentAnimKey = animKey;
        this.currentFlip = needsFlip;
        this.sprite.anims.play(animKey, true);
    }

    checkStuck() {
        const now = this.scene.time.now;
        if (now < this.nextStuckCheck) return;

        const moved = Phaser.Math.Distance.Between(
            this.sprite.x,
            this.sprite.y,
            this.stuckSamplePos.x,
            this.stuckSamplePos.y
        );

        if (moved < this.stuckThreshold) {
            this.skipBlockedWaypoint();
        } else {
            this.stuckSamplePos.set(this.sprite.x, this.sprite.y);
        }

        this.nextStuckCheck = now + this.stuckInterval;
    }

    skipBlockedWaypoint() {
        if (this.path.length === 0) {
            this.stopMovement();
            return;
        }

        if (this.currentPathIndex < this.path.length - 1) {
            this.currentPathIndex++;
            const nextPoint = this.path[this.currentPathIndex];
            this.targetX = nextPoint.x;
            this.targetY = nextPoint.y;
        } else {
            this.stopMovement();
        }
    }

    getPosition() {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    destroy() {
        this.sprite.destroy();
    }
}
