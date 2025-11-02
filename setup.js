document.addEventListener('DOMContentLoaded', () => {
    const visualizerPanel = document.getElementById('visualizer-panel');
    const noGamepadMessage = document.getElementById('no-gamepad-message');
    const saveBtn = document.getElementById('saveBtn');
    const saveStatus = document.getElementById('save-status');

    let gamepads = {};
    let animationFrameId;
    let config = {};
    let listeningFor = null; // { player, action, element }

    const CONFIG_KEY = 'gameControllerConfig';

    // --- Core Functions ---

    function loadConfig() {
        const savedConfig = localStorage.getItem(CONFIG_KEY);
        try {
            config = savedConfig ? JSON.parse(savedConfig) : generateDefaultConfig();
        } catch (e) {
            console.error("Failed to parse controller config, using defaults.", e);
            config = generateDefaultConfig();
        }
        updateMappingUI();
    }

    function saveConfig() {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        saveStatus.style.opacity = '1';
        setTimeout(() => { saveStatus.style.opacity = '0'; }, 2000);
    }

    function generateDefaultConfig() {
        return {
            player1: { up: 'button_12', left: 'button_14', right: 'button_15', shoot: 'button_0' },
            player2: { up: 'button_12', left: 'button_14', right: 'button_15', shoot: 'button_0' },
            global: { pause: 'button_9', confirm: 'button_0' }
        };
    }

    function updateMappingUI() {
        document.querySelectorAll('.map-button').forEach(button => {
            const player = button.dataset.player === 'global' ? 'global' : `player${parseInt(button.dataset.player) + 1}`;
            const action = button.dataset.action;
            if (config[player] && config[player][action]) {
                button.textContent = config[player][action].replace('_', ' ').toUpperCase();
            } else {
                button.textContent = "Not Set";
            }
        });
    }

    function listenForInput(player, action, element) {
        // Reset any other listening buttons
        document.querySelectorAll('.map-button.listening').forEach(el => el.classList.remove('listening'));

        listeningFor = { player, action, element };
        element.classList.add('listening');
        element.textContent = 'Press a button...';
    }

    // --- Gamepad Connection and Visualization ---

    function handleGamepadConnected(e) {
        const gamepad = e.gamepad;
        gamepads[gamepad.index] = gamepad;
        addGamepadVisualizer(gamepad);
        if (noGamepadMessage) noGamepadMessage.style.display = 'none';
        if (!animationFrameId) animationFrameId = requestAnimationFrame(update);
    }

    function handleGamepadDisconnected(e) {
        const gamepad = e.gamepad;
        removeGamepadVisualizer(gamepad);
        delete gamepads[gamepad.index];
        if (Object.keys(gamepads).length === 0) {
            if (noGamepadMessage) noGamepadMessage.style.display = 'block';
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }
    
    // (Visualizer creation functions are the same, just moved inside the main IIFE)
    function addGamepadVisualizer(gamepad) {
        const visualizer = document.createElement('div');
        visualizer.className = 'gamepad connected';
        visualizer.id = `gamepad-${gamepad.index}`;
        let buttonsHTML = '';
        gamepad.buttons.forEach((_, index) => { buttonsHTML += `<div class="button" id="btn-${gamepad.index}-${index}">B${index}</div>`; });
        let axesHTML = '';
        gamepad.axes.forEach((_, index) => {
            axesHTML += `<div class="axis">A${index}: <span id="axis-val-${gamepad.index}-${index}">0.00</span><div class="axis-bar"><div class="axis-value" id="axis-bar-${gamepad.index}-${index}"></div></div></div>`;
        });
        visualizer.innerHTML = `<div class="gamepad-name">[${gamepad.index}] ${gamepad.id}</div><div class="gamepad-details"><div class="buttons-container"><div class="container-title">Buttons</div><div class="buttons-grid">${buttonsHTML}</div></div><div class="axes-container"><div class="container-title">Axes</div><div class="axes-grid">${axesHTML}</div></div></div>`;
        visualizerPanel.appendChild(visualizer);
    }

    function removeGamepadVisualizer(gamepad) {
        const visualizer = document.getElementById(`gamepad-${gamepad.index}`);
        if (visualizer) visualizer.remove();
    }


    function update() {
        const connectedGamepads = navigator.getGamepads ? navigator.getGamepads() : [];

        for (const gamepad of connectedGamepads) {
            if (!gamepad) continue;

            // Check for input to map if we are listening
            if (listeningFor && gamepad.index == listeningFor.player) {
                // Check buttons
                const pressedButton = gamepad.buttons.findIndex(b => b.pressed);
                if (pressedButton !== -1) {
                    const inputId = `button_${pressedButton}`;
                    const playerKey = `player${parseInt(listeningFor.player) + 1}`;
                    config[playerKey][listeningFor.action] = inputId;
                    listeningFor.element.classList.remove('listening');
                    listeningFor = null;
                    updateMappingUI();
                    break; // Stop checking once input is captured
                }
            }
             // Handle Global mapping separately (listens on all controllers)
            if (listeningFor && listeningFor.player === 'global') {
                const pressedButton = gamepad.buttons.findIndex(b => b.pressed);
                if (pressedButton !== -1) {
                    const inputId = `button_${pressedButton}`;
                    config.global[listeningFor.action] = inputId;
                    listeningFor.element.classList.remove('listening');
                    listeningFor = null;
                    updateMappingUI();
                    break;
                }
            }


            // Update visualizer
            gamepad.buttons.forEach((button, index) => {
                document.getElementById(`btn-${gamepad.index}-${index}`)?.classList.toggle('pressed', button.pressed);
            });
            gamepad.axes.forEach((axisValue, index) => {
                const valEl = document.getElementById(`axis-val-${gamepad.index}-${index}`);
                const barEl = document.getElementById(`axis-bar-${gamepad.index}-${index}`);
                if (valEl && barEl) {
                    valEl.textContent = axisValue.toFixed(2);
                    barEl.style.width = `${Math.abs(axisValue) * 50}%`;
                    barEl.style.left = axisValue > 0 ? '50%' : `${50 - Math.abs(axisValue) * 50}%`;
                }
            });
        }
        
        animationFrameId = requestAnimationFrame(update);
    }

    // --- Event Listeners ---
    document.querySelectorAll('.map-button').forEach(button => {
        button.addEventListener('click', () => {
            const player = button.dataset.player;
            const action = button.dataset.action;
            listenForInput(player, action, button);
        });
    });

    saveBtn.addEventListener('click', saveConfig);
    
    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

    // --- Initial Load ---
    loadConfig();
    const initialGamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for(const gp of initialGamepads) { if(gp) handleGamepadConnected({gamepad: gp}); }
});
