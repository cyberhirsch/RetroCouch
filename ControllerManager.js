// ================================================================================
// FILE: ControllerManager.js
// This is the central hub for all controller logic.
// ================================================================================

class ControllerManager {
    constructor() {
        if (ControllerManager.instance) {
            return ControllerManager.instance;
        }

        this.CONFIG_KEY = 'universalControllerConfig';
        this.gamepads = {}; // Stores raw gamepad data
        this.virtualStates = [{}, {}]; // Stores translated state for player 0 and 1
        this.config = this.loadConfig();

        window.addEventListener('gamepadconnected', (e) => this.handleGamepadConnected(e));
        window.addEventListener('gamepaddisconnected', (e) => this.handleGamepadDisconnected(e));

        this.update(); // Start the update loop
        ControllerManager.instance = this;
    }

    // --- Public API for Games ---

    /**
     * Gets the current state of a player's virtual gamepad.
     * @param {number} playerIndex - The player index (0 or 1).
     * @returns {object} The state of all virtual buttons and axes.
     */
    getState(playerIndex) {
        return this.virtualStates[playerIndex] || {};
    }

    // --- Configuration Management (also used by setup.js) ---

    loadConfig() {
        const saved = localStorage.getItem(this.CONFIG_KEY);
        const defaultConfig = {
            profiles: {
                'Default (Xbox/PS4)': {
                    actionSouth: 'button_0', actionEast: 'button_1', actionWest: 'button_2', actionNorth: 'button_3',
                    leftBumper: 'button_4', rightBumper: 'button_5', leftTrigger: 'button_6', rightTrigger: 'button_7',
                    select: 'button_8', start: 'button_9',
                    leftStickPress: 'button_10', rightStickPress: 'button_11',
                    dpadUp: 'button_12', dpadDown: 'button_13', dpadLeft: 'button_14', dpadRight: 'button_15',
                    leftStickX: 'axis_0', leftStickY: 'axis_1', rightStickX: 'axis_2', rightStickY: 'axis_3',
                }
            },
            assignments: { 0: 'Default (Xbox/PS4)', 1: 'Default (Xbox/PS4)' }
        };
        try {
            return saved ? JSON.parse(saved) : defaultConfig;
        } catch {
            return defaultConfig;
        }
    }

    saveConfig(newConfig) {
        this.config = newConfig;
        localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    }

    // --- Internal Logic ---

    handleGamepadConnected(e) {
        this.gamepads[e.gamepad.index] = e.gamepad;
    }

    handleGamepadDisconnected(e) {
        delete this.gamepads[e.gamepad.index];
        this.virtualStates[e.gamepad.index] = {}; // Clear the state
    }

    update() {
        const rawGamepads = navigator.getGamepads();
        for (let i = 0; i < this.virtualStates.length; i++) {
            const rawGamepad = rawGamepads[i];
            const profileName = this.config.assignments[i];
            const profile = this.config.profiles[profileName];

            if (rawGamepad && profile) {
                this.virtualStates[i] = this.translateToVirtual(rawGamepad, profile);
            } else {
                this.virtualStates[i] = {}; // No gamepad or profile, so state is empty
            }
        }
        requestAnimationFrame(() => this.update());
    }

    translateToVirtual(rawGamepad, profile) {
        const virtualState = {};
        const threshold = 0.5;

        for (const virtualButton in profile) {
            const physicalId = profile[virtualButton];
            if (!physicalId) continue;

            const [type, indexStr, direction] = physicalId.split('_');
            const index = parseInt(indexStr);

            if (type === 'button') {
                virtualState[virtualButton] = rawGamepad.buttons[index]?.pressed || false;
            } else if (type === 'axis') {
                const value = rawGamepad.axes[index] || 0;
                if (direction) { // For D-pads mapped to axes
                    if (direction === 'neg') virtualState[virtualButton] = value < -threshold;
                    if (direction === 'pos') virtualState[virtualButton] = value > threshold;
                } else { // For analog sticks
                    virtualState[virtualButton] = value;
                }
            }
        }
        return virtualState;
    }
}

// Make it a singleton so all parts of the app use the same instance
const controllerManager = new ControllerManager();
