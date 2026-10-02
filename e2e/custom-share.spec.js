import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// 커스텀 보스 목록 공유 (issue-038). 실제 da.gd 는 호출하지 않고, 단축 요청에 실린 원본 URL 을 그대로 연다.
const appVersion = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).version;
const LIST_NAME = 'E2E 커스텀 목록';
const MEMO = '커스텀 공유 메모';

async function prepareContext(context) {
  await context.route('https://www.googletagmanager.com/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('https://www.google-analytics.com/**', route => route.fulfill({ status: 204, body: '' }));
  await context.route('https://da.gd/s', route => route.fulfill({ status: 200, contentType: 'text/plain', body: 'https://da.gd/boss-alarm-e2e' }));
  await context.addInitScript(version => {
    const settings = JSON.parse(localStorage.getItem('v3_settings') || '{}');
    settings[`hide_update_modal_v${version}`] = true;
    settings.hasVisitedAlarmPolicy = 'true';
    localStorage.setItem('v3_settings', JSON.stringify(settings));
  }, appVersion);
}

async function openPage(context, url = '/') {
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.accept());
  await page.goto(url);
  await expect(page.locator('body')).not.toHaveClass(/loading/);
  return page;
}

function addCustomList(page, name, content) {
  return page.evaluate(async ({ name: listName, content: listContent }) => {
    const { CustomListManager } = await import('./src/custom-list-manager.js');
    return CustomListManager.addCustomList(listName, listContent);
  }, { name, content });
}

function readState(page, gameId) {
  return page.evaluate(async id => {
    const { DB } = await import('./src/db.js');
    const names = new Map(DB.getBossesByGameId(id).map(b => [b.id, b.name]));
    return {
      hash: location.hash,
      lastSelectedGame: DB.getSetting('lastSelectedGame'),
      customLists: (DB.getSetting('customBossLists') || []).map(list => ({ name: list.name, bosses: list.bosses })),
      bosses: DB.getBossesByGameId(id).map(b => ({ name: b.name, interval: b.interval })),
      schedules: DB.getSchedulesByGameId(id).map(s => ({ bossName: names.get(s.bossId), scheduledDate: s.scheduledDate, memo: s.memo || '' }))
    };
  }, gameId);
}

// 보내는 쪽: 커스텀 목록을 만들고, 화면에서 첫 보스의 시간·메모·젠 주기를 입력해 저장한 뒤 공유 링크를 만든다.
async function createSharedCustomLink(browser) {
  const sender = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  await prepareContext(sender);
  const page = await openPage(sender);
  expect((await addCustomList(page, LIST_NAME, '커스텀보스A\n커스텀보스B')).success).toBe(true);

  await page.locator('#nav-boss-scheduler').click();
  await page.locator('#gameSelect').selectOption(LIST_NAME);
  const row = page.locator('#bossInputsContainer .boss-input-item').first();
  await expect(row.locator('.boss-name')).toHaveText('커스텀보스A');
  await row.locator('.remaining-time-input').fill('00:10');
  await row.locator('.memo-input').fill(MEMO);
  await row.locator('.interval-hh').fill('2');
  await row.locator('.interval-mm').fill('30');
  await page.locator('#moveToBossSettingsButton').click();
  await expect(page.locator('#bossListCardsContainer')).toContainText(MEMO);

  const requestPromise = page.waitForRequest('https://da.gd/s');
  await page.locator('#nav-share').click();
  const longUrl = new URLSearchParams((await requestPromise).postData()).get('url');
  await expect(page.locator('#shareMessage')).toContainText('단축 URL이 클립보드에 복사');

  // 링크에 실제로 실린 내용 (v4 는 시각을 초 단위로 싣는다)
  const sent = await page.evaluate(async url => {
    const { decodeShareData } = await import('./src/share-encoder.js');
    return decodeShareData(new URL(url).hash.slice(3));
  }, longUrl);
  await sender.close();
  return { longUrl, sent };
}

