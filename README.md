# questPhaser

Point-and-Click 2D Game built with Phaser 3

## Project Structure

```
questPhaser/
├── index.html           # Entry point HTML file
├── package.json         # Project dependencies
├── src/
│   ├── main.js         # Main game configuration
│   ├── scenes/
│   │   ├── BootScene.js      # Initial boot scene
│   │   ├── PreloadScene.js   # Asset preloading scene
│   │   ├── HubScene.js       # Main hub/game scene
│   ├── entities/
│   │   ├── Player.js         # Player entity
│   ├── systems/
│   │   ├── NavigationSystem.js      # Point-and-click navigation
│   │   ├── PlayerStateMachine.js    # Player state management
│   └── assets/          # Game assets (images, audio, etc.)
```

## Features

- **Modular ES6 Architecture**: Clean separation of concerns with ES6 modules
- **Point-and-Click Navigation**: Click anywhere to move the player
- **State Machine**: Robust player state management (idle, moving, interacting)
- **Scene Management**: Boot → Preload → Hub scene flow
- **Interactive Zones**: Example clickable areas in the game

## Installation

```bash
npm install
```

## Development

Start the development server:

```bash
npm start
```

The game will be available at `http://localhost:5173`

## Build

Build for production:

```bash
npm run build
```

## Technologies

- **Phaser 3.80.1**: Game framework
- **Vite**: Build tool and dev server
- **ES6 Modules**: Modern JavaScript module system

## Game Controls

- **Left Click**: Move player to clicked location
- **Interactive Zones**: Click on colored rectangles to interact

## Architecture Details

### Scenes
- **BootScene**: Handles initial game boot and loading screen
- **PreloadScene**: Loads all game assets
- **HubScene**: Main game scene with player and interactive elements

### Entities
- **Player**: Main player character with movement and state management

### Systems
- **NavigationSystem**: Manages point-and-click movement with visual feedback
- **PlayerStateMachine**: Handles player states (idle, moving, interacting)