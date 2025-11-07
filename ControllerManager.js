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
        this.keyboardState = {}; // Stores current keyboard state
        this.config = this.loadConfig();

        window.addEventListener('gamepadconnected', (e) => this.handleGamepadConnected(e));
        window.addEventListener('gamepaddisconnected', (e) => this.handleGamepadDisconnected(e));
        
        // Keyboard event listeners for keyboard-based profiles
        window.addEventListener('keydown', (e) => {
            this.keyboardState[e.code] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keyboardState[e.code] = false;
        });

        // Initial gamepad scan and start update loop
        this.scanGamepads();
        this.update(); // Start the update loop
        ControllerManager.instance = this;
    }

    scanGamepads() {
        const gamepads = navigator.getGamepads();
        console.log('Scanning for gamepads:', gamepads);
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                console.log('Found connected gamepad:', gamepads[i]);
                this.handleGamepadConnected({ gamepad: gamepads[i] });
            }
        }
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

    /**
     * Gets all connected gamepads with their proper device names.
     * @returns {Array} Array of connected gamepad objects with id, index, and connected status.
     */
    getConnectedGamepads() {
        const gamepads = navigator.getGamepads();
        const connectedGamepads = [];
        
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                connectedGamepads.push({
                    id: gamepads[i].id,
                    index: gamepads[i].index,
                    connected: true,
                    mapping: gamepads[i].mapping,
                    buttons: gamepads[i].buttons,
                    axes: gamepads[i].axes
                });
            }
        }
        
        return connectedGamepads;
    }

    /**
     * Gets device options for dropdowns, showing only actually connected devices.
     * @returns {Array} Array of device option objects {value, label, type}
     */
    getDeviceOptions() {
        const options = [
            { value: 'keyboard', label: 'Keyboard', type: 'keyboard' }
        ];
        
        const connectedGamepads = this.getConnectedGamepads();
        
        connectedGamepads.forEach(gamepad => {
            // Use the actual device name from the gamepad
            const deviceName = gamepad.id || 'Unknown Gamepad';
            options.push({
                value: `gamepad_${gamepad.index}`,
                label: deviceName,
                type: 'gamepad',
                index: gamepad.index
            });
        });
        
        return options;
    }

    // --- Configuration Management (also used by setup.js) ---

    loadConfig() {
        const saved = localStorage.getItem(this.CONFIG_KEY);
        const defaultConfig = {
            profiles: {
                'Default (Keyboard)': {
                    // Primary Movement (WASD style) - also used for left stick
                    dpadUp: 'KeyW', dpadDown: 'KeyS', dpadLeft: 'KeyA', dpadRight: 'KeyD',
                    leftStickX: 'KeyA', leftStickY: 'KeyW',
                    // Action buttons (Arrow keys)
                    actionNorth: 'ArrowUp', actionSouth: 'ArrowDown', actionWest: 'ArrowLeft', actionEast: 'ArrowRight',
                    // Additional buttons
                    leftBumper: 'KeyQ', rightBumper: 'KeyE',
                    // System buttons
                    select: 'Tab', start: 'Escape',
                    // Stick presses (sprint and special)
                    leftStickPress: 'ShiftLeft', rightStickPress: 'KeyF',
                    // Right stick (secondary D-pad for right hand)
                    rightStickX: 'KeyJ', rightStickY: 'KeyI',
                    // Other virtual buttons (triggers)
                    leftTrigger: 'ControlLeft', rightTrigger: 'Space',
                }
            },
            assignments: { 0: 'Default (Keyboard)', 1: 'Default (Keyboard)' }
        };
        
        try {
            const parsedConfig = saved ? JSON.parse(saved) : defaultConfig;
            
            // Ensure default keyboard profile is always present
            if (!parsedConfig.profiles['Default (Keyboard)']) {
                parsedConfig.profiles['Default (Keyboard)'] = defaultConfig.profiles['Default (Keyboard)'];
            }
            
            // Ensure assignments are valid
            if (!parsedConfig.assignments) {
                parsedConfig.assignments = { 0: 'Default (Keyboard)', 1: 'Default (Keyboard)' };
            }
            
            return parsedConfig;
        } catch {
            return defaultConfig;
        }
    }

    saveConfig(newConfig) {
        // Ensure default profiles are always preserved
        const currentConfig = this.loadConfig();
        
        // Always preserve the default keyboard profile
        if (!newConfig.profiles['Default (Keyboard)'] && currentConfig.profiles['Default (Keyboard)']) {
            newConfig.profiles['Default (Keyboard)'] = currentConfig.profiles['Default (Keyboard)'];
        }
        
        // Always preserve the default Xbox/PS4 profile
        if (!newConfig.profiles['Default (Xbox/PS4)'] && currentConfig.profiles['Default (Xbox/PS4)']) {
            newConfig.profiles['Default (Xbox/PS4)'] = currentConfig.profiles['Default (Xbox/PS4)'];
        }
        
        this.config = newConfig;
        localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    }

    /**
     * Checks if a profile name is a default (built-in) profile.
     * @param {string} profileName - The name of the profile to check.
     * @returns {boolean} True if the profile is a default profile, false otherwise.
     */
    isDefaultProfile(profileName) {
        return profileName === 'Default (Keyboard)';
    }

    /**
     * Checks if a profile name is a local (user-created) profile.
     * @param {string} profileName - The name of the profile to check.
     * @returns {boolean} True if the profile is a local profile, false otherwise.
     */
    isLocalProfile(profileName) {
        return !this.isDefaultProfile(profileName);
    }

    // --- Internal Logic ---

    handleGamepadConnected(e) {
        console.log('Gamepad connected event:', e.gamepad);
        this.gamepads[e.gamepad.index] = e.gamepad;
    }

    handleGamepadDisconnected(e) {
        console.log('Gamepad disconnected event:', e.gamepad);
        delete this.gamepads[e.gamepad.index];
        this.virtualStates[e.gamepad.index] = {}; // Clear the state
    }

    // Public method for manual gamepad scanning
    manualScan() {
        this.scanGamepads();
    }

    update() {
        const rawGamepads = navigator.getGamepads();
        
        // Find the first two connected gamepads
        const connectedGamepads = Array.from(rawGamepads).filter(gp => gp !== null);
        
        for (let i = 0; i < this.virtualStates.length; i++) {
            // Use the i-th connected gamepad instead of rawGamepads[i]
            const rawGamepad = connectedGamepads[i];
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

            // Check if this is a keyboard code (starts with Key or Arrow)
            if (physicalId.startsWith('Key') || physicalId.startsWith('Arrow')) {
                // Handle keyboard input
                virtualState[virtualButton] = this.keyboardState[physicalId] || false;
            } else if (physicalId.startsWith('button_')) {
                // Handle gamepad button input
                const buttonIndex = parseInt(physicalId.replace('button_', ''));
                virtualState[virtualButton] = rawGamepad.buttons[buttonIndex]?.pressed || false;
            } else if (physicalId.startsWith('axis_')) {
                // Handle gamepad axis input
                const axisParts = physicalId.replace('axis_', '');
                
                if (axisParts.includes('_neg')) {
                    // Negative direction for D-pad or triggers
                    const axisIndex = parseInt(axisParts.split('_')[0]);
                    const value = rawGamepad.axes[axisIndex] || 0;
                    virtualState[virtualButton] = value < -threshold;
                } else if (axisParts.includes('_pos')) {
                    // Positive direction for D-pad or triggers
                    const axisIndex = parseInt(axisParts.split('_')[0]);
                    const value = rawGamepad.axes[axisIndex] || 0;
                    virtualState[virtualButton] = value > threshold;
                } else {
                    // Standard analog stick
                    const axisIndex = parseInt(axisParts);
                    const value = rawGamepad.axes[axisIndex] || 0;
                    virtualState[virtualButton] = value;
                }
            }
        }
        return virtualState;
    }
}

// Make it a singleton so all parts of the app use the same instance
const controllerManager = new ControllerManager();
