class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreDisplay1 = document.getElementById('scoreDisplay1');
        this.scoreDisplay2 = document.getElementById('scoreDisplay2');
        this.livesDisplay1 = document.getElementById('livesDisplay1');
        this.livesDisplay2 = document.getElementById('livesDisplay2');
        this.livesIcons1 = document.getElementById('livesIcons1');
        this.livesIcons2 = document.getElementById('livesIcons2');
        this.boostIndicators1 = document.getElementById('boostIndicators1');
        this.boostIndicators2 = document.getElementById('boostIndicators2');
        this.gameOverModal = document.getElementById('gameOverModal');
        this.finalScore1 = document.getElementById('finalScore1');
        this.finalScore2 = document.getElementById('finalScore2');
        this.restartButton = document.getElementById('restartButton');
        this.startScreen = document.getElementById('startScreen');
        this.singlePlayerBtn = document.getElementById('singlePlayerBtn');
        this.multiplayerBtn = document.getElementById('multiplayerBtn');
        this.loadGameBtn = document.getElementById('loadGameBtn');
        this.restartButton = document.getElementById('restartButton');
        this.saveGameStatus = document.getElementById('saveGameStatus');
        this.escapeMenu = document.getElementById('escapeMenu');
        this.escapeMenuTitle = document.getElementById('escapeMenuTitle');
        this.menuResume = document.getElementById('menuResume');
        this.menuSave = document.getElementById('menuSave');
        this.menuLoad = document.getElementById('menuLoad');
        this.menuMainMenu = document.getElementById('menuMainMenu');
        this.saveSlots = document.getElementById('saveSlots');
        this.playerHud2 = document.querySelector('.player-hud.p2');
        
        // Menu state
        this.currentMenuItem = 0;
        this.menuItems = [];
        this.menuOpen = false;
        this.awaitingSlot = false;
        this.currentSlotIndex = 0;
        this.originalTitle = 'PAUSE MENU';
        this.originalResumeText = 'RESUME GAME';
        
        // --- GAMEPAD SUPPORT SETUP ---
        this.gamepads = {};
        this.gamepadThreshold = 0.4; // Axis deadzone
        this.gamepadButtonStates = [{}, {}]; // Track button presses for up to 2 players

        // Boost types configuration
        this.boostTypes = {
            rapidFire: { color: '#FF9500', duration: 10000 },
            speed: { color: '#00FF7F', duration: 8000 },
            shield: { color: '#3498DB', duration: 12000 },
            doublePoints: { color: '#FFD700', duration: 15000 },
            biggerBullets: { color: '#E74C3C', duration: 10000 },
            invincibility: { color: '#9B59B6', duration: 6000 }
        };
        
        this.setupCanvas();
        this.setupEventListeners();
        this.setupGamepadListeners(); // Initialize gamepad listeners
        this.updateSaveGameStatus();
        this.showStartScreen();
        this.gameLoop();
    }
    
    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
    }

    setupGamepadListeners() {
        window.addEventListener('gamepadconnected', (e) => {
            console.log(`Gamepad connected at index ${e.gamepad.index}: ${e.gamepad.id}`);
            this.gamepads[e.gamepad.index] = e.gamepad;
        });

        window.addEventListener('gamepaddisconnected', (e) => {
            console.log(`Gamepad disconnected from index ${e.gamepad.index}: ${e.gamepad.id}`);
            delete this.gamepads[e.gamepad.index];
            // Clear button states for the disconnected controller
            if (this.gamepadButtonStates[e.gamepad.index]) {
                this.gamepadButtonStates[e.gamepad.index] = {};
            }
        });
    }
    
    setupEventListeners() {
        // Global keyboard handling
        document.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
        
        // Menu item click handlers (for accessibility)
        this.singlePlayerBtn.addEventListener('click', () => this.selectMenuItem(0));
        this.multiplayerBtn.addEventListener('click', () => this.selectMenuItem(1));
        this.loadGameBtn.addEventListener('click', () => this.selectMenuItem(2));
        this.restartButton.addEventListener('click', () => this.selectMenuItem(0));
        
        // Menu item click handlers for escape menu
        this.menuResume.addEventListener('click', () => this.executeMenuAction(0));
        this.menuSave.addEventListener('click', () => this.executeMenuAction(1));
        this.menuLoad.addEventListener('click', () => this.executeMenuAction(2));
        this.menuMainMenu.addEventListener('click', () => this.executeMenuAction(3));
        
        // Save slot click handlers
        const slots = this.saveSlots.querySelectorAll('.save-slot');
        slots.forEach((slot, index) => {
            slot.addEventListener('click', () => {
                this.currentSlotIndex = index;
                this.executeSlotAction(index);
            });
        });
        
        // Dual player controls
        this.keys1 = { left: false, right: false, up: false, shoot: false };
        this.keys2 = { left: false, right: false, up: false, shoot: false };
        
        // Keyup event handling
        document.addEventListener('keyup', (e) => {
            if (!this.gameRunning) return;
            
            // Player 1: WASD + Space
            switch(e.code) {
                case 'KeyA': this.keys1.left = false; e.preventDefault(); break;
                case 'KeyD': this.keys1.right = false; e.preventDefault(); break;
                case 'KeyW': this.keys1.up = false; e.preventDefault(); break;
                case 'Space': this.keys1.shoot = false; e.preventDefault(); break;
            }
            
            // Player 2: Arrow keys + Enter
            if (this.playerCount === 2) {
                switch(e.code) {
                    case 'ArrowLeft': this.keys2.left = false; e.preventDefault(); break;
                    case 'ArrowRight': this.keys2.right = false; e.preventDefault(); break;
                    case 'ArrowUp': this.keys2.up = false; e.preventDefault(); break;
                    case 'Enter': this.keys2.shoot = false; e.preventDefault(); break;
                }
            }
        });
    }

    pollGamepads() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        if (!gamepads) return;

        for (let i = 0; i < gamepads.length; i++) {
            const gp = gamepads[i];
            if (!gp || i > 1) continue; // Only process first two controllers

            const wasButtonPressed = (buttonIndex) => {
                const pressed = gp.buttons[buttonIndex]?.pressed;
                const wasPressed = this.gamepadButtonStates[i]?.[buttonIndex];
                if (this.gamepadButtonStates[i]) {
                    this.gamepadButtonStates[i][buttonIndex] = pressed;
                }
                return pressed && !wasPressed;
            };

            // --- MENU CONTROLS (Player 1's controller navigates) ---
            if (i === 0) {
                 if (wasButtonPressed(9)) { // 'Start' Button
                    if (this.menuOpen) this.closeEscapeMenu();
                    else if (this.gameRunning) this.showEscapeMenu();
                }

                if (this.menuOpen || !this.gameRunning || this.awaitingSlot) {
                    if (wasButtonPressed(12)) { // D-Pad Up
                        this.handleKeydown({ code: 'ArrowUp', preventDefault: () => {} });
                    }
                    if (wasButtonPressed(13)) { // D-Pad Down
                        this.handleKeydown({ code: 'ArrowDown', preventDefault: () => {} });
                    }
                    if (wasButtonPressed(0)) { // 'A' or 'Cross' Button (Confirm)
                        this.handleKeydown({ code: 'Enter', preventDefault: () => {} });
                    }
                }
            }

            // --- IN-GAME PLAYER CONTROLS ---
            if (this.gameRunning && !this.menuOpen && !this.awaitingSlot) {
                const keys = (i === 0) ? this.keys1 : this.keys2;
                if (!keys || (i === 1 && this.playerCount < 2)) continue;
                
                const horizontalAxis = gp.axes[0] || 0;
                keys.left = horizontalAxis < -this.gamepadThreshold || gp.buttons[14]?.pressed;
                keys.right = horizontalAxis > this.gamepadThreshold || gp.buttons[15]?.pressed;

                const verticalAxis = gp.axes[1] || 0;
                keys.up = verticalAxis < -this.gamepadThreshold || gp.buttons[12]?.pressed;

                keys.shoot = gp.buttons[0]?.pressed || gp.buttons[7]?.pressed;
            } else if (!this.gameRunning) {
                // Reset player controls if not in-game
                this.keys1 = { left: false, right: false, up: false, shoot: false };
                this.keys2 = { left: false, right: false, up: false, shoot: false };
            }
        }
    }
    
    handleKeydown(e) {
        // Handle escape menu
        if (e.code === 'Escape') {
            e.preventDefault();
            if (this.menuOpen) this.closeEscapeMenu();
            else if (this.gameRunning) this.showEscapeMenu();
            return;
        }
        
        // Menu navigation
        if (this.menuOpen) {
            e.preventDefault();
            if(this.awaitingSlot) this.handleSlotNavigation(e);
            else this.handleMenuKeydown(e);
            return;
        }
        
        // Start screen navigation
        if (!this.gameRunning) {
            if (e.code === 'Enter' || e.code === 'Space') {
                e.preventDefault(); this.activateCurrentMenuItem(); return;
            }
            if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowDown' || e.code === 'KeyS') {
                e.preventDefault(); this.navigateStartScreen(e.code === 'ArrowUp' || e.code === 'KeyW' ? -1 : 1); return;
            }
        }
        
        // Prevent game controls when menu is active
        if (!this.gameRunning) return;
        
        // Player 1: WASD + Space
        switch(e.code) {
            case 'KeyA': this.keys1.left = true; e.preventDefault(); break;
            case 'KeyD': this.keys1.right = true; e.preventDefault(); break;
            case 'KeyW': this.keys1.up = true; e.preventDefault(); break;
            case 'Space': this.keys1.shoot = true; e.preventDefault(); break;
        }
        
        // Player 2: Arrow keys + Enter
        if (this.playerCount === 2) {
            switch(e.code) {
                case 'ArrowLeft': this.keys2.left = true; e.preventDefault(); break;
                case 'ArrowRight': this.keys2.right = true; e.preventDefault(); break;
                case 'ArrowUp': this.keys2.up = true; e.preventDefault(); break;
                case 'Enter': this.keys2.shoot = true; e.preventDefault(); break;
            }
        }
    }

    // ... (The rest of your Game class code is identical to what you provided) ...
    // ... I will omit it here for brevity, but you should paste the rest of your original file's content below this line.
    
    showStartScreen() {
        this.startScreen.classList.remove('hidden');
        this.gameOverModal.classList.remove('show');
        this.gameRunning = false;
        this.updateSaveGameStatus();
        this.startScreenCurrentItem = 0;
        this.updateStartScreenSelection();
    }
    
    // Menu navigation methods
    showEscapeMenu() {
        this.menuOpen = true;
        this.escapeMenu.classList.add('show');
        this.currentMenuItem = 0;
        this.updateMenuSelection();
    }
    
    closeEscapeMenu() {
        this.menuOpen = false;
        this.escapeMenu.classList.remove('show');
        this.hideSaveSlots();
    }
    
    updateMenuSelection() {
        const items = [this.menuResume, this.menuSave, this.menuLoad, this.menuMainMenu];
        items.forEach((item, index) => {
            if (index === this.currentMenuItem) {
                item.classList.add('selected');
                item.focus();
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    handleMenuKeydown(e) {
        switch(e.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.currentMenuItem = (this.currentMenuItem - 1 + 4) % 4;
                this.updateMenuSelection();
                e.preventDefault();
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.currentMenuItem = (this.currentMenuItem + 1) % 4;
                this.updateMenuSelection();
                e.preventDefault();
                break;
            case 'Enter':
            case 'Space':
                this.executeMenuAction(this.currentMenuItem);
                e.preventDefault();
                break;
        }
    }
    
    executeMenuAction(actionIndex) {
        switch(actionIndex) {
            case 0: // Resume
                this.closeEscapeMenu();
                break;
            case 1: // Save
                this.showSaveSlots('save');
                break;
            case 2: // Load
                this.showSaveSlots('load');
                break;
            case 3: // Main Menu
                this.closeEscapeMenu();
                this.showStartScreen();
                break;
        }
    }
    
    showSaveSlots(action) {
        this.awaitingSlot = action;
        this.saveSlots.classList.add('show');
        this.currentSlotIndex = 0;
        this.updateSaveSlotsDisplay();
        this.updateSaveSlotSelection();
        
        this.originalTitle = this.escapeMenuTitle.textContent;
        this.originalResumeText = this.menuResume.textContent;
        
        this.escapeMenuTitle.textContent = action === 'save' ? 'SAVE GAME' : 'LOAD GAME';
        
        [this.menuResume, this.menuSave, this.menuLoad, this.menuMainMenu].forEach(item => {
            item.style.display = 'none';
        });
    }
    
    hideSaveSlots() {
        this.awaitingSlot = false;
        this.saveSlots.classList.remove('show');
        
        if (this.originalTitle) {
            this.escapeMenuTitle.textContent = this.originalTitle;
        }
        if (this.originalResumeText) {
            this.menuResume.textContent = this.originalResumeText;
        }
        
        [this.menuResume, this.menuSave, this.menuLoad, this.menuMainMenu].forEach(item => {
            item.style.display = 'block';
        });
    }
    
    handleSlotNavigation(e) {
        const slots = this.saveSlots.querySelectorAll('.save-slot');
        switch(e.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.currentSlotIndex = (this.currentSlotIndex - 1 + slots.length) % slots.length;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.currentSlotIndex = (this.currentSlotIndex + 1) % slots.length;
                break;
            case 'Enter':
            case 'Space':
                this.executeSlotAction(this.currentSlotIndex);
                break;
        }
        this.updateSaveSlotSelection();
    }
    
    updateSaveSlotsDisplay() {
        for (let i = 0; i < 6; i++) {
            const slot = this.saveSlots.querySelector(`[data-slot="${i}"]`);
            if (!slot) continue;
            const statusDiv = slot.querySelector('.slot-status');
            const saveData = localStorage.getItem(`asteroidsSaveSlot_${i}`);
            
            if (saveData) {
                const gameState = JSON.parse(saveData);
                const date = new Date(gameState.timestamp);
                statusDiv.textContent = `Saved ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                statusDiv.classList.add('has-save');
            } else {
                statusDiv.textContent = 'Empty';
                statusDiv.classList.remove('has-save');
            }
        }
    }
    
    updateSaveSlotSelection() {
        const slots = this.saveSlots.querySelectorAll('.save-slot');
        slots.forEach((slot, index) => {
            if (index === this.currentSlotIndex) {
                slot.classList.add('selected');
                slot.focus();
            } else {
                slot.classList.remove('selected');
            }
        });
    }
    
    executeSlotAction(slotIndex) {
        if (this.awaitingSlot === 'save') {
            this.saveGameToSlot(slotIndex);
        } else if (this.awaitingSlot === 'load') {
            this.loadGameFromSlot(slotIndex);
        }
    }
    
    saveGameToSlot(slotIndex) {
        if (!this.gameRunning || !this.players || this.players.length === 0) {
            this.showSaveGameStatus('❌ No active game to save!');
            this.hideSaveSlots();
            return;
        }
        
        const gameState = {
            playerCount: this.playerCount,
            scores: this.scores,
            wave: this.wave,
            timestamp: Date.now(),
            players: this.players.map(p => p.serialize()),
            asteroids: this.asteroids.map(a => a.serialize())
        };
        
        try {
            localStorage.setItem(`asteroidsSaveSlot_${slotIndex}`, JSON.stringify(gameState));
            this.showSaveGameStatus(`✅ Game saved to Slot ${slotIndex + 1}!`);
            this.hideSaveSlots();
            this.closeEscapeMenu();
        } catch (error) {
            this.showSaveGameStatus(`❌ Save failed: ${error.message}`);
            this.hideSaveSlots();
        }
    }
    
    loadGameFromSlot(slotIndex) {
        const savedGame = localStorage.getItem(`asteroidsSaveSlot_${slotIndex}`);
        if (!savedGame) {
            this.showSaveGameStatus(`❌ Slot ${slotIndex + 1} is empty`);
            return;
        }
        
        const gameState = JSON.parse(savedGame);
        this.startScreen.classList.add('hidden');
        
        this.playerCount = gameState.playerCount;
        this.scores = gameState.scores;
        this.wave = gameState.wave;
        
        this.players = gameState.players.map(playerData => Player.deserialize(playerData));
        this.asteroids = gameState.asteroids.map(asteroidData => Asteroid.deserialize(asteroidData));
        
        this.bullets = [];
        this.explosions = [];
        this.boostNotifications = [];
        
        if (this.playerCount === 1) {
            this.playerHud2.classList.remove('alive');
            this.playerHud2.classList.add('dead');
        } else {
            this.playerHud2.classList.remove('dead');
            this.playerHud2.classList.add('alive');
        }
        
        this.lastShootTimes = new Array(this.playerCount).fill(0);
        this.shootCooldown = 150;
        this.gameRunning = true;
        
        this.hideGameOver();
        this.updateScores();
        this.updateLives();
        
        this.boostIndicators1.innerHTML = '';
        this.boostIndicators2.innerHTML = '';
        this.players.forEach((player, index) => {
            player.boosts.forEach(boost => this.addBoostIndicator(index, boost.type));
        });
        
        this.hideSaveSlots();
        this.closeEscapeMenu();
        this.showSaveGameStatus(`✅ Loaded game from Slot ${slotIndex + 1}!`);
    }
    
    navigateStartScreen(direction) {
        this.startScreenCurrentItem = (this.startScreenCurrentItem + direction + 3) % 3;
        this.updateStartScreenSelection();
    }
    
    updateStartScreenSelection() {
        const items = [this.singlePlayerBtn, this.multiplayerBtn, this.loadGameBtn];
        items.forEach((item, index) => {
            if (index === this.startScreenCurrentItem) {
                item.classList.add('selected');
                item.focus();
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    activateCurrentMenuItem() {
        if (this.startScreenCurrentItem === 0) this.startGame(1);
        else if (this.startScreenCurrentItem === 1) this.startGame(2);
        else if (this.startScreenCurrentItem === 2) this.loadGame();
    }
    
    selectMenuItem(index) {
        this.startScreenCurrentItem = index;
        this.updateStartScreenSelection();
        this.activateCurrentMenuItem();
    }
    
    startGame(playerCount) {
        this.playerCount = playerCount;
        this.startScreen.classList.add('hidden');
        
        this.players = [];
        const positions = [
            { x: this.canvas.width / 2 - 100, y: this.canvas.height / 2 },
            { x: this.canvas.width / 2 + 100, y: this.canvas.height / 2 }
        ];
        
        for (let i = 0; i < playerCount; i++) {
            this.players.push(new Player(i + 1, positions[i].x, positions[i].y, i === 0 ? '#00FFFF' : '#FF00FF', 6));
        }
        
        if (playerCount === 1) {
            this.playerHud2.classList.remove('alive');
            this.playerHud2.classList.add('dead');
        } else {
            this.playerHud2.classList.remove('dead');
            this.playerHud2.classList.add('alive');
        }
        
        this.asteroids = [];
        this.bullets = [];
        this.explosions = [];
        this.boostNotifications = [];
        this.scores = new Array(playerCount).fill(0);
        this.gameRunning = true;
        this.lastShootTimes = new Array(playerCount).fill(0);
        this.shootCooldown = 150;
        this.wave = 1;
        
        this.hideGameOver();
        this.spawnAsteroids();
        this.updateScores();
        this.updateLives();
    }
    
    spawnAsteroids() {
        const asteroidCount = 3 + this.wave;
        for (let i = 0; i < asteroidCount; i++) {
            let x, y;
            do {
                x = Math.random() * this.canvas.width;
                y = Math.random() * this.canvas.height;
            } while (this.players.some(p => this.getDistance(x, y, p.x, p.y) < 200));
            
            const hasBoost = Math.random() < 0.2;
            const boostType = hasBoost ? this.getRandomBoostType() : null;
            this.asteroids.push(new Asteroid(x, y, 3, boostType));
        }
    }
    
    getRandomBoostType() {
        const boostKeys = Object.keys(this.boostTypes);
        return boostKeys[Math.floor(Math.random() * boostKeys.length)];
    }
    
    getDistance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
    
    updateScores() {
        this.scoreDisplay1.textContent = this.scores[0] || 0;
        if (this.playerCount === 2) {
            this.scoreDisplay2.textContent = this.scores[1] || 0;
        }
    }
    
    updateLives() {
        if (this.players[0]) {
            this.livesDisplay1.textContent = this.players[0].lives;
            this.updateLivesIcons(1, this.players[0].lives);
        }
        if (this.playerCount === 2 && this.players[1]) {
            this.livesDisplay2.textContent = this.players[1].lives;
            this.updateLivesIcons(2, this.players[1].lives);
        }
    }
    
    updateLivesIcons(playerIndex, lives) {
        const iconsContainer = playerIndex === 1 ? this.livesIcons1 : this.livesIcons2;
        const icons = iconsContainer.querySelectorAll('.life-icon');
        icons.forEach((icon, index) => {
            icon.classList.toggle('lost', index >= lives);
        });
    }
    
    showGameOver() {
        this.gameRunning = false;
        this.finalScore1.textContent = this.scores[0] || 0;
        if (this.playerCount === 2) {
            this.finalScore2.textContent = this.scores[1] || 0;
            this.finalScore2.parentElement.style.display = 'block';
        } else {
            this.finalScore2.parentElement.style.display = 'none';
        }
        this.gameOverModal.classList.add('show');
    }
    
    hideGameOver() {
        this.gameOverModal.classList.remove('show');
    }
    
    gameLoop() {
        this.pollGamepads(); // Poll for gamepad input every frame

        if (this.gameRunning && !this.menuOpen) {
            this.update();
        }
        this.render(); // Render even when paused
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        const currentTime = Date.now();
        
        this.players.forEach((player, i) => {
            if (player.lives <= 0) return;
            const keys = i === 0 ? this.keys1 : this.keys2;
            player.update(keys, this.canvas.width, this.canvas.height);
            this.updatePlayerBoosts(player, i, currentTime);
            if (keys.shoot && currentTime - this.lastShootTimes[i] > this.getShootCooldown(player)) {
                this.shoot(i);
                this.lastShootTimes[i] = currentTime;
            }
        });
        
        this.bullets.forEach(b => b.update());
        this.bullets = this.bullets.filter(b => b.life > 0);
        
        this.asteroids.forEach(a => a.update(this.canvas.width, this.canvas.height));
        
        this.explosions.forEach(e => e.update());
        this.explosions = this.explosions.filter(e => e.life > 0);
        
        this.boostNotifications.forEach(n => n.update());
        this.boostNotifications = this.boostNotifications.filter(n => n.life > 0);
        
        this.checkCollisions();
        
        if (this.players.every(p => p.lives <= 0)) {
            this.showGameOver();
        }
        
        if (this.asteroids.length === 0) {
            this.wave++;
            this.spawnAsteroids();
        }
    }
    
    getShootCooldown(player) {
        return player.hasBoost('rapidFire') ? 50 : this.shootCooldown;
    }
    
    updatePlayerBoosts(player, playerIndex, currentTime) {
        const expiredBoosts = player.boosts.filter(boost => currentTime >= boost.endTime);
        expiredBoosts.forEach(boost => this.removeBoostIndicator(playerIndex, boost.type));
        player.boosts = player.boosts.filter(boost => currentTime < boost.endTime);
        this.updateBoostIndicators(player, playerIndex, currentTime);
    }
    
    updateBoostIndicators(player, playerIndex, currentTime) {
        const container = playerIndex === 0 ? this.boostIndicators1 : this.boostIndicators2;
        player.boosts.forEach(boost => {
            const indicator = container.querySelector(`[data-boost="${boost.type}"]`);
            if (indicator) {
                const timerBar = indicator.querySelector('.boost-timer-bar');
                const timeLeft = boost.endTime - currentTime;
                const percentage = (timeLeft / boost.duration) * 100;
                timerBar.style.width = `${Math.max(0, percentage)}%`;
            }
        });
    }
    
    addBoostIndicator(playerIndex, boostType) {
        const container = playerIndex === 0 ? this.boostIndicators1 : this.boostIndicators2;
        if (container.querySelector(`[data-boost="${boostType}"]`)) return;
        
        const boostConfig = this.boostTypes[boostType];
        const icon = this.getBoostIcon(boostType);
        const indicator = document.createElement('div');
        indicator.className = 'boost-indicator';
        indicator.dataset.boost = boostType;
        indicator.innerHTML = `
            <div class="boost-icon" style="font-size: 20px;">${icon}</div>
            <div class="boost-timer"><div class="boost-timer-bar" style="background: ${boostConfig.color};"></div></div>
        `;
        container.appendChild(indicator);
    }
    
    removeBoostIndicator(playerIndex, boostType) {
        const container = playerIndex === 0 ? this.boostIndicators1 : this.boostIndicators2;
        const indicator = container.querySelector(`[data-boost="${boostType}"]`);
        if (indicator) {
            indicator.classList.add('disappearing');
            setTimeout(() => indicator.remove(), 250);
        }
    }
    
    getBoostIcon(boostType) {
        const icons = {
            rapidFire: '⚡', speed: '🚀', shield: '🛡️',
            doublePoints: '💰', biggerBullets: '💥', invincibility: '✨'
        };
        return icons[boostType] || '⭐';
    }
    
    shoot(playerIndex) {
        const player = this.players[playerIndex];
        const bullet = new Bullet(
            player.x + Math.cos(player.angle) * 20,
            player.y + Math.sin(player.angle) * 20,
            player.angle, player.vx, player.vy, playerIndex, player.hasBoost('biggerBullets')
        );
        this.bullets.push(bullet);
    }
    
    checkCollisions() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                const bullet = this.bullets[i];
                const asteroid = this.asteroids[j];
                if (this.getDistance(bullet.x, bullet.y, asteroid.x, asteroid.y) < asteroid.radius + bullet.radius) {
                    this.bullets.splice(i, 1);
                    this.asteroidHit(j, bullet.playerIndex);
                    break;
                }
            }
        }
        
        this.players.forEach((player, i) => {
            if (player.lives <= 0 || player.hasBoost('invincibility') || player.hasBoost('shield')) return;
            for (const asteroid of this.asteroids) {
                if (this.getDistance(player.x, player.y, asteroid.x, asteroid.y) < player.radius + asteroid.radius * 0.8) {
                    this.playerHit(i);
                    break;
                }
            }
        });
        
        if (this.playerCount === 2) this.checkPlayerCollisions();
    }
    
    asteroidHit(asteroidIndex, playerIndex) {
        const asteroid = this.asteroids[asteroidIndex];
        this.explosions.push(new Explosion(asteroid.x, asteroid.y, asteroid.boostType));
        if (asteroid.boostType) this.applyBoost(playerIndex, asteroid.boostType);
        
        const player = this.players[playerIndex];
        const baseScore = asteroid.size === 3 ? 20 : asteroid.size === 2 ? 50 : 100;
        this.scores[playerIndex] += player.hasBoost('doublePoints') ? baseScore * 2 : baseScore;
        this.updateScores();
        
        this.splitAsteroid(asteroidIndex);
    }
    
    checkPlayerCollisions() {
        const p1 = this.players[0], p2 = this.players[1];
        if (p1.lives <= 0 || p2.lives <= 0) return;
        
        const distance = this.getDistance(p1.x, p1.y, p2.x, p2.y);
        if (distance < p1.radius + p2.radius) {
            this.explosions.push(new Explosion((p1.x + p2.x) / 2, (p1.y + p2.y) / 2));
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            p1.vx -= Math.cos(angle) * 2; p1.vy -= Math.sin(angle) * 2;
            p2.vx += Math.cos(angle) * 2; p2.vy += Math.sin(angle) * 2;
        }
    }
    
    playerHit(playerIndex) {
        const player = this.players[playerIndex];
        player.lives--;
        player.clearBoosts();
        
        if (playerIndex === 0) this.boostIndicators1.innerHTML = '';
        else this.boostIndicators2.innerHTML = '';
        
        this.updateLives();
        if (player.lives > 0) this.respawnPlayer(playerIndex);
    }
    
    respawnPlayer(playerIndex) {
        const player = this.players[playerIndex];
        const position = playerIndex === 0 ? 
            { x: this.canvas.width / 4, y: this.canvas.height / 2 } :
            { x: this.canvas.width * 3 / 4, y: this.canvas.height / 2 };
        
        player.x = position.x; player.y = position.y;
        player.vx = 0; player.vy = 0; player.angle = -Math.PI / 2;
        player.addBoost('invincibility', 2000);
        this.addBoostIndicator(playerIndex, 'invincibility');
    }
    
    applyBoost(playerIndex, boostType) {
        const player = this.players[playerIndex];
        const boostConfig = this.boostTypes[boostType];
        player.addBoost(boostType, boostConfig.duration);
        this.addBoostIndicator(playerIndex, boostType);
        this.showBoostNotification(playerIndex, boostType, boostConfig.color);
    }
    
    showBoostNotification(playerIndex, boostType, color) {
        const names = {
            rapidFire: 'RAPID FIRE', speed: 'SPEED BOOST', shield: 'SHIELD',
            doublePoints: 'DOUBLE POINTS', biggerBullets: 'BIG BULLETS', invincibility: 'INVINCIBLE'
        };
        const x = playerIndex === 0 ? this.canvas.width / 4 : this.canvas.width * 3 / 4;
        this.boostNotifications.push(new BoostNotification(x, this.canvas.height / 2, `${this.getBoostIcon(boostType)} ${names[boostType]}`, color));
    }
    
    splitAsteroid(asteroidIndex) {
        const asteroid = this.asteroids[asteroidIndex];
        this.asteroids.splice(asteroidIndex, 1);
        
        if (asteroid.size > 1) {
            for (let i = 0; i < 2; i++) {
                this.asteroids.push(new Asteroid(asteroid.x, asteroid.y, asteroid.size - 1, null));
            }
        }
    }
    
    render() {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.players.forEach(p => { if (p.lives > 0) p.render(this.ctx); });
        this.bullets.forEach(b => b.render(this.ctx));
        this.asteroids.forEach(a => a.render(this.ctx));
        this.explosions.forEach(e => e.render(this.ctx));
        this.boostNotifications.forEach(n => n.render(this.ctx));
    }
    
    loadGame() {
        this.showSaveSlots('load');
    }
    
    hasSavedGame() {
        for (let i = 0; i < 6; i++) {
            if (localStorage.getItem(`asteroidsSaveSlot_${i}`)) return true;
        }
        return false;
    }
    
    updateSaveGameStatus() {
        this.loadGameBtn.style.display = this.hasSavedGame() ? 'flex' : 'none';
    }
}
// (You still need the Player, Asteroid, Bullet, Explosion, and BoostNotification classes from your original file here)
class Player {
    constructor(id, x, y, color, lives = 6) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.angle = -Math.PI / 2;
        this.vx = 0;
        this.vy = 0;
        this.radius = 15;
        this.rotationSpeed = 0.1;
        this.baseThrustPower = 0.3;
        this.friction = 0.99;
        this.baseMaxSpeed = 8;
        this.color = color;
        this.thrusting = false;
        this.lives = lives;
        this.boosts = [];
    }
    
    hasBoost(boostType) {
        return this.boosts.some(boost => boost.type === boostType);
    }
    
    addBoost(boostType, duration) {
        const endTime = Date.now() + duration;
        const existingBoost = this.boosts.find(b => b.type === boostType);
        if (existingBoost) {
            existingBoost.endTime = endTime;
            existingBoost.duration = duration;
        } else {
            this.boosts.push({ type: boostType, endTime, duration });
        }
    }
    
    clearBoosts() {
        this.boosts = [];
    }
    
    getThrustPower() {
        return this.hasBoost('speed') ? this.baseThrustPower * 1.5 : this.baseThrustPower;
    }
    
    getMaxSpeed() {
        return this.hasBoost('speed') ? this.baseMaxSpeed * 1.3 : this.baseMaxSpeed;
    }
    
    update(keys, width, height) {
        // Rotation
        if (keys.left) this.angle -= this.rotationSpeed;
        if (keys.right) this.angle += this.rotationSpeed;
        
        // Thrust
        this.thrusting = !!keys.up;
        if (keys.up) {
            this.vx += Math.cos(this.angle) * this.getThrustPower();
            this.vy += Math.sin(this.angle) * this.getThrustPower();
        }
        
        // Apply friction & Limit speed
        this.vx *= this.friction;
        this.vy *= this.friction;
        const speed = Math.sqrt(this.vx**2 + this.vy**2);
        const maxSpeed = this.getMaxSpeed();
        if (speed > maxSpeed) {
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
        }
        
        // Update position & Screen wrapping
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < -this.radius) this.x = width + this.radius;
        if (this.x > width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = height + this.radius;
        if (this.y > height + this.radius) this.y = -this.radius;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        if (this.hasBoost('invincibility')) {
            const hue = (Date.now() / 10) % 360;
            ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
        } else {
            ctx.strokeStyle = this.color;
        }
        
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-15, -12);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-15, 12);
        ctx.closePath();
        ctx.stroke();
        
        if (this.thrusting) {
            ctx.strokeStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(-15, 0);
            ctx.lineTo(-25 - Math.random() * 10, 0);
            ctx.stroke();
        }
        
        if (this.hasBoost('shield')) {
            ctx.strokeStyle = '#3498DB';
            ctx.lineWidth = 1 + Math.sin(Date.now() / 100) * 0.5;
            ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 100) * 0.2;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    serialize() {
        return {
            id: this.id, x: this.x, y: this.y, angle: this.angle, vx: this.vx, vy: this.vy,
            lives: this.lives, boosts: this.boosts
        };
    }

    static deserialize(data) {
        const player = new Player(data.id, data.x, data.y, data.id === 1 ? '#00FFFF' : '#FF00FF', data.lives);
        Object.assign(player, data);
        return player;
    }
}

class Asteroid {
    constructor(x, y, size, boostType = null) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.radius = size * 15;
        this.boostType = boostType;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * (4 - size) + 0.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.04;
        this.pulseTime = 0;
        
        this.points = [];
        const numPoints = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const distance = this.radius * (0.8 + Math.random() * 0.4);
            this.points.push({ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance });
        }
    }
    
    update(width, height) {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        this.pulseTime += 0.05;
        
        if (this.x < -this.radius) this.x = width + this.radius;
        if (this.x > width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = height + this.radius;
        if (this.y > height + this.radius) this.y = -this.radius;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        
        if (this.boostType) {
            const colors = {
                rapidFire: '#FF9500', speed: '#00FF7F', shield: '#3498DB',
                doublePoints: '#FFD700', biggerBullets: '#E74C3C', invincibility: '#9B59B6'
            };
            ctx.fillStyle = colors[this.boostType] || '#FFFFFF';
            ctx.globalAlpha = 0.5 + Math.sin(this.pulseTime) * 0.3;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    serialize() {
        return {
            x: this.x, y: this.y, size: this.size, vx: this.vx, vy: this.vy,
            rotation: this.rotation, boostType: this.boostType, points: this.points
        };
    }

    static deserialize(data) {
        const asteroid = new Asteroid(data.x, data.y, data.size, data.boostType);
        Object.assign(asteroid, data);
        return asteroid;
    }
}

class Bullet {
    constructor(x, y, angle, playerVx, playerVy, playerIndex, isBigBullets = false) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * 10 + playerVx;
        this.vy = Math.sin(angle) * 10 + playerVy;
        this.life = 60;
        this.radius = isBigBullets ? 6 : 3;
        this.playerIndex = playerIndex;
        this.isBigBullets = isBigBullets;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }
    
    render(ctx) {
        ctx.fillStyle = this.isBigBullets ? '#E74C3C' : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Explosion {
    constructor(x, y, boostType = null) {
        this.x = x;
        this.y = y;
        this.life = 30;
        this.particles = [];
        
        const colors = {
            rapidFire: '#FF9500', speed: '#00FF7F', shield: '#3498DB',
            doublePoints: '#FFD700', biggerBullets: '#E74C3C', invincibility: '#9B59B6'
        };
        const particleColor = colors[boostType] || '#FFFFFF';
        
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.particles.push({
                x: 0, y: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1, color: particleColor
            });
        }
    }
    
    update() {
        this.particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            p.alpha -= 1 / this.life;
        });
        this.life--;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        this.particles.forEach(p => {
            ctx.globalAlpha = p.alpha;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx, p.y - p.vy);
            ctx.stroke();
        });
        ctx.restore();
    }
}

class BoostNotification {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 120; // frames
    }
    
    update() {
        this.y -= 0.5;
        this.life--;
    }
    
    render(ctx) {
        const alpha = Math.min(1, this.life / 30);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 32px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

window.addEventListener('load', () => {
    new Game();
});
