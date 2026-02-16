export default class NavigationSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        
        // Visual feedback for clicks
        this.targetMarker = null;
    }

    moveTo(x, y) {
        console.log(`NavigationSystem: Moving to (${x}, ${y})`);
        
        // Update player movement
        this.player.moveTo(x, y);
        
        // Show visual marker at target location
        this.showTargetMarker(x, y);
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
