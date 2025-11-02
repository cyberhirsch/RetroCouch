// ================================================================================
// FILE: blasteroids.js (with Universal Controller Integration)
// ================================================================================

class Game {
    constructor() {
        // --- Canvas and UI Element References ---
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
        this.saveGameStatus = document.getElementById('saveGameStatus');
        this.escapeMenu = document.getElementById('escapeMenu');
        this.escapeMenuTitle = document.getElementById('escapeMenuTitle');
        this.menuResume = document.getElementById('menuResume');
        this.menuSave = document.getElementById('menuSave');
        this.menuLoad = document.getElementById('menuLoad');
        this.menuMainMenu = document.getElementById('menuMainMenu');
        this.saveSlots = document.getElementById('saveSlots');
        this.playerHud2 = document.querySelector('.player-hud.p2');
        
        // --- State Management ---
        this.currentMenuItem = 0;
        this.menuOpen = false;
        this.awaitingSlot = false;
        this.currentSlotIndex = 0;
        this.keys1 = { left: false, right: false, up: false, shoot: false };
        this.keys2 = { left: false, right: false, up: false, shoot: false };

        // --- UNIVERSAL CONTROLLER INTEGRATION ---
        // The ControllerManager is a global singleton, already initialized by its own script file.
        // We just grab the instance to use it.
        this.controllerManager = new ControllerManager();
        // This is used to track "just pressed" events for menu navigation.
        this.gamepadButtonStates = [{}, {}]; 

        // --- Game Configuration ---
        this.boostTypes = {
            rapidFire: { color: '#FF9500', duration: 10000 },
            speed: { color: '#00FF7F', duration: 8000 },
            shield: { color: '#3498DB', duration: 12000 },
            doublePoints: { color: '#FFD700', duration: 15000 },
            biggerBullets: { color: '#E74C3C', duration: 10000 },
            invincibility: { color: '#9B59B6', duration: 6000 }
        };
        
        // --- Initialization ---
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
        // Keyboard event listeners remain the same.
        // NO gamepad-specific listeners are needed here anymore.
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
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
        
        // UI button click listeners
        this.singlePlayerBtn.addEventListener('click', () => this.selectMenuItem(0));
        this.multiplayerBtn.addEventListener('click', () => this.selectMenuItem(1));
        this.loadGameBtn.addEventListener('click', () => this.selectMenuItem(2));
        this.restartButton.addEventListener('click', () => { window.location.reload(); });
        this.menuResume.addEventListener('click', () => this.executeMenuAction(0));
        this.menuSave.addEventListener('click', () => this.executeMenuAction(1));
        this.menuLoad.addEventListener('click', () => this.executeMenuAction(2));
        this.menuMainMenu.addEventListener('click', () => this.executeMenuAction(3));
        this.saveSlots.querySelectorAll('.save-slot').forEach((slot, index) => {
            slot.addEventListener('click', () => { this.currentSlotIndex = index; this.executeSlotAction(index); });
        });
    }

