export default class PlayerStateMachine {
    constructor(player) {
        this.player = player;
        this.currentState = 'idle';
        this.states = {
            idle: {
                enter: () => {
                    console.log('Player state: idle');
                },
                update: () => {
                    // Idle state logic
                },
                exit: () => {
                    // Cleanup
                }
            },
            moving: {
                enter: () => {
                    console.log('Player state: moving');
                },
                update: () => {
                    // Moving state logic
                },
                exit: () => {
                    // Cleanup
                }
            },
            interacting: {
                enter: () => {
                    console.log('Player state: interacting');
                },
                update: () => {
                    // Interacting state logic
                },
                exit: () => {
                    // Cleanup
                }
            }
        };
    }

    setState(newState) {
        if (this.states[newState] && this.currentState !== newState) {
            // Exit current state
            if (this.states[this.currentState] && this.states[this.currentState].exit) {
                this.states[this.currentState].exit();
            }
            
            // Update state
            const previousState = this.currentState;
            this.currentState = newState;
            
            // Enter new state
            if (this.states[this.currentState] && this.states[this.currentState].enter) {
                this.states[this.currentState].enter();
            }
            
            console.log(`State transition: ${previousState} -> ${newState}`);
        }
    }

    update() {
        // Update current state
        if (this.states[this.currentState] && this.states[this.currentState].update) {
            this.states[this.currentState].update();
        }
    }

    getCurrentState() {
        return this.currentState;
    }
}
