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
        modulePath: '/games/input-tester/game.js'
    },
    {
        id: 'neon-runner',
        title: 'Neon Runner',
        description: 'Blazing fast synthwave arcade action.',
        tags: ['Action', 'Retro'],
        status: 'Coming Soon',
        enabled: false,
        color: '#1a1c23',
        icon: '🔒',
        modulePath: null
    }
];
