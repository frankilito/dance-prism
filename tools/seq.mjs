// 连拍:同一局内间隔抓帧,检查舞者连续动作
import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--window-size=1600,900', '--hide-scrollbars', '--mute-audio', '--use-angle=metal', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1600, height: 900 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:8991/?shot', { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__ready === true', { timeout: 60000 });
await page.evaluate('window.__startDemo(2, "solo")');
await new Promise((r) => setTimeout(r, 6000));
for (let i = 0; i < 8; i++) {
  await page.screenshot({ path: `/tmp/dp_seq_${i}.png` });
  await new Promise((r) => setTimeout(r, 350));
}
await browser.close();
console.log('saved 8 frames');
