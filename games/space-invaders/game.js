/**
 * Space Invaders - Classic arcade shooter.
 * Reference implementation for RetroCouch GameHub.
 */

export class SpaceInvaders {
    constructor(canvas, controllerSystem) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cs = controllerSystem;
        this.isRunning = false;

        // Player Constants
        this.playerWidth = 40;
        this.playerHeight = 20;
        this.playerSpeed = 5;

        // Alien Constants
        this.alienRows = 4;
        this.alienCols = 8;
        this.alienWidth = 30;
        this.alienHeight = 20;
        this.alienPadding = 20;
        this.alienOffsetTop = 60;
        this.alienOffsetLeft = 50;

        this.reset();
    }

    reset() {
        this.score = 0;
        this.lives = 3;
        this.isGameOver = false;
        this.isWin = false;

        // Player Position
        this.playerX = (this.canvas.width - this.playerWidth) / 2;
        this.playerY = this.canvas.height - 40;

        // Bullets
        this.playerBullet = null; // One bullet at a time for classic feel
        this.alienBullets = [];

        // Aliens
        this.aliens = [];
        for (let r = 0; r < this.alienRows; r++) {
            this.aliens[r] = [];
            for (let c = 0; c < this.alienCols; c++) {
                this.aliens[r][c] = {
                    x: 0,
                    y: 0,
                    status: 1,
                    type: r % 2 // different alien types
                };
            }
        }

        this.alienDirection = 1; // 1 for right, -1 for left
        this.alienMoveTimer = 0;
        this.alienMoveInterval = 800; // ms between steps
        this.alienStepDown = false;
    }

    start() {
        this.isRunning = true;
        this.resize();
        this.reset();
    }

    stop() {
        this.isRunning = false;
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.width * 0.6;
        this.playerY = this.canvas.height - 40;
    }

    update() {
        if (!this.isRunning || this.isGameOver || this.isWin) {
            const s1 = this.cs.getControllerState(0);
            if ((this.isGameOver || this.isWin) && (s1.actionSouth || s1.start)) {
                this.reset();
            }
            return;
        }

        const s1 = this.cs.getControllerState(0);

        // Player Movement
        if (s1.leftStickX < -0.1 || s1.dpadLeft) this.playerX -= this.playerSpeed;
        if (s1.leftStickX > 0.1 || s1.dpadRight) this.playerX += this.playerSpeed;
        this.playerX = Math.max(0, Math.min(this.canvas.width - this.playerWidth, this.playerX));

        // Shooting
        if ((s1.actionSouth || s1.start) && !this.playerBullet) {
            this.playerBullet = { x: this.playerX + this.playerWidth / 2 - 2, y: this.playerY - 10 };
        }

        // Update Player Bullet
        if (this.playerBullet) {
            this.playerBullet.y -= 8;
            if (this.playerBullet.y < 0) this.playerBullet = null;
        }

        // Alien Movement Logic
        const now = Date.now();
        if (now - this.alienMoveTimer > this.alienMoveInterval) {
            this.alienMoveTimer = now;
            this.moveAliens();
        }

        // Collision Detection: Player Bullet vs Aliens
        if (this.playerBullet) {
            this.checkAlienCollisions();
        }

        // Update Alien Bullets
        this.updateAlienBullets();

        // Alien Shooting
        if (Math.random() < 0.015) {
            this.spawnAlienBullet();
        }

        // Win check
        let remaining = 0;
        for (let r = 0; r < this.alienRows; r++) {
            for (let c = 0; c < this.alienCols; c++) {
                if (this.aliens[r][c].status === 1) remaining++;
            }
        }
        if (remaining === 0) this.isWin = true;
    }

    moveAliens() {
        let reachedEdge = false;
        const speed = 15;

        for (let r = 0; r < this.alienRows; r++) {
            for (let c = 0; c < this.alienCols; c++) {
                let a = this.aliens[r][c];
                if (a.status === 0) continue;

                let ax = c * (this.alienWidth + this.alienPadding) + this.alienOffsetLeft + (this.alienDirection * speed);
                if (ax > this.canvas.width - this.alienWidth || ax < 0) {
                    reachedEdge = true;
                }
            }
        }

        if (reachedEdge) {
            this.alienDirection *= -1;
            this.alienOffsetTop += 20;
            // Check if aliens reach player
            if (this.alienOffsetTop + (this.alienRows * (this.alienHeight + this.alienPadding)) > this.playerY) {
                this.isGameOver = true;
            }
            // Speed up
            this.alienMoveInterval = Math.max(100, this.alienMoveInterval - 50);
        } else {
            this.alienOffsetLeft += this.alienDirection * speed;
        }
    }

    checkAlienCollisions() {
        for (let r = 0; r < this.alienRows; r++) {
            for (let c = 0; c < this.alienCols; c++) {
                let a = this.aliens[r][c];
                if (a.status === 1) {
                    let ax = c * (this.alienWidth + this.alienPadding) + this.alienOffsetLeft;
                    let ay = r * (this.alienHeight + this.alienPadding) + this.alienOffsetTop;

                    if (this.playerBullet.x > ax && this.playerBullet.x < ax + this.alienWidth &&
                        this.playerBullet.y > ay && this.playerBullet.y < ay + this.alienHeight) {
                        a.status = 0;
                        this.playerBullet = null;
                        this.score += 100;
                        return;
                    }
                }
            }
        }
    }

    spawnAlienBullet() {
        // Find a random bottom-most alien
        let cols = [];
        for (let c = 0; c < this.alienCols; c++) {
            for (let r = this.alienRows - 1; r >= 0; r--) {
                if (this.aliens[r][c].status === 1) {
                    cols.push({ r, c });
                    break;
                }
            }
        }

        if (cols.length > 0) {
            let choice = cols[Math.floor(Math.random() * cols.length)];
            let ax = choice.c * (this.alienWidth + this.alienPadding) + this.alienOffsetLeft;
            let ay = choice.r * (this.alienHeight + this.alienPadding) + this.alienOffsetTop;
            this.alienBullets.push({ x: ax + this.alienWidth / 2, y: ay + this.alienHeight });
        }
    }

    updateAlienBullets() {
        for (let i = this.alienBullets.length - 1; i >= 0; i--) {
            let b = this.alienBullets[i];
            b.y += 5;

            // Player hit
            if (b.x > this.playerX && b.x < this.playerX + this.playerWidth &&
                b.y > this.playerY && b.y < this.playerY + this.playerHeight) {
                this.lives--;
                this.alienBullets.splice(i, 1);
                if (this.lives <= 0) this.isGameOver = true;
                return;
            }

            if (b.y > this.canvas.height) {
                this.alienBullets.splice(i, 1);
            }
        }
    }

    draw() {
        if (!this.isRunning || !this.ctx) return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Player
        ctx.fillStyle = '#69f0ae';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#69f0ae';
        ctx.fillRect(this.playerX, this.playerY, this.playerWidth, this.playerHeight);
        ctx.fillRect(this.playerX + this.playerWidth / 2 - 5, this.playerY - 8, 10, 8);

        // Draw Player Bullet
        if (this.playerBullet) {
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#fff';
            ctx.fillRect(this.playerBullet.x, this.playerBullet.y, 4, 15);
        }

        // Draw Aliens
        for (let r = 0; r < this.alienRows; r++) {
            for (let c = 0; c < this.alienCols; c++) {
                let a = this.aliens[r][c];
                if (a.status === 1) {
                    let ax = c * (this.alienWidth + this.alienPadding) + this.alienOffsetLeft;
                    let ay = r * (this.alienHeight + this.alienPadding) + this.alienOffsetTop;

                    ctx.fillStyle = a.type === 0 ? '#7c4dff' : '#00e5ff';
                    ctx.shadowColor = ctx.fillStyle;
                    ctx.fillRect(ax, ay, this.alienWidth, this.alienHeight);
                    // Minimal eyes
                    ctx.fillStyle = '#000';
                    ctx.shadowBlur = 0;
                    ctx.fillRect(ax + 5, ay + 5, 4, 4);
                    ctx.fillRect(ax + this.alienWidth - 9, ay + 5, 4, 4);
                }
            }
        }

        // Draw Alien Bullets
        ctx.fillStyle = '#ff5252';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff5252';
        for (let b of this.alienBullets) {
            ctx.fillRect(b.x - 2, b.y, 4, 10);
        }

        // HUD
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '600 16px Outfit';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 20, 30);
        ctx.textAlign = 'right';
        ctx.fillText(`LIVES: ${this.lives}`, this.canvas.width - 20, 30);

        if (this.isGameOver || this.isWin) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '800 48px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText(this.isWin ? 'MISSION CLEAR' : 'GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
            ctx.font = '400 16px Outfit';
            ctx.fillText('Press START or SOUTH button to retry', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
    }
}

export function initGame(canvas, controllerSystem) {
    return new SpaceInvaders(canvas, controllerSystem);
}
