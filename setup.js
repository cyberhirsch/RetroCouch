// ================================================================================
// FILE: setup.js
// This powers the new setup.html page UI with RetroCouch-style design.
// ================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Safety check for ControllerManager
    if (typeof controllerManager === 'undefined') {
        console.error('Error: ControllerManager not loaded. Please ensure ControllerManager.js is included before setup.js');
        return;
    }
    
    // Load configuration
    let config = controllerManager.loadConfig();
    if (!config || !config.profiles) {
        console.error('Error: Failed to load controller configuration');
        config = { profiles: {} };
    }
    
    // UI Elements
    const playerSlotsContainer = document.getElementById('playerSlots');
    const profilesListContainer = document.getElementById('profilesList');
    const createProfileBtn = document.getElementById('createProfileBtn');
    const createProfileModal = document.getElementById('createProfileModal');
    const profileNameInput = document.getElementById('profileNameInput');
    const cancelProfileBtn = document.getElementById('cancelProfileBtn');
    const createProfileConfirmBtn = document.getElementById('createProfileConfirmBtn');
    
    // Edit profile modal elements
    const editProfileModal = document.getElementById('editProfileModal');
    const editProfileNameInput = document.getElementById('editProfileNameInput');
    const editDeviceSelect = document.getElementById('editDeviceSelect');
    const editCancelBtn = document.getElementById('editCancelBtn');
    const editSaveBtn = document.getElementById('editSaveBtn');
    const editMappingsContainer = document.getElementById('editMappingsContainer');
    const editProfileTitle = document.getElementById('editProfileTitle');
    
    // Delete confirmation modal elements
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const deleteProfileName = document.getElementById('deleteProfileName');
    const deleteCancelBtn = document.getElementById('deleteCancelBtn');
    const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
    
    // Import elements
    const importProfilesBtn = document.getElementById('importProfilesBtn');
    const importFileInput = document.getElementById('importFileInput');
    
    // Save setup button
    const saveSetupBtn = document.getElementById('saveSetupBtn');
    
    // State for edit mode
    let editingProfile = null;
    let listeningFor = null; // { profile, key, element }
    let deleteTargetProfile = null; // Profile being deleted
    let isDeleting = false; // Prevent multiple delete attempts
    let isCreatingNewProfile = false; // Track if we're creating a new profile
    
    // Control layout for mapping
    const VIRTUAL_GAMEPAD_LAYOUT = [
        'actionSouth', 'actionEast', 'actionWest', 'actionNorth',
        'leftBumper', 'rightBumper', 'leftTrigger', 'rightTrigger',
        'select', 'start', 'leftStickPress', 'rightStickPress',
        'dpadUp', 'dpadDown', 'dpadLeft', 'dpadRight',
        'leftStickX', 'leftStickY', 'rightStickX', 'rightStickY'
    ];
    
    // Control labels for display
    const CONTROL_LABELS = {
        actionSouth: 'South Button (A)',
        actionEast: 'East Button (B)',
        actionWest: 'West Button (X)',
        actionNorth: 'North Button (Y)',
        leftBumper: 'Left Bumper (LB)',
        rightBumper: 'Right Bumper (RB)',
        leftTrigger: 'Left Trigger (LT)',
        rightTrigger: 'Right Trigger (RT)',
        select: 'Select',
        start: 'Start',
        leftStickPress: 'Left Stick Press',
        rightStickPress: 'Right Stick Press',
        dpadUp: 'D-Pad Up',
        dpadDown: 'D-Pad Down',
        dpadLeft: 'D-Pad Left',
        dpadRight: 'D-Pad Right',
        leftStickX: 'Left Stick X',
        leftStickY: 'Left Stick Y',
        rightStickX: 'Right Stick X',
        rightStickY: 'Right Stick Y'
    };
    
    // Player data structure
    let players = [
        { id: 1, name: 'Player 1', profile: '', device: 'None' },
        { id: 2, name: 'Player 2', profile: '', device: 'None' },
        { id: 3, name: 'Player 3', profile: '', device: 'None' },
        { id: 4, name: 'Player 4', profile: '', device: 'None' }
    ];
    
    // Load saved player setup from localStorage
    function loadPlayerSetup() {
        try {
            const savedSetup = localStorage.getItem('gamearcade_player_setup');
            if (savedSetup) {
                const parsedSetup = JSON.parse(savedSetup);
                players = players.map(player => {
                    const savedPlayer = parsedSetup.find(p => p.id === player.id);
                    return savedPlayer ? { ...player, ...savedPlayer } : player;
                });
                console.log('Loaded player setup from localStorage:', players);
            }
        } catch (error) {
            console.error('Error loading player setup:', error);
        }
    }
    
    // Save current player setup to localStorage
    function savePlayerSetup() {
        try {
            localStorage.setItem('gamearcade_player_setup', JSON.stringify(players));
            console.log('Saved player setup to localStorage:', players);
            showNotification('Player setup saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving player setup:', error);
            showNotification('Failed to save setup. Please try again.', 'error');
        }
    }
    
    // Check if player setup exists and is valid
    function hasValidPlayerSetup() {
        try {
            const savedSetup = localStorage.getItem('gamearcade_player_setup');
            if (!savedSetup) return false;
            
            const parsedSetup = JSON.parse(savedSetup);
            // Check if at least one player has a profile assigned
            return parsedSetup.some(player => player.profile && player.profile !== '');
        } catch (error) {
            console.error('Error checking player setup:', error);
            return false;
        }
    }
    
    // Get current player setup for API access
    function getCurrentPlayerSetup() {
        try {
            const savedSetup = localStorage.getItem('gamearcade_player_setup');
            if (savedSetup) {
                return JSON.parse(savedSetup);
            }
            return players; // Return current unsaved setup as fallback
        } catch (error) {
            console.error('Error getting player setup:', error);
            return players;
        }
    }
    
    // Expose setup functions globally for game access
    window.GameArcadeSetup = {
        getPlayerSetup: getCurrentPlayerSetup,
        hasValidSetup: hasValidPlayerSetup,
        saveSetup: savePlayerSetup,
        loadSetup: loadPlayerSetup
    };
    
    // Load saved setup on initialization
    loadPlayerSetup();
    
    console.log('Setup initialized with', Object.keys(config.profiles).length, 'profiles');
    
    // --- UI Generation Functions ---
    
    function generatePlayerSlots() {
        playerSlotsContainer.innerHTML = '';
        
        players.forEach((player, index) => {
            const playerSlot = document.createElement('div');
            playerSlot.className = 'player-slot';
            playerSlot.innerHTML = `
                <div class="player-slot-header">
                    <div class="player-number">${player.id}</div>
                    <input type="text" class="player-name-input" value="${player.name}" 
                           data-player-id="${player.id}" placeholder="Enter player name">
                </div>
                <div class="player-controls">
                    <div class="control-group">
                        <label class="control-label">Controller Profile</label>
                        <select class="control-select" data-player-id="${player.id}" data-control-type="profile">
                            <option value="">No Profile</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Input Device</label>
                        <select class="control-select" data-player-id="${player.id}" data-control-type="device">
                            <!-- Options will be populated dynamically -->
                        </select>
                    </div>
                </div>
            `;
            playerSlotsContainer.appendChild(playerSlot);
        });
        
        // Populate device dropdowns with connected devices
        populateDeviceDropdowns();
        populateProfileSelectors();
    }

    function populateDeviceDropdowns() {
        // Get available devices from ControllerManager
        const deviceOptions = controllerManager.getDeviceOptions();
        
        // Update all device dropdowns
        const deviceSelects = document.querySelectorAll('select[data-control-type="device"]');
        
        deviceSelects.forEach(select => {
            // Clear existing options
            select.innerHTML = '<option value="None">None</option>';
            
            // Add available devices
            deviceOptions.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.label;
                select.appendChild(optionElement);
            });
        });
    }

    function populateEditDeviceSelect() {
        // Get available devices from ControllerManager
        const deviceOptions = controllerManager.getDeviceOptions();
        
        // Clear existing options
        editDeviceSelect.innerHTML = '';
        
        // Add available devices
        deviceOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            editDeviceSelect.appendChild(optionElement);
        });
    }
    
    function generateProfilesList() {
        profilesListContainer.innerHTML = '';
        
        const profileNames = Object.keys(config.profiles);
        
        // Separate default and custom profiles
        const defaultProfiles = profileNames.filter(name => name === 'Default (Keyboard)');
        const customProfiles = profileNames.filter(name => name !== 'Default (Keyboard)');
        
        // Add default profiles first
        defaultProfiles.forEach(name => {
            const profileItem = createProfileItem(name, true);
            profilesListContainer.appendChild(profileItem);
        });
        
        // Add custom profiles
        customProfiles.forEach(name => {
            const profileItem = createProfileItem(name, false);
            profilesListContainer.appendChild(profileItem);
        });
        
        // Update profile selectors in player slots
        populateProfileSelectors();
    }
    
    function createProfileItem(profileName, isDefault) {
        const profileItem = document.createElement('div');
        profileItem.className = `profile-item ${isDefault ? 'default' : ''}`;
        profileItem.innerHTML = `
            <div class="profile-info">
                <div class="profile-name">${profileName}</div>
                <div class="profile-type">${isDefault ? 'Default' : 'Custom'}</div>
            </div>
            <div class="profile-actions">
                ${isDefault ? 
                    '<div class="default-badge">Default</div>' : 
                    `
                        <div class="profile-item-actions">
                            <button class="profile-btn" data-profile="${profileName}" data-action="export" title="Export Profile">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="action-btn" data-profile="${profileName}" data-action="edit" title="Edit Profile">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn danger" data-profile="${profileName}" data-action="delete" title="Delete Profile">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `
                }
            </div>
        `;
        return profileItem;
    }
    
    function populateProfileSelectors() {
        const profileSelectors = document.querySelectorAll('select[data-control-type="profile"]');
        const profileNames = Object.keys(config.profiles);
        
        profileSelectors.forEach(selector => {
            const currentValue = selector.value;
            selector.innerHTML = '<option value="">No Profile</option>';
            
            profileNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                selector.appendChild(option);
            });
            
            // Restore previous selection if it still exists
            if (profileNames.includes(currentValue)) {
                selector.value = currentValue;
            }
        });
    }
    
    // --- Event Handlers ---
    
    function showCreateProfileModal() {
        createProfileModal.classList.add('active');
        profileNameInput.value = '';
        profileNameInput.focus();
    }
    
    function hideCreateProfileModal() {
        createProfileModal.classList.remove('active');
    }
    
    function handleCreateProfile() {
        const profileName = profileNameInput.value.trim();
        
        if (!profileName) {
            showNotification('Profile name cannot be empty.', 'error');
            return;
        }
        
        // Check if profile name already exists
        if (config.profiles[profileName]) {
            showNotification('A profile with this name already exists.', 'error');
            return;
        }
        
        // Create new profile as copy of default keyboard profile
        const defaultProfile = config.profiles['Default (Keyboard)'];
        if (!defaultProfile) {
            showNotification('Default keyboard profile not found.', 'error');
            return;
        }
        
        config.profiles[profileName] = { ...defaultProfile };
        controllerManager.saveConfig(config);
        
        generateProfilesList();
        hideCreateProfileModal();
        showNotification(`Profile "${profileName}" created successfully!`, 'success');
    }
    
    function handleProfileAction(profileName, action) {
        if (action === 'edit') {
            showEditProfileModal(profileName);
        } else if (action === 'delete') {
            showDeleteConfirmModal(profileName);
        } else if (action === 'export') {
            exportSingleProfile(profileName);
        }
    }
    
    function exportSingleProfile(profileName) {
        try {
            const profile = config.profiles[profileName];
            if (!profile) {
                showNotification('Profile not found.', 'error');
                return;
            }
            
            // Create export data for single profile
            const exportData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                profileName: profileName,
                profile: profile
            };
            
            // Convert to JSON and download
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${profileName.replace(/[^a-zA-Z0-9]/g, '-')}-profile.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification(`Profile "${profileName}" exported successfully!`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            showNotification('Failed to export profile. Please try again.', 'error');
        }
    }
    
    function importSingleProfile(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const importData = JSON.parse(e.target.result);
                
                // Validate import data structure
                if (!importData.profile || !importData.profileName) {
                    throw new Error('Invalid profile file format');
                }
                
                const profileName = importData.profileName.trim();
                const profile = importData.profile;
                
                if (!profileName) {
                    throw new Error('Profile name is required');
                }
                
                let finalName = profileName;
                let counter = 1;
                
                // Handle duplicate names
                while (config.profiles[finalName]) {
                    finalName = `${profileName} (${counter})`;
                    counter++;
                }
                
                // Add the profile
                config.profiles[finalName] = profile;
                controllerManager.saveConfig(config);
                
                // Update UI
                generateProfilesList();
                
                const message = finalName !== profileName ? 
                    `Profile imported as "${finalName}"` : 
                    `Profile "${finalName}" imported successfully!`;
                showNotification(message, 'success');
                
            } catch (error) {
                console.error('Import error:', error);
                showNotification('Failed to import profile. Please check the file format.', 'error');
            }
        };
        
        reader.onerror = function() {
            showNotification('Failed to read the file. Please try again.', 'error');
        };
        
        reader.readAsText(file);
    }
    
    function showDeleteConfirmModal(profileName) {
        deleteTargetProfile = profileName;
        deleteProfileName.textContent = `"${profileName}"`;
        deleteConfirmBtn.disabled = false;
        deleteConfirmBtn.textContent = 'Delete';
        deleteConfirmModal.classList.add('active');
    }
    
    function hideDeleteConfirmModal() {
        deleteConfirmModal.classList.remove('active');
        deleteTargetProfile = null;
    }
    
    function handleDeleteConfirm() {
        if (isDeleting || !deleteTargetProfile || !config.profiles[deleteTargetProfile]) {
            return;
        }
        
        isDeleting = true;
        deleteConfirmBtn.disabled = true;
        deleteConfirmBtn.textContent = 'Deleting...';
        
        try {
            delete config.profiles[deleteTargetProfile];
            controllerManager.saveConfig(config);
            generateProfilesList();
            hideDeleteConfirmModal();
            showNotification(`Profile "${deleteTargetProfile}" deleted successfully!`, 'success');
        } catch (error) {
            console.error('Error deleting profile:', error);
            showNotification('Failed to delete profile. Please try again.', 'error');
        } finally {
            isDeleting = false;
            deleteConfirmBtn.disabled = false;
            deleteConfirmBtn.textContent = 'Delete';
        }
    }
    
    function showEditProfileModal(profileName, isNewProfile = false) {
        isCreatingNewProfile = isNewProfile; // Set the flag
        
        if (!isNewProfile && !config.profiles[profileName]) {
            showNotification('Profile not found.', 'error');
            return;
        }
        
        if (isNewProfile) {
            // Create a new empty profile for editing
            const defaultProfile = config.profiles['Default (Keyboard)'];
            editingProfile = { ...defaultProfile };
            editProfileNameInput.value = profileName || '';
            editProfileTitle.textContent = 'Edit Profile: New Profile';
            editDeviceSelect.disabled = false;
            populateEditDeviceSelect();
            editDeviceSelect.value = 'keyboard';
        } else {
            editingProfile = { ...config.profiles[profileName] };
            editProfileNameInput.value = profileName;
            editProfileTitle.textContent = `Edit Profile: ${profileName}`;
            
            // Set device selection based on profile type
            const profile = config.profiles[profileName];
            if (profileName === 'Default (Keyboard)') {
                populateEditDeviceSelect();
                editDeviceSelect.value = 'keyboard';
                editDeviceSelect.disabled = true; // Can't change device type for default keyboard profile
            } else {
                editDeviceSelect.disabled = false;
                populateEditDeviceSelect();
                // Try to detect device type from existing mappings
                const hasKeyboardMappings = Object.values(profile).some(value => 
                    typeof value === 'string' && value.startsWith('Key')
                );
                editDeviceSelect.value = hasKeyboardMappings ? 'keyboard' : 'gamepad';
            }
        }
        
        // Generate mappings
        generateEditMappings();
        editProfileModal.classList.add('active');
        
        // Focus on name input
        setTimeout(() => editProfileNameInput.focus(), 300);
    }
    
    function hideEditProfileModal() {
        // Clear listening state
        if (listeningFor) {
            const button = document.querySelector(`[data-key="${listeningFor.key}"].mapping-button`);
            if (button) {
                button.classList.remove('listening');
                button.textContent = formatKeyName(editingProfile[listeningFor.key]) || 'Not Assigned';
            }
            listeningFor = null;
        }
        
        editProfileModal.classList.remove('active');
        editingProfile = null;
        isCreatingNewProfile = false; // Reset flag
    }
    
    function generateEditMappings() {
        editMappingsContainer.innerHTML = '';
        
        VIRTUAL_GAMEPAD_LAYOUT.forEach(controlKey => {
            const mappingItem = document.createElement('div');
            mappingItem.className = 'mapping-item';
            mappingItem.innerHTML = `
                <div class="mapping-label">${CONTROL_LABELS[controlKey] || controlKey}</div>
                <button class="mapping-button ${!editingProfile[controlKey] ? 'unassigned' : ''}" 
                        data-key="${controlKey}">
                    ${formatKeyName(editingProfile[controlKey]) || 'Not Assigned'}
                </button>
            `;
            
            const button = mappingItem.querySelector('.mapping-button');
            button.addEventListener('click', () => startListeningForControl(controlKey));
            
            editMappingsContainer.appendChild(mappingItem);
        });
    }
    
    // Global variables for gamepad polling
    let gamepadPollInterval = null;
    let lastGamepadState = new Map();
    
    function startListeningForControl(controlKey) {
        if (listeningFor) {
            // Cancel current listening
            const button = document.querySelector(`[data-key="${listeningFor.key}"].mapping-button`);
            if (button) {
                button.classList.remove('listening');
                button.textContent = formatKeyName(editingProfile[listeningFor.key]) || 'Not Assigned';
            }
            // Stop previous polling
            stopGamepadPolling();
        }
        
        listeningFor = { controlKey };
        const button = document.querySelector(`[data-key="${controlKey}"].mapping-button`);
        if (button) {
            button.classList.add('listening');
            button.textContent = 'Press any key or button...';
        }
        
        // Get selected device to determine which listener to set up
        const selectedDevice = editDeviceSelect.value;
        
        let keyHandler = null;
        let escapeHandler = null;
        
        // Set up keyboard listener only if keyboard is selected
        if (selectedDevice === 'keyboard') {
            keyHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const keyName = formatKeyName(e.code);
                if (keyName) {
                    editingProfile[controlKey] = keyName;
                    
                    const button = document.querySelector(`[data-key="${controlKey}"].mapping-button`);
                    if (button) {
                        button.classList.remove('listening');
                        button.textContent = keyName;
                        button.classList.remove('unassigned');
                    }
                }
                
                // Clean up
                listeningFor = null;
                document.removeEventListener('keydown', keyHandler, true);
                if (escapeHandler) document.removeEventListener('keydown', escapeHandler, true);
            };
            
            document.addEventListener('keydown', keyHandler, true);
        }
        
        // Set up gamepad polling only if a gamepad is selected
        if (selectedDevice.startsWith('gamepad_')) {
            startGamepadPolling(controlKey, selectedDevice);
        }
        
        // Escape to cancel
        escapeHandler = (e) => {
            if (e.key === 'Escape') {
                cancelListeningForControl(controlKey);
                if (keyHandler) document.removeEventListener('keydown', keyHandler, true);
                stopGamepadPolling();
                document.removeEventListener('keydown', escapeHandler, true);
            }
        };
        document.addEventListener('keydown', escapeHandler, true);
    }
    
    function startGamepadPolling(controlKey, selectedDevice) {
        // Extract gamepad index from value (e.g., "gamepad_0" -> 0)
        const gamepadIndex = parseInt(selectedDevice.split('_')[1]);
        
        // Store initial state
        const gamepads = navigator.getGamepads();
        if (gamepads[gamepadIndex]) {
            lastGamepadState.set(gamepadIndex, gamepads[gamepadIndex].buttons.map(btn => btn.pressed));
        }
        
        // Poll gamepad state every 16ms (60 FPS)
        gamepadPollInterval = setInterval(() => {
            const gamepads = navigator.getGamepads();
            const gamepad = gamepads[gamepadIndex];
            
            if (gamepad) {
                const currentState = gamepad.buttons.map(btn => btn.pressed);
                const prevState = lastGamepadState.get(gamepadIndex) || [];
                
                // Check for button press (was not pressed, now pressed)
                for (let i = 0; i < gamepad.buttons.length; i++) {
                    if (currentState[i] && !prevState[i]) {
                        // Button was just pressed
                        editingProfile[controlKey] = `button_${i}`;
                        
                        const button = document.querySelector(`[data-key="${controlKey}"].mapping-button`);
                        if (button) {
                            button.classList.remove('listening');
                            button.textContent = `button_${i}`;
                            button.classList.remove('unassigned');
                        }
                        
                        // Clean up and stop polling
                        listeningFor = null;
                        stopGamepadPolling();
                        document.removeEventListener('keydown', escapeHandler, true);
                        break;
                    }
                }
                
                // Update last state
                lastGamepadState.set(gamepadIndex, currentState);
            } else {
                // Gamepad disconnected during polling
                listeningFor = null;
                stopGamepadPolling();
                document.removeEventListener('keydown', escapeHandler, true);
                showNotification('Gamepad disconnected during mapping.', 'warning');
            }
        }, 16);
        
        // Escape handler reference for cleanup
        let escapeHandler = null;
    }
    
    function stopGamepadPolling() {
        if (gamepadPollInterval) {
            clearInterval(gamepadPollInterval);
            gamepadPollInterval = null;
        }
        lastGamepadState.clear();
    }
    
    function cancelListeningForControl(controlKey) {
        if (listeningFor) {
            const button = document.querySelector(`[data-key="${controlKey}"].mapping-button`);
            if (button) {
                button.classList.remove('listening');
                button.textContent = formatKeyName(editingProfile[controlKey]) || 'Not Assigned';
            }
            listeningFor = null;
            stopGamepadPolling();
        }
    }
    
    function cancelListeningForControl(controlKey) {
        if (listeningFor) {
            const button = document.querySelector(`[data-key="${controlKey}"].mapping-button`);
            if (button) {
                button.classList.remove('listening');
                button.textContent = formatKeyName(editingProfile[controlKey]) || 'Not Assigned';
            }
            listeningFor = null;
        }
    }
    
    function formatKeyName(keyCode) {
        if (!keyCode) return null;
        
        // Convert KeyX format to readable names
        if (keyCode.startsWith('Key')) {
            return keyCode.substring(3).toUpperCase();
        }
        
        // Convert ArrowX format
        if (keyCode.startsWith('Arrow')) {
            return keyCode.substring(5).toUpperCase();
        }
        
        // Handle special keys
        const specialKeys = {
            'Space': 'SPACE',
            'Enter': 'ENTER',
            'Escape': 'ESC',
            'Tab': 'TAB',
            'ShiftLeft': 'SHIFT',
            'ShiftRight': 'SHIFT',
            'ControlLeft': 'CTRL',
            'ControlRight': 'CTRL',
            'AltLeft': 'ALT',
            'AltRight': 'ALT'
        };
        
        return specialKeys[keyCode] || keyCode;
    }
    
    function handleDeviceSelectionChange() {
        if (!editingProfile) return;
        
        const selectedDevice = editDeviceSelect.value;
        
        // Clear existing mappings when switching device type
        VIRTUAL_GAMEPAD_LAYOUT.forEach(controlKey => {
            delete editingProfile[controlKey];
        });
        
        // Apply default mappings based on device type
        if (selectedDevice === 'keyboard') {
            // Apply default keyboard mappings
            editingProfile.dpadUp = 'KeyW';
            editingProfile.dpadDown = 'KeyS';
            editingProfile.dpadLeft = 'KeyA';
            editingProfile.dpadRight = 'KeyD';
            editingProfile.leftStickX = 'KeyA';
            editingProfile.leftStickY = 'KeyW';
            editingProfile.actionNorth = 'ArrowUp';
            editingProfile.actionSouth = 'ArrowDown';
            editingProfile.actionWest = 'ArrowLeft';
            editingProfile.actionEast = 'ArrowRight';
            editingProfile.leftBumper = 'KeyQ';
            editingProfile.rightBumper = 'KeyE';
            editingProfile.select = 'Tab';
            editingProfile.start = 'Escape';
            editingProfile.leftStickPress = 'KeyX';
            editingProfile.rightStickPress = 'KeyZ';
            editingProfile.leftTrigger = 'ShiftLeft';
            editingProfile.rightTrigger = 'Space';
            editingProfile.rightStickX = 'KeyJ';
            editingProfile.rightStickY = 'KeyI';
        } else if (selectedDevice === 'gamepad') {
            // Apply default gamepad mappings (Xbox/PS4 style)
            editingProfile.dpadUp = 'axis_6_neg'; // D-pad up
            editingProfile.dpadDown = 'axis_6_pos'; // D-pad down
            editingProfile.dpadLeft = 'axis_7_neg'; // D-pad left
            editingProfile.dpadRight = 'axis_7_pos'; // D-pad right
            editingProfile.leftStickX = 'axis_0'; // Left stick X
            editingProfile.leftStickY = 'axis_1'; // Left stick Y
            editingProfile.actionNorth = 'button_1'; // Y
            editingProfile.actionSouth = 'button_0'; // A
            editingProfile.actionWest = 'button_2'; // X
            editingProfile.actionEast = 'button_3'; // B
            editingProfile.leftBumper = 'button_4'; // LB
            editingProfile.rightBumper = 'button_5'; // RB
            editingProfile.select = 'button_6'; // Select/View
            editingProfile.start = 'button_7'; // Start/Menu
            editingProfile.leftStickPress = 'button_8'; // L3
            editingProfile.rightStickPress = 'button_9'; // R3
            editingProfile.leftTrigger = 'axis_4'; // LT (trigger as analog)
            editingProfile.rightTrigger = 'axis_5'; // RT (trigger as analog)
            editingProfile.rightStickX = 'axis_2'; // Right stick X
            editingProfile.rightStickY = 'axis_3'; // Right stick Y
        }
        
        // Regenerate mappings display
        generateEditMappings();
        showNotification(`Switched to ${selectedDevice} mappings. Press any key/button to reassign controls.`, 'info');
    }

    function handleSaveEditProfile() {
        const newProfileName = editProfileNameInput.value.trim();
        
        if (!newProfileName) {
            showNotification('Profile name cannot be empty.', 'error');
            return;
        }
        
        // For creating new profile
        if (isCreatingNewProfile) {
            // Check if profile name already exists
            if (config.profiles[newProfileName]) {
                showNotification('A profile with this name already exists.', 'error');
                return;
            }
            
            // Create new profile
            config.profiles[newProfileName] = { ...editingProfile };
            controllerManager.saveConfig(config);
            
            // Update UI
            generateProfilesList();
            hideEditProfileModal();
            showNotification(`Profile "${newProfileName}" created successfully!`, 'success');
        } 
        // For editing existing profile
        else {
            const currentProfileName = editProfileTitle.textContent.replace('Edit Profile: ', '');
            
            // Check if name changed and new name exists
            if (newProfileName !== currentProfileName && config.profiles[newProfileName]) {
                showNotification('A profile with this name already exists.', 'error');
                return;
            }
            
            // Save changes
            if (newProfileName !== currentProfileName) {
                delete config.profiles[currentProfileName];
            }
            config.profiles[newProfileName] = { ...editingProfile };
            controllerManager.saveConfig(config);
            
            // Update UI
            generateProfilesList();
            hideEditProfileModal();
            showNotification(`Profile "${newProfileName}" saved successfully!`, 'success');
        }
    }
    
    function handlePlayerNameChange(playerId, newName) {
        const player = players.find(p => p.id === playerId);
        if (player) {
            player.name = newName || `Player ${playerId}`;
        }
    }
    
    function handlePlayerControlChange(playerId, controlType, value) {
        const player = players.find(p => p.id === playerId);
        if (player) {
            if (controlType === 'profile') {
                player.profile = value;
            } else if (controlType === 'device') {
                player.device = value;
            }
        }
        console.log('Player', playerId, 'updated:', controlType, '=', value);
    }
    
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--accent-primary)'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-weight: 500;
            z-index: 1001;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // --- Event Listeners ---
    
    // Create profile button - now goes directly to edit modal
    createProfileBtn.addEventListener('click', () => {
        showEditProfileModal('', true); // Empty name for new profile, true = isNewProfile
    });
    
    // Modal controls - kept for backward compatibility but not used
    cancelProfileBtn.addEventListener('click', hideCreateProfileModal);
    createProfileConfirmBtn.addEventListener('click', handleCreateProfile);
    
    // Close modal when clicking overlay
    createProfileModal.addEventListener('click', (e) => {
        if (e.target === createProfileModal) {
            hideCreateProfileModal();
        }
    });
    
    // Edit profile modal controls
    editCancelBtn.addEventListener('click', hideEditProfileModal);
    editSaveBtn.addEventListener('click', handleSaveEditProfile);
    
    // Handle device selection change
    editDeviceSelect.addEventListener('change', handleDeviceSelectionChange);
    
    // Close edit modal when clicking overlay
    editProfileModal.addEventListener('click', (e) => {
        if (e.target === editProfileModal) {
            hideEditProfileModal();
        }
    });
    
    // Delete confirmation modal controls
    deleteCancelBtn.addEventListener('click', hideDeleteConfirmModal);
    deleteConfirmBtn.addEventListener('click', handleDeleteConfirm);
    
    // Close delete confirmation modal when clicking overlay
    deleteConfirmModal.addEventListener('click', (e) => {
        if (e.target === deleteConfirmModal) {
            hideDeleteConfirmModal();
        }
    });
    
    // Handle Enter key in edit profile name input
    editProfileNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSaveEditProfile();
        } else if (e.key === 'Escape') {
            hideEditProfileModal();
        }
    });
    
    // Handle Enter key in profile name input
    profileNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleCreateProfile();
        } else if (e.key === 'Escape') {
            hideCreateProfileModal();
        }
    });
    
    // Profile actions (edit/delete)
    profilesListContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (button) {
            const profileName = button.dataset.profile;
            const action = button.dataset.action;
            handleProfileAction(profileName, action);
        }
    });
    
    // Player name changes
    playerSlotsContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('player-name-input')) {
            const playerId = parseInt(e.target.dataset.playerId);
            handlePlayerNameChange(playerId, e.target.value);
        }
    });
    
    // Player control changes
    playerSlotsContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('control-select')) {
            const playerId = parseInt(e.target.dataset.playerId);
            const controlType = e.target.dataset.controlType;
            handlePlayerControlChange(playerId, controlType, e.target.value);
        }
    });
    
    // --- Initialize UI ---
    
    generatePlayerSlots();
    generateProfilesList();
    
    // Add event listeners for gamepad connection/disconnection
    window.addEventListener('gamepadconnected', () => {
        console.log('Gamepad connected - refreshing device dropdowns');
        populateDeviceDropdowns();
        if (editProfileModal.classList.contains('active')) {
            populateEditDeviceSelect();
        }
    });
    
    window.addEventListener('gamepaddisconnected', () => {
        console.log('Gamepad disconnected - refreshing device dropdowns');
        populateDeviceDropdowns();
        if (editProfileModal.classList.contains('active')) {
            populateEditDeviceSelect();
        }
    });
    
    console.log('Controller setup interface initialized successfully!');
    
    // Import functionality
    importProfilesBtn.addEventListener('click', () => {
        importFileInput.click();
    });
    
    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importSingleProfile(file);
            // Reset input so the same file can be selected again
            importFileInput.value = '';
        }
    });
    
    // Event listeners for save button
    saveSetupBtn.addEventListener('click', savePlayerSetup);
    
    // Welcome notification
    setTimeout(() => {
        showNotification('Controller setup loaded successfully!', 'success');
    }, 500);
});