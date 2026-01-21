/**
 * Light Cycles - 2-4 Player Grid Survival.
 * Shared screen multiplayer implementation for RetroCouch GameHub.
 */

export class LightCycles {
    constructor(canvas, controllerSystem) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cs = controllerSystem;
        this.isRunning = false;

        // Grid Configuration
        this.gridSize = 10;
        this.tickRate = 100; // Speed of movement (ms)
        this.lastUpdateTime = 0;

        this.reset();
    }

    reset() {
        this.isGameOver = false;
        this.winner = null;

        // Players: 0: up, 1: right, 2: down, 3: left
        this.players = [
            { id: 0, x: 0, y: 0, dir: 1, nextDir: 1, color: '#7c4dff', alive: false, trail: [] },
            { id: 1, x: 0, y: 0, dir: 3, nextDir: 3, color: '#00e5ff', alive: false, trail: [] },
            { id: 2, x: 0, y: 0, dir: 2, nextDir: 2, color: '#69f0ae', alive: false, trail: [] },
            { id: 3, x: 0, y: 0, dir: 0, nextDir: 0, color: '#ff5252', alive: false, trail: [] }
        ];

        this.fullTrailMap = new Set(); // Map for fast collision checking: "x,y"
    }

    start() {
        this.isRunning = true;
        this.resize();
    }

    stop() {
        this.isRunning = false;
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.cols = Math.floor(rect.width / this.gridSize);
        this.rows = Math.floor((rect.width * 0.6) / this.gridSize);
        this.canvas.width = this.cols * this.gridSize;
        this.canvas.height = this.rows * this.gridSize;

        this.initPositions();
    }

    initPositions() {
        this.fullTrailMap.clear();
        const p = 10; // Padding from edges in grid units

        this.players.forEach((player, i) => {
            player.alive = !!this.cs.players[i].device;
            player.trail = [];

            if (i === 0) { player.x = p; player.y = p; player.dir = 1; }
            if (i === 1) { player.x = this.cols - p; player.y = this.rows - p; player.dir = 3; }
            if (i === 2) { player.x = this.cols - p; player.y = p; player.dir = 2; }
            if (i === 3) { player.x = p; player.y = this.rows - p; player.dir = 0; }

            player.nextDir = player.dir;
            if (player.alive) {
                this.fullTrailMap.add(`${player.x},${player.y}`);
            }
        });
    }

    update() {
        if (!this.isRunning || this.isGameOver) {
            const s1 = this.cs.getControllerState(0);
            if (this.isGameOver && (s1.actionSouth || s1.start)) {
                this.reset();
                this.resize();
            }
            return;
        }

        const now = Date.now();

        // Handle Inputs every frame
        this.players.forEach((p, i) => {
            if (!p.alive) return;
            const state = this.cs.getControllerState(i);

            if ((state.dpadUp || state.leftStickY < -0.5) && p.dir !== 2) p.nextDir = 0;
            if ((state.dpadRight || state.leftStickX > 0.5) && p.dir !== 3) p.nextDir = 1;
            if ((state.dpadDown || state.leftStickY > 0.5) && p.dir !== 0) p.nextDir = 2;
            if ((state.dpadLeft || state.leftStickX < -0.5) && p.dir !== 1) p.nextDir = 3;
        });

        // Logic Tick
        if (now - this.lastUpdateTime > this.tickRate) {
            this.lastUpdateTime = now;
            this.move();
        }
    }

    move() {
        let aliveCount = 0;
        let lastSurvivor = null;

        this.players.forEach(p => {
            if (!p.alive) return;

            // Add current pos to trail map
            this.fullTrailMap.add(`${p.x},${p.y}`);
            p.trail.push({ x: p.x, y: p.y });

            p.dir = p.nextDir;
            if (p.dir === 0) p.y--;
            if (p.dir === 1) p.x++;
            if (p.dir === 2) p.y++;
            if (p.dir === 3) p.x--;

            // Collision: Walls
            if (p.x < 0 || p.x >= this.cols || p.y < 0 || p.y >= this.rows) {
                p.alive = false;
                return;
            }

            // Collision: Trails (Self and others)
            if (this.fullTrailMap.has(`${p.x},${p.y}`)) {
                p.alive = false;
                return;
            }
        });

        // Check for double head-on collisions (if two players move to the exact same cell)
        const currentHeads = new Map();
        this.players.forEach(p => {
            if (!p.alive) return;
            const key = `${p.x},${p.y}`;
            if (currentHeads.has(key)) {
                p.alive = false;
                this.players[currentHeads.get(key)].alive = false;
            } else {
                currentHeads.set(key, p.id);
            }
        });

        // Check Win Condition
        this.players.forEach(p => {
            if (p.alive) {
                aliveCount++;
                lastSurvivor = p;
            }
        });

        if (aliveCount <= 1 && this.players.filter(p => !!this.cs.players[p.id].device).length > 1) {
            this.isGameOver = true;
            this.winner = lastSurvivor;
        } else if (aliveCount === 0) {
            this.isGameOver = true;
            this.winner = null; // Draw
        }
    }

    draw() {
        if (!this.isRunning || !this.ctx) return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Trails
        this.players.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;

            p.trail.forEach(segment => {
                ctx.fillRect(segment.x * this.gridSize, segment.y * this.gridSize, this.gridSize, this.gridSize);
            });

            // Draw Head
            if (p.alive) {
                ctx.shadowBlur = 20;
                ctx.fillStyle = '#fff';
                ctx.fillRect(p.x * this.gridSize, p.y * this.gridSize, this.gridSize, this.gridSize);
            }
        });

        // Draw HUD
        this.players.forEach((p, i) => {
            if (!this.cs.players[i].device) return;
            ctx.shadowBlur = 0;
            ctx.fillStyle = p.alive ? p.color : '#555';
            ctx.font = '700 12px Outfit';
            ctx.textAlign = 'center';

            let tx = 0, ty = 0;
            if (i === 0) { tx = 40; ty = 20; }
            if (i === 1) { tx = this.canvas.width - 40; ty = this.canvas.height - 10; }
            if (i === 2) { tx = this.canvas.width - 40; ty = 20; }
            if (i === 3) { tx = 40; ty = this.canvas.height - 10; }

            ctx.fillText(this.cs.players[i].name.toUpperCase(), tx, ty);
        });

        if (this.isGameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '800 48px Outfit';
            ctx.textAlign = 'center';

            let msg = 'DRAW!';
            if (this.winner) {
                msg = `${this.cs.players[this.winner.id].name.toUpperCase()} WINS!`;
                ctx.shadowBlur = 20;
                ctx.shadowColor = this.winner.color;
            }

            ctx.fillText(msg, this.canvas.width / 2, this.canvas.height / 2);
            ctx.shadowBlur = 0;
            ctx.font = '400 16px Outfit';
            ctx.fillText('Press START or SOUTH button to restart', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
    }
}

export function initGame(canvas, controllerSystem) {
    return new LightCycles(canvas, controllerSystem);
}
