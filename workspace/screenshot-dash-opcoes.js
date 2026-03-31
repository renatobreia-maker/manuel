const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const opcoes = [
    { html: 'dash-opcao1.html', out: 'dash-opcao1.png', h: 900 },
    { html: 'dash-opcao2.html', out: 'dash-opcao2.png', h: 900 },
    { html: 'dash-opcao3.html', out: 'dash-opcao3.png', h: 1000 },
    { html: 'dash-opcao4.html', out: 'dash-opcao4.png', h: 1050 },
  ];
  for (const o of opcoes) {
    const page = await browser.newPage({ viewport: { width: 1100, height: o.h } });
    await page.goto('file:///Users/renatobreia/.openclaw/workspace/' + o.html);
    await page.waitForTimeout(1200);
    const body = await page.$('body');
    await body.screenshot({ path: '/Users/renatobreia/.openclaw/workspace/' + o.out, type: 'png' });
    await page.close();
    console.log('OK: ' + o.out);
  }
  await browser.close();
})();
