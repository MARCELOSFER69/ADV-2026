module.exports = {
    apps: [{
        name: 'clara-bot',
        script: './bot.cjs',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'production',
        }
    }]
};
