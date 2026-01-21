/**
 * Breakout - A classic brick-breaking arcade game.
 * Reference implementation for RetroCouch GameHub.
 */

export class Breakout {
    constructor(canvas, controllerSystem) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cs = controllerSystem;
        this.isRunning = false;

        // Game Configuration
        this.paddleWidth = 100;
        this.paddleHeight = 15;
        this.ballRadius = 8;
        this.brickRowCount = 5;
        this.brickColumnCount = 8;
        this.brickPadding = 10;
        this.brickOffsetTop = 50;
        this.brickOffsetLeft = 30;

        this.reset();
    }

    reset() {
        this.score = 0;
        this.lives = 3;

        // Paddle Position
        this.paddleX = (this.canvas.width - this.paddleWidth) / 2;

        // Ball Position & Velocity
        this.resetBall();

        // Brick Initialization
        this.bricks = [];
        const brickWidth = (this.canvas.width - (this.brickOffsetLeft * 2) - (this.brickColumnCount - 1) * this.brickPadding) / this.brickColumnCount;
        const brickHeight = 20;

        for (let c = 0; c < this.brickColumnCount; c++) {
            this.bricks[c] = [];
            for (let r = 0; r < this.brickRowCount; r++) {
                this.bricks[c][r] = {
                    x: 0,
                    y: 0,
                    status: 1,
                    color: `hsl(${220 + (r * 20)}, 70%, 60%)`
                };
            }
        }
        this.brickWidth = brickWidth;
        this.brickHeight = brickHeight;
    }

    resetBall() {
        this.ballX = this.canvas.width / 2;
        this.ballY = this.canvas.height - 30;
        this.ballVX = 4;
        this.ballVY = -4;
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

        // Recalculate brick widths on resize
        this.brickWidth = (this.canvas.width - (this.brickOffsetLeft * 2) - (this.brickColumnCount - 1) * this.brickPadding) / this.brickColumnCount;
    }

    update() {
        if (!this.isRunning) return;

        // Get states for P1
        const s1 = this.cs.getControllerState(0);

        // Paddle Movement
        if (s1.leftStickX < -0.1 || s1.dpadLeft) this.paddleX -= 8;
        if (s1.leftStickX > 0.1 || s1.dpadRight) this.paddleX += 8;

        // Constrain Paddle
        this.paddleX = Math.max(0, Math.min(this.canvas.width - this.paddleWidth, this.paddleX));

        // Ball Movement
        this.ballX += this.ballVX;
        this.ballY += this.ballVY;

        // Wall Collisions (Left/Right)
        if (this.ballX + this.ballRadius > this.canvas.width || this.ballX - this.ballRadius < 0) {
            this.ballVX = -this.ballVX;
        }

        // Wall Collision (Top)
        if (this.ballY - this.ballRadius < 0) {
            this.ballVY = -this.ballVY;
        }

        // Paddle Collision
        if (this.ballY + this.ballRadius > this.canvas.height - this.paddleHeight) {
            if (this.ballX > this.paddleX && this.ballX < this.paddleX + this.paddleWidth) {
                // Change angle based on where it hits the paddle
                let hitPoint = (this.ballX - (this.paddleX + this.paddleWidth / 2)) / (this.paddleWidth / 2);
                this.ballVX = hitPoint * 6;
                this.ballVY = -Math.abs(this.ballVY);
                // Slight speed up
                this.ballVY *= 1.05;
            } else if (this.ballY + this.ballRadius > this.canvas.height) {
                this.lives--;
                if (this.lives <= 0) {
                    this.reset();
                } else {
                    this.resetBall();
                }
            }
        }

        // Brick Collision Detection
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                let b = this.bricks[c][r];
                if (b.status === 1) {
                    let brickX = c * (this.brickWidth + this.brickPadding) + this.brickOffsetLeft;
                    let brickY = r * (this.brickHeight + this.brickPadding) + this.brickOffsetTop;
                    b.x = brickX;
                    b.y = brickY;

                    if (this.ballX > brickX && this.ballX < brickX + this.brickWidth &&
                        this.ballY > brickY && this.ballY < brickY + this.brickHeight) {
                        this.ballVY = -this.ballVY;
                        b.status = 0;
                        this.score++;

                        if (this.score === this.brickRowCount * this.brickColumnCount) {
                            alert("YOU WIN, CONGRATS!");
                            this.reset();
                        }
                    }
                }
            }
        }
    }

    draw() {
        if (!this.isRunning || !this.ctx) return;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Bricks
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                if (this.bricks[c][r].status === 1) {
                    let b = this.bricks[c][r];
                    ctx.fillStyle = b.color;
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = b.color;
                    ctx.fillRect(b.x, b.y, this.brickWidth, this.brickHeight);
                }
            }
        }

        // Draw Paddle
        ctx.fillStyle = '#00e5ff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00e5ff';
        ctx.fillRect(this.paddleX, this.canvas.height - this.paddleHeight, this.paddleWidth, this.paddleHeight);

        // Draw Ball
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.beginPath();
        ctx.arc(this.ballX, this.ballY, this.ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        // Draw HUD
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '600 16px Outfit';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 20, 30);
        ctx.textAlign = 'right';
        ctx.fillText(`LIVES: ${this.lives}`, this.canvas.width - 20, 30);
    }
}

export function initGame(canvas, controllerSystem) {
    return new Breakout(canvas, controllerSystem);
}
