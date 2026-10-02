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

test('a zen interval edited after the first save is stored and carried by the share link', async ({ browser }) => {
  // issue-039: 처음 저장한 뒤 주기를 고치면 DB에 반영되지 않던 문제
  const sender = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  try {
    await prepareContext(sender);
    const page = await openPage(sender);
    expect((await addCustomList(page, LIST_NAME, '커스텀보스A')).success).toBe(true);

    await page.locator('#nav-boss-scheduler').click();
    await page.locator('#gameSelect').selectOption(LIST_NAME);
    const row = page.locator('#bossInputsContainer .boss-input-item').first();
    await row.locator('.remaining-time-input').fill('00:10');
    await page.locator('#moveToBossSettingsButton').click();
    await expect(page.locator('#timetable-screen')).toHaveClass(/active/);
    expect((await readState(page, LIST_NAME)).bosses).toEqual([{ name: '커스텀보스A', interval: 0 }]);

    await page.locator('#nav-boss-scheduler').click();
    await expect(row.locator('.calculated-spawn-time')).not.toHaveText('--:--:--');
    await row.locator('.interval-hh').fill('1');
    await row.locator('.interval-mm').fill('30');
    await page.locator('#moveToBossSettingsButton').click();
    await expect(page.locator('#timetable-screen')).toHaveClass(/active/);

    const saved = await readState(page, LIST_NAME);
    expect(saved.bosses).toEqual([{ name: '커스텀보스A', interval: 90 }]);
    expect(saved.schedules.length).toBeGreaterThan(1); // 새 주기로 48h 확장됨

    const requestPromise = page.waitForRequest('https://da.gd/s');
    await page.locator('#nav-share').click();
    const longUrl = new URLSearchParams((await requestPromise).postData()).get('url');
    const sent = await page.evaluate(async url => {
      const { decodeShareData } = await import('./src/share-encoder.js');
      return decodeShareData(new URL(url).hash.slice(3));
    }, longUrl);
    expect(sent.bosses).toEqual([{ name: '커스텀보스A', interval: 90 }]);

    // 주기 칸을 비워 저장하면 주기 없음으로 돌아간다
    await page.locator('#nav-boss-scheduler').click();
    await expect(row.locator('.interval-hh')).toHaveValue('1');
    await row.locator('.interval-hh').fill('');
    await row.locator('.interval-mm').fill('');
    await page.locator('#moveToBossSettingsButton').click();
    await expect(page.locator('#timetable-screen')).toHaveClass(/active/);
    expect((await readState(page, LIST_NAME)).bosses).toEqual([{ name: '커스텀보스A', interval: 0 }]);
  } finally {
    await sender.close();
  }
});

test('a crafted link with 1-minute intervals and far-future dates cannot flood the schedule table', async ({ browser }) => {
  // issue-040: 수정 전에는 보스 하나가 스케줄 50만 건 이상을 만들어 앱이 멈췄다
  const context = await browser.newContext();
  try {
    await prepareContext(context);
    const source = await openPage(context);
    const url = await source.evaluate(async listName => {
      const { encodeV4Data } = await import('./src/share-encoder.js');
      const names = ['폭주1', '폭주2', '폭주3', '폭주4', '폭주5'];
      const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const encoded = encodeV4Data({
        gameId: listName,
        schedules: names.map(bossName => ({ bossName, scheduledDate: farFuture, memo: '' })),
        bosses: names.map(name => ({ name, interval: 1 }))
      });
      return `${location.origin}/#d=${encoded}`;
    }, LIST_NAME);
    await source.close();

    const receiver = await browser.newContext();
    await prepareContext(receiver);
    const page = await openPage(receiver, url);
    const state = await readState(page, LIST_NAME);
    expect(state.lastSelectedGame).toBe(LIST_NAME);
    expect(state.bosses).toHaveLength(5);
    expect(state.schedules.length).toBeGreaterThan(9000); // 상한까지는 확장됨
    expect(state.schedules.length).toBeLessThanOrEqual(10010);

    // 다음 부팅에서도 늘어나지 않고 정상 동작한다
    await page.reload();
    await expect(page.locator('body')).not.toHaveClass(/loading/);
    const reloaded = (await readState(page, LIST_NAME)).schedules.length;
    expect(reloaded).toBeGreaterThan(9000);
    expect(reloaded).toBeLessThanOrEqual(10010);
    await page.locator('#nav-timetable').click();
    await expect(page.locator('#timetable-screen')).toHaveClass(/active/);
    await receiver.close();
  } finally {
    await context.close();
  }
});

