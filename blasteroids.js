// ================================================================================
// FILE: blasteroids.js
// ================================================================================

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
        
        // --- CONTROLLER SETUP ---
        this.controllerConfig = null; // Will hold the loaded config.
        this.gamepads = {};
        this.gamepadThreshold = 0.5;
        this.gamepadButtonStates = [{}, {}]; // Track button presses for up to 2 players
        this.loadControllerConfig(); // Load the config from localStorage on startup

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
        this.setupGamepadListeners();
        this.updateSaveGameStatus();
        this.showStartScreen();
        this.gameLoop();
    }
    
    // --- NEW: Method to load controller config from localStorage ---
    loadControllerConfig() {
        const CONFIG_KEY = 'gameControllerConfig'; // Must match the key in setup.js
        const defaultConfig = {
            player1: { up: 'button_12', left: 'button_14', right: 'button_15', shoot: 'button_0' },
            player2: { up: 'button_12', left: 'button_14', right: 'button_15', shoot: 'button_0' },
            global: { pause: 'button_9', confirm: 'button_0' }
        };
        
        try {
            const savedConfig = localStorage.getItem(CONFIG_KEY);
            if (savedConfig) {
                this.controllerConfig = JSON.parse(savedConfig);
                console.log("Loaded controller configuration from localStorage.");
            } else {
                this.controllerConfig = defaultConfig;
                console.log("No saved controller configuration found, using defaults.");
            }
        } catch (e) {
            console.error("Failed to load/parse controller configuration, using defaults.", e);
            this.controllerConfig = defaultConfig;
        }
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
            if (this.gamepadButtonStates[e.gamepad.index]) {
                this.gamepadButtonStates[e.gamepad.index] = {};
            }
        });
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        this.singlePlayerBtn.addEventListener('click', () => this.selectMenuItem(0));
        this.multiplayerBtn.addEventListener('click', () => this.selectMenuItem(1));
        this.loadGameBtn.addEventListener('click', () => this.selectMenuItem(2));
        this.restartButton.addEventListener('click', () => this.selectMenuItem(0));
        
        this.menuResume.addEventListener('click', () => this.executeMenuAction(0));
        this.menuSave.addEventListener('click', () => this.executeMenuAction(1));
        this.menuLoad.addEventListener('click', () => this.executeMenuAction(2));
        this.menuMainMenu.addEventListener('click', () => this.executeMenuAction(3));
        
        this.saveSlots.querySelectorAll('.save-slot').forEach((slot, index) => {
            slot.addEventListener('click', () => {
                this.currentSlotIndex = index;
                this.executeSlotAction(index);
            });
        });
        
        this.keys1 = { left: false, right: false, up: false, shoot: false };
        this.keys2 = { left: false, right: false, up: false, shoot: false };
        
        document.addEventListener('keyup', (e) => {
            if (!this.gameRunning) return;
            switch(e.code) {
                case 'KeyA': this.keys1.left = false; break;
                case 'KeyD': this.keys1.right = false; break;
                case 'KeyW': this.keys1.up = false; break;
                case 'Space': this.keys1.shoot = false; break;
            }
            if (this.playerCount === 2) {
                switch(e.code) {
                    case 'ArrowLeft': this.keys2.left = false; break;
                    case 'ArrowRight': this.keys2.right = false; break;
                    case 'ArrowUp': this.keys2.up = false; break;
                    case 'Enter': this.keys2.shoot = false; break;
                }
            }
        });
    }

    // --- REVISED: pollGamepads now uses the loaded configuration ---
    pollGamepads() {
        if (!this.controllerConfig) return; // Guard against missing config

        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

        const isInputActive = (inputId, gamepad) => {
            if (!inputId || !gamepad) return false;
            const [type, indexStr] = inputId.split('_');
            const index = parseInt(indexStr, 10);
            if (isNaN(index)) return false;

            if (type === 'button') {
                return gamepad.buttons[index]?.pressed;
            }
            // Future-proofing for axes, though not used for movement in this config
            if (type === 'axis') {
                const value = gamepad.axes[index] || 0;
                // Positive or negative axis can be mapped, e.g., 'axis_1_neg'
                if (inputId.endsWith('_pos')) return value > this.gamepadThreshold;
                if (inputId.endsWith('_neg')) return value < -this.gamepadThreshold;
            }
            return false;
        };
        
        const wasButtonPressed = (inputId, playerIndex, gamepad) => {
            const isActive = isInputActive(inputId, gamepad);
            const wasActive = this.gamepadButtonStates[playerIndex]?.[inputId];
            if (this.gamepadButtonStates[playerIndex]) {
                 this.gamepadButtonStates[playerIndex][inputId] = isActive;
            }
            return isActive && !wasActive;
        };

        for (let i = 0; i < gamepads.length; i++) {
            const gp = gamepads[i];
            if (!gp) continue;

            const config = this.controllerConfig;

            // --- Global/Menu Controls (listens on all connected controllers) ---
            if (wasButtonPressed(config.global.pause, i, gp)) {
                if (this.menuOpen) this.closeEscapeMenu();
                else if (this.gameRunning) this.showEscapeMenu();
            }
            
            if (this.menuOpen || this.awaitingSlot || !this.gameRunning) {
                 if (wasButtonPressed(config.global.confirm, i, gp)) {
                    this.handleKeydown({ code: 'Enter', preventDefault: () => {} });
                }
            }

            // --- In-Game Player-Specific Controls ---
            if (this.gameRunning && !this.menuOpen && !this.awaitingSlot) {
                const playerIndex = i;
                if (playerIndex > 1) continue;

                const playerKey = `player${playerIndex + 1}`;
                const keys = playerIndex === 0 ? this.keys1 : this.keys2;

                if (!config[playerKey] || !keys || (playerIndex === 1 && this.playerCount < 2)) continue;

                keys.up = isInputActive(config[playerKey].up, gp);
                keys.left = isInputActive(config[playerKey].left, gp);
                keys.right = isInputActive(config[playerKey].right, gp);
                keys.shoot = isInputActive(config[playerKey].shoot, gp);
            }
        }
    }
    
    handleKeydown(e) {
        if (e.code === 'Escape') {
            e.preventDefault();
            if (this.menuOpen) this.closeEscapeMenu();
            else if (this.gameRunning) this.showEscapeMenu();
            return;
        }
        
        if (this.menuOpen || this.awaitingSlot) {
            e.preventDefault();
            if (this.awaitingSlot) this.handleSlotNavigation(e);
            else this.handleMenuKeydown(e);
            return;
        }
        
        if (!this.gameRunning) {
            if (['Enter', 'Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) {
                e.preventDefault();
                if (e.code === 'Enter' || e.code === 'Space') this.activateCurrentMenuItem();
                else this.navigateStartScreen(e.code === 'ArrowUp' || e.code === 'KeyW' ? -1 : 1);
            }
            return;
        }
        
        switch(e.code) {
            case 'KeyA': this.keys1.left = true; break;
            case 'KeyD': this.keys1.right = true; break;
            case 'KeyW': this.keys1.up = true; break;
            case 'Space': this.keys1.shoot = true; break;
        }
        
        if (this.playerCount === 2) {
            switch(e.code) {
                case 'ArrowLeft': this.keys2.left = true; break;
                case 'ArrowRight': this.keys2.right = true; break;
                case 'ArrowUp': this.keys2.up = true; break;
                case 'Enter': this.keys2.shoot = true; break;
            }
        }
    }
    
    // ... The rest of the file is standard game logic ...
    
    showStartScreen() {
        this.startScreen.classList.remove('hidden');
        this.gameOverModal.classList.remove('show');
        this.gameRunning = false;
        this.updateSaveGameStatus();
        this.startScreenCurrentItem = 0;
        this.updateStartScreenSelection();
    }
    
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
        items.forEach((item, index) => item.classList.toggle('selected', index === this.currentMenuItem));
    }
    
    handleMenuKeydown(e) {
        let count = 4;
        if (e.code === 'ArrowUp' || e.code === 'KeyW') this.currentMenuItem = (this.currentMenuItem - 1 + count) % count;
        if (e.code === 'ArrowDown' || e.code === 'KeyS') this.currentMenuItem = (this.currentMenuItem + 1) % count;
        if (e.code === 'Enter' || e.code === 'Space') this.executeMenuAction(this.currentMenuItem);
        this.updateMenuSelection();
    }
    
    executeMenuAction(actionIndex) {
        switch(actionIndex) {
            case 0: this.closeEscapeMenu(); break;
            case 1: this.showSaveSlots('save'); break;
            case 2: this.showSaveSlots('load'); break;
            case 3: this.closeEscapeMenu(); this.showStartScreen(); break;
        }
    }
    
    showSaveSlots(action) {
        this.awaitingSlot = action;
        this.saveSlots.classList.add('show');
        this.currentSlotIndex = 0;
        this.updateSaveSlotsDisplay();
        this.updateSaveSlotSelection();
        this.escapeMenuTitle.textContent = action === 'save' ? 'SAVE GAME' : 'LOAD GAME';
        [this.menuResume, this.menuSave, this.menuLoad, this.menuMainMenu].forEach(item => item.style.display = 'none');
    }
    
    hideSaveSlots() {
        this.awaitingSlot = false;
        this.saveSlots.classList.remove('show');
        this.escapeMenuTitle.textContent = 'PAUSE MENU';
        [this.menuResume, this.menuSave, this.menuLoad, this.menuMainMenu].forEach(item => item.style.display = 'block');
    }
    
    handleSlotNavigation(e) {
        let count = 6;
        if (e.code === 'ArrowUp' || e.code === 'KeyW') this.currentSlotIndex = (this.currentSlotIndex - 1 + count) % count;
        if (e.code === 'ArrowDown' || e.code === 'KeyS') this.currentSlotIndex = (this.currentSlotIndex + 1) % count;
        if (e.code === 'Enter' || e.code === 'Space') this.executeSlotAction(this.currentSlotIndex);
        this.updateSaveSlotSelection();
    }
    
    updateSaveSlotsDisplay() {
        for (let i = 0; i < 6; i++) {
            const slot = this.saveSlots.querySelector(`[data-slot="${i}"]`);
            const statusDiv = slot.querySelector('.slot-status');
            const saveData = localStorage.getItem(`asteroidsSaveSlot_${i}`);
            if (saveData) {
                const date = new Date(JSON.parse(saveData).timestamp);
                statusDiv.textContent = `Saved ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                statusDiv.classList.add('has-save');
            } else {
                statusDiv.textContent = 'Empty';
                statusDiv.classList.remove('has-save');
            }
        }
    }
    
    updateSaveSlotSelection() {
        this.saveSlots.querySelectorAll('.save-slot').forEach((slot, index) => {
            slot.classList.toggle('selected', index === this.currentSlotIndex);
        });
    }
    
    executeSlotAction(slotIndex) {
        if (this.awaitingSlot === 'save') this.saveGameToSlot(slotIndex);
        else if (this.awaitingSlot === 'load') this.loadGameFromSlot(slotIndex);
    }
    
    saveGameToSlot(slotIndex) {
        if (!this.gameRunning || !this.players || this.players.length === 0) return;
        const gameState = {
            playerCount: this.playerCount, scores: this.scores, wave: this.wave, timestamp: Date.now(),
            players: this.players.map(p => p.serialize()),
            asteroids: this.asteroids.map(a => a.serialize())
        };
        localStorage.setItem(`asteroidsSaveSlot_${slotIndex}`, JSON.stringify(gameState));
        this.hideSaveSlots();
        this.closeEscapeMenu();
    }
    
    loadGameFromSlot(slotIndex) {
        const savedGame = localStorage.getItem(`asteroidsSaveSlot_${slotIndex}`);
        if (!savedGame) return;
        const gameState = JSON.parse(savedGame);
        
        this.startScreen.classList.add('hidden');
        this.playerCount = gameState.playerCount;
        this.scores = gameState.scores;
        this.wave = gameState.wave;
        this.players = gameState.players.map(data => Player.deserialize(data));
        this.asteroids = gameState.asteroids.map(data => Asteroid.deserialize(data));
        this.bullets = []; this.explosions = []; this.boostNotifications = [];
        this.playerHud2.classList.toggle('dead', this.playerCount === 1);
        this.playerHud2.classList.toggle('alive', this.playerCount === 2);
        this.lastShootTimes = new Array(this.playerCount).fill(0);
        this.gameRunning = true;
        this.hideGameOver();
        this.updateScores(); this.updateLives();
        this.boostIndicators1.innerHTML = ''; this.boostIndicators2.innerHTML = '';
        this.players.forEach((p, i) => p.boosts.forEach(b => this.addBoostIndicator(i, b.type)));
        this.hideSaveSlots();
        this.closeEscapeMenu();
    }
    
    navigateStartScreen(direction) {
        this.startScreenCurrentItem = (this.startScreenCurrentItem + direction + 3) % 3;
        this.updateStartScreenSelection();
    }
    
    updateStartScreenSelection() {
        [this.singlePlayerBtn, this.multiplayerBtn, this.loadGameBtn].forEach((item, index) => {
            item.classList.toggle('selected', index === this.startScreenCurrentItem);
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
        const positions = [{ x: this.canvas.width / 2 - 100, y: this.canvas.height / 2 }, { x: this.canvas.width / 2 + 100, y: this.canvas.height / 2 }];
        for (let i = 0; i < playerCount; i++) this.players.push(new Player(i + 1, positions[i].x, positions[i].y, i === 0 ? '#00FFFF' : '#FF00FF', 6));
        this.playerHud2.classList.toggle('dead', playerCount === 1);
        this.playerHud2.classList.toggle('alive', playerCount === 2);
        this.asteroids = []; this.bullets = []; this.explosions = []; this.boostNotifications = [];
        this.scores = new Array(playerCount).fill(0); this.gameRunning = true;
        this.lastShootTimes = new Array(playerCount).fill(0); this.shootCooldown = 150;
        this.wave = 1;
        this.hideGameOver(); this.spawnAsteroids(); this.updateScores(); this.updateLives();
    }
    
    spawnAsteroids() {
        const asteroidCount = 3 + this.wave;
        for (let i = 0; i < asteroidCount; i++) {
            let x, y;
            do { x = Math.random() * this.canvas.width; y = Math.random() * this.canvas.height; } 
            while (this.players.some(p => this.getDistance(x, y, p.x, p.y) < 200));
            this.asteroids.push(new Asteroid(x, y, 3, Math.random() < 0.2 ? this.getRandomBoostType() : null));
        }
    }
    
    getRandomBoostType() {
        const keys = Object.keys(this.boostTypes);
        return keys[Math.floor(Math.random() * keys.length)];
    }
    
    getDistance(x1, y1, x2, y2) { return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2); }
    
    updateScores() {
        this.scoreDisplay1.textContent = this.scores[0] || 0;
        if (this.playerCount === 2) this.scoreDisplay2.textContent = this.scores[1] || 0;
    }
    
    updateLives() {
        if (this.players[0]) { this.livesDisplay1.textContent = this.players[0].lives; this.updateLivesIcons(1, this.players[0].lives); }
        if (this.players[1]) { this.livesDisplay2.textContent = this.players[1].lives; this.updateLivesIcons(2, this.players[1].lives); }
    }
    
    updateLivesIcons(playerIndex, lives) {
        const icons = playerIndex === 1 ? this.livesIcons1 : this.livesIcons2;
        icons.querySelectorAll('.life-icon').forEach((icon, i) => icon.classList.toggle('lost', i >= lives));
    }
    
    showGameOver() {
        this.gameRunning = false;
        this.finalScore1.textContent = this.scores[0] || 0;
        const p2score = this.finalScore1.nextElementSibling.nextElementSibling;
        if (this.playerCount === 2) {
            this.finalScore2.textContent = this.scores[1] || 0;
            p2score.style.display = 'block';
        } else {
            p2score.style.display = 'none';
        }
        this.gameOverModal.classList.add('show');
    }
    
    hideGameOver() { this.gameOverModal.classList.remove('show'); }
    
    gameLoop() {
        this.pollGamepads();
        if (this.gameRunning && !this.menuOpen) this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        const currentTime = Date.now();
        this.players.forEach((p, i) => {
            if (p.lives <= 0) return;
            const keys = i === 0 ? this.keys1 : this.keys2;
            p.update(keys, this.canvas.width, this.canvas.height);
            this.updatePlayerBoosts(p, i, currentTime);
            if (keys.shoot && currentTime - this.lastShootTimes[i] > this.getShootCooldown(p)) { this.shoot(i); this.lastShootTimes[i] = currentTime; }
        });
        this.bullets = this.bullets.filter(b => b.life > 0);
        this.bullets.forEach(b => b.update());
        this.asteroids.forEach(a => a.update(this.canvas.width, this.canvas.height));
        this.explosions = this.explosions.filter(e => e.life > 0);
        this.explosions.forEach(e => e.update());
        this.boostNotifications = this.boostNotifications.filter(n => n.life > 0);
        this.boostNotifications.forEach(n => n.update());
        this.checkCollisions();
        if (this.asteroids.length === 0 && this.gameRunning) { this.wave++; this.spawnAsteroids(); }
        if (this.players.every(p => p.lives <= 0)) this.showGameOver();
    }
    
    getShootCooldown(player) { return player.hasBoost('rapidFire') ? 50 : this.shootCooldown; }
    
    updatePlayerBoosts(player, playerIndex, currentTime) {
        player.boosts = player.boosts.filter(boost => {
            const active = currentTime < boost.endTime;
            if (!active) this.removeBoostIndicator(playerIndex, boost.type);
            return active;
        });
        this.updateBoostIndicators(player, playerIndex, currentTime);
    }
    
    updateBoostIndicators(player, playerIndex, currentTime) {
        const container = playerIndex === 0 ? this.boostIndicators1 : this.boostIndicators2;
        player.boosts.forEach(boost => {
            const indicator = container.querySelector(`[data-boost="${boost.type}"]`);
            if (indicator) {
                const timerBar = indicator.querySelector('.boost-timer-bar');
                timerBar.style.width = `${Math.max(0, (boost.endTime - currentTime) / boost.duration * 100)}%`;
            }
        });
    }
    
    addBoostIndicator(playerIndex, boostType) {
        const container = playerIndex === 0 ? this.boostIndicators1 : this.boostIndicators2;
        if (container.querySelector(`[data-boost="${boostType}"]`)) return;
        const config = this.boostTypes[boostType];
        const indicator = document.createElement('div');
        indicator.className = 'boost-indicator';
        indicator.dataset.boost = boostType;
        indicator.innerHTML = `<div class="boost-icon">${this.getBoostIcon(boostType)}</div><div class="boost-timer"><div class.boost-timer-bar" style="background: ${config.color};"></div></div>`;
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
    
    getBoostIcon(boostType) { return { rapidFire: '⚡', speed: '🚀', shield: '🛡️', doublePoints: '💰', biggerBullets: '💥', invincibility: '✨' }[boostType] || '⭐'; }
    
    shoot(playerIndex) {
        const p = this.players[playerIndex];
        this.bullets.push(new Bullet(p.x + Math.cos(p.angle) * 20, p.y + Math.sin(p.angle) * 20, p.angle, p.vx, p.vy, playerIndex, p.hasBoost('biggerBullets')));
    }
    
    checkCollisions() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                const b = this.bullets[i], a = this.asteroids[j];
                if (this.getDistance(b.x, b.y, a.x, a.y) < a.radius + b.radius) {
                    this.bullets.splice(i, 1);
                    this.explosions.push(new Explosion(a.x, a.y, a.boostType));
                    if (a.boostType) this.applyBoost(b.playerIndex, a.boostType);
                    const p = this.players[b.playerIndex];
                    this.scores[b.playerIndex] += (p.hasBoost('doublePoints') ? 2 : 1) * (a.size === 3 ? 20 : a.size === 2 ? 50 : 100);
                    this.updateScores();
                    this.splitAsteroid(j);
                    break;
                }
            }
        }
        
        this.players.forEach((p, i) => {
            if (p.lives <= 0 || p.hasBoost('invincibility') || p.hasBoost('shield')) return;
            for (const a of this.asteroids) if (this.getDistance(p.x, p.y, a.x, a.y) < p.radius + a.radius * 0.8) { this.playerHit(i); break; }
        });
        
        if (this.playerCount === 2) this.checkPlayerCollisions();
    }
    
    checkPlayerCollisions() {
        const [p1, p2] = this.players;
        if (!p1 || !p2 || p1.lives <= 0 || p2.lives <= 0) return;
        if (this.getDistance(p1.x, p1.y, p2.x, p2.y) < p1.radius + p2.radius) {
            this.explosions.push(new Explosion((p1.x + p2.x) / 2, (p1.y + p2.y) / 2));
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            p1.vx -= Math.cos(angle) * 2; p1.vy -= Math.sin(angle) * 2;
            p2.vx += Math.cos(angle) * 2; p2.vy += Math.sin(angle) * 2;
        }
    }
    
    playerHit(playerIndex) {
        const p = this.players[playerIndex];
        p.lives--; p.clearBoosts();
        const container = playerIndex === 0 ? this.boostIndicators1 : this.boostIndicators2;
        container.innerHTML = '';
        this.updateLives();
        if (p.lives > 0) this.respawnPlayer(playerIndex);
    }
    
    respawnPlayer(playerIndex) {
        const p = this.players[playerIndex];
        const pos = playerIndex === 0 ? { x: this.canvas.width / 4, y: this.canvas.height / 2 } : { x: this.canvas.width * 3 / 4, y: this.canvas.height / 2 };
        p.x = pos.x; p.y = pos.y; p.vx = 0; p.vy = 0; p.angle = -Math.PI / 2;
        p.addBoost('invincibility', 2000);
        this.addBoostIndicator(playerIndex, 'invincibility');
    }
    
    applyBoost(playerIndex, boostType) {
        const p = this.players[playerIndex], config = this.boostTypes[boostType];
        p.addBoost(boostType, config.duration);
        this.addBoostIndicator(playerIndex, boostType);
        this.showBoostNotification(playerIndex, boostType, config.color);
    }
    
    showBoostNotification(playerIndex, boostType, color) {
        const names = { rapidFire: 'RAPID FIRE', speed: 'SPEED BOOST', shield: 'SHIELD', doublePoints: 'DOUBLE POINTS', biggerBullets: 'BIG BULLETS', invincibility: 'INVINCIBLE' };
        const x = playerIndex === 0 ? this.canvas.width / 4 : this.canvas.width * 3 / 4;
        this.boostNotifications.push(new BoostNotification(x, this.canvas.height / 2, `${this.getBoostIcon(boostType)} ${names[boostType]}`, color));
    }
    
    splitAsteroid(asteroidIndex) {
        const a = this.asteroids[asteroidIndex];
        this.asteroids.splice(asteroidIndex, 1);
        if (a.size > 1) for (let i = 0; i < 2; i++) this.asteroids.push(new Asteroid(a.x, a.y, a.size - 1, null));
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
    
    loadGame() { this.showSaveSlots('load'); }
    hasSavedGame() { for (let i = 0; i < 6; i++) if (localStorage.getItem(`asteroidsSaveSlot_${i}`)) return true; return false; }
    updateSaveGameStatus() { this.loadGameBtn.style.display = this.hasSavedGame() ? 'flex' : 'none'; }
}