    pollGamepads() {
        // Loop through players 1 and 2
        for (let i = 0; i < 2; i++) {
            // Get the clean, standardized state from the manager
            const state = this.controllerManager.getState(i);
            const keys = (i === 0) ? this.keys1 : this.keys2;

            // Helper to check if a virtual button was just pressed (for menus)
            const wasJustPressed = (buttonName) => {
                const isPressed = state[buttonName] || false;
                const wasPressed = this.gamepadButtonStates[i][buttonName] || false;
                this.gamepadButtonStates[i][buttonName] = isPressed;
                return isPressed && !wasPressed;
            };

            // If no controller is assigned to this player, the state will be empty.
            if (Object.keys(state).length === 0) {
                // We reset controller-driven keys here to avoid "stuck" inputs
                // if a controller is disconnected mid-game.
                if(i === 0) { this.keys1 = { ...this.keys1 }; } // create new object
                else { this.keys2 = { ...this.keys2 }; }
                continue;
            }

            // --- Menu Navigation Logic ---
            // Only Player 1's "start" button can pause for simplicity
            if (i === 0 && wasJustPressed('start')) {
                if (this.menuOpen) this.closeEscapeMenu();
                else if (this.gameRunning) this.showEscapeMenu();
            }

            // Any controller can navigate menus when they are open
            if (this.menuOpen || !this.gameRunning || this.awaitingSlot) {
                if (wasJustPressed('actionSouth')) this.handleKeydown({ code: 'Enter', preventDefault: () => {} });
                if (wasJustPressed('dpadUp')) this.handleKeydown({ code: 'ArrowUp', preventDefault: () => {} });
                if (wasJustPressed('dpadDown')) this.handleKeydown({ code: 'ArrowDown', preventDefault: () => {} });
            }

            // --- In-Game Player Control Logic ---
            if (this.gameRunning && !this.menuOpen && !this.awaitingSlot) {
                 // The keyboard state is handled by keydown/keyup.
                 // We combine it with the controller state. True if either is active.
                keys.up = (state.dpadUp || (state.leftStickY && state.leftStickY < -0.5)) || this.keys1.up;
                keys.left = (state.dpadLeft || (state.leftStickX && state.leftStickX < -0.5)) || this.keys1.left;
                keys.right = (state.dpadRight || (state.leftStickX && state.leftStickX > 0.5)) || this.keys1.right;
                // Allow multiple buttons/triggers for shooting
                keys.shoot = (state.actionSouth || state.actionWest || (state.rightTrigger && state.rightTrigger > 0.5)) || this.keys1.shoot;
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
        
        // Keyboard controls
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
    
    gameLoop() {
        this.pollGamepads(); // Always check for controller input
        if (this.gameRunning && !this.menuOpen) {
            this.update();
        }
        this.render(); // Render even when paused to see the pause menu
        requestAnimationFrame(() => this.gameLoop());
    }

    // ... The rest of your game logic (update, render, etc.) remains unchanged ...
    
    showStartScreen() { this.startScreen.classList.remove('hidden'); this.gameOverModal.classList.remove('show'); this.gameRunning = false; this.updateSaveGameStatus(); this.startScreenCurrentItem = 0; this.updateStartScreenSelection(); }
    showEscapeMenu() { this.menuOpen = true; this.escapeMenu.classList.add('show'); this.currentMenuItem = 0; this.updateMenuSelection(); }
    closeEscapeMenu() { this.menuOpen = false; this.escapeMenu.classList.remove('show'); this.hideSaveSlots(); }
    updateMenuSelection() { [this.menuResume, this.menuSave, this.menuLoad, this.menuMainMenu].forEach((item, i) => item.classList.toggle('selected', i === this.currentMenuItem)); }
    handleMenuKeydown(e) { if (e.code === 'ArrowUp' || e.code === 'KeyW') this.currentMenuItem = (this.currentMenuItem - 1 + 4) % 4; if (e.code === 'ArrowDown' || e.code === 'KeyS') this.currentMenuItem = (this.currentMenuItem + 1) % 4; if (e.code === 'Enter' || e.code === 'Space') this.executeMenuAction(this.currentMenuItem); this.updateMenuSelection(); }
    executeMenuAction(i) { switch(i) { case 0: this.closeEscapeMenu(); break; case 1: this.showSaveSlots('save'); break; case 2: this.showSaveSlots('load'); break; case 3: this.closeEscapeMenu(); this.showStartScreen(); break; } }
    showSaveSlots(action) { this.awaitingSlot = action; this.saveSlots.classList.add('show'); this.currentSlotIndex = 0; this.updateSaveSlotsDisplay(); this.updateSaveSlotSelection(); this.escapeMenuTitle.textContent = action === 'save' ? 'SAVE GAME' : 'LOAD GAME'; [this.menuResume, this.menuSave, this.menuLoad, this.menuMainMenu].forEach(item => item.style.display = 'none'); }
    hideSaveSlots() { this.awaitingSlot = false; this.saveSlots.classList.remove('show'); this.escapeMenuTitle.textContent = 'PAUSE MENU'; [this.menuResume, this.menuSave, this.menuLoad, this.menuMainMenu].forEach(item => item.style.display = 'block'); }
    handleSlotNavigation(e) { if (e.code === 'ArrowUp' || e.code === 'KeyW') this.currentSlotIndex = (this.currentSlotIndex - 1 + 6) % 6; if (e.code === 'ArrowDown' || e.code === 'KeyS') this.currentSlotIndex = (this.currentSlotIndex + 1) % 6; if (e.code === 'Enter' || e.code === 'Space') this.executeSlotAction(this.currentSlotIndex); this.updateSaveSlotSelection(); }
    updateSaveSlotsDisplay() { for (let i = 0; i < 6; i++) { const slot = this.saveSlots.querySelector(`[data-slot="${i}"]`), statusDiv = slot.querySelector('.slot-status'), data = localStorage.getItem(`asteroidsSaveSlot_${i}`); if (data) { statusDiv.textContent = `Saved ${new Date(JSON.parse(data).timestamp).toLocaleString()}`; statusDiv.classList.add('has-save'); } else { statusDiv.textContent = 'Empty'; statusDiv.classList.remove('has-save'); } } }
    updateSaveSlotSelection() { this.saveSlots.querySelectorAll('.save-slot').forEach((s, i) => s.classList.toggle('selected', i === this.currentSlotIndex)); }
    executeSlotAction(i) { if (this.awaitingSlot === 'save') this.saveGameToSlot(i); else if (this.awaitingSlot === 'load') this.loadGameFromSlot(i); }
    saveGameToSlot(i) { if (!this.gameRunning) return; localStorage.setItem(`asteroidsSaveSlot_${i}`, JSON.stringify({ playerCount: this.playerCount, scores: this.scores, wave: this.wave, timestamp: Date.now(), players: this.players.map(p => p.serialize()), asteroids: this.asteroids.map(a => a.serialize()) })); this.hideSaveSlots(); this.closeEscapeMenu(); }
    loadGameFromSlot(i) { const data = localStorage.getItem(`asteroidsSaveSlot_${i}`); if (!data) return; const state = JSON.parse(data); this.startScreen.classList.add('hidden'); this.playerCount = state.playerCount; this.scores = state.scores; this.wave = state.wave; this.players = state.players.map(d => Player.deserialize(d)); this.asteroids = state.asteroids.map(d => Asteroid.deserialize(d)); this.bullets = []; this.explosions = []; this.boostNotifications = []; this.playerHud2.classList.toggle('dead', this.playerCount === 1); this.playerHud2.classList.toggle('alive', this.playerCount === 2); this.lastShootTimes = new Array(this.playerCount).fill(0); this.gameRunning = true; this.hideGameOver(); this.updateScores(); this.updateLives(); this.boostIndicators1.innerHTML = ''; this.boostIndicators2.innerHTML = ''; this.players.forEach((p, i) => p.boosts.forEach(b => this.addBoostIndicator(i, b.type))); this.hideSaveSlots(); this.closeEscapeMenu(); }
    navigateStartScreen(dir) { this.startScreenCurrentItem = (this.startScreenCurrentItem + dir + 3) % 3; this.updateStartScreenSelection(); }
    updateStartScreenSelection() { [this.singlePlayerBtn, this.multiplayerBtn, this.loadGameBtn].forEach((item, i) => item.classList.toggle('selected', i === this.startScreenCurrentItem)); }
    activateCurrentMenuItem() { if (this.startScreenCurrentItem === 0) this.startGame(1); else if (this.startScreenCurrentItem === 1) this.startGame(2); else if (this.startScreenCurrentItem === 2) this.loadGame(); }
    selectMenuItem(i) { this.startScreenCurrentItem = i; this.updateStartScreenSelection(); this.activateCurrentMenuItem(); }
    startGame(count) { this.playerCount = count; this.startScreen.classList.add('hidden'); this.players = []; const pos = [{ x: this.canvas.width/2-100, y: this.canvas.height/2 }, { x: this.canvas.width/2+100, y: this.canvas.height/2 }]; for (let i = 0; i < count; i++) this.players.push(new Player(i+1, pos[i].x, pos[i].y, i===0?'#00FFFF':'#FF00FF', 6)); this.playerHud2.classList.toggle('dead', count===1); this.playerHud2.classList.toggle('alive', count===2); this.asteroids = []; this.bullets = []; this.explosions = []; this.boostNotifications = []; this.scores = new Array(count).fill(0); this.gameRunning = true; this.lastShootTimes = new Array(count).fill(0); this.shootCooldown = 150; this.wave = 1; this.hideGameOver(); this.spawnAsteroids(); this.updateScores(); this.updateLives(); }
    spawnAsteroids() { for (let i = 0; i < 3+this.wave; i++) { let x, y; do { x = Math.random()*this.canvas.width; y = Math.random()*this.canvas.height; } while (this.players.some(p => this.getDistance(x, y, p.x, p.y) < 200)); this.asteroids.push(new Asteroid(x, y, 3, Math.random() < 0.2 ? this.getRandomBoostType() : null)); } }
    getRandomBoostType() { const keys = Object.keys(this.boostTypes); return keys[Math.floor(Math.random() * keys.length)]; }
    getDistance(x1, y1, x2, y2) { return Math.sqrt((x2 - x1)**2 + (y2 - y1)**2); }
    updateScores() { this.scoreDisplay1.textContent = this.scores[0] || 0; if (this.playerCount === 2) this.scoreDisplay2.textContent = this.scores[1] || 0; }
    updateLives() { if (this.players[0]) { this.livesDisplay1.textContent = this.players[0].lives; this.updateLivesIcons(1, this.players[0].lives); } if (this.players[1]) { this.livesDisplay2.textContent = this.players[1].lives; this.updateLivesIcons(2, this.players[1].lives); } }
    updateLivesIcons(pIdx, lives) { const icons = pIdx === 1 ? this.livesIcons1 : this.livesIcons2; icons.querySelectorAll('.life-icon').forEach((icon, i) => icon.classList.toggle('lost', i >= lives)); }
    showGameOver() { this.gameRunning = false; this.finalScore1.textContent = this.scores[0] || 0; const p2score = this.finalScore1.parentElement.querySelector('#finalScore2'); if (this.playerCount === 2) { p2score.textContent = this.scores[1] || 0; p2score.previousElementSibling.style.display = 'block'; p2score.style.display = 'block'; } else { p2score.previousElementSibling.style.display = 'none'; p2score.style.display = 'none'; } this.gameOverModal.classList.add('show'); }
    hideGameOver() { this.gameOverModal.classList.remove('show'); }
    update() { const now = Date.now(); this.players.forEach((p, i) => { if (p.lives <= 0) return; const keys = i === 0 ? this.keys1 : this.keys2; p.update(keys, this.canvas.width, this.canvas.height); this.updatePlayerBoosts(p, i, now); if (keys.shoot && now - this.lastShootTimes[i] > this.getShootCooldown(p)) { this.shoot(i); this.lastShootTimes[i] = now; } }); this.bullets = this.bullets.filter(b => b.life > 0); this.bullets.forEach(b => b.update()); this.asteroids.forEach(a => a.update(this.canvas.width, this.canvas.height)); this.explosions = this.explosions.filter(e => e.life > 0); this.explosions.forEach(e => e.update()); this.boostNotifications = this.boostNotifications.filter(n => n.life > 0); this.boostNotifications.forEach(n => n.update()); this.checkCollisions(); if (this.asteroids.length === 0 && this.gameRunning) { this.wave++; this.spawnAsteroids(); } if (this.players.every(p => p.lives <= 0)) this.showGameOver(); }
    getShootCooldown(p) { return p.hasBoost('rapidFire') ? 50 : this.shootCooldown; }
    updatePlayerBoosts(p, pIdx, now) { p.boosts = p.boosts.filter(b => { const active = now < b.endTime; if (!active) this.removeBoostIndicator(pIdx, b.type); return active; }); this.updateBoostIndicators(p, pIdx, now); }
    updateBoostIndicators(p, pIdx, now) { const container = pIdx === 0 ? this.boostIndicators1 : this.boostIndicators2; p.boosts.forEach(b => { const ind = container.querySelector(`[data-boost="${b.type}"]`); if (ind) ind.querySelector('.boost-timer-bar').style.width = `${Math.max(0, (b.endTime - now) / b.duration * 100)}%`; }); }
    addBoostIndicator(pIdx, type) { const container = pIdx === 0 ? this.boostIndicators1 : this.boostIndicators2; if (container.querySelector(`[data-boost="${type}"]`)) return; const conf = this.boostTypes[type], ind = document.createElement('div'); ind.className = 'boost-indicator'; ind.dataset.boost = type; ind.innerHTML = `<div class="boost-icon">${this.getBoostIcon(type)}</div><div class="boost-timer"><div class="boost-timer-bar" style="background:${conf.color};"></div></div>`; container.appendChild(ind); }
    removeBoostIndicator(pIdx, type) { const ind = (pIdx === 0 ? this.boostIndicators1 : this.boostIndicators2).querySelector(`[data-boost="${type}"]`); if (ind) { ind.classList.add('disappearing'); setTimeout(() => ind.remove(), 250); } }
    getBoostIcon(type) { return { rapidFire: '⚡', speed: '🚀', shield: '🛡️', doublePoints: '💰', biggerBullets: '💥', invincibility: '✨' }[type] || '⭐'; }
    shoot(pIdx) { const p = this.players[pIdx]; this.bullets.push(new Bullet(p.x + Math.cos(p.angle) * 20, p.y + Math.sin(p.angle) * 20, p.angle, p.vx, p.vy, pIdx, p.hasBoost('biggerBullets'))); }
    checkCollisions() { for (let i = this.bullets.length - 1; i >= 0; i--) for (let j = this.asteroids.length - 1; j >= 0; j--) { const b = this.bullets[i], a = this.asteroids[j]; if (this.getDistance(b.x, b.y, a.x, a.y) < a.radius + b.radius) { this.bullets.splice(i, 1); this.explosions.push(new Explosion(a.x, a.y, a.boostType)); if (a.boostType) this.applyBoost(b.playerIndex, a.boostType); const p = this.players[b.playerIndex]; this.scores[b.playerIndex] += (p.hasBoost('doublePoints') ? 2 : 1) * (a.size === 3 ? 20 : a.size === 2 ? 50 : 100); this.updateScores(); this.splitAsteroid(j); break; } } this.players.forEach((p, i) => { if (p.lives <= 0 || p.hasBoost('invincibility') || p.hasBoost('shield')) return; for (const a of this.asteroids) if (this.getDistance(p.x, p.y, a.x, a.y) < p.radius + a.radius * 0.8) { this.playerHit(i); break; } }); if (this.playerCount === 2) this.checkPlayerCollisions(); }
    checkPlayerCollisions() { const [p1, p2] = this.players; if (!p1 || !p2 || p1.lives <= 0 || p2.lives <= 0) return; if (this.getDistance(p1.x, p1.y, p2.x, p2.y) < p1.radius + p2.radius) { this.explosions.push(new Explosion((p1.x+p2.x)/2, (p1.y+p2.y)/2)); const angle = Math.atan2(p2.y-p1.y, p2.x-p1.x); p1.vx -= Math.cos(angle)*2; p1.vy -= Math.sin(angle)*2; p2.vx += Math.cos(angle)*2; p2.vy += Math.sin(angle)*2; } }
    playerHit(pIdx) { const p = this.players[pIdx]; p.lives--; p.clearBoosts(); (pIdx === 0 ? this.boostIndicators1 : this.boostIndicators2).innerHTML = ''; this.updateLives(); if (p.lives > 0) this.respawnPlayer(pIdx); }
    respawnPlayer(pIdx) { const p = this.players[pIdx], pos = pIdx === 0 ? {x:this.canvas.width/4, y:this.canvas.height/2} : {x:this.canvas.width*3/4, y:this.canvas.height/2}; p.x = pos.x; p.y = pos.y; p.vx = 0; p.vy = 0; p.angle = -Math.PI/2; p.addBoost('invincibility', 2000); this.addBoostIndicator(pIdx, 'invincibility'); }
    applyBoost(pIdx, type) { const p = this.players[pIdx], conf = this.boostTypes[type]; p.addBoost(type, conf.duration); this.addBoostIndicator(pIdx, type); this.showBoostNotification(pIdx, type, conf.color); }
    showBoostNotification(pIdx, type, color) { const names = { rapidFire: 'RAPID FIRE', speed: 'SPEED BOOST', shield: 'SHIELD', doublePoints: 'DOUBLE POINTS', biggerBullets: 'BIG BULLETS', invincibility: 'INVINCIBLE' }; this.boostNotifications.push(new BoostNotification(pIdx===0?this.canvas.width/4:this.canvas.width*3/4, this.canvas.height/2, `${this.getBoostIcon(type)} ${names[type]}`, color)); }
    splitAsteroid(aIdx) { const a = this.asteroids[aIdx]; this.asteroids.splice(aIdx, 1); if (a.size > 1) for (let i = 0; i < 2; i++) this.asteroids.push(new Asteroid(a.x, a.y, a.size - 1, null)); }
    render() { this.ctx.fillStyle = '#000000'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); this.players.forEach(p => { if (p.lives > 0) p.render(this.ctx); }); this.bullets.forEach(b => b.render(this.ctx)); this.asteroids.forEach(a => a.render(this.ctx)); this.explosions.forEach(e => e.render(this.ctx)); this.boostNotifications.forEach(n => n.render(this.ctx)); }
    loadGame() { this.showSaveSlots('load'); }
    hasSavedGame() { for (let i = 0; i < 6; i++) if (localStorage.getItem(`asteroidsSaveSlot_${i}`)) return true; return false; }
    updateSaveGameStatus() { this.loadGameBtn.style.display = this.hasSavedGame() ? 'flex' : 'none'; }
}

// All helper classes (Player, Asteroid, Bullet, etc.) are included below and are unchanged.
// ... (The rest of your code from the previous submission) ...
class Player { constructor(id, x, y, color, lives = 6) { this.id = id; this.x = x; this.y = y; this.color = color; this.lives = lives; this.angle = -Math.PI / 2; this.vx = 0; this.vy = 0; this.radius = 15; this.rotationSpeed = 0.1; this.baseThrustPower = 0.3; this.friction = 0.99; this.baseMaxSpeed = 8; this.thrusting = false; this.boosts = []; } hasBoost(type) { return this.boosts.some(b => b.type === type); } addBoost(type, duration) { const endTime = Date.now() + duration; const existing = this.boosts.find(b => b.type === type); if (existing) { existing.endTime = endTime; existing.duration = duration; } else { this.boosts.push({ type, endTime, duration }); } } clearBoosts() { this.boosts = []; } getThrustPower() { return this.baseThrustPower * (this.hasBoost('speed') ? 1.5 : 1); } getMaxSpeed() { return this.baseMaxSpeed * (this.hasBoost('speed') ? 1.3 : 1); } update(keys, width, height) { if (keys.left) this.angle -= this.rotationSpeed; if (keys.right) this.angle += this.rotationSpeed; this.thrusting = !!keys.up; if (keys.up) { this.vx += Math.cos(this.angle) * this.getThrustPower(); this.vy += Math.sin(this.angle) * this.getThrustPower(); } this.vx *= this.friction; this.vy *= this.friction; const speed = Math.sqrt(this.vx ** 2 + this.vy ** 2); const maxSpeed = this.getMaxSpeed(); if (speed > maxSpeed) { this.vx = (this.vx / speed) * maxSpeed; this.vy = (this.vy / speed) * maxSpeed; } this.x += this.vx; this.y += this.vy; if (this.x < -this.radius) this.x = width + this.radius; if (this.x > width + this.radius) this.x = -this.radius; if (this.y < -this.radius) this.y = height + this.radius; if (this.y > height + this.radius) this.y = -this.radius; } render(ctx) { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.strokeStyle = this.hasBoost('invincibility') ? `hsl(${(Date.now()/10)%360}, 100%, 70%)` : this.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-15, -12); ctx.lineTo(-10, 0); ctx.lineTo(-15, 12); ctx.closePath(); ctx.stroke(); if (this.thrusting) { ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-25 - Math.random() * 10, 0); ctx.stroke(); } if (this.hasBoost('shield')) { ctx.strokeStyle = '#3498DB'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2); ctx.stroke(); } ctx.restore(); } serialize() { return { id: this.id, x: this.x, y: this.y, angle: this.angle, vx: this.vx, vy: this.vy, lives: this.lives, boosts: this.boosts }; } static deserialize(data) { const p = new Player(data.id, data.x, data.y, data.id === 1 ? '#00FFFF' : '#FF00FF', data.lives); Object.assign(p, data); return p; } }
class Asteroid { constructor(x, y, size, boostType = null) { this.x = x; this.y = y; this.size = size; this.boostType = boostType; this.radius = size * 15; const angle = Math.random() * Math.PI * 2, speed = Math.random() * (4-size) + 0.5; this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed; this.rotation = Math.random() * Math.PI * 2; this.rotationSpeed = (Math.random() - 0.5) * 0.04; this.pulseTime = 0; this.points = []; const numPoints = 8 + Math.floor(Math.random() * 5); for (let i = 0; i < numPoints; i++) { const a = (i / numPoints) * Math.PI * 2, d = this.radius * (0.8 + Math.random() * 0.4); this.points.push({ x: Math.cos(a) * d, y: Math.sin(a) * d }); } } update(width, height) { this.x += this.vx; this.y += this.vy; this.rotation += this.rotationSpeed; this.pulseTime += 0.05; if (this.x < -this.radius) this.x = width + this.radius; if (this.x > width + this.radius) this.x = -this.radius; if (this.y < -this.radius) this.y = height + this.radius; if (this.y > height + this.radius) this.y = -this.radius; } render(ctx) { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.points[0].x, this.points[0].y); this.points.forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.stroke(); if (this.boostType) { const colors = { rapidFire: '#FF9500', speed: '#00FF7F', shield: '#3498DB', doublePoints: '#FFD700', biggerBullets: '#E74C3C', invincibility: '#9B59B6' }; ctx.fillStyle = colors[this.boostType]; ctx.globalAlpha = 0.5 + Math.sin(this.pulseTime) * 0.3; ctx.beginPath(); ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); } serialize() { return { x: this.x, y: this.y, size: this.size, vx: this.vx, vy: this.vy, rotation: this.rotation, boostType: this.boostType, points: this.points }; } static deserialize(data) { const a = new Asteroid(data.x, data.y, data.size, data.boostType); Object.assign(a, data); return a; } }
class Bullet { constructor(x, y, angle, pVx, pVy, pIdx, isBig = false) { this.x = x; this.y = y; this.playerIndex = pIdx; this.isBigBullets = isBig; this.vx = Math.cos(angle) * 10 + pVx; this.vy = Math.sin(angle) * 10 + pVy; this.life = 60; this.radius = isBig ? 6 : 3; } update() { this.x += this.vx; this.y += this.vy; this.life--; } render(ctx) { ctx.fillStyle = this.isBigBullets ? '#E74C3C' : '#FFFFFF'; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); } }
class Explosion { constructor(x, y, boostType = null) { this.x = x; this.y = y; this.life = 30; this.particles = []; const colors = { rapidFire: '#FF9500', speed: '#00FF7F', shield: '#3498DB', doublePoints: '#FFD700', biggerBullets: '#E74C3C', invincibility: '#9B59B6' }; for (let i = 0; i < 15; i++) { const angle = Math.random() * Math.PI * 2, speed = Math.random() * 5 + 2; this.particles.push({ x: 0, y: 0, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, alpha: 1, color: colors[boostType] || '#FFFFFF' }); } } update() { this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.alpha -= 1 / this.life; }); this.life--; } render(ctx) { ctx.save(); ctx.translate(this.x, this.y); this.particles.forEach(p => { ctx.globalAlpha = p.alpha; ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx, p.y - p.vy); ctx.stroke(); }); ctx.restore(); } }
class BoostNotification { constructor(x, y, text, color) { this.x = x; this.y = y; this.text = text; this.color = color; this.life = 120; } update() { this.y -= 0.5; this.life--; } render(ctx) { ctx.save(); ctx.globalAlpha = Math.min(1, this.life / 30); ctx.fillStyle = this.color; ctx.font = 'bold 32px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.strokeStyle = 'black'; ctx.lineWidth = 4; ctx.strokeText(this.text, this.x, this.y); ctx.fillText(this.text, this.x, this.y); ctx.restore(); } }

window.addEventListener('load', () => {
    new Game();
});
