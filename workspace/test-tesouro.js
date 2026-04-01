const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  const userDataDir = path.join(os.homedir(), 'Library/Application Support/Google/Chrome');
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    channel: 'chrome'
  });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  // Interceptar chamadas de rede para achar o endpoint da API
  const apiCalls = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('tesouro') || url.includes('b3') || url.includes('json') || url.includes('api') || url.includes('titulo')) {
      apiCalls.push({ url, method: req.method() });
    }
  });
  page.on('response', async res => {
    const url = res.url();
    if ((url.includes('tesouro') || url.includes('titulo') || url.includes('precos')) && !url.includes('.css') && !url.includes('.js')) {
      console.log('RESPONSE:', res.status(), url);
      try {
        const body = await res.text();
        if (body.includes('2032') || body.includes('LTN')) {
          console.log('DADOS ENCONTRADOS em:', url);
          console.log(body.substring(0, 500));
        }
      } catch(e) {}
    }
  });

  try {
    console.log('Abrindo Tesouro Direto...');
    await page.goto('https://www.tesourodireto.com.br/titulos/precos-e-taxas.htm', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(8000);

    console.log('\nAPI calls interceptadas:', apiCalls.length);
    apiCalls.forEach(c => console.log('-', c.method, c.url));

  } catch (e) {
    console.error('Erro:', e.message);
  }

  await browser.close().catch(() => {});
})();
