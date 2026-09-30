import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Explicitly enabled in CI: this creates one real short URL containing synthetic data.
test.skip(process.env.LIVE_SHARE_E2E !== '1', 'Set LIVE_SHARE_E2E=1 for the real da.gd integration');
const origin = 'https://bohe76.github.io';
const appUrl = `${origin}/boss-alarm/`;
const root = process.cwd();
const appVersion = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;
const memo = '실연동 검증 한글 & + % # 雪';

async function prepareContext(context) {
  // Serve the checked-out PR files under the real origin WITHOUT deploying them.
  // The da.gd request and redirect are deliberately never mocked.
  await context.route(`${appUrl}**`, async route => {
    const pathname = new URL(route.request().url()).pathname;
    const relative = decodeURIComponent(pathname.slice('/boss-alarm/'.length)) || 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(`${root}${path.sep}`)) {
      await route.fulfill({ status: 403, body: 'Invalid test asset path' });
      return;
    }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
    try {
      await route.fulfill({ body: await readFile(file), contentType: mime[path.extname(file)] || 'application/octet-stream' });
    } catch {
      await route.fulfill({ status: 404, body: 'Missing test asset' });
    }
  });
  await context.route('https://www.googletagmanager.com/**', r => r.fulfill({ body: '', contentType: 'text/javascript' }));
  await context.route('https://www.google-analytics.com/**', r => r.fulfill({ status: 204, body: '' }));
  await context.route('https://html2canvas.hertzen.com/**', r => r.fulfill({ body: '', contentType: 'text/javascript' }));
  await context.addInitScript(version => {
    if (location.origin !== 'https://bohe76.github.io') return;
    const settings = JSON.parse(localStorage.getItem('v3_settings') || '{}');
    settings[`hide_update_modal_v${version}`] = true;
    settings.hasVisitedAlarmPolicy = 'true';
    localStorage.setItem('v3_settings', JSON.stringify(settings));
  }, appVersion);
}

test('real da.gd sharing restores every schedule in a fresh browser context', async ({ browser }) => {
  test.setTimeout(90_000);
  const sender = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const receiver = await browser.newContext();
  try {
    await prepareContext(sender);
    await prepareContext(receiver);
    const page = await sender.newPage();
    page.on('dialog', dialog => dialog.accept());
    await page.goto(appUrl);
    await expect(page.locator('body')).not.toHaveClass(/loading/);
    await page.locator('#nav-boss-scheduler').click();
    const row = page.locator('#bossInputsContainer .boss-input-item').first();
    await row.locator('.remaining-time-input').fill('00:10');
    await row.locator('.memo-input').fill(memo);
    await page.locator('#moveToBossSettingsButton').click();
    await expect(page.locator('#bossListCardsContainer')).toContainText(memo);

    const responsePromise = page.waitForResponse('https://da.gd/s');
    await page.locator('#nav-share').click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.headers()['access-control-allow-origin']).toBe('*');
    const shortUrl = (await response.text()).trim();
    expect(shortUrl).toMatch(/^https:\/\/da\.gd\/[A-Za-z0-9_-]+$/);
    const originalUrl = new URLSearchParams(response.request().postData()).get('url');
    expect(originalUrl).toContain(`${appUrl}#d=`);
    await expect(page.locator('#shareMessage')).toContainText('단축 URL이 클립보드에 복사');
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(shortUrl);
    const expected = await page.evaluate(async url => {
      const { decodeShareData } = await import('./src/share-encoder.js');
      return decodeShareData(new URL(url).hash.slice(3));
    }, originalUrl);
    expect(expected.schedules.some(s => s.memo === memo)).toBe(true);

    const landing = await receiver.newPage();
    landing.on('dialog', dialog => dialog.accept());
    await landing.goto(shortUrl, { waitUntil: 'domcontentloaded' });
    if (new URL(landing.url()).hostname === 'da.gd') {
      // Fresh long links are inside a collapsed <details> element.
      const details = landing.locator('details').filter({ has: landing.locator(`a[href^="${appUrl}"]`) });
      if (await details.count() && await details.first().getAttribute('open') === null) {
        await details.first().locator('summary').click();
      }
      const destination = landing.locator(`a[href^="${appUrl}"]`);
      await expect(destination).toHaveCount(1);
      expect(await destination.getAttribute('href')).toBe(originalUrl);
      await destination.click();
    }
    await landing.waitForURL(`${appUrl}**`);
    await expect(landing.locator('body')).not.toHaveClass(/loading/);
    const actual = await landing.evaluate(async gameId => {
      const { DB } = await import('./src/db.js');
      const names = new Map(DB.getBossesByGameId(gameId).map(b => [b.id, b.name]));
      return DB.getSchedulesByGameId(gameId).map(s => ({ bossName: names.get(s.bossId), scheduledDate: s.scheduledDate, memo: s.memo || '' }));
    }, expected.gameId);
    expect(actual).toEqual(expected.schedules);
    expect(new URL(landing.url()).hash).toBe('');
    await landing.locator('#nav-timetable').click();
    await expect(landing.locator('#timetable-screen')).toContainText(memo);
    console.log(`Live share passed: ${expected.schedules.length} schedules, ${originalUrl.length}-character URL; real CORS, clipboard, da.gd click-through and fresh-context restore verified.`);
  } finally {
    await sender.close();
    await receiver.close();
  }
});