class Player {
    constructor(id, x, y, color, lives = 6) {
        this.id = id; this.x = x; this.y = y; this.color = color; this.lives = lives;
        this.angle = -Math.PI / 2; this.vx = 0; this.vy = 0; this.radius = 15;
        this.rotationSpeed = 0.1; this.baseThrustPower = 0.3; this.friction = 0.99;
        this.baseMaxSpeed = 8; this.thrusting = false; this.boosts = [];
    }
    hasBoost(type) { return this.boosts.some(b => b.type === type); }
    addBoost(type, duration) {
        const endTime = Date.now() + duration;
        const existing = this.boosts.find(b => b.type === type);
        if (existing) { existing.endTime = endTime; existing.duration = duration; }
        else { this.boosts.push({ type, endTime, duration }); }
    }
    clearBoosts() { this.boosts = []; }
    getThrustPower() { return this.baseThrustPower * (this.hasBoost('speed') ? 1.5 : 1); }
    getMaxSpeed() { return this.baseMaxSpeed * (this.hasBoost('speed') ? 1.3 : 1); }
    update(keys, width, height) {
        if (keys.left) this.angle -= this.rotationSpeed;
        if (keys.right) this.angle += this.rotationSpeed;
        this.thrusting = !!keys.up;
        if (keys.up) { this.vx += Math.cos(this.angle) * this.getThrustPower(); this.vy += Math.sin(this.angle) * this.getThrustPower(); }
        this.vx *= this.friction; this.vy *= this.friction;
        const speed = Math.sqrt(this.vx ** 2 + this.vy ** 2);
        const maxSpeed = this.getMaxSpeed();
        if (speed > maxSpeed) { this.vx = (this.vx / speed) * maxSpeed; this.vy = (this.vy / speed) * maxSpeed; }
        this.x += this.vx; this.y += this.vy;
        if (this.x < -this.radius) this.x = width + this.radius;
        if (this.x > width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = height + this.radius;
        if (this.y > height + this.radius) this.y = -this.radius;
    }
    render(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.strokeStyle = this.hasBoost('invincibility') ? `hsl(${(Date.now()/10)%360}, 100%, 70%)` : this.color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-15, -12); ctx.lineTo(-10, 0); ctx.lineTo(-15, 12); ctx.closePath(); ctx.stroke();
        if (this.thrusting) { ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-25 - Math.random() * 10, 0); ctx.stroke(); }
        if (this.hasBoost('shield')) {
            ctx.strokeStyle = '#3498DB'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
            ctx.beginPath(); ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
    }
    serialize() { return { id: this.id, x: this.x, y: this.y, angle: this.angle, vx: this.vx, vy: this.vy, lives: this.lives, boosts: this.boosts }; }
    static deserialize(data) {
        const p = new Player(data.id, data.x, data.y, data.id === 1 ? '#00FFFF' : '#FF00FF', data.lives);
        Object.assign(p, data);
        return p;
    }
}

