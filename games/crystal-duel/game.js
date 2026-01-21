/**
 * Crystal Duel - Competitive Puzzle Game.
 * Side-by-side block battle for RetroCouch GameHub.
 */

export class CrystalDuel {
    constructor(canvas, controllerSystem) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cs = controllerSystem;
        this.isRunning = false;

        // Board Constants
        this.rows = 20;
        this.cols = 10;
        this.tileSize = 25;
        this.wellWidth = this.cols * this.tileSize;
        this.wellHeight = this.rows * this.tileSize;

        // Tetrominoes
        this.shapes = {
            'I': [[1, 1, 1, 1]],
            'J': [[1, 0, 0], [1, 1, 1]],
            'L': [[0, 0, 1], [1, 1, 1]],
            'O': [[1, 1], [1, 1]],
            'S': [[0, 1, 1], [1, 1, 0]],
            'T': [[0, 1, 0], [1, 1, 1]],
            'Z': [[1, 1, 0], [0, 1, 1]]
        };

        this.colors = {
            'I': '#00e5ff', // Cyan
            'J': '#2979ff', // Blue
            'L': '#ff9100', // Orange
            'O': '#ffea00', // Yellow
            'S': '#00e676', // Green
            'T': '#d500f9', // Purple
            'Z': '#ff1744'  // Red
        };

