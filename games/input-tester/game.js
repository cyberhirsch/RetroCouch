/**
 * Input Tester - Reference Implementation
 * 
 * This game demonstrates how to integrate with the Universal Controller System.
 * Every game receives the global ControllerSystem instance and renders based on its state.
 */

export class InputTester {
    constructor(canvas, controllerSystem) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cs = controllerSystem;
        this.isRunning = false;

        this.playerShapes = [
            { id: 0, x: 100, y: 100, color: '#7c4dff' },
            { id: 1, x: 300, y: 100, color: '#00e5ff' },
            { id: 2, x: 100, y: 300, color: '#69f0ae' },
            { id: 3, x: 300, y: 300, color: '#ff5252' }
        ];
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
    }

    update() {
        if (!this.isRunning) return;

        this.cs.players.forEach((p, i) => {
            if (!p.device) return;

            const shape = this.playerShapes[i];
            const state = p.state;

            // Movement demonstration using leftStickX and leftStickY
            shape.x += state.leftStickX * 5;
            shape.y += state.leftStickY * 5;

            // Screen boundaries
            shape.x = Math.max(20, Math.min(this.canvas.width - 20, shape.x));
            shape.y = Math.max(20, Math.min(this.canvas.height - 20, shape.y));
        });
    }

    draw() {
        if (!this.isRunning || !this.ctx) return;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        ctx.strokeStyle = '#1a1c23';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 50) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.canvas.height); ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 50) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvas.width, y); ctx.stroke();
        }

        // Draw players
        this.cs.players.forEach((p, i) => {
            if (!p.device) return;

            const shape = this.playerShapes[i];
            const state = p.state;

            // Color shift demonstration on face buttons
            let color = shape.color;
            if (state.actionSouth) color = '#fff';
            if (state.actionEast) color = '#ff00ff';
            if (state.actionWest) color = '#00ffff';
            if (state.actionNorth) color = '#ffff00';

            // Glow effect
            ctx.fillStyle = color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = color;
            ctx.fillRect(shape.x - 20, shape.y - 20, 40, 40);
            ctx.shadowBlur = 0;

            // Name tag
            ctx.fillStyle = '#fff';
            ctx.font = '700 12px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText(p.name.toUpperCase(), shape.x, shape.y - 30);
        });
    }
}

// Factory function for dynamic loading
export function initGame(canvas, controllerSystem) {
    return new InputTester(canvas, controllerSystem);
}