class Asteroid {
    constructor(x, y, size, boostType = null) {
        this.x = x; this.y = y; this.size = size; this.boostType = boostType;
        this.radius = size * 15;
        const angle = Math.random() * Math.PI * 2, speed = Math.random() * (4-size) + 0.5;
        this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
        this.rotation = Math.random() * Math.PI * 2; this.rotationSpeed = (Math.random() - 0.5) * 0.04;
        this.pulseTime = 0;
        this.points = [];
        const numPoints = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numPoints; i++) {
            const a = (i / numPoints) * Math.PI * 2, d = this.radius * (0.8 + Math.random() * 0.4);
            this.points.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
        }
    }
    update(width, height) {
        this.x += this.vx; this.y += this.vy; this.rotation += this.rotationSpeed; this.pulseTime += 0.05;
        if (this.x < -this.radius) this.x = width + this.radius; if (this.x > width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = height + this.radius; if (this.y > height + this.radius) this.y = -this.radius;
    }
    render(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(this.points[0].x, this.points[0].y);
        this.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath(); ctx.stroke();
        if (this.boostType) {
            const colors = { rapidFire: '#FF9500', speed: '#00FF7F', shield: '#3498DB', doublePoints: '#FFD700', biggerBullets: '#E74C3C', invincibility: '#9B59B6' };
            ctx.fillStyle = colors[this.boostType]; ctx.globalAlpha = 0.5 + Math.sin(this.pulseTime) * 0.3;
            ctx.beginPath(); ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
    serialize() { return { x: this.x, y: this.y, size: this.size, vx: this.vx, vy: this.vy, rotation: this.rotation, boostType: this.boostType, points: this.points }; }
    static deserialize(data) { const a = new Asteroid(data.x, data.y, data.size, data.boostType); Object.assign(a, data); return a; }
}

class Bullet {
    constructor(x, y, angle, pVx, pVy, pIdx, isBig = false) {
        this.x = x; this.y = y; this.playerIndex = pIdx; this.isBigBullets = isBig;
        this.vx = Math.cos(angle) * 10 + pVx; this.vy = Math.sin(angle) * 10 + pVy;
        this.life = 60; this.radius = isBig ? 6 : 3;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life--; }
    render(ctx) { ctx.fillStyle = this.isBigBullets ? '#E74C3C' : '#FFFFFF'; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); }
}

class Explosion {
    constructor(x, y, boostType = null) {
        this.x = x; this.y = y; this.life = 30; this.particles = [];
        const colors = { rapidFire: '#FF9500', speed: '#00FF7F', shield: '#3498DB', doublePoints: '#FFD700', biggerBullets: '#E74C3C', invincibility: '#9B59B6' };
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2, speed = Math.random() * 5 + 2;
            this.particles.push({ x: 0, y: 0, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, alpha: 1, color: colors[boostType] || '#FFFFFF' });
        }
    }
    update() { this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.alpha -= 1 / this.life; }); this.life--; }
    render(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        this.particles.forEach(p => {
            ctx.globalAlpha = p.alpha; ctx.strokeStyle = p.color; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx, p.y - p.vy); ctx.stroke();
        });
        ctx.restore();
    }
}

class BoostNotification {
    constructor(x, y, text, color) { this.x = x; this.y = y; this.text = text; this.color = color; this.life = 120; }
    update() { this.y -= 0.5; this.life--; }
    render(ctx) {
        ctx.save(); ctx.globalAlpha = Math.min(1, this.life / 30);
        ctx.fillStyle = this.color; ctx.font = 'bold 32px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.strokeStyle = 'black'; ctx.lineWidth = 4;
        ctx.strokeText(this.text, this.x, this.y); ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

window.addEventListener('load', () => {
    new Game();
});
