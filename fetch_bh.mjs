import puppeteer from 'puppeteer';

(async () => {
  const urls = [
    'https://www.bhphotovideo.com/c/product/1904935-REG/megadap_etz21pro_etz21_pro_sony_e_mount.html',
    'https://www.bhphotovideo.com/c/product/1919505-REG/nikon_zr_cinema_camera.html',
    'https://www.bhphotovideo.com/c/product/1796985-REG/prograde_digital_pgcfx1tbatbh_prograde_digital_1tb_cfexpress.html',
    'https://www.bhphotovideo.com/c/product/1920348-REG/smallrig_5467_camera_cage_for_nikon.html'
  ];

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

  const results = [];
  for (const url of urls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const data = await page.evaluate(() => {
        const title = document.querySelector('meta[property="og:title"]')?.content || document.title;
        const img = document.querySelector('meta[property="og:image"]')?.content || '';
        const priceElement = document.querySelector('[data-selenium="pricingPrice"]');
        const price = priceElement ? priceElement.innerText.replace(/[^0-9.]/g, '') : '';
        const desc = document.querySelector('meta[property="og:description"]')?.content || '';
        return { title, img, price, desc };
      });
      results.push(data);
    } catch (e) {
      results.push({ error: e.message });
    }
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
