export default class NavigationSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        this.navMapKey = 'hub_navmap';
        this.walkableThreshold = 128;
        this.gridSize = 32;

        this.navGrid = null;
        this.gridWidth = 0;
        this.gridHeight = 0;

        this.targetMarker = null;

        // Use actual physics body size for padding
        this.agentPadding = this.getAgentPadding();

        if (!this.scene.textures.exists(this.navMapKey)) {
            console.warn(`NavigationSystem: Navigation map '${this.navMapKey}' not found. All areas walkable.`);
        } else {
            this.buildNavigationGrid();
        }
    }

    getAgentPadding() {
        const s = this.player?.sprite;
        const body = s?.body;
        const halfW = body?.halfWidth ?? 16;
        const halfH = body?.halfHeight ?? 16;
        const maxHalf = Math.max(halfW, halfH);
        return Math.max(Math.min(maxHalf, 22), 12);
    }

    getNavBounds() {
        if (!this.scene.textures.exists(this.navMapKey)) return null;
        const source = this.scene.textures.get(this.navMapKey).getSourceImage();
        return { width: source.width, height: source.height };
    }

    clampToNavBounds(x, y, padding = null) {
        const bounds = this.getNavBounds();
        if (!bounds) return { x, y };

        const pad = padding ?? this.agentPadding;
        const minX = pad;
        const minY = pad;
        const maxX = bounds.width - 1 - pad;
        const maxY = bounds.height - 1 - pad;

        return {
            x: Math.max(minX, Math.min(maxX, Math.floor(x))),
            y: Math.max(minY, Math.min(maxY, Math.floor(y)))
        };
    }

    buildNavigationGrid() {
        const bounds = this.getNavBounds();
        if (!bounds) {
            console.warn('NavigationSystem: Cannot build grid - no navmap bounds');
            return;
        }

        this.gridWidth = Math.ceil(bounds.width / this.gridSize);
        this.gridHeight = Math.ceil(bounds.height / this.gridSize);

        this.navGrid = [];
        for (let y = 0; y < this.gridHeight; y++) {
            this.navGrid[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                const worldX = x * this.gridSize + this.gridSize / 2;
                const worldY = y * this.gridSize + this.gridSize / 2;
                this.navGrid[y][x] = this.isWalkable(worldX, worldY);
            }
        }

        console.log(`NavigationSystem: Built ${this.gridWidth}x${this.gridHeight} grid (${this.gridSize}px cells)`);
    }

    isWalkable(x, y) {
        if (!this.scene.textures.exists(this.navMapKey)) {
            return true;
        }
        
        const texture = this.scene.textures.get(this.navMapKey);
        const source = texture.getSourceImage();
        
        if (x < 0 || y < 0 || x >= source.width || y >= source.height) {
            return false;
        }
        
        const pixel = this.scene.textures.getPixel(Math.floor(x), Math.floor(y), this.navMapKey);
        if (!pixel) {
            return false;
        }
        
        return pixel.r >= this.walkableThreshold;
    }

    moveTo(x, y) {
        const clamped = this.clampToNavBounds(x, y);
        let target = clamped;

        if (!this.isWalkable(target.x, target.y)) {
            const nearest = this.findNearestWalkablePoint(target.x, target.y, 500, 6);
            if (!nearest) {
                this.showInvalidMarker(clamped.x, clamped.y);
                return;
            }
            target = this.clampToNavBounds(nearest.x, nearest.y);
        }

        const playerPos = this.player.getPosition();
        const start = this.isWalkable(playerPos.x, playerPos.y)
            ? this.clampToNavBounds(playerPos.x, playerPos.y)
            : (this.findNearestWalkablePoint(playerPos.x, playerPos.y, 500, 6) || playerPos);

        const path = this.calculatePath(start.x, start.y, target.x, target.y);
        if (path && path.length > 0) {
            this.player.setPath(path);
            this.showTargetMarker(target.x, target.y);
        } else {
            this.showInvalidMarker(target.x, target.y);
        }
    }

    calculatePath(startX, startY, endX, endY) {
        if (!this.navGrid) {
            return [
                this.clampToNavBounds(startX, startY),
                this.clampToNavBounds(endX, endY)
            ];
        }

        const s = this.clampToNavBounds(startX, startY);
        const e = this.clampToNavBounds(endX, endY);

        const startGridX = Math.floor(s.x / this.gridSize);
        const startGridY = Math.floor(s.y / this.gridSize);
        const endGridX = Math.floor(e.x / this.gridSize);
        const endGridY = Math.floor(e.y / this.gridSize);

        if (!this.isGridWalkable(startGridX, startGridY) || !this.isGridWalkable(endGridX, endGridY)) {
            return null;
        }

        const gridPath = this.findPathAStar(startGridX, startGridY, endGridX, endGridY);
        if (!gridPath) return null;

        const worldPath = gridPath.map(node => {
            const p = {
                x: node.x * this.gridSize + this.gridSize / 2,
                y: node.y * this.gridSize + this.gridSize / 2
            };
            return this.clampToNavBounds(p.x, p.y);
        });

        return this.smoothPath(worldPath);
    }

    enforcePlayerOnNavmesh() {
        const p = this.player.getPosition();
        const clamped = this.clampToNavBounds(p.x, p.y);

        // Check if out of bounds OR on non-walkable tile
        const outOfBounds = (Math.abs(p.x - clamped.x) > 1 || Math.abs(p.y - clamped.y) > 1);
        const onBadTile = !this.isWalkable(clamped.x, clamped.y);

        if (outOfBounds || onBadTile) {
            const safe = this.findNearestWalkablePoint(clamped.x, clamped.y, 500, 8);
            if (safe) {
                console.warn(`Player stuck at (${p.x}, ${p.y}), teleporting to (${safe.x}, ${safe.y})`);
                this.player.sprite.setPosition(safe.x, safe.y);
                
                // Reset velocity
                if (this.player.sprite.body) {
                    this.player.sprite.body.setVelocity(0, 0);
                }
                
                // Stop path
                this.player.stopMovement();
            }
        }
    }

    findPathAStar(startX, startY, endX, endY) {
        const startNode = { x: startX, y: startY, g: 0, h: 0, f: 0, parent: null };
        const endNode = { x: endX, y: endY };
        
        const openList = [startNode];
        const closedList = [];
        
        while (openList.length > 0) {
            let currentIndex = 0;
            for (let i = 1; i < openList.length; i++) {
                if (openList[i].f < openList[currentIndex].f) {
                    currentIndex = i;
                }
            }
            
            const current = openList[currentIndex];
            
            if (current.x === endNode.x && current.y === endNode.y) {
                return this.reconstructPath(current);
            }
            
            openList.splice(currentIndex, 1);
            closedList.push(current);
            
            const neighbors = this.getGridNeighbors(current);
            for (const neighbor of neighbors) {
                if (closedList.find(n => n.x === neighbor.x && n.y === neighbor.y)) {
                    continue;
                }
                
                const g = current.g + this.gridDistance(current, neighbor);
                const h = this.heuristic(neighbor, endNode);
                const f = g + h;
                
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
        
        return null;
    }
    
    getGridNeighbors(node) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
            { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }
        ];

        for (const dir of directions) {
            const nx = node.x + dir.x;
            const ny = node.y + dir.y;
            if (!this.isGridWalkable(nx, ny)) continue;

            if (dir.x !== 0 && dir.y !== 0) {
                const side1 = this.isGridWalkable(node.x + dir.x, node.y);
                const side2 = this.isGridWalkable(node.x, node.y + dir.y);
                if (!side1 || !side2) continue;
            }

            neighbors.push({ x: nx, y: ny });
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
        const D = 1;
        const D2 = Math.SQRT2;
        return D * (dx + dy) + (D2 - 2 * D) * Math.min(dx, dy);
    }
    
    heuristic(a, b) {
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        const D = 1;
        const D2 = Math.SQRT2;
        return D * (dx + dy) + (D2 - 2 * D) * Math.min(dx, dy);
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
        
        const smoothed = [path[0]];
        let current = 0;
        
        while (current < path.length - 1) {
            let farthest = current + 1;
            
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
        const dx = Math.abs(to.x - from.x);
        const dy = Math.abs(to.y - from.y);
        const steps = Math.max(dx, dy) / this.gridSize;

        if (steps === 0) return true;

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

    findNearestWalkablePoint(x, y, maxRadius = 300, step = 8) {
        if (this.isWalkable(x, y)) return { x, y };

        for (let r = step; r <= maxRadius; r += step) {
            for (let angle = 0; angle < 360; angle += 15) {
                const rad = (angle * Math.PI) / 180;
                const px = Math.floor(x + Math.cos(rad) * r);
                const py = Math.floor(y + Math.sin(rad) * r);

                if (this.isWalkable(px, py)) {
                    return { x: px, y: py };
                }
            }
        }

        return null;
    }

    showInvalidMarker(x, y) {
        const marker = this.scene.add.graphics();
        marker.lineStyle(3, 0xff0000, 0.8);
        marker.beginPath();
        marker.moveTo(x - 10, y - 10);
        marker.lineTo(x + 10, y + 10);
        marker.moveTo(x + 10, y - 10);
        marker.lineTo(x - 10, y + 10);
        marker.strokePath();
        
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
        if (this.targetMarker) {
            this.targetMarker.destroy();
        }
        
        this.targetMarker = this.scene.add.circle(x, y, 8, 0xffff00, 0.6);
        
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

    destroy() {
        if (this.targetMarker) {
            this.targetMarker.destroy();
        }
    }
}