test('a shared custom list arrives with its bosses, zen intervals and schedules', async ({ browser }) => {
  const { longUrl, sent } = await createSharedCustomLink(browser);
  expect(sent.gameId).toBe(LIST_NAME);
  expect(sent.bosses).toEqual([{ name: '커스텀보스A', interval: 150 }, { name: '커스텀보스B', interval: 0 }]);
  expect(sent.schedules.some(s => s.memo === MEMO)).toBe(true);

  const receiver = await browser.newContext();
  try {
    await prepareContext(receiver);
    const page = await openPage(receiver, longUrl);

    const received = await readState(page, LIST_NAME);
    expect(received.hash).toBe('');
    expect(received.lastSelectedGame).toBe(LIST_NAME);
    expect(received.customLists).toEqual([{ name: LIST_NAME, bosses: ['커스텀보스A', '커스텀보스B'] }]);
    expect(received.bosses).toEqual([{ name: '커스텀보스A', interval: 150 }, { name: '커스텀보스B', interval: 0 }]);
    expect(received.schedules).toEqual(sent.schedules);

    await page.locator('#nav-timetable').click();
    await expect(page.locator('#timetable-screen')).toContainText(MEMO);

    await page.locator('#nav-boss-scheduler').click();
    await expect(page.locator('#gameSelect')).toHaveValue(LIST_NAME);
    const row = page.locator('#bossInputsContainer .boss-input-item').first();
    await expect(row.locator('.boss-name')).toHaveText('커스텀보스A');
    await expect(row.locator('.interval-hh')).toHaveValue('2');
    await expect(row.locator('.interval-mm')).toHaveValue('30');
    await expect(page.locator('#bossInputsContainer .boss-name')).toHaveText(['커스텀보스A', '커스텀보스B']);

    // 새로고침해도 목록이 남아 있고, 같은 링크를 다시 열어도 목록이 늘지 않는다
    await page.reload();
    await expect(page.locator('body')).not.toHaveClass(/loading/);
    expect((await readState(page, LIST_NAME)).customLists).toHaveLength(1);
    await page.goto('about:blank');
    await page.goto(longUrl);
    await expect(page.locator('body')).not.toHaveClass(/loading/);
    const again = await readState(page, LIST_NAME);
    expect(again.customLists).toEqual([{ name: LIST_NAME, bosses: ['커스텀보스A', '커스텀보스B'] }]);
    expect(again.schedules).toEqual(sent.schedules);
  } finally {
    await receiver.close();
  }
});

test('a same-named list with different bosses is kept and the shared list gets another name', async ({ browser }) => {
  const { longUrl, sent } = await createSharedCustomLink(browser);
  const renamed = `${LIST_NAME} (2)`;

  const receiver = await browser.newContext();
  try {
    await prepareContext(receiver);
    const setup = await openPage(receiver);
    expect((await addCustomList(setup, LIST_NAME, '내 보스1\n내 보스2')).success).toBe(true);
    await setup.close();

    const page = await openPage(receiver, longUrl);
    const mine = await readState(page, LIST_NAME);
    expect(mine.lastSelectedGame).toBe(renamed);
    expect(mine.customLists).toEqual([
      { name: LIST_NAME, bosses: ['내 보스1', '내 보스2'] },
      { name: renamed, bosses: ['커스텀보스A', '커스텀보스B'] }
    ]);
    expect(mine.bosses).toEqual([]);
    expect(mine.schedules).toEqual([]);

    const received = await readState(page, renamed);
    expect(received.bosses).toEqual([{ name: '커스텀보스A', interval: 150 }, { name: '커스텀보스B', interval: 0 }]);
    expect(received.schedules).toEqual(sent.schedules);
    expect(received.hash).toBe('');

    // 이 수신자는 오늘 이미 앱을 연 상태다(자동 갱신이 Draft를 다시 채워 주지 않음).
    // 그래도 스케줄러 입력 화면에 받은 시간과 젠 주기가 보여야 한다.
    await page.locator('#nav-boss-scheduler').click();
    await expect(page.locator('#gameSelect')).toHaveValue(renamed);
    const row = page.locator('#bossInputsContainer .boss-input-item').first();
    await expect(row.locator('.boss-name')).toHaveText('커스텀보스A');
    await expect(row.locator('.calculated-spawn-time')).not.toHaveText('--:--:--');
    await expect(row.locator('.memo-input')).toHaveValue(MEMO);
    await expect(row.locator('.interval-hh')).toHaveValue('2');
    await expect(row.locator('.interval-mm')).toHaveValue('30');
  } finally {
    await receiver.close();
  }
});

test('a preset share link still loads exactly as before', async ({ browser }) => {
  const context = await browser.newContext();
  try {
    await prepareContext(context);
    const source = await openPage(context);
    const { url, gameId, bossName } = await source.evaluate(async () => {
      const { DB } = await import('./src/db.js');
      const { encodeV4Data } = await import('./src/share-encoder.js');
      const game = DB.getGames().find(g => g.type === 'preset');
      const boss = DB.getBossesByGameId(game.id)[0];
      const encoded = encodeV4Data({ gameId: game.id, schedules: [{ bossName: boss.name, scheduledDate: '2030-01-01T00:00:00.000Z', memo: '프리셋 공유' }] });
      return { url: `${location.origin}/#d=${encoded}`, gameId: game.id, bossName: boss.name };
    });
    await source.close();

    const receiver = await browser.newContext();
    await prepareContext(receiver);
    const page = await openPage(receiver, url);
    const state = await readState(page, gameId);
    expect(state.hash).toBe('');
    expect(state.lastSelectedGame).toBe(gameId);
    expect(state.customLists).toEqual([]);
    expect(state.schedules).toContainEqual({ bossName, scheduledDate: '2030-01-01T00:00:00.000Z', memo: '프리셋 공유' });
    await receiver.close();
  } finally {
    await context.close();
  }
});
