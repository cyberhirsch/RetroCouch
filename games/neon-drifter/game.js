/**
 * Neon Micro-Drifter - 2-4 Player Top-Down Circuit Racing.
 * Shared Screen Multiplayer implementation for RetroCouch GameHub.
 */

export class NeonDrifter {
    constructor(canvas, controllerSystem) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cs = controllerSystem;
        this.isRunning = false;

        // Physics Constants
        this.acceleration = 0.15;
        this.braking = 0.2;
        this.friction = 0.98;
        this.turnSpeed = 0.08;
        this.driftFactor = 0.95;
        this.carSize = 24;

        this.reset();
    }

    reset() {
        this.isGameOver = false;
        this.cars = [
            { id: 0, x: 0, y: 0, angle: 0, speed: 0, color: '#7c4dff', alive: false, lap: 1, checkpoints: 0 },
            { id: 1, x: 0, y: 0, angle: 0, speed: 0, color: '#00e5ff', alive: false, lap: 1, checkpoints: 0 },
            { id: 2, x: 0, y: 0, angle: 0, speed: 0, color: '#69f0ae', alive: false, lap: 1, checkpoints: 0 },
            { id: 3, x: 0, y: 0, angle: 0, speed: 0, color: '#ff5252', alive: false, lap: 1, checkpoints: 0 }
        ];

        // Track Definition (Single screen oval-ish)
        // Checkpoints as boxes: {x, y, w, h}
        this.track = {
            inner: { x: 0.2, y: 0.2, w: 0.6, h: 0.6 }, // The "Infield"
            finishLine: { x: 0.48, y: 0.8, w: 0.04, h: 0.2 }
        };
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
        // Starting grid near the bottom finish line
        const startX = this.canvas.width * 0.5 - 50;
        const startY = this.canvas.height * 0.85;

        this.cars.forEach((car, i) => {
            car.alive = !!this.cs.players[i].device;
            car.x = startX;
            car.y = startY + (i - 1.5) * 30;
            car.angle = 0;
            car.speed = 0;
        });
    }

    update() {
        if (!this.isRunning) return;

        this.cars.forEach((car, i) => {
            if (!car.alive) return;

            const state = this.cs.getControllerState(i);

            // 1. INPUTS
            // Support triggers or action/shoulder buttons as fallbacks
            let gas = state.rightTrigger ? 1 : (state.actionSouth ? 1 : 0);
            let brake = state.leftTrigger ? 1 : (state.actionEast ? 1 : 0);
            let steer = state.leftStickX || (state.dpadRight ? 1 : (state.dpadLeft ? -1 : 0));

            // Acceleration Logic
            if (gas > 0) {
                car.speed += gas * this.acceleration;
            }
            if (brake > 0) {
                car.speed -= brake * this.braking;
            }

            // Friction & Speed Caps
            car.speed *= this.friction;
            if (Math.abs(car.speed) < 0.1) car.speed = 0;
            if (car.speed > 10) car.speed = 10;
            if (car.speed < -3) car.speed = -3;

            // Steering
            if (Math.abs(car.speed) > 0.5) {
                const actualTurn = this.turnSpeed * (car.speed / 10) * steer;
                car.angle += actualTurn;
            }

            // Movement Physics
            const prevX = car.x;
            const prevY = car.y;
            car.x += Math.cos(car.angle) * car.speed;
            car.y += Math.sin(car.angle) * car.speed;

            // COLLISION: Borders
            if (car.x < 0 || car.x > this.canvas.width || car.y < 0 || car.y > this.canvas.height) {
                car.speed *= 0.5;
                car.x = prevX;
                car.y = prevY;
            }

            // COLLISION: Inner Infield (Frosted Glass)
            const ix = this.track.inner.x * this.canvas.width;
            const iy = this.track.inner.y * this.canvas.height;
            const iw = this.track.inner.w * this.canvas.width;
            const ih = this.track.inner.h * this.canvas.height;
            if (car.x > ix && car.x < ix + iw && car.y > iy && car.y < iy + ih) {
                car.speed *= 0.3; // Slam on brakes when hitting infield
                car.x = prevX;
                car.y = prevY;
            }
        });
    }

    draw() {
        if (!this.isRunning || !this.ctx) return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Track (Neon Outline)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.strokeRect(5, 5, this.canvas.width - 10, this.canvas.height - 10);

        // Draw Finish Line
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        const fx = this.track.finishLine.x * this.canvas.width;
        const fy = this.track.finishLine.y * this.canvas.height;
        const fw = this.track.finishLine.w * this.canvas.width;
        const fh = this.track.finishLine.h * this.canvas.height;
        ctx.fillRect(fx, fy, fw, fh);

        // Draw Infield (Frosted Glass)
        const ix = this.track.inner.x * this.canvas.width;
        const iy = this.track.inner.y * this.canvas.height;
        const iw = this.track.inner.w * this.canvas.width;
        const ih = this.track.inner.h * this.canvas.height;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(ix, iy, iw, ih);
        ctx.strokeRect(ix, iy, iw, ih);

        // Draw Cars
        this.cars.forEach((car, i) => {
            if (!car.alive) return;

            ctx.save();
            ctx.translate(car.x, car.y);
            ctx.rotate(car.angle);

            // Car Body
            ctx.fillStyle = car.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = car.color;
            ctx.fillRect(-this.carSize / 2, -this.carSize / 3, this.carSize, this.carSize / 1.5);

            // Cockpit
            ctx.fillStyle = '#fff';
            ctx.fillRect(-2, -this.carSize / 4, this.carSize / 3, this.carSize / 2);

            // Exhaust flame if speeding
            if (car.speed > 5) {
                ctx.fillStyle = '#ff8f00';
                ctx.fillRect(-this.carSize / 2 - 10, -5, 8, 10);
            }

            ctx.restore();

            // Name Tag
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = '700 10px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText(this.cs.players[i].name.toUpperCase(), car.x, car.y + 25);
        });
    }
}

export function initGame(canvas, controllerSystem) {
    return new NeonDrifter(canvas, controllerSystem);
}
