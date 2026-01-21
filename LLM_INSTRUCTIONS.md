# Instructions for Recreating RetroCouch GameHub

This document provides a detailed, technology-agnostic blueprint for an LLM to recreate the RetroCouch GameHub application. The focus is on the core features, logic, and user experience, not on specific frameworks or libraries.

## 1. Core Application Concept

The application is a browser-based hub for playing retro-style games. Its primary purpose is to provide a **Universal Controller System** that allows users to play games with various input devices (keyboard, different gamepads) without the games needing to handle the specific hardware themselves.

## 2. Core Features

### 2.1. Homepage / Game Launcher

- **Purpose**: To display a selection of available games.
- **Layout**:
    - A clear headline like "Choose Your Game".
    - A grid layout (e.g., 3x3) of game "tiles".
- **Game Tile Content**: Each tile represents a game and must contain:
    - An image for the game.
    - The title of the game.
    - Tags to indicate its status (e.g., "Test Game", "Coming Soon").
- **Functionality**:
    - Tiles for enabled games should be interactive and navigate to the game's page when clicked.
    - Tiles for disabled games ("Coming Soon") should appear inactive and not be clickable.
    - There must be a persistent navigation element (e.g., in a header) that links to the **Settings Page** and the **Documentation Page**.

### 2.2. Universal Controller System (The Core Logic)

This is the most critical part of the application. It should be a central software module or service.

- **Input Abstraction**:
    - The system must monitor and process inputs from the **keyboard** and any **connected gamepads** (using the browser's Gamepad API).
    - It must translate raw hardware inputs (e.g., a "W" key press, a "Button 0" press on a gamepad, or an analog stick movement) into a predefined, standardized set of **Game Actions**.
- **Standardized Game Actions**: The system must use a fixed set of abstract actions that all games will understand. These are:
    - **Face Buttons**: `actionSouth`, `actionEast`, `actionWest`, `actionNorth` (boolean: `true` if pressed).
    - **Shoulder Buttons**: `leftBumper`, `rightBumper`, `leftTrigger`, `rightTrigger` (boolean).
    - **Special Buttons**: `select`, `start`, `leftStickPress`, `rightStickPress` (boolean).
    - **Directional Pad**: `dpadUp`, `dpadDown`, `dpadLeft`, `dpadRight` (boolean).
    - **Analog Sticks**: `leftStickX`, `leftStickY`, `rightStickX`, `rightStickY` (number: from -1.0 to 1.0).
- **Player State**:
    - The system must support multiple players (e.g., up to 4).
    - For each player, it must maintain a "state object" that holds the current value of every standardized game action (e.g., `{ actionSouth: false, leftStickX: 0.95, ... }`).
- **Game Integration API**:
    - Provide a simple mechanism for a game to retrieve the current controller state for a specific player (e.g., `getControllerState(playerIndex)`).
    - This mechanism must be "live". When a controller input changes, the game should automatically receive the updated state, triggering the game's logic loop.

### 2.3. Settings Page

- **Purpose**: To allow users to configure players and their controller mappings.
- **Player Setup Section**:
    - Display a separate configuration area ("card") for each of the 4 players.
    - Each player card must contain:
        1.  **Name Input**: An editable text field to set the player's name (e.g., "Player 1", "Pika-Chu", "HighScorer"). This name should be saved.
        2.  **Profile Dropdown**: A dropdown menu to assign a Controller Profile to this player.
        3.  **Device Dropdown**: A dropdown menu to assign a physical input device to this player. The options should be "Keyboard" and any currently connected gamepads (e.g., "Gamepad 0: Wireless Controller", "Gamepad 1: USB Gamepad"). A device can only be assigned to one player at a time.
- **Controller Profiles Section**:
    - **Concept**: A "profile" is a saved mapping from raw device inputs to the standardized game actions.
    - **Default Profiles**: The application must ship with non-editable, non-deletable default profiles (e.g., "Default Keyboard", "Standard Gamepad", "Retro Gamepad").
    - **Custom Profiles**:
        - List all custom profiles created by the user.
        - For each custom profile, provide "Edit" and "Delete" buttons.
        - Provide a "Create New Profile" button.
    - **Profile Editor (Popup/Modal)**:
        - When creating or editing a profile, display a dialog.
        - The dialog must contain a list of all standardized game actions.
        - Next to each action, display the raw input it is currently mapped to (e.g., `actionSouth` -> `button-0`).
        - A "Remap" button next to each action should initiate a "listening" state.
        - A dropdown menu in the editor must allow the user to select which device to use for the remapping (Keyboard or a specific gamepad).
        - When listening, the system should wait for the next button press or significant axis movement on the selected device and assign that input to the action.
- **Data Persistence**: All player assignments (name, profile, device) and all custom controller profiles must be saved in the browser's local storage so they persist between sessions.

### 2.4. Test Game

- **Purpose**: To provide immediate visual feedback for the controller configurations.
- **Game Area**:
    - A designated area on the screen.
    - For each player with an active input device, render a distinct movable shape (e.g., a colored square).
- **Functionality**:
    - The position of a player's shape must be controlled by their `leftStickX` and `leftStickY` actions.
    - The color of the player's shape should change when they press the face buttons (`actionNorth`, `actionSouth`, etc.).
- **Debug View**:
    - Alongside the game area, display the real-time controller state object for each player. This is crucial for debugging.
    - Show each game action and its current boolean or numeric value.
    - The display for an inactive player should indicate that they are inactive.

### 2.5. Documentation Page

- **Purpose**: To explain to other developers how to integrate their games with the Universal Controller System.
- **Content**:
    - An introduction to the concept of the controller API.
    - A code example showing how to call the Game Integration API to get the controller state.
    - A comprehensive list of all the standardized **Game Actions** and the data type of their values (boolean or number).

This structure ensures that the core logic is decoupled from the UI and that the user has full control over their gaming experience.
