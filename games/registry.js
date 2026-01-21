/**
 * Game Registry
 * Add your games here to have them appear in the GameHub launcher.
 */
export const games = [
    {
        id: 'input-tester',
        title: 'Input Tester',
        description: 'A reference implementation for the Universal Controller System.',
        tags: ['System', 'Reference'],
        status: 'Ready',
        enabled: true,
        color: 'linear-gradient(135deg, #7c4dff, #00e5ff)',
        icon: '🎮',
        modulePath: '/games/input-tester/game.js',
        fullscreen: false
    },
    {
        id: 'pong',
        title: 'Pong',
        description: 'A neon-infused classic 2-player paddle battle.',
        tags: ['Classic', 'Multiplayer'],
        status: 'Ready',
        enabled: true,
        color: 'linear-gradient(135deg, #7c4dff, #00e5ff)',
        icon: '🏓',
        modulePath: '/games/pong/game.js',
        fullscreen: true
    },
    {
        id: 'breakout',
        title: 'Breakout',
        description: 'Smash through neon bricks in this solo arcade challenge.',
        tags: ['Classic', 'Singleplayer'],
        status: 'Ready',
        enabled: true,
        color: 'linear-gradient(135deg, #00e5ff, #7c4dff)',
        icon: '🧱',
        modulePath: '/games/breakout/game.js',
        fullscreen: true
    },
    {
        id: 'snake',
        title: 'Snake',
        description: 'Classic grid-based snake with a neon twist.',
        tags: ['Classic', 'Singleplayer'],
        status: 'Ready',
        enabled: true,
        color: 'linear-gradient(135deg, #69f0ae, #00e5ff)',
        icon: '🐍',
        modulePath: '/games/snake/game.js',
        fullscreen: true
    },
    {
        id: 'space-invaders',
        title: 'Space Invaders',
        description: 'Defend the earth from waves of neon invaders.',
        tags: ['Shooter', 'Classic'],
        status: 'Ready',
        enabled: true,
        color: 'linear-gradient(135deg, #7c4dff, #69f0ae)',
        icon: '🛸',
        modulePath: '/games/space-invaders/game.js',
        fullscreen: true
    },
    {
        id: 'cyber-tanks',
        title: 'Cyber Tanks',
        description: '2-4 player arena combat on a shared screen.',
        tags: ['Action', 'Multiplayer'],
        status: 'Ready',
        enabled: true,
        color: 'linear-gradient(135deg, #7c4dff, #ff5252)',
        icon: '🚜',
        modulePath: '/games/cyber-tanks/game.js',
        fullscreen: true
    },
    {
        id: 'neon-drifter',
        title: 'Neon Drifter',
        description: 'High-speed top-down circuit racing for 2-4 players.',
        tags: ['Racing', 'Multiplayer'],
        status: 'Ready',
        enabled: true,
        color: 'linear-gradient(135deg, #00e5ff, #69f0ae)',
        icon: '🏎️',
        modulePath: '/games/neon-drifter/game.js',
        fullscreen: true
    },
    {
        id: 'crystal-duel',
        title: 'Crystal Duel',
        description: 'Side-by-side neon puzzle battle for 2 players.',
        tags: ['Puzzle', 'Multiplayer'],
        status: 'Ready',
        enabled: true,
        color: 'linear-gradient(135deg, #d500f9, #2979ff)',
        icon: '💎',
        modulePath: '/games/crystal-duel/game.js',
        fullscreen: true
    },
    {
        id: 'light-volley',
        title: 'Light Volley',
        description: 'Physics-based neon volleyball battle for 2-4 players.',
        tags: ['Sports', 'Multiplayer'],
        status: 'Ready',
        enabled: true,
        color: 'linear-gradient(135deg, #69f0ae, #7c4dff)',
        icon: '🏐',
        modulePath: '/games/light-volley/game.js',
        fullscreen: true
    },
    {
        id: 'light-cycles',
        title: 'Light Cycles',
        description: 'Neon grid survival for 2-4 players. Leave no trail behind.',
        tags: ['Classic', 'Multiplayer'],
        status: 'Ready',
        enabled: true,
        color: 'linear-gradient(135deg, #00e5ff, #d500f9)',
        icon: '🟦',
        modulePath: '/games/light-cycles/game.js',
        fullscreen: true
    }
];
