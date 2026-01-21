# RetroCouch GameHub

A premium, browser-based hub for retro-style gaming with a focus on a **Universal Controller System**. 

RetroCouch allows you to play web-based games with any input device—keyboards, modern gamepads, or retro controllers—without the games needing to handle specific hardware drivers. It abstracts all inputs into a standardized set of "Game Actions."

## ✨ Features

- **Universal Controller System (UCS)**: Plug-and-play support for keyboards and gamepads via the browser's Gamepad API.
- **Custom Mapping**: Create and save your own controller profiles with a live "listening" remap system.
- **Player Management**: Supports up to 4 players, each with their own name, device, and profile.
- **Modular Game Registry**: Easily add new games by registering them in a central metadata file.
- **High-Fidelity UI**: A modern "glassmorphism" aesthetic with vibrant neon accents and responsive design.
- **Developer Documentation**: Built-in guides for integrating third-party games.

## 🕹️ Standardized Game Actions

The UCS translates hardware inputs into these standardized actions:
- **Face Buttons**: `actionSouth`, `actionEast`, `actionWest`, `actionNorth`
- **Directional**: `leftStickX`, `leftStickY`, `rightStickX`, `rightStickY`, `dpadUp`, `dpadDown`, `dpadLeft`, `dpadRight`
- **Shoulders**: `leftBumper`, `rightBumper`, `leftTrigger`, `rightTrigger`
- **Special**: `start`, `select`, `leftStickPress`, `rightStickPress`

## 🚀 Getting Started

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/cyberhirsch/RetroCouch.git
    cd RetroCouch
    ```
2.  **Run a local server**:
    ```bash
    npx serve .
    ```
3.  **Open in browser**: Navigate to `http://localhost:3000`.

## 🛠️ For Developers: Adding a Game

RetroCouch makes it easy to host your own games:

1.  **Create a folder**: Add your game files to `/games/your-game/`.
2.  **Export the Lifecycle**: Your entry JS file must export an `initGame` function:
    ```javascript
    export function initGame(canvas, controllerSystem) {
        return {
            start() { /* Setup */ },
            stop() { /* Cleanup */ },
            update() { /* Logic */ },
            draw() { /* Rendering */ },
            resize() { /* Scaling */ }
        };
    }
    ```
3.  **Register the Game**: Add your metadata to `/games/registry.js`.

---

Built for gamers and developers who love the retro experience.
