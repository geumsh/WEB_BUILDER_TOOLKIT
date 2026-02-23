const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  // 2배 해상도로 캡처하여 디테일 확인
  const page = await browser.newPage({
    viewport: { width: 528, height: 657 },
    deviceScaleFactor: 2
  });
  const cwd = process.cwd().replace(/\\/g, '/');
  const filePath = 'file:///' + cwd + '/Static_Components/Solution_Dashboard/popup/popup.html';
  await page.goto(filePath);
  await page.waitForTimeout(500);

  // 차트 영역만 클리핑하여 캡처
  const chartEl = await page.$('.chart-contents');
  if (chartEl) {
    await chartEl.screenshot({ path: 'Static_Components/Solution_Dashboard/popup/screenshots/chart-zoom.png' });
    console.log('Chart zoom screenshot saved');
  }

  // 전체도 2배로 캡처
  await page.screenshot({ path: 'Static_Components/Solution_Dashboard/popup/screenshots/impl-2x.png' });
  console.log('Full 2x screenshot saved');

  await browser.close();
})();
