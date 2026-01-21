/**
 * Cyber Tanks - 2-4 Player Arena Combat.
 * Shared Screen Multiplayer implementation for RetroCouch GameHub.
 */

export class CyberTanks {
    constructor(canvas, controllerSystem) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cs = controllerSystem;
        this.isRunning = false;

        // Tank Constants
        this.tankSize = 30;
        this.turretLength = 25;
        this.bulletSpeed = 7;
        this.moveSpeed = 3.5;
        this.fireCooldown = 400; // ms

        this.reset();
    }

    reset() {
        this.isGameOver = false;
        this.bullets = [];
        this.tanks = [
            { id: 0, x: 100, y: 100, angle: 0, turretAngle: 0, color: '#7c4dff', lastFire: 0, alive: false, health: 100 },
            { id: 1, x: 0, y: 0, angle: Math.PI, turretAngle: Math.PI, color: '#00e5ff', lastFire: 0, lastFire: 0, alive: false, health: 100 },
            { id: 2, x: 100, y: 0, angle: Math.PI / 2, turretAngle: Math.PI / 2, color: '#69f0ae', lastFire: 0, alive: false, health: 100 },
            { id: 3, x: 0, y: 100, angle: -Math.PI / 2, turretAngle: -Math.PI / 2, color: '#ff5252', lastFire: 0, alive: false, health: 100 }
        ];

        // Obstacles (Frosted Glass Walls)
        this.walls = [
            { x: 0.25, y: 0.25, w: 0.05, h: 0.2 },
            { x: 0.7, y: 0.25, w: 0.05, h: 0.2 },
            { x: 0.25, y: 0.55, w: 0.05, h: 0.2 },
            { x: 0.7, y: 0.55, w: 0.05, h: 0.2 },
            { x: 0.45, y: 0.45, w: 0.1, h: 0.1 }
        ];
    }

    start() {
        this.isRunning = true;
        this.resize();
        this.initPositions();
    }

    stop() {
        this.isRunning = false;
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.width * 0.6;
        this.initPositions();
    }

    initPositions() {
        // Position tanks in corners
        const p = 60;
        this.tanks[0].x = p; this.tanks[0].y = p;
        this.tanks[1].x = this.canvas.width - p; this.tanks[1].y = this.canvas.height - p;
        this.tanks[2].x = this.canvas.width - p; this.tanks[2].y = p;
        this.tanks[3].x = p; this.tanks[3].y = this.canvas.height - p;

        // Only activate tanks that have a device
        this.tanks.forEach((tank, i) => {
            tank.alive = !!this.cs.players[i].device;
            tank.health = 100;
        });
    }

    update() {
        if (!this.isRunning) return;

        this.tanks.forEach((tank, i) => {
            if (!tank.alive) return;

            const state = this.cs.getControllerState(i);

            // 1. CHASSIS MOVEMENT
            const mx = state.leftStickX;
            const my = state.leftStickY;

            if (Math.abs(mx) > 0.1 || Math.abs(my) > 0.1) {
                // Update angle based on movement direction
                tank.angle = Math.atan2(my, mx);

                const nextX = tank.x + mx * this.moveSpeed;
                const nextY = tank.y + my * this.moveSpeed;

                // Wall & Boundary Collision
                if (!this.checkWallCollision(nextX, nextY)) {
                    tank.x = Math.max(this.tankSize / 2, Math.min(this.canvas.width - this.tankSize / 2, nextX));
                    tank.y = Math.max(this.tankSize / 2, Math.min(this.canvas.height - this.tankSize / 2, nextY));
                }
            }

            // 2. TURRET ROTATION (Independent)
            const tx = state.rightStickX;
            const ty = state.rightStickY;
            if (Math.abs(tx) > 0.1 || Math.abs(ty) > 0.1) {
                tank.turretAngle = Math.atan2(ty, tx);
            } else if (Math.abs(mx) > 0.1 || Math.abs(my) > 0.1) {
                // Turret follows chassis if not controlled
                tank.turretAngle = tank.angle;
            }

            // 3. SHOOTING
            if ((state.rightBumper || state.actionSouth) && Date.now() - tank.lastFire > this.fireCooldown) {
                this.bullets.push({
                    x: tank.x + Math.cos(tank.turretAngle) * this.turretLength,
                    y: tank.y + Math.sin(tank.turretAngle) * this.turretLength,
                    vx: Math.cos(tank.turretAngle) * this.bulletSpeed,
                    vy: Math.sin(tank.turretAngle) * this.bulletSpeed,
                    ownerId: tank.id,
                    bounces: 1
                });
                tank.lastFire = Date.now();
            }
        });

        // Update Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx;
            b.y += b.vy;

            // Boundary Collision
            if (b.x < 0 || b.x > this.canvas.width || b.y < 0 || b.y > this.canvas.height) {
                this.bullets.splice(i, 1);
                continue;
            }

            // Tank Collision
            this.tanks.forEach(tank => {
                if (tank.alive && tank.id !== b.ownerId) {
                    const dist = Math.hypot(tank.x - b.x, tank.y - b.y);
                    if (dist < this.tankSize / 2) {
                        tank.health -= 25;
                        if (tank.health <= 0) tank.alive = false;
                        this.bullets.splice(i, 1);
                    }
                }
            });

            // Wall Collision (Simple bounce)
            this.walls.forEach(w => {
                const wx = w.x * this.canvas.width;
                const wy = w.y * this.canvas.height;
                const ww = w.w * this.canvas.width;
                const wh = w.h * this.canvas.height;

                if (b.x > wx && b.x < wx + ww && b.y > wy && b.y < wy + wh) {
                    this.bullets.splice(i, 1);
                }
            });
        }
    }

    checkWallCollision(x, y) {
        const radius = this.tankSize / 2;
        return this.walls.some(w => {
            const wx = w.x * this.canvas.width;
            const wy = w.y * this.canvas.height;
            const ww = w.w * this.canvas.width;
            const wh = w.h * this.canvas.height;
            return x + radius > wx && x - radius < wx + ww &&
                y + radius > wy && y - radius < wy + wh;
        });
    }

    draw() {
        if (!this.isRunning || !this.ctx) return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Walls (Frosted Glass)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        this.walls.forEach(w => {
            const wx = w.x * this.canvas.width;
            const wy = w.y * this.canvas.height;
            const ww = w.w * this.canvas.width;
            const wh = w.h * this.canvas.height;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(wx, wy, ww, wh);
            ctx.strokeRect(wx, wy, ww, wh);
        });

        // Draw Tanks
        this.tanks.forEach((tank, i) => {
            if (!tank.alive) return;

            ctx.save();
            ctx.translate(tank.x, tank.y);

            // Chassis
            ctx.rotate(tank.angle);
            ctx.fillStyle = tank.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = tank.color;
            ctx.fillRect(-this.tankSize / 2, -this.tankSize / 2, this.tankSize, this.tankSize);

            // Health Bar
            ctx.rotate(-tank.angle);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000';
            ctx.fillRect(-20, -30, 40, 4);
            ctx.fillStyle = tank.color;
            ctx.fillRect(-20, -30, (tank.health / 100) * 40, 4);

            // Turret
            ctx.rotate(tank.turretAngle);
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, -3, this.turretLength, 6);
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fff';
            ctx.fillRect(this.turretLength - 5, -5, 10, 10);

            ctx.restore();

            // Name
            ctx.fillStyle = '#fff';
            ctx.font = '700 12px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText(this.cs.players[i].name.toUpperCase(), tank.x, tank.y + this.tankSize);
        });

        // Draw Bullets
        this.bullets.forEach(b => {
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fff';
            ctx.beginPath();
            ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur = 0;
    }
}

export function initGame(canvas, controllerSystem) {
    return new CyberTanks(canvas, controllerSystem);
}
