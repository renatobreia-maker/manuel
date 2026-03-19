const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 800, height: 800 });
  await page.goto('file:///Users/renatobreia/.openclaw/workspace/nord-ia-group.html');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/Users/renatobreia/.openclaw/workspace/nord-ia-group.png', type: 'png' });
  await browser.close();
  console.log('Screenshot saved');
})();
