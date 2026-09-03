const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
    console.log(error.stack);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });
  await page.goto('http://localhost:8080/');
  await page.waitForTimeout(2000);
  
  const regionBtn = page.locator('button:has-text("إربد")');
  if (await regionBtn.count() > 0) {
    await regionBtn.click();
    await page.waitForTimeout(1000);
  }
  
  const cards = page.locator('.ratecard__services button');
  if (await cards.count() > 0) {
    console.log('Clicking card...');
    await cards.first().click();
    await page.waitForTimeout(1000);
  }
  
  await browser.close();
})();
