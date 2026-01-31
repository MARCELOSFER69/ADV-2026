const { firefox } = require('playwright');
const jsQR = require('jsqr');
const Jimp = require('jimp');

// Função para atrasos aleatórios "humanos"
const delay = (ms) => new Promise(res => setTimeout(res, ms));
const randomDelay = (min = 1000, max = 3000) => delay(Math.floor(Math.random() * (max - min + 1) + min));

async function typeLikeHuman(page, selector, text) {
    await page.waitForSelector(selector);
    const element = await page.$(selector);

    const box = await element.boundingBox();
    if (box) {
        // Ponto de destino aleatório dentro do campo (não sempre no centro)
        const targetX = box.x + (box.width * (0.2 + Math.random() * 0.6));
        const targetY = box.y + (box.height * (0.2 + Math.random() * 0.6));

        await page.mouse.move(targetX - 50, targetY + 30, { steps: 5 });
        await page.mouse.move(targetX, targetY, { steps: 15 });
        await randomDelay(200, 500);
        await page.mouse.click(targetX, targetY);
    } else {
        await element.click();
    }

    await randomDelay(400, 800);

    for (const char of text) {
        await page.keyboard.type(char, { delay: Math.floor(Math.random() * (350 - 150 + 1) + 150) });
        if (Math.random() > 0.8) await randomDelay(100, 400);
    }
}

async function randomMouseMove(page) {
    const { width, height } = page.viewportSize();
    for (let i = 0; i < 3; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        // Caminho curvo simples simulado com steps
        await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 20) + 10 });
        if (Math.random() > 0.7) await randomDelay(200, 600);
    }
}

async function humanScroll(page) {
    try {
        await page.evaluate(async () => {
            const amount = Math.floor(Math.random() * 200) + 100;
            window.scrollBy({ top: amount, behavior: 'smooth' });
            await new Promise(r => setTimeout(r, 800));
            window.scrollBy({ top: -amount, behavior: 'smooth' });
        });
    } catch (e) { }
}

async function getQRCodeLink(page) {
    const isDeepLink = (url) => {
        if (!url || typeof url !== 'string' || url.length < 40) return false;
        const deepPatterns = ['oauth2', 'authorize', 'nuapp', 'link', 'beta'];
        const isGeneric = url.match(/^https?:\/\/(www\.)?nubank\.com\.br\/?$/i);
        return deepPatterns.some(p => url.toLowerCase().includes(p)) && !isGeneric;
    };

    // 1. Tentar extrair link diretamente (incluindo Shadow DOM)
    try {
        console.log("🔍 Buscando links profundos...");
        const links = await page.locator('a').all();
        console.log(`🔎 Links detectados na página: ${links.length}`);

        for (const l of links) {
            const href = await l.getAttribute('href');
            if (href && isDeepLink(href)) {
                console.log("🔗 Deep Link encontrado via Locator!");
                return href;
            } else if (href && href.includes('nubank')) {
                const text = await l.innerText();
                console.log(`   - [${text.trim().slice(0, 15)}]: ${href} (Filtro Longo)`);
            }
        }
    } catch (e) {
        console.log("⚠️ Erro na extração via Locators:", e.message);
    }

    // 2. Tentar decodificar o QR Code
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            const qrLoc = page.locator('svg[role="authorizeQRCode"], svg, canvas, .qr-code img').first();
            await qrLoc.waitFor({ timeout: 35000 });
            await qrLoc.scrollIntoViewIfNeeded();

            await qrLoc.evaluate((el) => {
                // @ts-ignore
                el.style.backgroundColor = 'white';
                // @ts-ignore
                el.style.filter = 'none';
                const shapes = el.querySelectorAll('path, rect, circle, polygon');
                shapes.forEach(s => {
                    const fill = s.getAttribute('fill') || window.getComputedStyle(s).fill;
                    if (fill && fill !== 'transparent' && fill !== 'none' && !fill.includes('rgba(0,0,0,0)')) {
                        s.setAttribute('fill', 'black');
                        // @ts-ignore
                        s.style.fill = 'black';
                    }
                });
            });

            console.log(`📸 Capturando QR Code (Tentativa ${attempts + 1})...`);
            const buffer = await qrLoc.screenshot({ type: 'png', scale: 'device' });
            require('fs').writeFileSync('ultimo_qr_capturado.png', buffer);

            let image = await Jimp.read(buffer);
            image.resize(600, Jimp.AUTO, Jimp.RESIZE_NEAREST_NEIGHBOR);

            const strategies = [
                { name: 'Pure White BG', bg: 0xFFFFFFFF, contrast: 0.6 },
                { name: 'High Contrast', bg: 0xFFFFFFFF, grayscale: true, contrast: 0.9 },
                { name: 'Binarized', bg: 0xFFFFFFFF, threshold: true }
            ];

            for (const strat of strategies) {
                let canvas = new Jimp(image.bitmap.width, image.bitmap.height, strat.bg);
                canvas.composite(image, 0, 0);
                if (strat.grayscale) canvas.grayscale();
                if (strat.contrast) canvas.contrast(strat.contrast);
                if (strat.threshold) {
                    canvas.grayscale();
                    canvas.scan(0, 0, canvas.bitmap.width, canvas.bitmap.height, function (x, y, idx) {
                        const avg = (this.bitmap.data[idx + 0] + this.bitmap.data[idx + 1] + this.bitmap.data[idx + 2]) / 3;
                        const val = avg > 150 ? 255 : 0;
                        this.bitmap.data[idx + 0] = this.bitmap.data[idx + 1] = this.bitmap.data[idx + 2] = val;
                        this.bitmap.data[idx + 3] = 255;
                    });
                }

                const code = jsQR(new Uint8ClampedArray(canvas.bitmap.data), canvas.bitmap.width, canvas.bitmap.height);
                if (code && isDeepLink(code.data)) {
                    console.log(`✅ Deep Link decodificado via QR!`);
                    return code.data;
                }
            }

            attempts++;
            if (attempts < maxAttempts) await randomDelay(2000, 3000);
        } catch (err) {
            console.error("Erro no processamento do QR:", err.message);
            attempts++;
        }
    }
    return null;
}

