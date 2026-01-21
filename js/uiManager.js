import { games } from '../games/registry.js';

export class UIManager {
    constructor(controllerSystem) {
        this.cs = controllerSystem;
        this.canvas = document.getElementById('test-game-canvas');
        this.ctx = this.canvas?.getContext('2d');
        this.currentGame = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('btn-create-profile').addEventListener('click', () => this.showProfileEditor());

        // Global Escape listener for exiting games
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.currentGame) {
                    this.exitGame();
                } else if (!document.getElementById('modal-container').classList.contains('hidden')) {
                    document.getElementById('modal-container').classList.add('hidden');
                }
            }
        });
    }

    renderInitial() {
        this.renderLauncher();
        this.renderSettings();
        this.renderDocs();
    }

    renderLauncher() {
        const grid = document.getElementById('game-grid');

        grid.innerHTML = games.map(game => `
            <div class="game-tile ${game.enabled ? '' : 'disabled'}" data-game-id="${game.id}">
                <div class="tile-img" style="background: ${game.color}; display: flex; align-items: center; justify-content: center; font-size: 3rem;">
                    ${game.icon || (game.enabled ? '🎮' : '🔒')}
                </div>
                <div class="tile-info">
                    <h3 class="tile-title">${game.title}</h3>
                    <div class="tags">
                        ${game.tags.map(t => `<span class="tag">${t}</span>`).join('')}
                        <span class="tag status ${game.enabled ? '' : 'coming-soon'}">${game.status}</span>
                    </div>
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('.game-tile').forEach(tile => {
            tile.addEventListener('click', () => {
                const gameId = tile.dataset.gameId;
                const game = games.find(g => g.id === gameId);

                if (game && game.enabled) {
                    this.launchGame(game);
                }
            });
        });
    }

    async launchGame(gameMetadata) {
        const gameView = document.getElementById('test-game-view');

        // Navigate UI
        document.getElementById('nav-launcher').classList.remove('active');
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        gameView.classList.remove('hidden');
        document.getElementById('game-view-title').innerText = gameMetadata.title;

        // Fullscreen Handling
        if (gameMetadata.fullscreen) {
            gameView.classList.add('fullscreen-mode');
        } else {
            gameView.classList.remove('fullscreen-mode');
        }

        try {
            const module = await import(gameMetadata.modulePath);
            if (module.initGame) {
                this.currentGame = module.initGame(this.canvas, this.cs);
                this.currentGame.start();
                this.resizeListener = () => this.currentGame.resize();
                window.addEventListener('resize', this.resizeListener);
            }
        } catch (err) {
            console.error('Failed to load game module:', err);
        }
    }

    exitGame() {
        this.stopTestGame();

        // Return to launcher
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.getElementById('launcher-view').classList.remove('hidden');
        document.getElementById('nav-launcher').classList.add('active');
        document.getElementById('test-game-view').classList.remove('fullscreen-mode');

        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
            this.resizeListener = null;
        }
    }

    renderSettings() {
        this.renderPlayerCards();
        this.renderProfilesList();
    }

    renderPlayerCards() {
        const container = document.getElementById('player-cards');
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

        container.innerHTML = this.cs.players.map((p, i) => `
            <div class="player-card glass-card">
                <h4>Player ${i + 1}</h4>
                <div class="field">
                    <label>Name</label>
                    <input type="text" value="${p.name}" data-player-index="${i}" class="player-name-input">
                </div>
                <div class="field">
                    <label>Profile</label>
                    <select data-player-index="${i}" class="player-profile-select">
                        ${Object.entries(this.cs.profiles).map(([id, prof]) => `
                            <option value="${id}" ${p.profileId === id ? 'selected' : ''}>${prof.name}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="field">
                    <label>Device</label>
                    <select data-player-index="${i}" class="player-device-select">
                        <option value="">None</option>
                        <option value="keyboard" ${p.device === 'keyboard' ? 'selected' : ''}>Keyboard</option>
                        ${Array.from(gamepads).map((gp, gidx) => gp ? `
                            <option value="gamepad-${gidx}" ${p.device === `gamepad-${gidx}` ? 'selected' : ''}>
                                Gamepad ${gidx}: ${gp.id.substring(0, 20)}...
                            </option>
                        ` : '').join('')}
                    </select>
                </div>
            </div>
        `).join('');

        // Listeners for changes
        container.querySelectorAll('.player-name-input').forEach(input => {
            input.addEventListener('change', (e) => {
                this.cs.players[e.target.dataset.playerIndex].name = e.target.value;
                this.cs.save();
            });
        });
        container.querySelectorAll('.player-profile-select').forEach(select => {
            select.addEventListener('change', (e) => {
                this.cs.players[e.target.dataset.playerIndex].profileId = e.target.value;
                this.cs.save();
            });
        });
        container.querySelectorAll('.player-device-select').forEach(select => {
            select.addEventListener('change', (e) => {
                this.cs.players[e.target.dataset.playerIndex].device = e.target.value;
                this.cs.save();
                this.renderPlayerCards(); // Refresh to update device availability (optional)
            });
        });
    }

    renderProfilesList() {
        const container = document.getElementById('profiles-list');
        container.innerHTML = Object.entries(this.cs.profiles).map(([id, prof]) => `
            <div class="profile-item">
                <span>${prof.name} ${prof.isDefault ? '<small>(Default)</small>' : ''}</span>
                <div class="profile-actions">
                    <button class="btn-edit" data-id="${id}">Edit</button>
                    ${!prof.isDefault ? `<button class="btn-delete" data-id="${id}">Delete</button>` : ''}
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => this.showProfileEditor(btn.dataset.id));
        });

        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm(`Delete profile "${this.cs.profiles[btn.dataset.id].name}"?`)) {
                    delete this.cs.profiles[btn.dataset.id];
                    this.cs.save();
                    this.renderProfilesList();
                    this.renderPlayerCards(); // Refresh selects
                }
            });
        });
    }

    initTestGame() {
        // Legacy support if needed, but launchGame handles it now
    }

    stopTestGame() {
        if (this.currentGame) {
            this.currentGame.stop();
            this.currentGame = null;
        }
    }

    update() {
        if (this.currentGame) {
            this.currentGame.update();
            this.currentGame.draw();
        }
        this.updateDebugView();
    }


    updateDebugView() {
        const debug = document.getElementById('debug-output');
        if (!debug) return;

        debug.innerHTML = this.cs.players.map((p, i) => `
            <div class="debug-player ${p.device ? 'active' : 'inactive'}">
                <h4>${p.name}</h4>
                <pre>${JSON.stringify(p.state, (key, value) => typeof value === 'number' ? value.toFixed(2) : value, 2)}</pre>
            </div>
        `).join('');
    }

    showProfileEditor(profileId = null) {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        modal.classList.remove('hidden');

        const isNew = !profileId;
        const profile = profileId ? { ...this.cs.profiles[profileId] } : {
            name: 'New Custom Profile',
            mapping: { ...this.cs.profiles['default-gamepad'].mapping }
        };

        const actions = Object.keys(this.cs.getEmptyState());

        content.innerHTML = `
            <div class="profile-editor">
                <header class="modal-header">
                    <h3>${isNew ? 'Create New Profile' : 'Edit Profile'}</h3>
                    <button class="btn-close" id="btn-modal-close">×</button>
                </header>
                <div class="field">
                    <label>Profile Name</label>
                    <input type="text" id="edit-profile-name" value="${profile.name}" ${profile.isDefault ? 'disabled' : ''}>
                </div>
                <div class="mapping-grid">
                    ${actions.map(action => `
                        <div class="mapping-item">
                            <span class="action-label">${action}</span>
                            <div class="mapping-control">
                                <span class="current-mapping" id="map-${action}">${this.formatMapping(profile.mapping[action])}</span>
                                ${!profile.isDefault ? `<button class="btn-remap" data-action="${action}">Remap</button>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" id="btn-save-profile" ${profile.isDefault ? 'disabled' : ''}>Save Profile</button>
                    ${!isNew && !profile.isDefault ? `<button class="btn-delete-modal" id="btn-delete-profile">Delete</button>` : ''}
                </div>
            </div>
        `;

        document.getElementById('btn-modal-close').onclick = () => modal.classList.add('hidden');

        if (!profile.isDefault) {
            content.querySelectorAll('.btn-remap').forEach(btn => {
                btn.onclick = (e) => this.initRemap(e.target.dataset.action, profile);
            });

            document.getElementById('btn-save-profile').onclick = () => {
                const name = document.getElementById('edit-profile-name').value;
                const id = isNew ? `custom-${Date.now()}` : profileId;
                this.cs.profiles[id] = { ...profile, name, isDefault: false };
                this.cs.save();
                modal.classList.add('hidden');
                this.renderSettings();
            };

            const btnDelete = document.getElementById('btn-delete-profile');
            if (btnDelete) {
                btnDelete.onclick = () => {
                    if (confirm(`Delete profile "${profile.name}"?`)) {
                        delete this.cs.profiles[profileId];
                        this.cs.save();
                        modal.classList.add('hidden');
                        this.renderSettings();
                    }
                };
            }
        }
    }

    formatMapping(m) {
        if (!m) return 'None';
        if (typeof m === 'string') return m;
        return `${m.pos}/${m.neg}`;
    }

    initRemap(action, profile) {
        const btn = document.querySelector(`.btn-remap[data-action="${action}"]`);
        const label = document.getElementById(`map-${action}`);
        const originalText = label.innerText;

        label.innerText = 'Waiting for input...';
        btn.disabled = true;

        const listener = (e) => {
            e.preventDefault();
            profile.mapping[action] = e.code;
            label.innerText = e.code;
            btn.disabled = false;
            window.removeEventListener('keydown', listener);
        };

        window.addEventListener('keydown', listener);

        // Timeout if no key pressed? Or just wait.
        // Also should handle gamepad buttons... simplified to keyboard for now.
    }

    renderDocs() {
        const docs = document.querySelector('#docs-view .docs-content');
        if (!docs) return;
        docs.innerHTML = `
            <h3>Integrating a New Game</h3>
            <p>RetroCouch GameHub is designed for rapid game development. Follow these steps to add your game:</p>
            
            <div class="field">
                <label>1. Create your game folder</label>
                <p>Add a new directory under <code>/games/my-game/</code>.</p>
            </div>

            <div class="field">
                <label>2. Implement the Lifecycle</label>
                <p>Your main game file must export an <code>initGame</code> function that returns a lifecycle object:</p>
                <div class="code-block">
                    <pre><code>export function initGame(canvas, controllerSystem) {
    return {
        start() { /* Setup */ },
        stop() { /* Cleanup */ },
        update() { /* Game Logic */ },
        draw() { /* Rendering */ },
        resize() { /* Handle canvas size */ }
    };
}</code></pre>
                </div>
            </div>

            <div class="field">
                <label>3. Register in the Registry</label>
                <p>Open <code>/games/registry.js</code> and add your game metadata:</p>
                <div class="code-block">
                    <pre><code>{
    id: 'my-game',
    title: 'My Project',
    modulePath: './games/my-game/main.js',
    enabled: true,
    // ... metadata
}</code></pre>
                </div>
            </div>

            <h4>Standardized Game Actions</h4>
            <ul class="action-list">
                <li><strong>actionSouth, actionEast, actionWest, actionNorth</strong> (Boolean)</li>
                <li><strong>leftStickX, leftStickY</strong> (Number: -1.0 to 1.0)</li>
                <li><strong>rightStickX, rightStickY</strong> (Number: -1.0 to 1.0)</li>
                <li><strong>dpadUp, dpadDown, dpadLeft, dpadRight</strong> (Boolean)</li>
                <li><strong>leftBumper, rightBumper, leftTrigger, rightTrigger</strong> (Boolean)</li>
                <li><strong>start, select</strong> (Boolean)</li>
            </ul>
        `;
    }
}
