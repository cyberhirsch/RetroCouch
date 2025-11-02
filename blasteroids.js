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
        
        // Save slot click and keyboard handlers
        const slots = this.saveSlots.querySelectorAll('.save-slot');
        slots.forEach((slot, index) => {
            // Click handler
            slot.addEventListener('click', () => {
                this.currentSlotIndex = index;
                this.executeSlotAction(index);
            });
            
            // Keyboard handler for when slot is focused
            slot.addEventListener('keydown', (e) => {
                // Handle navigation keys - let global handler deal with these
                if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || 
                    e.code === 'KeyW' || e.code === 'KeyS') {
                    // Don't prevent default or stop propagation - let global handler handle navigation
                    return;
                }
                
                // Handle selection keys
                if (e.code === 'Enter' || e.code === 'Space') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.currentSlotIndex = index;
                    this.executeSlotAction(index);
                }
            });
        });
        
        // Dual player controls
        this.keys1 = { left: false, right: false, up: false, shoot: false };
        this.keys2 = { left: false, right: false, up: false, shoot: false };
        
        // Keyup event handling
        document.addEventListener('keyup', (e) => {
            if (!this.gameRunning) return;
            
            // Player 1: WASD + Space (both single and multiplayer)
            switch(e.code) {
                case 'KeyA':
                    this.keys1.left = false;
                    e.preventDefault();
                    break;
                case 'KeyD':
                    this.keys1.right = false;
                    e.preventDefault();
                    break;
                case 'KeyW':
                    this.keys1.up = false;
                    e.preventDefault();
                    break;
                case 'Space':
                    this.keys1.shoot = false;
                    e.preventDefault();
                    break;
            }
            
            // Player 2: Arrow keys + Enter (multiplayer only)
            if (this.playerCount === 2) {
                switch(e.code) {
                    case 'ArrowLeft':
                        this.keys2.left = false;
                        e.preventDefault();
                        break;
                    case 'ArrowRight':
                        this.keys2.right = false;
                        e.preventDefault();
                        break;
                    case 'ArrowUp':
                        this.keys2.up = false;
                        e.preventDefault();
                        break;
                    case 'Enter':
                        this.keys2.shoot = false;
                        e.preventDefault();
                        break;
                }
            }
        });
    }
    
    handleKeydown(e) {
        // Handle escape menu
        if (e.code === 'Escape') {
            e.preventDefault();
            if (this.menuOpen) {
                this.closeEscapeMenu();
            } else if (this.gameRunning) {
                this.showEscapeMenu();
            }
            return;
        }
        
        // Menu navigation
        if (this.menuOpen) {
            e.preventDefault();
            this.handleMenuKeydown(e);
            return;
        }
        
        // Save slot selection
        if (this.awaitingSlot) {
            e.preventDefault();
            this.handleSlotNavigation(e);
            return;
        }
        
        // Start screen navigation
        if (!this.gameRunning && !this.menuOpen && !this.awaitingSlot) {
            if (e.code === 'Enter' || e.code === 'Space') {
                e.preventDefault();
                this.activateCurrentMenuItem();
                return;
            }
            if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
                e.preventDefault();
                this.navigateStartScreen(e.code === 'ArrowUp' ? -1 : 1);
                return;
            }
            if (e.code === 'KeyW' || e.code === 'KeyS') {
                e.preventDefault();
                this.navigateStartScreen(e.code === 'KeyW' ? -1 : 1);
                return;
            }
        }
        
        // Prevent game controls when menu or save slots are active
        if (!this.gameRunning || this.menuOpen || this.awaitingSlot) return;
        
        // Player 1: WASD + Space (both single and multiplayer)
        switch(e.code) {
            case 'KeyA':
                this.keys1.left = true;
                e.preventDefault();
                break;
            case 'KeyD':
                this.keys1.right = true;
                e.preventDefault();
                break;
            case 'KeyW':
                this.keys1.up = true;
                e.preventDefault();
                break;
            case 'Space':
                this.keys1.shoot = true;
                e.preventDefault();
                break;
        }
        
        // Player 2: Arrow keys + Enter (multiplayer only)
        if (this.playerCount === 2) {
            switch(e.code) {
                case 'ArrowLeft':
                    this.keys2.left = true;
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    this.keys2.right = true;
                    e.preventDefault();
                    break;
                case 'ArrowUp':
                    this.keys2.up = true;
                    e.preventDefault();
                    break;
                case 'Enter':
                    this.keys2.shoot = true;
                    e.preventDefault();
                    break;
            }
        }
    }
    
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
        
        // Save original menu text
        this.originalTitle = this.escapeMenuTitle.textContent;
        this.originalResumeText = this.menuResume.textContent;
        
        // Update menu title
        this.escapeMenuTitle.textContent = 'SAVE MENU';
        
        // Hide the original menu items completely (not just disable them)
        [this.menuResume, this.menuSave, this.menuLoad, this.menuMainMenu].forEach(item => {
            item.style.display = 'none';
        });
    }
    
    hideSaveSlots() {
        this.awaitingSlot = false;
        this.saveSlots.classList.remove('show');
        
        // Restore original menu title and text
        if (this.originalTitle) {
            this.escapeMenuTitle.textContent = this.originalTitle;
        }
        if (this.originalResumeText) {
            this.menuResume.textContent = this.originalResumeText;
        }
        
        // Restore the original menu items visibility
        [this.menuResume, this.menuSave, this.menuLoad, this.menuMainMenu].forEach(item => {
            item.style.display = 'block';
        });
    }
    
    handleSlotNavigation(e) {
        switch(e.code) {
            case 'ArrowUp':
            case 'KeyW':
                e.preventDefault();
                this.currentSlotIndex = Math.max(0, this.currentSlotIndex - 1);
                this.updateSaveSlotSelection();
                break;
            case 'ArrowDown':
            case 'KeyS':
                e.preventDefault();
                this.currentSlotIndex = Math.min(5, this.currentSlotIndex + 1);
                this.updateSaveSlotSelection();
                break;
            case 'ArrowLeft':
            case 'KeyA':
                e.preventDefault();
                // Left/right doesn't make sense in single column, but we can cycle
                this.currentSlotIndex = (this.currentSlotIndex - 1 + 6) % 6;
                this.updateSaveSlotSelection();
                break;
            case 'ArrowRight':
            case 'KeyD':
                e.preventDefault();
                // Right doesn't make sense in single column, but we can cycle
                this.currentSlotIndex = (this.currentSlotIndex + 1) % 6;
                this.updateSaveSlotSelection();
                break;
            case 'Enter':
            case 'Space':
                e.preventDefault();
                this.executeSlotAction(this.currentSlotIndex);
                break;
        }
    }
    
    updateSaveSlotsDisplay() {
        for (let i = 0; i < 6; i++) {
            const slot = this.saveSlots.children[1].children[i]; // Get the slot div
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
            slotIndex: slotIndex,
            players: this.players.map(player => ({
                id: player.id,
                x: player.x,
                y: player.y,
                angle: player.angle,
                vx: player.vx,
                vy: player.vy,
                lives: player.lives,
                boosts: player.boosts.map(boost => ({
                    type: boost.type,
                    endTime: boost.endTime,
                    duration: boost.duration
                }))
            })),
            asteroids: this.asteroids.map(asteroid => ({
                x: asteroid.x,
                y: asteroid.y,
                size: asteroid.size,
                vx: asteroid.vx,
                vy: asteroid.vy,
                rotation: asteroid.rotation,
                boostType: asteroid.boostType,
                points: asteroid.points
            }))
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
        try {
            const savedGame = localStorage.getItem(`asteroidsSaveSlot_${slotIndex}`);
            
            if (!savedGame) {
                this.showSaveGameStatus(`❌ Slot ${slotIndex + 1} is empty`);
                this.hideSaveSlots();
                return false;
            }
            
            const gameState = JSON.parse(savedGame);
            
            // Hide start screen
            this.startScreen.classList.add('hidden');
            
            // Setup players
            this.players = [];
            const positions = [
                { x: this.canvas.width / 2 - 100, y: this.canvas.height / 2 },
                { x: this.canvas.width / 2 + 100, y: this.canvas.height / 2 }
            ];
            
            for (let i = 0; i < gameState.playerCount; i++) {
                const playerData = gameState.players[i];
                const player = new Player(playerData.id, playerData.x, playerData.y, 
                                        i === 0 ? '#00FFFF' : '#FF00FF', 6);
                
                // Restore player state
                player.x = playerData.x;
                player.y = playerData.y;
                player.angle = playerData.angle;
                player.vx = playerData.vx;
                player.vy = playerData.vy;
                player.lives = playerData.lives;
                player.boosts = playerData.boosts.map(boost => ({
                    type: boost.type,
                    endTime: boost.endTime,
                    duration: boost.duration
                }));
                
                this.players.push(player);
            }
            
            // Restore other game state
            this.playerCount = gameState.playerCount;
            this.scores = gameState.scores;
            this.wave = gameState.wave;
            
            // Restore asteroids
            this.asteroids = [];
            for (let asteroidData of gameState.asteroids) {
                const asteroid = new Asteroid(asteroidData.x, asteroidData.y, asteroidData.size, asteroidData.boostType, asteroidData);
                this.asteroids.push(asteroid);
            }
            
            // Clear other arrays
            this.bullets = [];
            this.explosions = [];
            this.boostNotifications = [];
            
            // Hide player 2 HUD if single player
            if (gameState.playerCount === 1) {
                this.playerHud2.classList.remove('alive');
                this.playerHud2.classList.add('dead');
            } else {
                this.playerHud2.classList.remove('dead');
                this.playerHud2.classList.add('alive');
            }
            
            this.lastShootTimes = new Array(gameState.playerCount).fill(0);
            this.shootCooldown = 150;
            this.gameRunning = true;
            
            this.hideGameOver();
            this.updateScores();
            this.updateLives();
            
            // Clear boost indicators and restore them
            this.boostIndicators1.innerHTML = '';
            this.boostIndicators2.innerHTML = '';
            this.players.forEach((player, index) => {
                player.boosts.forEach(boost => {
                    this.addBoostIndicator(index, boost.type);
                });
            });
            
            this.hideSaveSlots();
            this.closeEscapeMenu();
            this.showSaveGameStatus(`✅ Loaded game from Slot ${slotIndex + 1}!`);
            return true;
            
        } catch (error) {
            this.showSaveGameStatus(`❌ Load failed: ${error.message}`);
            this.hideSaveSlots();
            return false;
        }
    }
    
    // Start screen navigation
    navigateStartScreen(direction) {
        // Simple navigation between 3 menu items
        this.startScreenCurrentItem = (this.startScreenCurrentItem || 0) + direction;
        if (this.startScreenCurrentItem < 0) this.startScreenCurrentItem = 2;
        if (this.startScreenCurrentItem > 2) this.startScreenCurrentItem = 0;
        
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
        if (this.startScreenCurrentItem === 0) {
            this.startGame(1);
        } else if (this.startScreenCurrentItem === 1) {
            this.startGame(2);
        } else if (this.startScreenCurrentItem === 2) {
            this.loadGame();
        }
    }
    
    // Remove old saveGame method - replaced with filename-based version
    
    selectMenuItem(index) {
        this.startScreenCurrentItem = index;
        this.updateStartScreenSelection();
        this.activateCurrentMenuItem();
    }
    
    startGame(playerCount) {
        this.playerCount = playerCount;
        
        // Hide start screen
        this.startScreen.classList.add('hidden');
        
        // Setup players
        this.players = [];
        const positions = [
            { x: this.canvas.width / 2 - 100, y: this.canvas.height / 2 },
            { x: this.canvas.width / 2 + 100, y: this.canvas.height / 2 }
        ];
        
        for (let i = 0; i < playerCount; i++) {
            const player = new Player(i + 1, positions[i].x, positions[i].y, 
                                    i === 0 ? '#00FFFF' : '#FF00FF', 6);
            this.players.push(player);
        }
        
        // Hide player 2 HUD if single player
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
            let attempts = 0;
            do {
                x = Math.random() * this.canvas.width;
                y = Math.random() * this.canvas.height;
                attempts++;
            } while (attempts < 50 && this.players.some(player => 
                     this.getDistance(x, y, player.x, player.y) < 150));
            
            // 20% chance for boost asteroid
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
        this.scoreDisplay1.textContent = this.scores[0];
        if (this.playerCount === 2) {
            this.scoreDisplay2.textContent = this.scores[1];
        }
    }
    
    updateLives() {
        this.livesDisplay1.textContent = this.players[0].lives;
        this.updateLivesIcons(1, this.players[0].lives);
        
        if (this.playerCount === 2) {
            this.livesDisplay2.textContent = this.players[1].lives;
            this.updateLivesIcons(2, this.players[1].lives);
        }
    }
    
    updateLivesIcons(playerIndex, lives) {
        const iconsContainer = playerIndex === 1 ? this.livesIcons1 : this.livesIcons2;
        const icons = iconsContainer.querySelectorAll('.life-icon');
        
        icons.forEach((icon, index) => {
            if (index < lives) {
                icon.classList.remove('lost');
            } else {
                icon.classList.add('lost');
            }
        });
    }
    
    showGameOver() {
        this.finalScore1.textContent = this.scores[0];
        if (this.playerCount === 2) {
            this.finalScore2.textContent = this.scores[1];
            document.querySelector('#finalScore1').nextElementSibling.style.display = 'block';
        } else {
            this.finalScore2.textContent = 'N/A';
            document.querySelector('#finalScore1').nextElementSibling.style.display = 'none';
        }
        this.gameOverModal.classList.add('show');
    }
    
    hideGameOver() {
        this.gameOverModal.classList.remove('show');
    }
    
    gameLoop() {
        if (this.gameRunning && !this.menuOpen) {
            this.update();
            this.render();
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        const currentTime = Date.now();
        
        // Update players
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            if (player.lives <= 0) continue;
            
            const keys = i === 0 ? this.keys1 : this.keys2;
            
            player.update(keys, this.canvas.width, this.canvas.height);
            this.updatePlayerBoosts(player, i, currentTime);
            
            // Handle shooting
            if (keys.shoot && currentTime - this.lastShootTimes[i] > this.getShootCooldown(player)) {
                this.shoot(i);
                this.lastShootTimes[i] = currentTime;
            }
        }
        
        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            return bullet.life > 0;
        });
        
        // Update asteroids
        this.asteroids.forEach(asteroid => {
            asteroid.update();
        });
        
        // Update explosions
        this.explosions = this.explosions.filter(explosion => {
            explosion.update();
            return explosion.life > 0;
        });
        
        // Update boost notifications
        this.boostNotifications = this.boostNotifications.filter(notification => {
            notification.update();
            return notification.life > 0;
        });
        
        // Check collisions
        this.checkCollisions();
        this.checkPlayerCollisions();
        
        // Check game over
        this.checkGameOver();
        
        // Check if wave is complete
        if (this.asteroids.length === 0) {
            this.wave++;
            this.spawnAsteroids();
        }
    }
    
    getShootCooldown(player) {
        return player.hasBoost('rapidFire') ? 50 : this.shootCooldown;
    }
    
    updatePlayerBoosts(player, playerIndex, currentTime) {
        // Remove expired boosts
        player.boosts = player.boosts.filter(boost => {
            if (currentTime >= boost.endTime) {
                this.removeBoostIndicator(playerIndex, boost.type);
                return false;
            }
            return true;
        });
        
        // Update boost indicators
        this.updateBoostIndicators(player, playerIndex);
    }
    
    updateBoostIndicators(player, playerIndex) {
        const container = playerIndex === 0 ? this.boostIndicators1 : this.boostIndicators2;
        const currentTime = Date.now();
        
        // Update timer bars
        player.boosts.forEach(boost => {
            const timeLeft = boost.endTime - currentTime;
            const percentage = (timeLeft / boost.duration) * 100;
            
            const indicator = container.querySelector(`[data-boost="${boost.type}"]`);
            if (indicator) {
                const timerBar = indicator.querySelector('.boost-timer-bar');
                timerBar.style.width = Math.max(0, percentage) + '%';
            }
        });
    }
    
    addBoostIndicator(playerIndex, boostType) {
        const container = playerIndex === 0 ? this.boostIndicators1 : this.boostIndicators2;
        const boostConfig = this.boostTypes[boostType];
        
        // Check if already exists
        if (container.querySelector(`[data-boost="${boostType}"]`)) return;
        
        const icon = this.getBoostIcon(boostType);
        const indicator = document.createElement('div');
        indicator.className = 'boost-indicator';
        indicator.setAttribute('data-boost', boostType);
        indicator.innerHTML = `
            <div class="boost-icon" style="color: ${boostConfig.color};">${icon}</div>
            <div class="boost-timer">
                <div class="boost-timer-bar" style="background: ${boostConfig.color};"></div>
            </div>
        `;
        
        container.appendChild(indicator);
    }
    
    removeBoostIndicator(playerIndex, boostType) {
        const container = playerIndex === 0 ? this.boostIndicators1 : this.boostIndicators2;
        const indicator = container.querySelector(`[data-boost="${boostType}"]`);
        
        if (indicator) {
            indicator.classList.add('disappearing');
            setTimeout(() => {
                indicator.remove();
            }, 250);
        }
    }
    
    getBoostIcon(boostType) {
        const icons = {
            rapidFire: '⚡',
            speed: '🚀',
            shield: '🛡️',
            doublePoints: '💰',
            biggerBullets: '💥',
            invincibility: '✨'
        };
        return icons[boostType] || '⭐';
    }
    
    shoot(playerIndex) {
        const player = this.players[playerIndex];
        const bullet = new Bullet(
            player.x + Math.cos(player.angle) * 20,
            player.y + Math.sin(player.angle) * 20,
            player.angle,
            player.vx,
            player.vy,
            playerIndex,
            player.hasBoost('biggerBullets')
        );
        this.bullets.push(bullet);
    }
    
    checkCollisions() {
        // Bullet-asteroid collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                const asteroid = this.asteroids[j];
                
                if (this.getDistance(bullet.x, bullet.y, asteroid.x, asteroid.y) < asteroid.radius) {
                    // Bullet hits asteroid
                    this.bullets.splice(i, 1);
                    
                    // Create explosion
                    this.explosions.push(new Explosion(asteroid.x, asteroid.y, asteroid.boostType));
                    
                    // Handle boost asteroid
                    if (asteroid.boostType) {
                        this.applyBoost(bullet.playerIndex, asteroid.boostType);
                    }
                    
                    // Update score based on asteroid size and double points boost
                    const player = this.players[bullet.playerIndex];
                    const baseScore = asteroid.size === 3 ? 20 : asteroid.size === 2 ? 50 : 100;
                    const finalScore = player.hasBoost('doublePoints') ? baseScore * 2 : baseScore;
                    this.scores[bullet.playerIndex] += finalScore;
                    this.updateScores();
                    
                    // Split asteroid
                    this.splitAsteroid(j);
                    break;
                }
            }
        }
        
        // Player-asteroid collisions
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            
            if (player.lives <= 0) continue;
            if (player.hasBoost('invincibility') || player.hasBoost('shield')) continue;
            
            for (let j = 0; j < this.asteroids.length; j++) {
                const asteroid = this.asteroids[j];
                
                if (this.getDistance(player.x, player.y, asteroid.x, asteroid.y) < player.radius + asteroid.radius * 0.8) {
                    this.playerHit(i);
                    break;
                }
            }
        }
    }
    
    checkPlayerCollisions() {
        if (this.playerCount !== 2) return;
        
        // Player-player collision (no damage, just physics)
        const p1 = this.players[0];
        const p2 = this.players[1];
        
        if (p1.lives <= 0 || p2.lives <= 0) return;
        
        const distance = this.getDistance(p1.x, p1.y, p2.x, p2.y);
        const minDistance = p1.radius + p2.radius;
        
        if (distance < minDistance) {
            // Create collision effect
            this.explosions.push(new Explosion((p1.x + p2.x) / 2, (p1.y + p2.y) / 2));
            
            // Simple knockback
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const force = 2;
            p1.vx -= Math.cos(angle) * force;
            p1.vy -= Math.sin(angle) * force;
            p2.vx += Math.cos(angle) * force;
            p2.vy += Math.sin(angle) * force;
        }
    }
    
    playerHit(playerIndex) {
        const player = this.players[playerIndex];
        player.lives--;
        player.clearBoosts();
        
        // Clear boost indicators
        if (playerIndex === 0) {
            this.boostIndicators1.innerHTML = '';
        } else {
            this.boostIndicators2.innerHTML = '';
        }
        
        // Update lives display
        this.updateLives();
        
        // Respawn player if they still have lives
        if (player.lives > 0) {
            this.respawnPlayer(playerIndex);
        }
    }
    
    respawnPlayer(playerIndex) {
        const player = this.players[playerIndex];
        const position = playerIndex === 0 ? 
            { x: this.canvas.width / 2 - 100, y: this.canvas.height / 2 } :
            { x: this.canvas.width / 2 + 100, y: this.canvas.height / 2 };
        
        // Clear position with invincibility
        player.x = position.x;
        player.y = position.y;
        player.vx = 0;
        player.vy = 0;
        player.angle = -Math.PI / 2;
        player.addBoost('invincibility', 2000); // 2 seconds invincibility
        this.addBoostIndicator(playerIndex, 'invincibility');
    }
    
    checkGameOver() {
        // Check if all players are eliminated
        const alivePlayers = this.players.filter(player => player.lives > 0);
        
        if (alivePlayers.length === 0) {
            this.gameRunning = false;
            this.showGameOver();
        }
    }
    
    applyBoost(playerIndex, boostType) {
        const player = this.players[playerIndex];
        const boostConfig = this.boostTypes[boostType];
        const currentTime = Date.now();
        
        // Add boost to player
        player.addBoost(boostType, boostConfig.duration);
        this.addBoostIndicator(playerIndex, boostType);
        
        // Show boost notification
        this.showBoostNotification(playerIndex, boostType, boostConfig.color);
    }
    
    showBoostNotification(playerIndex, boostType, color) {
        const names = {
            rapidFire: 'RAPID FIRE',
            speed: 'SPEED BOOST',
            shield: 'SHIELD',
            doublePoints: 'DOUBLE POINTS',
            biggerBullets: 'BIG BULLETS',
            invincibility: 'INVINCIBLE'
        };
        
        const icon = this.getBoostIcon(boostType);
        const notification = new BoostNotification(
            playerIndex === 0 ? 150 : this.canvas.width - 150,
            this.canvas.height / 2,
            `${icon} ${names[boostType]}`,
            color
        );
        
        this.boostNotifications.push(notification);
    }
    
    splitAsteroid(asteroidIndex) {
        const asteroid = this.asteroids[asteroidIndex];
        this.asteroids.splice(asteroidIndex, 1);
        
        if (asteroid.size > 1) {
            // Create 2 smaller asteroids
            for (let i = 0; i < 2; i++) {
                const newAsteroid = new Asteroid(
                    asteroid.x,
                    asteroid.y,
                    asteroid.size - 1,
                    asteroid.boostType // Inherit boost type with smaller asteroids
                );
                
                // Add some variation to the new asteroids' movement
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 2 + 1;
                newAsteroid.vx = Math.cos(angle) * speed;
                newAsteroid.vy = Math.sin(angle) * speed;
                
                this.asteroids.push(newAsteroid);
            }
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render all entities
        this.players.forEach(player => {
            if (player.lives > 0) player.render(this.ctx);
        });
        this.bullets.forEach(bullet => bullet.render(this.ctx));
        this.asteroids.forEach(asteroid => asteroid.render(this.ctx));
        this.explosions.forEach(explosion => explosion.render(this.ctx));
        this.boostNotifications.forEach(notification => notification.render(this.ctx));
    }
    
    saveGame() {
        if (!this.gameRunning || !this.players || this.players.length === 0) {
            alert('No active game to save!');
            return;
        }
        
        const gameState = {
            playerCount: this.playerCount,
            scores: this.scores,
            wave: this.wave,
            timestamp: Date.now(),
            players: this.players.map(player => ({
                id: player.id,
                x: player.x,
                y: player.y,
                angle: player.angle,
                vx: player.vx,
                vy: player.vy,
                lives: player.lives,
                boosts: player.boosts.map(boost => ({
                    type: boost.type,
                    endTime: boost.endTime,
                    duration: boost.duration
                }))
            })),
            asteroids: this.asteroids.map(asteroid => ({
                x: asteroid.x,
                y: asteroid.y,
                size: asteroid.size,
                vx: asteroid.vx,
                vy: asteroid.vy,
                rotation: asteroid.rotation,
                boostType: asteroid.boostType,
                points: asteroid.points
            }))
        };
        
        try {
            localStorage.setItem('asteroidsSaveGame', JSON.stringify(gameState));
            this.showSaveGameStatus('✅ Game saved successfully!');
        } catch (error) {
            this.showSaveGameStatus('❌ Save failed: ' + error.message);
        }
    }
    
    saveGameWithFilename(filename) {
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
            filename: filename,
            players: this.players.map(player => ({
                id: player.id,
                x: player.x,
                y: player.y,
                angle: player.angle,
                vx: player.vx,
                vy: player.vy,
                lives: player.lives,
                boosts: player.boosts.map(boost => ({
                    type: boost.type,
                    endTime: boost.endTime,
                    duration: boost.duration
                }))
            })),
            asteroids: this.asteroids.map(asteroid => ({
                x: asteroid.x,
                y: asteroid.y,
                size: asteroid.size,
                vx: asteroid.vx,
                vy: asteroid.vy,
                rotation: asteroid.rotation,
                boostType: asteroid.boostType,
                points: asteroid.points
            }))
        };
        
        try {
            // Sanitize filename for localStorage key
            const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
            localStorage.setItem(`asteroidsSave_${sanitizedFilename}`, JSON.stringify(gameState));
            
            // Update saved games list
            const savedGames = this.getSavedGamesList();
            if (!savedGames.includes(filename)) {
                savedGames.push(filename);
                localStorage.setItem('asteroidsSavedGamesList', JSON.stringify(savedGames));
            }
            
            this.showSaveGameStatus(`✅ Game saved as "${filename}"!`);
            this.hideSaveSlots();
            this.closeEscapeMenu();
        } catch (error) {
            this.showSaveGameStatus(`❌ Save failed: ${error.message}`);
            this.hideSaveSlots();
        }
    }
    
    loadGameWithFilename(filename) {
        try {
            // Sanitize filename for localStorage key
            const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
            const savedGame = localStorage.getItem(`asteroidsSave_${sanitizedFilename}`);
            
            if (!savedGame) {
                this.showSaveGameStatus(`❌ Save file "${filename}" not found`);
                this.hideSaveSlots();
                return false;
            }
            
            const gameState = JSON.parse(savedGame);
            
            // Hide start screen
            this.startScreen.classList.add('hidden');
            
            // Setup players
            this.players = [];
            const positions = [
                { x: this.canvas.width / 2 - 100, y: this.canvas.height / 2 },
                { x: this.canvas.width / 2 + 100, y: this.canvas.height / 2 }
            ];
            
            for (let i = 0; i < gameState.playerCount; i++) {
                const playerData = gameState.players[i];
                const player = new Player(playerData.id, playerData.x, playerData.y, 
                                        i === 0 ? '#00FFFF' : '#FF00FF', 6);
                
                // Restore player state
                player.x = playerData.x;
                player.y = playerData.y;
                player.angle = playerData.angle;
                player.vx = playerData.vx;
                player.vy = playerData.vy;
                player.lives = playerData.lives;
                player.boosts = playerData.boosts.map(boost => ({
                    type: boost.type,
                    endTime: boost.endTime,
                    duration: boost.duration
                }));
                
                this.players.push(player);
            }
            
            // Restore other game state
            this.playerCount = gameState.playerCount;
            this.scores = gameState.scores;
            this.wave = gameState.wave;
            
            // Restore asteroids
            this.asteroids = [];
            for (let asteroidData of gameState.asteroids) {
                const asteroid = new Asteroid(asteroidData.x, asteroidData.y, asteroidData.size, asteroidData.boostType, asteroidData);
                this.asteroids.push(asteroid);
            }
            
            // Clear other arrays
            this.bullets = [];
            this.explosions = [];
            this.boostNotifications = [];
            
            // Hide player 2 HUD if single player
            if (gameState.playerCount === 1) {
                this.playerHud2.classList.remove('alive');
                this.playerHud2.classList.add('dead');
            } else {
                this.playerHud2.classList.remove('dead');
                this.playerHud2.classList.add('alive');
            }
            
            this.lastShootTimes = new Array(gameState.playerCount).fill(0);
            this.shootCooldown = 150;
            this.gameRunning = true;
            
            this.hideGameOver();
            this.updateScores();
            this.updateLives();
            
            // Clear boost indicators and restore them
            this.boostIndicators1.innerHTML = '';
            this.boostIndicators2.innerHTML = '';
            this.players.forEach((player, index) => {
                player.boosts.forEach(boost => {
                    this.addBoostIndicator(index, boost.type);
                });
            });
            
            this.showSaveGameStatus(`✅ Game "${filename}" loaded successfully!`);
            this.hideSaveSlots();
            this.closeEscapeMenu();
            return true;
            
        } catch (error) {
            this.showSaveGameStatus(`❌ Load failed: ${error.message}`);
            this.hideSaveSlots();
            return false;
        }
    }
    
    loadGame() {
        // Show save slots for user to choose
        this.showSaveSlots('load');
        return true;
    }
    
    getSavedGamesList() {
        try {
            const savedGamesList = localStorage.getItem('asteroidsSavedGamesList');
            return savedGamesList ? JSON.parse(savedGamesList) : [];
        } catch (error) {
            return [];
        }
    }
    
    showSaveGameStatus(message) {
        if (this.saveGameStatus) {
            this.saveGameStatus.textContent = message;
            setTimeout(() => {
                if (this.saveGameStatus) {
                    this.saveGameStatus.textContent = this.hasSavedGame() ? 
                        `Last saved: ${new Date(JSON.parse(localStorage.getItem('asteroidsSaveGame')).timestamp).toLocaleString()}` :
                        'No saved game found';
                }
            }, 3000);
        }
    }
    
    hasSavedGame() {
        return localStorage.getItem('asteroidsSaveGame') !== null;
    }
    
    updateSaveGameStatus() {
        if (this.saveGameStatus) {
            if (this.hasSavedGame()) {
                const savedGame = JSON.parse(localStorage.getItem('asteroidsSaveGame'));
                this.saveGameStatus.textContent = `Last saved: ${new Date(savedGame.timestamp).toLocaleString()}`;
            } else {
                this.saveGameStatus.textContent = 'No saved game found';
            }
        }
    }
}

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
        this.boosts.push({ type: boostType, endTime, duration });
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
        if (keys.left) {
            this.angle -= this.rotationSpeed;
        }
        if (keys.right) {
            this.angle += this.rotationSpeed;
        }
        
        // Thrust
        this.thrusting = false;
        if (keys.up) {
            this.vx += Math.cos(this.angle) * this.getThrustPower();
            this.vy += Math.sin(this.angle) * this.getThrustPower();
            this.thrusting = true;
        }
        
        // Apply friction
        this.vx *= this.friction;
        this.vy *= this.friction;
        
        // Limit speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const maxSpeed = this.getMaxSpeed();
        if (speed > maxSpeed) {
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
        }
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Screen wrapping
        if (this.x < -this.radius) this.x = width + this.radius;
        if (this.x > width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = height + this.radius;
        if (this.y > height + this.radius) this.y = -this.radius;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Handle visual effects for different boosts
        if (this.hasBoost('invincibility')) {
            const time = Date.now() * 0.01;
            const hue = (time * 10) % 360;
            ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
        } else {
            ctx.strokeStyle = this.color;
        }
        
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-15, -10);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-15, 10);
        ctx.closePath();
        ctx.stroke();
        
        // Thrust effect
        if (this.thrusting) {
            ctx.strokeStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(-15, 0);
            ctx.lineTo(-25 - Math.random() * 10, 0);
            ctx.stroke();
        }
        
        // Shield effect
        if (this.hasBoost('shield')) {
            ctx.strokeStyle = '#3498DB';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
    }
}

