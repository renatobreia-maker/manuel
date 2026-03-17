const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 3200 } });
  await page.goto('file:///Users/renatobreia/.openclaw/workspace/dashboard-investimentos/clinica-maria-flora.html');
  await page.waitForTimeout(2000); // wait for charts to render
  await page.screenshot({
    path: '/Users/renatobreia/.openclaw/workspace/dashboard-investimentos/dashboard-maria-flora.png',
    fullPage: true
  });
  await browser.close();
  console.log('Screenshot saved!');
})();
