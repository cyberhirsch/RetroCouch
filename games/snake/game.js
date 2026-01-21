/**
 * Retro Snake - Classic grid-based movement game.
 * Reference implementation for RetroCouch GameHub.
 */

export class Snake {
    constructor(canvas, controllerSystem) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cs = controllerSystem;
        this.isRunning = false;

        // Grid Configuration
        this.gridSize = 25;
        this.tickRate = 120; // Move every 120ms
        this.lastUpdateTime = 0;

        this.reset();
    }

    reset() {
        this.score = 0;
        this.isGameOver = false;

        // Initial Snake
        this.snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];

        // Directions: 0: up, 1: right, 2: down, 3: left
        this.direction = 1;
        this.nextDirection = 1;

        this.spawnFood();
    }

    spawnFood() {
        this.cols = Math.floor(this.canvas.width / this.gridSize);
        this.rows = Math.floor(this.canvas.height / this.gridSize);

        this.food = {
            x: Math.floor(Math.random() * this.cols),
            y: Math.floor(Math.random() * this.rows)
        };

        // Ensure food doesn't spawn on snake
        for (let segment of this.snake) {
            if (segment.x === this.food.x && segment.y === this.food.y) {
                this.spawnFood();
                break;
            }
        }
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
        this.canvas.width = Math.floor(rect.width / this.gridSize) * this.gridSize;
        this.canvas.height = Math.floor((rect.width * 0.6) / this.gridSize) * this.gridSize;
        this.reset();
    }

    update() {
        if (!this.isRunning || this.isGameOver) return;

        const now = Date.now();

        // Handle Input every frame for responsiveness
        const s1 = this.cs.getControllerState(0);

        if ((s1.dpadUp || s1.leftStickY < -0.5) && this.direction !== 2) this.nextDirection = 0;
        if ((s1.dpadRight || s1.leftStickX > 0.5) && this.direction !== 3) this.nextDirection = 1;
        if ((s1.dpadDown || s1.leftStickY > 0.5) && this.direction !== 0) this.nextDirection = 2;
        if ((s1.dpadLeft || s1.leftStickX < -0.5) && this.direction !== 1) this.nextDirection = 3;

        // Reset game on face button press if Game Over
        if (this.isGameOver && (s1.actionSouth || s1.start)) {
            this.reset();
            return;
        }

        // Logic Tick
        if (now - this.lastUpdateTime > this.tickRate) {
            this.lastUpdateTime = now;
            this.move();
        }
    }

    move() {
        this.direction = this.nextDirection;
        const head = { ...this.snake[0] };

        if (this.direction === 0) head.y--;
        if (this.direction === 1) head.x++;
        if (this.direction === 2) head.y++;
        if (this.direction === 3) head.x--;

        // Collision: Walls
        if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) {
            this.isGameOver = true;
            return;
        }

        // Collision: Self
        for (let segment of this.snake) {
            if (head.x === segment.x && head.y === segment.y) {
                this.isGameOver = true;
                return;
            }
        }

        this.snake.unshift(head);

        // Collision: Food
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.spawnFood();
            // Speed up slightly
            this.tickRate = Math.max(60, this.tickRate - 2);
        } else {
            this.snake.pop();
        }
    }

    draw() {
        if (!this.isRunning || !this.ctx) return;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Snake
        this.snake.forEach((segment, index) => {
            ctx.fillStyle = index === 0 ? '#00e5ff' : '#00b0ff';
            if (index === 0) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00e5ff';
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.fillRect(
                segment.x * this.gridSize + 1,
                segment.y * this.gridSize + 1,
                this.gridSize - 2,
                this.gridSize - 2
            );
        });

        // Draw Food
        ctx.fillStyle = '#ff5252';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff5252';
        ctx.beginPath();
        const centerX = this.food.x * this.gridSize + this.gridSize / 2;
        const centerY = this.food.y * this.gridSize + this.gridSize / 2;
        ctx.arc(centerX, centerY, this.gridSize / 2 - 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw Score
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '600 16px Outfit';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 20, 30);

        if (this.isGameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            ctx.fillStyle = '#fff';
            ctx.font = '800 40px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
            ctx.font = '400 16px Outfit';
            ctx.fillText('Press START or SOUTH button to retry', this.canvas.width / 2, this.canvas.height / 2 + 40);
        }
    }
}

export function initGame(canvas, controllerSystem) {
    return new Snake(canvas, controllerSystem);
}
