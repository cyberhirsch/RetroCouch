/**
 * Pong - A classic 2-player arcade game.
 * Reference implementation for RetroCouch GameHub.
 */

export class Pong {
    constructor(canvas, controllerSystem) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cs = controllerSystem;
        this.isRunning = false;

        // Game Constants
        this.paddleWidth = 15;
        this.paddleHeight = 80;
        this.ballSize = 10;
        this.paddleSpeed = 8;
        this.initialBallSpeed = 5;

        // Game State
        this.reset();
    }

    reset() {
        this.p1 = {
            y: this.canvas.height / 2 - this.paddleHeight / 2,
            score: 0
        };
        this.p2 = {
            y: this.canvas.height / 2 - this.paddleHeight / 2,
            score: 0
        };
        this.resetBall();
    }

    resetBall() {
        this.ball = {
            x: this.canvas.width / 2 - this.ballSize / 2,
            y: this.canvas.height / 2 - this.ballSize / 2,
            vx: (Math.random() > 0.5 ? 1 : -1) * this.initialBallSpeed,
            vy: (Math.random() * 2 - 1) * this.initialBallSpeed
        };
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

        // Adjust positions on resize
        this.p1.y = this.canvas.height / 2 - this.paddleHeight / 2;
        this.p2.y = this.canvas.height / 2 - this.paddleHeight / 2;
        this.resetBall();
    }

    update() {
        if (!this.isRunning) return;

        // Get states for P1 and P2
        const s1 = this.cs.getControllerState(0);
        const s2 = this.cs.getControllerState(1);

        // Movement P1 (Classic Stick or D-Pad)
        if (s1.leftStickY < -0.1 || s1.dpadUp) this.p1.y -= this.paddleSpeed;
        if (s1.leftStickY > 0.1 || s1.dpadDown) this.p1.y += this.paddleSpeed;

        // Movement P2 (Classic Stick or D-Pad)
        if (s2.leftStickY < -0.1 || s2.dpadUp) this.p2.y -= this.paddleSpeed;
        if (s2.leftStickY > 0.1 || s2.dpadDown) this.p2.y += this.paddleSpeed;

        // Constrain Paddles
        this.p1.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, this.p1.y));
        this.p2.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, this.p2.y));

        // Move Ball
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        // Wall Collisions (Top/Bottom)
        if (this.ball.y <= 0 || this.ball.y >= this.canvas.height - this.ballSize) {
            this.ball.vy *= -1;
        }

        // Paddle Collisions (Simplified)
        if (this.ball.vx < 0) { // P1 Side
            if (this.ball.x <= this.paddleWidth &&
                this.ball.y + this.ballSize >= this.p1.y &&
                this.ball.y <= this.p1.y + this.paddleHeight) {
                this.ball.vx = Math.abs(this.ball.vx) * 1.1; // Speed up
                this.ball.x = this.paddleWidth;
            }
        } else { // P2 Side
            if (this.ball.x + this.ballSize >= this.canvas.width - this.paddleWidth &&
                this.ball.y + this.ballSize >= this.p2.y &&
                this.ball.y <= this.p2.y + this.paddleHeight) {
                this.ball.vx = -Math.abs(this.ball.vx) * 1.1; // Speed up
                this.ball.x = this.canvas.width - this.paddleWidth - this.ballSize;
            }
        }

        // Scoring
        if (this.ball.x < 0) {
            this.p2.score++;
            this.resetBall();
        } else if (this.ball.x > this.canvas.width) {
            this.p1.score++;
            this.resetBall();
        }
    }

    draw() {
        if (!this.isRunning || !this.ctx) return;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Line
        ctx.setLineDash([10, 10]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(this.canvas.width / 2, 0);
        ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Score
        ctx.fillStyle = '#fff';
        ctx.font = '800 40px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText(this.p1.score, this.canvas.width * 0.25, 60);
        ctx.fillText(this.p2.score, this.canvas.width * 0.75, 60);

        // Draw Paddles
        ctx.fillStyle = '#7c4dff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#7c4dff';
        ctx.fillRect(0, this.p1.y, this.paddleWidth, this.paddleHeight);

        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.fillRect(this.canvas.width - this.paddleWidth, this.p2.y, this.paddleWidth, this.paddleHeight);

        // Draw Ball
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.fillRect(this.ball.x, this.ball.y, this.ballSize, this.ballSize);

        ctx.shadowBlur = 0;
    }
}

export function initGame(canvas, controllerSystem) {
    return new Pong(canvas, controllerSystem);
}
