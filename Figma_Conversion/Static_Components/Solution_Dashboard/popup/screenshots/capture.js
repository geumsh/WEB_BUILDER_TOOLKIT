const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 528, height: 657 } });
  const cwd = process.cwd().replace(/\\/g, '/');
  const filePath = 'file:///' + cwd + '/Static_Components/Solution_Dashboard/popup/popup.html';
  await page.goto(filePath);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'Static_Components/Solution_Dashboard/popup/screenshots/impl.png' });
  await browser.close();
  console.log('Screenshot saved');
})();
