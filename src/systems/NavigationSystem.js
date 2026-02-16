export default class NavigationSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        
        // Navigation map for walkable areas
        this.navMapKey = 'hub_navmap';
        
        // Threshold for considering a pixel as walkable (0-255)
        // Higher values mean lighter pixels are required for walkability
        this.walkableThreshold = 128;
        
        // Grid resolution for pathfinding (in pixels)
        this.gridSize = 8;
        
        // Navigation grid for A* pathfinding
        this.navGrid = null;
        this.gridWidth = 0;
        this.gridHeight = 0;
        
        // Visual feedback for clicks
        this.targetMarker = null;
        
        // Validate that navigation map is loaded
        if (!this.scene.textures.exists(this.navMapKey)) {
            console.warn(`NavigationSystem: Navigation map '${this.navMapKey}' not found. All areas will be considered walkable.`);
        } else {
            this.buildNavigationGrid();
        }
    }
    
    buildNavigationGrid() {
        const texture = this.scene.textures.get(this.navMapKey);
        const source = texture.getSourceImage();
        
        this.gridWidth = Math.ceil(source.width / this.gridSize);
        this.gridHeight = Math.ceil(source.height / this.gridSize);
        
        // Build grid from navmap
        this.navGrid = [];
        for (let y = 0; y < this.gridHeight; y++) {
            this.navGrid[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                // Sample center of each grid cell
                const pixelX = Math.floor(x * this.gridSize + this.gridSize / 2);
                const pixelY = Math.floor(y * this.gridSize + this.gridSize / 2);
                
                const pixel = this.scene.textures.getPixel(pixelX, pixelY, this.navMapKey);
                this.navGrid[y][x] = pixel ? pixel.r >= this.walkableThreshold : false;
            }
        }
        
        console.log(`NavigationSystem: Built grid ${this.gridWidth}x${this.gridHeight}`);
    }

    moveTo(x, y) {
        // Check if the clicked position is walkable
        if (!this.isWalkable(x, y)) {
            console.log(`NavigationSystem: Position (${x}, ${y}) is not walkable`);
            this.showInvalidMarker(x, y);
            return;
        }
        
        console.log(`NavigationSystem: Moving to (${x}, ${y})`);
        
        // Calculate path using A*
        const playerPos = this.player.getPosition();
        const path = this.calculatePath(playerPos.x, playerPos.y, x, y);
        
        if (path && path.length > 0) {
            // Set the path for the player to follow
            this.player.setPath(path);
            
            // Show visual marker at target location
            this.showTargetMarker(x, y);
        } else {
            console.log('NavigationSystem: No path found to target');
            this.showInvalidMarker(x, y);
        }
    }

    isWalkable(x, y) {
        // If navigation map doesn't exist, consider all areas walkable
        if (!this.scene.textures.exists(this.navMapKey)) {
            return true;
        }
        
        // Get the texture to check bounds
        const texture = this.scene.textures.get(this.navMapKey);
        const source = texture.getSourceImage();
        
        // Validate coordinates are within texture bounds
        if (x < 0 || y < 0 || x >= source.width || y >= source.height) {
            return false;
        }
        
        // Get the pixel color from the navigation map
        const pixel = this.scene.textures.getPixel(Math.floor(x), Math.floor(y), this.navMapKey);
        
        // If pixel is null or undefined, consider it non-walkable
        if (!pixel) {
            return false;
        }
        
        // For grayscale navigation maps, use the red channel directly
        // (In grayscale images, R=G=B, so checking any channel is sufficient)
        const brightness = pixel.r;
        
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
        // If no navigation grid, use direct path
        if (!this.navGrid) {
            return [
                { x: startX, y: startY },
                { x: endX, y: endY }
            ];
        }
        
        // Convert world coordinates to grid coordinates
        const startGridX = Math.floor(startX / this.gridSize);
        const startGridY = Math.floor(startY / this.gridSize);
        const endGridX = Math.floor(endX / this.gridSize);
        const endGridY = Math.floor(endY / this.gridSize);
        
        // Validate grid coordinates
        if (!this.isGridWalkable(startGridX, startGridY) || 
            !this.isGridWalkable(endGridX, endGridY)) {
            return null;
        }
        
        // Run A* algorithm
        const gridPath = this.findPathAStar(startGridX, startGridY, endGridX, endGridY);
        
        if (!gridPath) {
            return null;
        }
        
        // Convert grid path back to world coordinates
        const worldPath = gridPath.map(node => ({
            x: node.x * this.gridSize + this.gridSize / 2,
            y: node.y * this.gridSize + this.gridSize / 2
        }));
        
        // Simplify path by removing unnecessary waypoints
        return this.smoothPath(worldPath);
    }
    
    findPathAStar(startX, startY, endX, endY) {
        const startNode = { x: startX, y: startY, g: 0, h: 0, f: 0, parent: null };
        const endNode = { x: endX, y: endY };
        
        const openList = [startNode];
        const closedList = [];
        
        while (openList.length > 0) {
            // Find node with lowest f score
            let currentIndex = 0;
            for (let i = 1; i < openList.length; i++) {
                if (openList[i].f < openList[currentIndex].f) {
                    currentIndex = i;
                }
            }
            
            const current = openList[currentIndex];
            
            // Check if we reached the goal
            if (current.x === endNode.x && current.y === endNode.y) {
                return this.reconstructPath(current);
            }
            
            // Move current from open to closed
            openList.splice(currentIndex, 1);
            closedList.push(current);
            
            // Check all neighbors
            const neighbors = this.getGridNeighbors(current);
            for (const neighbor of neighbors) {
                // Skip if in closed list
                if (closedList.find(n => n.x === neighbor.x && n.y === neighbor.y)) {
                    continue;
                }
                
                // Calculate scores
                const g = current.g + this.gridDistance(current, neighbor);
                const h = this.heuristic(neighbor, endNode);
                const f = g + h;
                
                // Check if this path is better
                const existingNode = openList.find(n => n.x === neighbor.x && n.y === neighbor.y);
                if (existingNode) {
                    if (g < existingNode.g) {
                        existingNode.g = g;
                        existingNode.f = f;
                        existingNode.parent = current;
                    }
                } else {
                    openList.push({ x: neighbor.x, y: neighbor.y, g, h, f, parent: current });
                }
            }
        }
        
        // No path found
        return null;
    }
    
    getGridNeighbors(node) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 },  // up
            { x: 1, y: 0 },   // right
            { x: 0, y: 1 },   // down
            { x: -1, y: 0 },  // left
            { x: 1, y: -1 },  // up-right
            { x: 1, y: 1 },   // down-right
            { x: -1, y: 1 },  // down-left
            { x: -1, y: -1 }  // up-left
        ];
        
        for (const dir of directions) {
            const nx = node.x + dir.x;
            const ny = node.y + dir.y;
            
            if (this.isGridWalkable(nx, ny)) {
                neighbors.push({ x: nx, y: ny });
            }
        }
        
        return neighbors;
    }
    
    isGridWalkable(x, y) {
        if (x < 0 || y < 0 || x >= this.gridWidth || y >= this.gridHeight) {
            return false;
        }
        return this.navGrid[y][x];
    }
    
    gridDistance(a, b) {
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        // Diagonal distance
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    heuristic(a, b) {
        // Manhattan distance
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    
    reconstructPath(node) {
        const path = [];
        let current = node;
        while (current) {
            path.unshift({ x: current.x, y: current.y });
            current = current.parent;
        }
        return path;
    }
    
    smoothPath(path) {
        if (!path || path.length <= 2) {
            return path;
        }
        
        // Simple path smoothing - remove intermediate points if line-of-sight exists
        const smoothed = [path[0]];
        let current = 0;
        
        while (current < path.length - 1) {
            let farthest = current + 1;
            
            // Try to find the farthest point we can reach in a straight line
            for (let i = current + 2; i < path.length; i++) {
                if (this.hasLineOfSight(path[current], path[i])) {
                    farthest = i;
                } else {
                    break;
                }
            }
            
            smoothed.push(path[farthest]);
            current = farthest;
        }
        
        return smoothed;
    }
    
    hasLineOfSight(from, to) {
        // Simple line-of-sight check using Bresenham-like algorithm
        const dx = Math.abs(to.x - from.x);
        const dy = Math.abs(to.y - from.y);
        const steps = Math.max(dx, dy) / this.gridSize;
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = Math.floor(from.x + (to.x - from.x) * t);
            const y = Math.floor(from.y + (to.y - from.y) * t);
            
            if (!this.isWalkable(x, y)) {
                return false;
            }
        }
        
        return true;
    }

    destroy() {
        if (this.targetMarker) {
            this.targetMarker.destroy();
        }
    }
}