class Asteroid {
    constructor(x, y, size, boostType = null, restoreData = null) {
        this.x = x;
        this.y = y;
        this.size = size; // 3 = large, 2 = medium, 1 = small
        this.radius = size * 12;
        this.boostType = boostType;
        
        if (restoreData) {
            // Restore exact state from saved game
            this.vx = restoreData.vx;
            this.vy = restoreData.vy;
            this.rotation = restoreData.rotation;
            this.rotationSpeed = (Math.random() - 0.5) * 0.02; // Keep same rotation speed
            this.pulseTime = 0;
            this.points = restoreData.points;
        } else {
            // Random movement
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 + 0.5;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            
            // Random rotation
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.02;
            this.pulseTime = 0;
            
            // Generate irregular shape
            this.points = [];
            const numPoints = 8 + Math.floor(Math.random() * 4);
            for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 2;
                const distance = this.radius * (0.7 + Math.random() * 0.6);
                this.points.push({
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance
                });
            }
        }
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        this.pulseTime += 0.02;
        
        // Screen wrapping
        const canvas = document.getElementById('gameCanvas');
        if (this.x < -this.radius) this.x = canvas.width + this.radius;
        if (this.x > canvas.width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = canvas.height + this.radius;
        if (this.y > canvas.height + this.radius) this.y = -this.radius;
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
        
        // Draw boost core if applicable
        if (this.boostType) {
            const pulseSize = 1 + Math.sin(this.pulseTime) * 0.3;
            const colors = {
                rapidFire: '#FF9500',
                speed: '#00FF7F',
                shield: '#3498DB',
                doublePoints: '#FFD700',
                biggerBullets: '#E74C3C',
                invincibility: '#9B59B6'
            };
            
            const color = colors[this.boostType] || '#FFFFFF';
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(0, 0, 8 * pulseSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, angle, playerVx, playerVy, playerIndex, isBigBullets = false) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * 8 + playerVx * 0.5;
        this.vy = Math.sin(angle) * 8 + playerVy * 0.5;
        this.life = isBigBullets ? 80 : 60; // Big bullets last longer
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
        this.boostType = boostType;
        
        // Create particles with boost-specific colors
        const colors = {
            rapidFire: '#FF9500',
            speed: '#00FF7F',
            shield: '#3498DB',
            doublePoints: '#FFD700',
            biggerBullets: '#E74C3C',
            invincibility: '#9B59B6'
        };
        
        const particleColor = colors[boostType] || '#FFFFFF';
        
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const speed = Math.random() * 4 + 2;
            this.particles.push({
                x: 0,
                y: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                color: particleColor
            });
        }
    }
    
    update() {
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.alpha -= 1 / this.life;
        });
        
        this.life--;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        this.particles.forEach(particle => {
            ctx.globalAlpha = particle.alpha;
            ctx.strokeStyle = particle.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(particle.x, particle.y);
            ctx.stroke();
        });
        
        ctx.restore();
        ctx.globalAlpha = 1;
    }
}

class BoostNotification {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 90; // frames
    }
    
    update() {
        this.life--;
    }
    
    render(ctx) {
        const alpha = Math.min(1, this.life / 30);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.font = '32px "JetBrains Mono", monospace';
        ctx.fontWeight = '700';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
        ctx.globalAlpha = 1;
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});
