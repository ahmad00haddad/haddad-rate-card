import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  const consoleErrors = [];

  page.on('pageerror', error => {
    errors.push('PAGE ERROR: ' + error.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push('CONSOLE: ' + msg.text());
  });

  // Test 1: Load homepage
  console.log('=== Test 1: Homepage loads ===');
  await page.goto('http://localhost:8080/');
  await page.waitForTimeout(2000);
  console.log('  OK: Page loaded');

  // Test 2: Select Irbid region
  console.log('=== Test 2: Select Irbid ===');
  const irbidBtn = page.locator('button:has-text("إربد")');
  if (await irbidBtn.count() > 0) {
    await irbidBtn.first().click();
    await page.waitForTimeout(1000);
    console.log('  OK: Irbid selected');
  } else {
    console.log('  SKIP: No Irbid button (auto-detected Amman?)');
  }

  // Test 3: Click first service card
  console.log('=== Test 3: Select a service ===');
  const serviceCards = page.locator('.ratecard__services button, .ratecard__stage button');
  const cardCount = await serviceCards.count();
  console.log('  Found', cardCount, 'service buttons');
  if (cardCount > 0) {
    await serviceCards.first().click();
    await page.waitForTimeout(1500);
    console.log('  OK: Service selected');
  }

  // Test 4: Check pricing rows exist
  console.log('=== Test 4: Check pricing rows ===');
  const rows = page.locator('.ratecard__price-row');
  const rowCount = await rows.count();
  console.log('  Found', rowCount, 'pricing rows');

  // Test 5: Go back to services
  console.log('=== Test 5: Go back ===');
  const backBtn = page.locator('.ratecard__back');
  if (await backBtn.count() > 0) {
    await backBtn.click();
    await page.waitForTimeout(500);
    console.log('  OK: Back to services');
  }

  // Test 6: Go back to region selection
  console.log('=== Test 6: Change region ===');
  const regionPill = page.locator('.ratecard__region-pill');
  if (await regionPill.count() > 0) {
    await regionPill.click();
    await page.waitForTimeout(500);
    console.log('  OK: Back to region selection');
  }

  // Test 7: Select Amman
  console.log('=== Test 7: Select Amman ===');
  const ammanBtn = page.locator('button:has-text("عمّان")');
  if (await ammanBtn.count() > 0) {
    await ammanBtn.first().click();
    await page.waitForTimeout(1000);
    console.log('  OK: Amman selected');
  }

  // Test 8: Click first service in Amman
  console.log('=== Test 8: Select service in Amman ===');
  const ammanServices = page.locator('.ratecard__services button, .ratecard__stage button');
  if (await ammanServices.count() > 0) {
    await ammanServices.first().click();
    await page.waitForTimeout(1500);
    console.log('  OK: Service selected in Amman');
  }

  // Test 9: Switch currency to USD
  console.log('=== Test 9: Switch to USD ===');
  const usdBtn = page.locator('button:has-text("USD")');
  if (await usdBtn.count() > 0) {
    await usdBtn.click();
    await page.waitForTimeout(500);
    console.log('  OK: Switched to USD');
  }

  // Test 10: Switch language
  console.log('=== Test 10: Switch language ===');
  const enBtn = page.locator('button:has-text("EN")');
  if (await enBtn.count() > 0) {
    await enBtn.click();
    await page.waitForTimeout(500);
    console.log('  OK: Switched to English');
  }

  // Test 11: Admin page
  console.log('=== Test 11: Admin page loads ===');
  await page.goto('http://localhost:8080/admin');
  await page.waitForTimeout(3000);
  console.log('  OK: Admin page loaded');

  // Summary
  console.log('\n=== RESULTS ===');
  console.log('Page errors:', errors.length);
  errors.forEach(e => console.log('  ', e));
  console.log('Console errors:', consoleErrors.length);
  consoleErrors.forEach(e => console.log('  ', e));
  console.log(errors.length === 0 && consoleErrors.length === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ ERRORS FOUND');

  await browser.close();
})();