test('a crafted link packed with long memos still boots when storage runs out', async ({ browser }) => {
  // issue-040: 확장된 행마다 200자 메모가 붙으면 스케줄(약 340만 자)에 Draft 사본을 더한 크기가 localStorage 용량을 넘긴다.
  // 수정 전에는 Draft 저장이 던진 예외가 그대로 올라와 부팅이 멈췄다.
  const context = await browser.newContext();
  try {
    await prepareContext(context);
    const source = await openPage(context);
    const url = await source.evaluate(async listName => {
      const { encodeV4Data } = await import('./src/share-encoder.js');
      const names = ['폭주1', '폭주2', '폭주3', '폭주4', '폭주5'];
      const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const encoded = encodeV4Data({
        gameId: listName,
        schedules: names.map(bossName => ({ bossName, scheduledDate: soon, memo: 'x'.repeat(200) })),
        bosses: names.map(name => ({ name, interval: 1 }))
      });
      return `${location.origin}/#d=${encoded}`;
    }, LIST_NAME);
    await source.close();

    const receiver = await browser.newContext();
    await prepareContext(receiver);
    const pageErrors = [];
    const page = await receiver.newPage();
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(url);
    await expect(page.locator('body')).not.toHaveClass(/loading/);

    const state = await readState(page, LIST_NAME);
    expect(state.lastSelectedGame).toBe(LIST_NAME);
    expect(state.schedules.length).toBeGreaterThan(9000); // 상한까지 확장됨
    expect(state.schedules.length).toBeLessThanOrEqual(10010);
    expect(state.schedules.every(s => s.memo.length === 200)).toBe(true);

    await page.reload();
    await expect(page.locator('body')).not.toHaveClass(/loading/);
    const reloaded = (await readState(page, LIST_NAME)).schedules.length;
    expect(reloaded).toBeGreaterThan(9000);
    expect(reloaded).toBeLessThanOrEqual(10010);
    await page.locator('#nav-timetable').click();
    await expect(page.locator('#timetable-screen')).toHaveClass(/active/);
    expect(pageErrors).toEqual([]);
    await receiver.close();
  } finally {
    await context.close();
  }
});

test('a boss shared without a schedule shows its stored zen interval and keeps it on save', async ({ browser }) => {
  // issue-039: 일정 없이 공유받은 보스는 Draft 항목이 없다. 입력 화면이 저장된 주기를 칸에 보여 줘야 하고,
  // 시간만 넣어 저장해도 받은 주기가 지워지면 안 된다.
  const context = await browser.newContext();
  try {
    await prepareContext(context);
    const source = await openPage(context);
    const url = await source.evaluate(async listName => {
      const { encodeV4Data } = await import('./src/share-encoder.js');
      const encoded = encodeV4Data({
        gameId: listName,
        schedules: [{ bossName: '커스텀보스A', scheduledDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), memo: '' }],
        bosses: [{ name: '커스텀보스A', interval: 150 }, { name: '커스텀보스B', interval: 90 }]
      });
      return `${location.origin}/#d=${encoded}`;
    }, LIST_NAME);
    await source.close();

    const receiver = await browser.newContext();
    await prepareContext(receiver);
    const page = await openPage(receiver, url);
    await page.locator('#nav-boss-scheduler').click();
    await expect(page.locator('#gameSelect')).toHaveValue(LIST_NAME);
    const rowB = page.locator('#bossInputsContainer .boss-input-item').nth(1);
    await expect(rowB.locator('.boss-name')).toHaveText('커스텀보스B');
    await expect(rowB.locator('.interval-hh')).toHaveValue('1');
    await expect(rowB.locator('.interval-mm')).toHaveValue('30');
    await rowB.locator('.remaining-time-input').fill('00:10');
    await page.locator('#moveToBossSettingsButton').click();
    await expect(page.locator('#timetable-screen')).toHaveClass(/active/);

    const saved = await readState(page, LIST_NAME);
    expect(saved.bosses).toEqual([{ name: '커스텀보스A', interval: 150 }, { name: '커스텀보스B', interval: 90 }]);
    expect(saved.schedules.filter(s => s.bossName === '커스텀보스B').length).toBeGreaterThan(1); // 90분 주기로 확장됨
    await receiver.close();
  } finally {
    await context.close();
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
