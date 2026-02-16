export default class NavigationSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        
        // Navigation map for walkable areas
        this.navMapKey = 'hub_navmap';
        
        // Threshold for considering a pixel as walkable (0-255)
        // Higher values mean lighter pixels are required for walkability
        this.walkableThreshold = 128;
        
        // Visual feedback for clicks
        this.targetMarker = null;
    }

    moveTo(x, y) {
        // Check if the clicked position is walkable
        if (!this.isWalkable(x, y)) {
            console.log(`NavigationSystem: Position (${x}, ${y}) is not walkable`);
            this.showInvalidMarker(x, y);
            return;
        }
        
        console.log(`NavigationSystem: Moving to (${x}, ${y})`);
        
        // Update player movement
        this.player.moveTo(x, y);
        
        // Show visual marker at target location
        this.showTargetMarker(x, y);
    }

    isWalkable(x, y) {
        // Get the pixel color from the navigation map
        const pixel = this.scene.textures.getPixel(Math.floor(x), Math.floor(y), this.navMapKey);
        
        // If pixel is null or undefined, consider it non-walkable
        if (!pixel) {
            return false;
        }
        
        // Check if the pixel is light enough (walkable areas are white/light)
        // For grayscale images, we can check any color channel or the alpha
        // Lighter pixels (higher values) are walkable
        const brightness = (pixel.r + pixel.g + pixel.b) / 3;
        
        return brightness >= this.walkableThreshold;
    }

    showInvalidMarker(x, y) {
        // Show a red X for invalid clicks
        const marker = this.scene.add.graphics();
        marker.lineStyle(3, 0xff0000, 0.8);
        marker.beginPath();
        marker.moveTo(x - 10, y - 10);
        marker.lineTo(x + 10, y + 10);
        marker.moveTo(x + 10, y - 10);
        marker.lineTo(x - 10, y + 10);
        marker.strokePath();
        
        // Fade out marker after a short time
        this.scene.tweens.add({
            targets: marker,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                marker.destroy();
            }
        });
    }

    showTargetMarker(x, y) {
        // Remove existing marker if any
        if (this.targetMarker) {
            this.targetMarker.destroy();
        }
        
        // Create new marker
        this.targetMarker = this.scene.add.circle(x, y, 8, 0xffff00, 0.6);
        
        // Fade out marker after a short time
        this.scene.tweens.add({
            targets: this.targetMarker,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                if (this.targetMarker) {
                    this.targetMarker.destroy();
                    this.targetMarker = null;
                }
            }
        });
    }

    calculatePath(startX, startY, endX, endY) {
        // Simple direct path for now
        // In a more complex game, this would use pathfinding algorithms
        return [
            { x: startX, y: startY },
            { x: endX, y: endY }
        ];
    }

    destroy() {
        if (this.targetMarker) {
            this.targetMarker.destroy();
        }
    }
}
