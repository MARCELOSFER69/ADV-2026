const { spawn } = require('child_process');
const path = require('path');

// Caminho absoluto para o RGP SERVER (Sistema Principal)
const botScript = path.join(__dirname, 'rgp_server.cjs');

function startBot() {
    console.log("\n===================================================");
    console.log("🚀 [RUNNER] Iniciando Backend do Sistema (RGP + Terminal)...");
    console.log("===================================================\n");

    // Inicia o serviço principal
    const bot = spawn('node', [botScript], { stdio: 'inherit' });

    bot.on('close', (code) => {
        if (code === 0) {
            console.log("\n✅ [RUNNER] Bot reiniciado propositalmente (Comando de Restart).");
        } else {
            console.log(`\n⚠️ [RUNNER] Bot caiu ou parou (Código ${code}).`);
        }
        console.log("⏳ Reiniciando em 3 segundos...\n");
        setTimeout(startBot, 3000);
    });

    bot.on('error', (err) => {
        console.error("❌ [RUNNER] Erro ao iniciar processo:", err);
    });
}

startBot();