async function startGovBrRecovery(cpf, bank = 'nubank', headless = true) {
    console.log(`🦊 Iniciando motor Firefox (${headless ? 'Modo Oculto' : 'Modo Visível'} - Alta Furtividade)...`);

    // Lista de User Agents modernos e variados para rotatividade
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.2; rv:122.0) Gecko/20100101 Firefox/122.0'
    ];
    const selectedUA = userAgents[Math.floor(Math.random() * userAgents.length)];

    const browser = await firefox.launch({
        headless: headless,
        firefoxUserPrefs: {
            'dom.webdriver.enabled': false,
            'useAutomationExtension': false,
            'devtools.debugger.remote-enabled': false,
            'browser.display.use_document_fonts': 1,
            'privacy.trackingprotection.enabled': true,
            'privacy.resistFingerprinting': false, // Algumas vezes atrapalha detecção de bot se true
        }
    });

    // Viewport levemente aleatória
    const viewportWidth = 1366 + Math.floor(Math.random() * 100);
    const viewportHeight = 768 + Math.floor(Math.random() * 50);

    const context = await browser.newContext({
        viewport: { width: viewportWidth, height: viewportHeight },
        userAgent: selectedUA,
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        permissions: ['geolocation'],
        ignoreHTTPSErrors: true
    });

    // Injeção de script de camuflagem avançada
    await context.addInitScript(() => {
        // Ocultar webdriver
        Object.defineProperty(navigator, 'webdriver', { get: () => false });

        // Mock de hardware
        // @ts-ignore
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
        // @ts-ignore
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });

        // Mock de WebGL
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (parameter) {
            if (parameter === 37445) return 'Intel Inc.';
            if (parameter === 37446) return 'Intel(R) Iris(TM) Graphics 6100';
            return getParameter.apply(this, arguments);
        };

        // Mock de plugins
        // @ts-ignore
        Object.defineProperty(navigator, 'plugins', {
            get: () => [
                { name: 'PDF Viewer', filename: 'internal-pdf-viewer' },
                { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer' }
            ]
        });
    });

    const page = await context.newPage();

    try {
        console.log(`🚀 Acessando gov.br para CPF: ${cpf}`);
        // Timeout maior e espera pelo carregamento inicial
        await page.goto('https://acesso.gov.br/', { waitUntil: 'load', timeout: 90000 });
        console.log("✅ Página carregada com sucesso.");

        await randomDelay(2000, 4000);
        await randomMouseMove(page);
        await humanScroll(page);
        await randomDelay(1000, 2000);

        // 1. Inserir CPF
        console.log("⌨️ Localizando campo de CPF...");
        const cpfSelector = '#accountId';
        await page.waitForSelector(cpfSelector, { timeout: 30000 });

        await randomMouseMove(page);
        console.log("✍️ Digitando CPF lentamente...");
        await typeLikeHuman(page, cpfSelector, cpf);

        await randomDelay(1500, 2500);
        console.log("🖱️ Pressionando Enter...");
        await page.keyboard.press('Enter');

        // Detecção de Captcha
        const captchaSelector = '#captcha, .g-recaptcha, iframe[src*="captcha"]';
        try {
            const hasCaptcha = await page.waitForSelector(captchaSelector, { timeout: 5000 });
            if (hasCaptcha) {
                console.log("⚠️ CAPTCHA detectado! Por favor, resolva manualmente na janela do Firefox...");
                await page.waitForFunction(() => !document.querySelector('#accountId') || document.location.href.includes('password-recovery'), { timeout: 300000 });
                console.log("✅ Sistema avançou! Continuando...");
            }
        } catch (e) {
            console.log("✨ Fluxo direto (sem captcha visível).");
        }

        // 2. Esqueci minha senha
        console.log("🔗 Procurando 'Esqueci minha senha'...");
        await page.waitForSelector('#password-recovery, a:has-text("Esqueci minha senha")', { timeout: 30000 });
        await randomDelay(1000, 2000);
        await page.click('#password-recovery, a:has-text("Esqueci minha senha")');

        // 3. Recuperar de outra forma
        console.log("🏦 Procurando 'Recuperar de outra forma'...");
        await page.waitForSelector('#btnGoToBanks, button:has-text("Recuperar de outra forma")', { timeout: 30000 });
        await randomDelay(1000, 2000);
        await page.click('#btnGoToBanks, button:has-text("Recuperar de outra forma")');

        // 4. Modal de confirmação
        console.log("⚠️ Confirmando no modal...");
        const continueBtn = 'input[value="Continuar"], button:has-text("Continuar")';
        await page.waitForSelector(continueBtn, { timeout: 30000 });
        await randomDelay(1000, 2500);

        // Hover antes de clicar (movimento humano)
        const btnBox = await (await page.$(continueBtn)).boundingBox();
        if (btnBox) {
            await page.mouse.move(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2, { steps: 10 });
            await randomDelay(300, 700);
        }
        await page.click(continueBtn);

        // 5. Selecionar Banco
        if (bank === 'nubank') {
            console.log("💜 Escolhendo Nubank...");
            // Usando seletor mais específico baseado na estrutura de card e texto
            const nubankSelector = 'div.br-card:has-text("Nubank") a, a:has-text("Nubank"), .br-card:nth-child(7)';
            await page.waitForSelector(nubankSelector, { timeout: 30000 });
            await randomDelay(1500, 3000);

            // Hover para garantir movimento humano
            const bankBox = await (await page.$(nubankSelector)).boundingBox();
            if (bankBox) {
                await page.mouse.move(bankBox.x + bankBox.width / 2, bankBox.y + bankBox.height / 2, { steps: 10 });
                await randomDelay(300, 600);
            }

            await page.click(nubankSelector);
        } else {
            throw new Error("Banco não suportado.");
        }

        // 6. Modal OK
        console.log("✅ Clicando OK no redirecionamento...");
        await page.waitForSelector('button:has-text("OK")', { timeout: 30000 });
        await randomDelay(1000, 2000);
        await page.click('button:has-text("OK")');

        // 7. Tela do QR Code
        console.log("⌛ Aguardando QR Code final...");
        await page.waitForLoadState('networkidle');
        const link = await getQRCodeLink(page);

        if (link) {
            console.log(`✅ Link extraído com sucesso: ${link}`);
            setTimeout(() => { browser.close().catch(() => { }); }, 300000);
            return { success: true, link: link };
        } else {
            throw new Error("Falha ao extrair link.");
        }

    } catch (err) {
        console.error("❌ Erro na automação gov.br:", err.message);
        if (browser) await browser.close();
        return { success: false, error: err.message };
    }
}

module.exports = { startGovBrRecovery };
