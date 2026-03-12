const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
  await page.goto('file:///Users/renatobreia/.openclaw/workspace/arquitetura-manuel.html');
  await page.waitForTimeout(500);
  const body = await page.$('body');
  await body.screenshot({ path: '/Users/renatobreia/.openclaw/workspace/arquitetura-manuel.png', type: 'png' });
  await browser.close();
  console.log('OK');
})();
