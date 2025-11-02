// ================================================================================
// FILE: setup.js
// This powers the setup.html page UI.
// ================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const profileSelector = document.getElementById('profile-selector');
    const newProfileBtn = document.getElementById('new-profile-btn');
    const deleteProfileBtn = document.getElementById('delete-profile-btn');
    const mappingContainer = document.getElementById('mapping-container');
    const assignmentsContainer = document.getElementById('assignments-container');
    const visualizerPanel = document.getElementById('visualizer-panel');

    let config = controllerManager.loadConfig();
    let listeningFor = null; // { profile, key, element }
    
    const VIRTUAL_GAMEPAD_LAYOUT = [
        'actionSouth', 'actionEast', 'actionWest', 'actionNorth',
        'leftBumper', 'rightBumper', 'leftTrigger', 'rightTrigger',
        'select', 'start', 'leftStickPress', 'rightStickPress',
        'dpadUp', 'dpadDown', 'dpadLeft', 'dpadRight',
        'leftStickX', 'leftStickY', 'rightStickX', 'rightStickY'
    ];

    function populateProfileSelector() {
        profileSelector.innerHTML = '';
        for (const name in config.profiles) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            profileSelector.appendChild(option);
        }
    }

    function populateMappings() {
        mappingContainer.innerHTML = '';
        const selectedProfile = profileSelector.value;
        const profile = config.profiles[selectedProfile];
        if (!profile) return;

        VIRTUAL_GAMEPAD_LAYOUT.forEach(key => {
            const div = document.createElement('div');
            div.className = 'control-mapping';
            div.innerHTML = `<span>${key}</span><button class="map-button" data-key="${key}">Not Set</button>`;
            mappingContainer.appendChild(div);
            
            const button = div.querySelector('button');
            if (profile[key]) {
                button.textContent = profile[key].replace(/_/g, ' ').toUpperCase();
            }
            button.onclick = () => listenForInput(selectedProfile, key, button);
        });
    }

    function populateAssignments() {
        assignmentsContainer.innerHTML = '';
        for (let i = 0; i < 2; i++) { // For Player 1 and Player 2
            const div = document.createElement('div');
            div.className = 'control-mapping';
            const select = document.createElement('select');
            select.id = `assign-p${i}`;
            for (const name in config.profiles) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                select.appendChild(option);
            }
            select.value = config.assignments[i] || 'none';
            select.onchange = () => {
                config.assignments[i] = select.value;
                controllerManager.saveConfig(config);
            };
            div.innerHTML = `<span>Player ${i + 1} uses:</span>`;
            div.appendChild(select);
            assignmentsContainer.appendChild(div);
        }
    }

    function listenForInput(profile, key, element) {
        if (listeningFor) {
            listeningFor.element.classList.remove('listening');
            listeningFor.element.textContent = config.profiles[listeningFor.profile][listeningFor.key]?.replace(/_/g, ' ').toUpperCase() || 'Not Set';
        }
        listeningFor = { profile, key, element };
        element.classList.add('listening');
        element.textContent = 'Press button/axis...';
    }
    
    function update() {
        const rawGamepads = navigator.getGamepads();
        visualizerPanel.innerHTML = ''; // Clear and redraw
        if (rawGamepads.length === 0 || !Object.values(rawGamepads).some(p => p)) {
            visualizerPanel.textContent = 'No controllers detected. Connect a controller to begin mapping.';
        }

        for(const gamepad of rawGamepads) {
            if (!gamepad) continue;
            
            // --- Handle Input Mapping ---
            if (listeningFor) {
                let capturedInput = null;
                // Buttons
                const btnIndex = gamepad.buttons.findIndex(b => b.pressed);
                if (btnIndex !== -1) capturedInput = `button_${btnIndex}`;
                // Axes
                if (!capturedInput) {
                    const axisIndex = gamepad.axes.findIndex(a => Math.abs(a) > 0.8);
                    if (axisIndex !== -1) {
                        const val = gamepad.axes[axisIndex];
                        capturedInput = `axis_${axisIndex}_${val > 0 ? 'pos' : 'neg'}`;
                    }
                }
                
                if (capturedInput) {
                    config.profiles[listeningFor.profile][listeningFor.key] = capturedInput;
                    controllerManager.saveConfig(config);
                    listeningFor.element.classList.remove('listening');
                    listeningFor.element.textContent = capturedInput.replace(/_/g, ' ').toUpperCase();
                    listeningFor = null;
                }
            }

            // --- Draw Visualizer (simplified) ---
            const div = document.createElement('div');
            let html = `<h3>[${gamepad.index}] ${gamepad.id}</h3>`;
            gamepad.buttons.forEach((b, i) => { html += `<span style="padding:5px; margin:2px; border:1px solid #555; background:${b.pressed ? '#F5D94D' : 'transparent'}">B${i}</span>` });
            html += '<br>';
            gamepad.axes.forEach((a, i) => { html += ` A${i}: ${a.toFixed(2)}` });
            div.innerHTML = html;
            visualizerPanel.appendChild(div);
        }

        requestAnimationFrame(update);
    }
    
    // --- Event Handlers ---
    profileSelector.onchange = populateMappings;
    newProfileBtn.onclick = () => {
        const name = prompt("Enter new profile name:");
        if (name && !config.profiles[name]) {
            config.profiles[name] = {};
            controllerManager.saveConfig(config);
            populateProfileSelector();
            profileSelector.value = name;
            populateMappings();
        }
    };
    deleteProfileBtn.onclick = () => {
        if (Object.keys(config.profiles).length > 1) {
            const name = profileSelector.value;
            if (confirm(`Are you sure you want to delete the "${name}" profile?`)) {
                delete config.profiles[name];
                controllerManager.saveConfig(config);
                populateProfileSelector();
                populateMappings();
            }
        }
    };

    // --- Initial Setup ---
    populateProfileSelector();
    populateMappings();
    populateAssignments();
    update();
});
