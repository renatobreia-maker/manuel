const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const htmlPath = path.resolve(__dirname, 'estrategia-redes-sociais.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });

  await page.waitForTimeout(2000);

  const outputPath = path.resolve(__dirname, 'estrategia-redes-sociais.pdf');

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });

  console.log(`PDF gerado: ${outputPath}`);
  await browser.close();
})();
