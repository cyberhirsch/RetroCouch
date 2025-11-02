document.addEventListener('DOMContentLoaded', () => {
    const gamepadsContainer = document.getElementById('gamepads-container');
    const noGamepadMessage = document.getElementById('no-gamepad-message');
    
    let gamepads = {};
    let animationFrameId;

    function handleGamepadConnected(e) {
        const gamepad = e.gamepad;
        console.log(`Gamepad connected: ${gamepad.id}`);
        gamepads[gamepad.index] = gamepad;
        addGamepadVisualizer(gamepad);

        if (noGamepadMessage) {
            noGamepadMessage.style.display = 'none';
        }
        
        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(update);
        }
    }

    function handleGamepadDisconnected(e) {
        const gamepad = e.gamepad;
        console.log(`Gamepad disconnected: ${gamepad.id}`);
        removeGamepadVisualizer(gamepad);
        delete gamepads[gamepad.index];

        if (Object.keys(gamepads).length === 0) {
            if (noGamepadMessage) {
                noGamepadMessage.style.display = 'block';
            }
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    function addGamepadVisualizer(gamepad) {
        const visualizer = document.createElement('div');
        visualizer.className = 'gamepad connected';
        visualizer.id = `gamepad-${gamepad.index}`;

        let buttonsHTML = '';
        gamepad.buttons.forEach((button, index) => {
            buttonsHTML += `<div class="button" id="btn-${gamepad.index}-${index}">B${index}</div>`;
        });

        let axesHTML = '';
        gamepad.axes.forEach((axis, index) => {
            axesHTML += `
                <div class="axis">
                    A${index}: <span id="axis-val-${gamepad.index}-${index}">0.00</span>
                    <div class="axis-bar">
                        <div class="axis-value" id="axis-bar-${gamepad.index}-${index}"></div>
                    </div>
                </div>`;
        });

        visualizer.innerHTML = `
            <div class="gamepad-name">[${gamepad.index}] ${gamepad.id}</div>
            <div class="gamepad-details">
                <div class="buttons-container">
                    <div class="container-title">Buttons</div>
                    <div class="buttons-grid">${buttonsHTML}</div>
                </div>
                <div class="axes-container">
                    <div class="container-title">Axes</div>
                    <div class="axes-grid">${axesHTML}</div>
                </div>
            </div>
        `;
        gamepadsContainer.appendChild(visualizer);
    }

    function removeGamepadVisualizer(gamepad) {
        const visualizer = document.getElementById(`gamepad-${gamepad.index}`);
        if (visualizer) {
            visualizer.remove();
        }
    }

    function update() {
        const connectedGamepads = navigator.getGamepads ? navigator.getGamepads() : [];

        for (const gamepad of connectedGamepads) {
            if (!gamepad) continue;

            // Update buttons
            gamepad.buttons.forEach((button, index) => {
                const btnElement = document.getElementById(`btn-${gamepad.index}-${index}`);
                if (btnElement) {
                    btnElement.classList.toggle('pressed', button.pressed);
                }
            });

            // Update axes
            gamepad.axes.forEach((axisValue, index) => {
                const axisValElement = document.getElementById(`axis-val-${gamepad.index}-${index}`);
                const axisBarElement = document.getElementById(`axis-bar-${gamepad.index}-${index}`);

                if (axisValElement && axisBarElement) {
                    axisValElement.textContent = axisValue.toFixed(2);
                    
                    // Update visual bar
                    const percentage = (axisValue + 1) / 2 * 100;
                    axisBarElement.style.width = `${Math.abs(axisValue) * 50}%`;
                    if (axisValue > 0) {
                        axisBarElement.style.left = '50%';
                    } else {
                        axisBarElement.style.left = `${50 - Math.abs(axisValue) * 50}%`;
                    }
                }
            });
        }
        
        animationFrameId = requestAnimationFrame(update);
    }

    // Initial check for already connected gamepads
    const initialGamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for(const gp of initialGamepads) {
        if(gp) {
            handleGamepadConnected({gamepad: gp});
        }
    }

    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);
});
