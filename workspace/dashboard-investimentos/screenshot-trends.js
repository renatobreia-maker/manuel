const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 2200 });
  await page.goto('file:///Users/renatobreia/.openclaw/workspace/dashboard-investimentos/nord-marca-trends.html');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/Users/renatobreia/.openclaw/workspace/dashboard-investimentos/nord-marca-trends.png', type: 'png', fullPage: true });
  await browser.close();
  console.log('Screenshot saved');
})();
