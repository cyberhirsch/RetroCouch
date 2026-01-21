/**
 * Light Volley - 2-4 Player Physics Sports.
 * Side-view shared screen battle for RetroCouch GameHub.
 */

export class LightVolley {
    constructor(canvas, controllerSystem) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cs = controllerSystem;
        this.isRunning = false;

        // Physics Constants
        this.gravity = 0.5;
        this.friction = 0.9;
        this.jumpForce = -12;
        this.moveSpeed = 0.8;
        this.maxSpeed = 8;
        this.playerRadius = 35;
        this.ballRadius = 15;

        this.reset();
    }

    reset() {
        this.scores = [0, 0]; // Left Team (P1, P3), Right Team (P2, P4)
        this.isGameOver = false;

        this.ball = {
            x: 0, y: 0, vx: 0, vy: 0,
            trail: []
        };

        this.players = [
            { id: 0, team: 0, x: 0, y: 0, vx: 0, vy: 0, color: '#7c4dff', alive: false, name: '' },
            { id: 1, team: 1, x: 0, y: 0, vx: 0, vy: 0, color: '#00e5ff', alive: false, name: '' },
            { id: 2, team: 0, x: 0, y: 0, vx: 0, vy: 0, color: '#69f0ae', alive: false, name: '' },
            { id: 3, team: 1, x: 0, y: 0, vx: 0, vy: 0, color: '#ff5252', alive: false, name: '' }
        ];

        this.resetBall();
    }

    resetBall(servingTeam = 0) {
        this.ball.x = servingTeam === 0 ? this.canvas.width * 0.25 : this.canvas.width * 0.75;
        this.ball.y = this.canvas.height * 0.3;
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.ball.trail = [];
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
        this.canvas.width = rect.width;
        this.canvas.height = rect.width * 0.6;

        this.initPositions();
        this.resetBall();
    }

    initPositions() {
        this.players.forEach((p, i) => {
            p.alive = !!this.cs.players[i].device;
            p.name = this.cs.players[i].name;
            p.vx = 0;
            p.vy = 0;
            p.y = this.canvas.height - this.playerRadius;

            if (p.team === 0) {
                p.x = this.canvas.width * (i === 0 ? 0.15 : 0.3);
            } else {
                p.x = this.canvas.width * (i === 1 ? 0.85 : 0.7);
            }
        });
    }

    update() {
        if (!this.isRunning) return;

        const groundY = this.canvas.height;
        const netX = this.canvas.width / 2;
        const netHeight = 120;
        const netY = groundY - netHeight;

        // 1. Update Players
        this.players.forEach((p, i) => {
            if (!p.alive) return;

            const state = this.cs.getControllerState(i);

            // Movement
            let move = state.leftStickX || (state.dpadRight ? 1 : (state.dpadLeft ? -1 : 0));
            p.vx += move * this.moveSpeed;
            p.vx *= this.friction;

            // Jump
            if ((state.actionSouth || state.start) && p.y >= groundY - this.playerRadius) {
                p.vy = this.jumpForce;
            }

            // Gravity
            p.vy += this.gravity;
            p.x += p.vx;
            p.y += p.vy;

            // Boundaries & Floor
            if (p.y > groundY - this.playerRadius) {
                p.y = groundY - this.playerRadius;
                p.vy = 0;
            }

            // Team Boundaries (Cannot cross net)
            if (p.team === 0) {
                p.x = Math.max(this.playerRadius, Math.min(netX - this.playerRadius, p.x));
            } else {
                p.x = Math.max(netX + this.playerRadius, Math.min(this.canvas.width - this.playerRadius, p.x));
            }
        });

        // 2. Update Ball
        this.ball.vy += this.gravity * 0.5; // Lower gravity for ball
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        // Ball Trail
        this.ball.trail.push({ x: this.ball.x, y: this.ball.y });
        if (this.ball.trail.length > 10) this.ball.trail.shift();

        // Wall Collisions
        if (this.ball.x < this.ballRadius || this.ball.x > this.canvas.width - this.ballRadius) {
            this.ball.vx *= -0.8;
            this.ball.x = this.ball.x < this.ballRadius ? this.ballRadius : this.canvas.width - this.ballRadius;
        }
        if (this.ball.y < this.ballRadius) {
            this.ball.vy *= -0.8;
            this.ball.y = this.ballRadius;
        }

        // Net Collision
        if (this.ball.y > netY) {
            if (Math.abs(this.ball.x - netX) < this.ballRadius + 5) {
                this.ball.vx *= -0.8;
                this.ball.x = this.ball.x < netX ? netX - (this.ballRadius + 5) : netX + (this.ballRadius + 5);
            }
        }

        // Player Collision (Elastic)
        this.players.forEach(p => {
            if (!p.alive) return;
            const dx = this.ball.x - p.x;
            const dy = this.ball.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.playerRadius + this.ballRadius) {
                // Collision Normal
                const nx = dx / dist;
                const ny = dy / dist;

                // Push ball out
                this.ball.x = p.x + nx * (this.playerRadius + this.ballRadius);
                this.ball.y = p.y + ny * (this.playerRadius + this.ballRadius);

                // Transfer velocity
                const strength = 1.2;
                this.ball.vx = (nx * 10) + (p.vx * 0.5);
                this.ball.vy = (ny * 12) + (p.vy * 0.5);
            }
        });

        // Scoring
        if (this.ball.y > groundY - this.ballRadius) {
            if (this.ball.x < netX) {
                this.scores[1]++; // Point for Right Team
                this.resetBall(0); // Left serves
            } else {
                this.scores[0]++; // Point for Left Team
                this.resetBall(1); // Right serves
            }
        }
    }

    draw() {
        if (!this.isRunning || !this.ctx) return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const groundY = this.canvas.height;
        const netX = this.canvas.width / 2;
        const netHeight = 120;

        // Draw Net (Glass pillar)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(netX - 5, groundY - netHeight, 10, netHeight);
        ctx.strokeRect(netX - 5, groundY - netHeight, 10, netHeight);

        // Draw Players (Blobs)
        this.players.forEach((p, i) => {
            if (!p.alive) return;

            ctx.save();
            ctx.translate(p.x, p.y);

            // Blob Body
            ctx.beginPath();
            ctx.arc(0, 0, this.playerRadius, Math.PI, 0); // Semi-circle
            ctx.lineTo(this.playerRadius, 0);
            ctx.lineTo(-this.playerRadius, 0);
            ctx.closePath();

            ctx.fillStyle = p.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = p.color;
            ctx.fill();

            // Eyes
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            const eyeX = p.team === 0 ? 10 : -10;
            ctx.beginPath();
            ctx.arc(eyeX, -15, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(eyeX + (p.team === 0 ? 2 : -2), -15, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            // Name
            ctx.fillStyle = '#fff';
            ctx.font = '700 12px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText(p.name.toUpperCase(), p.x, p.y + 20);
        });

        // Draw Ball
        ctx.save();
        // Ball Trail
        this.ball.trail.forEach((t, i) => {
            ctx.globalAlpha = i / 10;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(t.x, t.y, (i / 10) * this.ballRadius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.globalAlpha = 1;
        ctx.translate(this.ball.x, this.ball.y);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, this.ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Scoreboard
        ctx.shadowBlur = 0;
        ctx.font = '800 40px Outfit';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillText(`${this.scores[0]}   ${this.scores[1]}`, this.canvas.width / 2, this.canvas.height / 2);
    }
}

export function initGame(canvas, controllerSystem) {
    return new LightVolley(canvas, controllerSystem);
}