        this.reset();
    }

    reset() {
        this.players = [this.createPlayer(0), this.createPlayer(1)];
        this.isGameOver = false;
        this.lastDropTime = 0;
        this.dropInterval = 800; // ms
    }

    createPlayer(id) {
        const board = [];
        for (let r = 0; r < this.rows; r++) {
            board[r] = new Array(this.cols).fill(0);
        }

        return {
            id,
            board,
            score: 0,
            lines: 0,
            activePiece: this.spawnPiece(),
            nextPiece: this.spawnPiece(),
            gameOver: false,
            junkQueue: 0
        };
    }

    spawnPiece() {
        const types = Object.keys(this.shapes);
        const type = types[Math.floor(Math.random() * types.length)];
        const shape = this.shapes[type];
        return {
            type,
            shape,
            x: Math.floor(this.cols / 2) - Math.floor(shape[0].length / 2),
            y: 0
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

        // Dynamic tile size based on canvas height (leave some padding)
        this.tileSize = Math.floor((this.canvas.height - 100) / this.rows);
        this.wellWidth = this.cols * this.tileSize;
        this.wellHeight = this.rows * this.tileSize;
    }

    update() {
        if (!this.isRunning || this.isGameOver) {
            const s1 = this.cs.getControllerState(0);
            if (this.isGameOver && (s1.actionSouth || s1.start)) {
                this.reset();
            }
            return;
        }

        const now = Date.now();
        const delta = now - this.lastDropTime;

        this.players.forEach((p, i) => {
            if (p.gameOver) return;

            const state = this.cs.getControllerState(i);

            // Input Handlers (with simple debounce/repeat logic)
            if (!p.lastInputTime) p.lastInputTime = 0;
            const inputCooldown = 100;

            if (now - p.lastInputTime > inputCooldown) {
                if (state.dpadLeft || state.leftStickX < -0.5) {
                    this.movePiece(p, -1, 0);
                    p.lastInputTime = now;
                }
                if (state.dpadRight || state.leftStickX > 0.5) {
                    this.movePiece(p, 1, 0);
                    p.lastInputTime = now;
                }
                if (state.actionSouth || state.actionNorth) {
                    this.rotatePiece(p);
                    p.lastInputTime = now;
                }
            }

            // Faster drop
            const currentDropInterval = (state.dpadDown || state.leftStickY > 0.5) ? 50 : this.dropInterval;

            if (delta > currentDropInterval) {
                this.dropPiece(p);
                if (i === this.players.length - 1) this.lastDropTime = now;
            }
        });

        if (this.players.every(p => p.gameOver)) this.isGameOver = true;
    }

    movePiece(p, dx, dy) {
        p.activePiece.x += dx;
        p.activePiece.y += dy;
        if (this.checkCollision(p)) {
            p.activePiece.x -= dx;
            p.activePiece.y -= dy;
            return false;
        }
        return true;
    }

    rotatePiece(p) {
        const s = p.activePiece.shape;
        const newShape = s[0].map((_, i) => s.map(row => row[i]).reverse());
        const oldShape = p.activePiece.shape;
        p.activePiece.shape = newShape;

        if (this.checkCollision(p)) {
            p.activePiece.shape = oldShape;
        }
    }

    dropPiece(p) {
        if (!this.movePiece(p, 0, 1)) {
            this.lockPiece(p);
            this.clearLines(p);
            p.activePiece = p.nextPiece;
            p.nextPiece = this.spawnPiece();

            if (this.checkCollision(p)) {
                p.gameOver = true;
            }

            // Apply junk if any
            if (p.junkQueue > 0) {
                this.applyJunk(p);
            }
        }
    }

    checkCollision(p) {
        const { shape, x, y } = p.activePiece;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] !== 0) {
                    const bx = x + c;
                    const by = y + r;
                    if (bx < 0 || bx >= this.cols || by >= this.rows || (by >= 0 && p.board[by][bx] !== 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    lockPiece(p) {
        const { shape, x, y, type } = p.activePiece;
        shape.forEach((row, r) => {
            row.forEach((v, c) => {
                if (v !== 0) {
                    if (y + r >= 0) {
                        p.board[y + r][x + c] = type;
                    }
                }
            });
        });
    }

    clearLines(p) {
        let linesCleared = 0;
        for (let r = this.rows - 1; r >= 0; r--) {
            if (p.board[r].every(v => v !== 0)) {
                p.board.splice(r, 1);
                p.board.unshift(new Array(this.cols).fill(0));
                linesCleared++;
                r++; // Check same row index again
            }
        }
        if (linesCleared > 0) {
            p.lines += linesCleared;
            p.score += [0, 100, 300, 500, 800][linesCleared];

            // Send junk to opponent
            if (linesCleared >= 2) {
                const opponent = this.players[1 - p.id];
                opponent.junkQueue += linesCleared - 1;
            }
        }
    }

    applyJunk(p) {
        const junkCount = p.junkQueue;
        p.junkQueue = 0;
        for (let i = 0; i < junkCount; i++) {
            p.board.shift();
            const junkRow = new Array(this.cols).fill('Junk');
            const hole = Math.floor(Math.random() * this.cols);
            junkRow[hole] = 0;
            p.board.push(junkRow);
        }
    }

    draw() {
        if (!this.isRunning || !this.ctx) return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const spacing = 100;
        const totalWidth = (this.wellWidth * 2) + spacing;
        const startX = (this.canvas.width - totalWidth) / 2;
        const startY = (this.canvas.height - this.wellHeight) / 2;

        this.players.forEach((p, i) => {
            const xOffset = startX + (i * (this.wellWidth + spacing));

            // Draw Background Well (Glass)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(xOffset, startY, this.wellWidth, this.wellHeight);
            ctx.strokeRect(xOffset, startY, this.wellWidth, this.wellHeight);

            // Draw Board
            p.board.forEach((row, r) => {
                row.forEach((v, c) => {
                    if (v !== 0) {
                        this.drawBlock(xOffset + c * this.tileSize, startY + r * this.tileSize, v);
                    }
                });
            });

            // Draw Active Piece
            if (!p.gameOver) {
                const { shape, x, y, type } = p.activePiece;
                shape.forEach((row, r) => {
                    row.forEach((v, c) => {
                        if (v !== 0) {
                            this.drawBlock(xOffset + (x + c) * this.tileSize, startY + (y + r) * this.tileSize, type);
                        }
                    });
                });
            }

            // Draw HUD for each player
            ctx.fillStyle = '#fff';
            ctx.font = '600 16px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText(this.cs.players[i].name.toUpperCase(), xOffset + this.wellWidth / 2, startY - 20);
            ctx.font = '400 14px Outfit';
            ctx.fillText(`Lines: ${p.lines}`, xOffset + this.wellWidth / 2, startY + this.wellHeight + 30);
            if (p.junkQueue > 0) {
                ctx.fillStyle = '#ff5252';
                ctx.fillText(`Junk: ${p.junkQueue}`, xOffset + this.wellWidth / 2, startY + this.wellHeight + 50);
            }

            if (p.gameOver) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(xOffset, startY, this.wellWidth, this.wellHeight);
                ctx.fillStyle = '#fff';
                ctx.font = '800 24px Outfit';
                ctx.fillText('OUT', xOffset + this.wellWidth / 2, startY + this.wellHeight / 2);
            }
        });

        if (this.isGameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '800 48px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText('BATTLE ENDED', this.canvas.width / 2, this.canvas.height / 2);
            ctx.font = '400 16px Outfit';
            ctx.fillText('Press START or SOUTH button to rematch', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
    }

    drawBlock(x, y, type) {
        const ctx = this.ctx;
        const color = type === 'Junk' ? '#455a64' : this.colors[type];

        ctx.save();
        ctx.translate(x, y);

        // Glass Block
        ctx.fillStyle = color + '33'; // Semi-transparent
        ctx.fillRect(1, 1, this.tileSize - 2, this.tileSize - 2);

        // Neon Border
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, this.tileSize - 4, this.tileSize - 4);

        // Inner Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.fillRect(this.tileSize / 4, this.tileSize / 4, this.tileSize / 2, this.tileSize / 2);

        ctx.restore();
    }
}

export function initGame(canvas, controllerSystem) {
    return new CrystalDuel(canvas, controllerSystem);
}
