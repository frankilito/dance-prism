// 用系统 Chrome 驱动游戏:自动测试 / 定点截图
// 用法:
//   node tools/shoot.mjs test [extraQuery]            → 跑 ?autotest(模拟玩家全流程),收集 TEST 日志
//   node tools/shoot.mjs shot out.png [query] [waitMs] → 打开 ?shot&<query> 截图
//   node tools/shoot.mjs eval out.png "JS代码" [waitMs] → 进游戏后执行代码再截图
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:8991/';
const mode = process.argv[2] || 'test';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--window-size=1600,900', '--hide-scrollbars', '--mute-audio', '--use-angle=metal',
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
  ],
  defaultViewport: { width: 1600, height: 900 },
});
const page = await browser.newPage();
page.on('console', (m) => {
  const t = m.text();
  if (t.startsWith('TEST') || t.startsWith('FPS') || t.toLowerCase().includes('error') || t.startsWith('[game]')) console.log('[console]', t);
});
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

try {
  if (mode === 'test') {
    const extra = process.argv[3] ? `&${process.argv[3]}` : '';
    await page.goto(BASE + '?shot&autotest' + extra, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__testDone === true, { timeout: 180000 }).catch(() => console.log('[warn] test timeout'));
    await page.screenshot({ path: '/tmp/stardance_test_end.png' });
    console.log('saved /tmp/stardance_test_end.png');
  } else if (mode === 'shot') {
    const out = process.argv[3] || '/tmp/stardance.png';
    const query = process.argv[4] || '';
    const waitMs = parseInt(process.argv[5] || '3000');
    await page.goto(`${BASE}?shot${query ? `&${query}` : ''}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.__ready === true', { timeout: 60000 }).catch(() => console.log('[warn] ready timeout'));
    await new Promise((r) => setTimeout(r, waitMs));
    await page.screenshot({ path: out });
    console.log('saved', out);
  } else if (mode === 'eval') {
    const out = process.argv[3] || '/tmp/stardance.png';
    const code = process.argv[4] || '';
    const waitMs = parseInt(process.argv[5] || '1500');
    const extraQ = process.env.SHOT_QS ? `&${process.env.SHOT_QS}` : '';
    await page.goto(`${BASE}?shot${extraQ}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.__ready === true', { timeout: 60000 }).catch(() => {});
    if (code) await page.evaluate(code);
    await new Promise((r) => setTimeout(r, waitMs));
    await page.screenshot({ path: out });
    console.log('saved', out);
  }
} finally {
  await browser.close();
}
