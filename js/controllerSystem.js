/**
 * Universal Controller System (UCS)
 * Abstracts hardware inputs into standardized Game Actions.
 */
export class ControllerSystem {
    constructor() {
        this.players = [
            { id: 0, name: 'Player 1', device: 'keyboard', profileId: 'default-keyboard', state: this.getEmptyState() },
            { id: 1, name: 'Player 2', device: null, profileId: 'default-gamepad', state: this.getEmptyState() },
            { id: 2, name: 'Player 3', device: null, profileId: 'default-gamepad', state: this.getEmptyState() },
            { id: 3, name: 'Player 4', device: null, profileId: 'default-gamepad', state: this.getEmptyState() }
        ];

        this.profiles = this.loadProfiles();
        this.keyboardState = {};
        this.gamepads = [];

        // Listeners for hardware
        window.addEventListener('keydown', (e) => this.keyboardState[e.code] = true);
        window.addEventListener('keyup', (e) => this.keyboardState[e.code] = false);
        window.addEventListener("gamepadconnected", (e) => {
            console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
                e.gamepad.index, e.gamepad.id,
                e.gamepad.buttons.length, e.gamepad.axes.length);
        });
    }

    getEmptyState() {
        return {
            // Face Buttons
            actionSouth: false, actionEast: false, actionWest: false, actionNorth: false,
            // Shoulder Buttons
            leftBumper: false, rightBumper: false, leftTrigger: false, rightTrigger: false,
            // Special Buttons
            select: false, start: false, leftStickPress: false, rightStickPress: false,
            // D-Pad
            dpadUp: false, dpadDown: false, dpadLeft: false, dpadRight: false,
            // Analog Sticks
            leftStickX: 0, leftStickY: 0, rightStickX: 0, rightStickY: 0
        };
    }

    loadProfiles() {
        const defaultProfiles = {
            'default-keyboard': {
                name: 'Default Keyboard',
                isDefault: true,
                mapping: {
                    actionSouth: 'Space',
                    actionEast: 'KeyE',
                    actionWest: 'KeyQ',
                    actionNorth: 'ShiftLeft',
                    leftStickX: { pos: 'KeyD', neg: 'KeyA' },
                    leftStickY: { pos: 'KeyS', neg: 'KeyW' },
                    dpadUp: 'ArrowUp',
                    dpadDown: 'ArrowDown',
                    dpadLeft: 'ArrowLeft',
                    dpadRight: 'ArrowRight',
                    start: 'Enter',
                    select: 'Escape'
                }
            },
            'default-gamepad': {
                name: 'Standard Gamepad',
                isDefault: true,
                mapping: {
                    actionSouth: 'button-0', actionEast: 'button-1', actionWest: 'button-2', actionNorth: 'button-3',
                    leftBumper: 'button-4', rightBumper: 'button-5',
                    leftTrigger: 'button-6', rightTrigger: 'button-7',
                    select: 'button-8', start: 'button-9',
                    leftStickPress: 'button-10', rightStickPress: 'button-11',
                    dpadUp: 'button-12', dpadDown: 'button-13', dpadLeft: 'button-14', dpadRight: 'button-15',
                    leftStickX: 'axis-0', leftStickY: 'axis-1',
                    rightStickX: 'axis-2', rightStickY: 'axis-3'
                }
            },
            'snes-gamepad': {
                name: 'Retro SNES',
                isDefault: true,
                mapping: {
                    actionSouth: 'button-0', // B
                    actionEast: 'button-1',  // A
                    actionWest: 'button-2',  // Y
                    actionNorth: 'button-3', // X
                    leftBumper: 'button-4',  // L
                    rightBumper: 'button-5', // R
                    select: 'button-8',
                    start: 'button-9',
                    // D-Pad
                    dpadUp: 'button-12',
                    dpadDown: 'button-13',
                    dpadLeft: 'button-14',
                    dpadRight: 'button-15',
                    // Map leftStick to D-pad buttons for games that require sticks
                    leftStickX: { pos: 'button-15', neg: 'button-14' },
                    leftStickY: { pos: 'button-13', neg: 'button-12' }
                }
            }
        };

        const saved = localStorage.getItem('retro_couch_profiles');
        return saved ? { ...defaultProfiles, ...JSON.parse(saved) } : defaultProfiles;
    }

    start() {
        // Load player assignments from local storage if they exist
        const savedPlayers = localStorage.getItem('retro_couch_players');
        if (savedPlayers) {
            const parsed = JSON.parse(savedPlayers);
            this.players.forEach((p, i) => {
                if (parsed[i]) {
                    p.name = parsed[i].name || p.name;
                    p.device = parsed[i].device;
                    p.profileId = parsed[i].profileId;
                }
            });
        }
    }

    update() {
        this.gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

        this.players.forEach(player => {
            if (!player.device) {
                player.state = this.getEmptyState();
                return;
            }

            const profile = this.profiles[player.profileId] || this.profiles['default-gamepad'];
            const newState = this.getEmptyState();

            if (player.device === 'keyboard') {
                this.updateKeyboardPlayer(newState, profile.mapping);
            } else if (player.device.startsWith('gamepad-')) {
                const index = parseInt(player.device.split('-')[1]);
                const gamepad = this.gamepads[index];
                if (gamepad) {
                    this.updateGamepadPlayer(newState, profile.mapping, gamepad);
                }
            }

            player.state = newState;
        });
    }

    updateKeyboardPlayer(state, mapping) {
        for (const [action, key] of Object.entries(mapping)) {
            if (typeof key === 'string') {
                state[action] = !!this.keyboardState[key];
            } else if (typeof key === 'object') {
                // Handle axis simulation (WASD/Arrows)
                let val = 0;
                if (this.keyboardState[key.pos]) val += 1;
                if (this.keyboardState[key.neg]) val -= 1;
                state[action] = val;
            }
        }
    }

    updateGamepadPlayer(state, mapping, gamepad) {
        for (const [action, source] of Object.entries(mapping)) {
            if (typeof source === 'string') {
                state[action] = this.getGamepadSourceValue(gamepad, source);
            } else if (typeof source === 'object' && source !== null) {
                // Virtual axis support (digital-to-analog simulation)
                let val = 0;
                if (source.pos && this.getGamepadSourceValue(gamepad, source.pos)) val += 1;
                if (source.neg && this.getGamepadSourceValue(gamepad, source.neg)) val -= 1;
                state[action] = val;
            }
        }
    }

    getGamepadSourceValue(gamepad, source) {
        if (!source || typeof source !== 'string') return 0;

        if (source.startsWith('button-')) {
            const idx = parseInt(source.split('-')[1]);
            return !!gamepad.buttons[idx]?.pressed;
        } else if (source.startsWith('axis-')) {
            const parts = source.split('-');
            const axisIdx = parseInt(parts[1]);
            const val = gamepad.axes[axisIdx] || 0;

            if (parts.length === 2) {
                // Analog value
                return Math.abs(val) < 0.1 ? 0 : val;
            } else {
                // Digital direction from axis
                const dir = parts[2];
                if (dir === 'pos') return val > 0.5;
                if (dir === 'neg') return val < -0.5;
            }
        }
        return 0;
    }

    getControllerState(playerIndex) {
        return this.players[playerIndex]?.state || this.getEmptyState();
    }

    save() {
        const saveData = this.players.map(p => ({
            name: p.name,
            device: p.device,
            profileId: p.profileId
        }));
        localStorage.setItem('retro_couch_players', JSON.stringify(saveData));

        // Save only custom profiles
        const customProfiles = {};
        for (const [id, profile] of Object.entries(this.profiles)) {
            if (!profile.isDefault) customProfiles[id] = profile;
        }
        localStorage.setItem('retro_couch_profiles', JSON.stringify(customProfiles));
    }
}
