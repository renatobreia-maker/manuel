const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file:///Users/renatobreia/.openclaw/workspace/vaga-social-media.html');
  await page.waitForTimeout(1000);
  const body = await page.$('body');
  await body.screenshot({ path: '/Users/renatobreia/.openclaw/workspace/vaga-social-media.png', type: 'png' });
  await browser.close();
  console.log('OK');
})();
