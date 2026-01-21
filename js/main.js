import { ControllerSystem } from './controllerSystem.js';
import { UIManager } from './uiManager.js';

class App {
    constructor() {
        this.controllerSystem = new ControllerSystem();
        this.uiManager = new UIManager(this.controllerSystem);

        this.init();
    }

    init() {
        // Handle Navigation
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const viewId = link.getAttribute('id').replace('nav-', '') + '-view';
                this.switchView(viewId, link);
            });
        });

        // Initial setup for the controller system
        this.controllerSystem.start();

        // Let the UI manager take over the initial rendering
        this.uiManager.renderInitial();

        // Start the main app loop for input processing and UI updates
        this.loop();
    }

    switchView(viewId, activeLink) {
        // Update Nav UI
        document.querySelectorAll('nav a').forEach(l => l.classList.remove('active'));
        activeLink.classList.add('active');

        // Update View Visibility
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        const targetView = document.getElementById(viewId);
        if (targetView) targetView.classList.remove('hidden');

        // Special handling for views
        if (viewId === 'test-game-view') {
            this.uiManager.initTestGame();
        } else {
            this.uiManager.stopTestGame();
            document.getElementById('test-game-view').classList.remove('fullscreen-mode');
        }
    }

    loop() {
        this.controllerSystem.update();
        this.uiManager.update();
        requestAnimationFrame(() => this.loop());
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
