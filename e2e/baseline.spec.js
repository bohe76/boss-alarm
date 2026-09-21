import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const screenshotDir = path.join(process.cwd(), 'screenshots', 'e2e');

test.beforeAll(() => {
  mkdirSync(screenshotDir, { recursive: true });
});

function screenshotPath(name) {
  return path.join(screenshotDir, `${name}.png`);
}

async function stubExternalRequests(page) {
  await page.route('https://www.googletagmanager.com/**', route => {
    route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
  });
  await page.route('https://www.google-analytics.com/**', route => {
    route.fulfill({ status: 204, body: '' });
  });
  await page.route('https://html2canvas.hertzen.com/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: 'window.html2canvas = async () => { const canvas = document.createElement("canvas"); canvas.width = 16; canvas.height = 16; return canvas; };'
    });
  });
  await page.route('https://tinyurl.com/api-create.php**', route => {
    route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: 'https://tinyurl.test/boss-alarm-e2e'
    });
  });
}

async function seedQuietSettings(page, { skipPolicyDialog = true, alarmRunning = false, withoutNotificationApi = false } = {}) {
  await page.addInitScript(({ skipPolicyDialog: shouldSkipPolicyDialog, alarmRunning: isAlarmRunning, withoutNotificationApi: shouldRemoveNotificationApi }) => {
    const settings = JSON.parse(localStorage.getItem('v3_settings') || '{}');
    settings['hide_update_modal_v3.0.3'] = true;
    if (shouldSkipPolicyDialog) settings.hasVisitedAlarmPolicy = 'true';
    if (isAlarmRunning) settings.alarmRunningState = true;
    localStorage.setItem('v3_settings', JSON.stringify(settings));

    // iOS Safari 일반 탭에는 Notification API 자체가 없다
    if (shouldRemoveNotificationApi) {
      delete window.Notification;
      return;
    }

    if (!('Notification' in window)) {
      window.Notification = {
        permission: 'default',
        requestPermission: () => Promise.resolve('denied')
      };
    }
  }, { skipPolicyDialog, alarmRunning, withoutNotificationApi });
}

function watchUnexpectedErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function openApp(page, options = {}) {
  await stubExternalRequests(page);
  await seedQuietSettings(page, options);
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/');
  await expect(page.locator('body')).not.toHaveClass(/loading/);
  await expect(page.locator('#dashboard-screen')).toHaveClass(/active/);
}

async function enterOneBossSchedule(page) {
  await page.locator('#nav-boss-scheduler').click();
  await expect(page.locator('#boss-scheduler-screen')).toHaveClass(/active/);

  const firstBossItem = page.locator('#bossInputsContainer .boss-input-item').first();
  await expect(firstBossItem).toBeVisible();

  const remainingInput = firstBossItem.locator('.remaining-time-input');
  await remainingInput.fill('00:10');
  await firstBossItem.locator('.memo-input').fill('E2E baseline');
  await expect(firstBossItem.locator('.calculated-spawn-time')).not.toHaveText('--:--:--');

  await page.screenshot({ path: screenshotPath('scheduler-input'), fullPage: true });
  await page.locator('#moveToBossSettingsButton').click();
  await expect(page.locator('#timetable-screen')).toHaveClass(/active/);
  await expect(page.locator('#bossListCardsContainer')).toContainText('E2E baseline');
}

test('dashboard and help content load from a clean browser state', async ({ page }) => {
  const errors = watchUnexpectedErrors(page);
  await openApp(page, { skipPolicyDialog: false });

  await expect(page.locator('#dashboard-real-content')).toBeVisible();
  await expect(page.locator('#alarmStatusText')).toContainText(/알림/);
  await page.screenshot({ path: screenshotPath('dashboard'), fullPage: true });

  await page.locator('#nav-help').click();
  await expect(page.locator('#help-screen')).toHaveClass(/active/);
  await expect(page.locator('#featureGuideContent')).toContainText('대시보드');
  await page.screenshot({ path: screenshotPath('help'), fullPage: true });

  expect(errors).toEqual([]);
});

test('app boots without Notification API while alarm was left running (iOS Safari)', async ({ page }) => {
  const errors = watchUnexpectedErrors(page);
  await openApp(page, { alarmRunning: true, withoutNotificationApi: true });

  await expect(page.locator('#dashboard-real-content')).toBeVisible();
  await expect(page.locator('#alarmToggleButton')).toHaveClass(/alarm-on/);

  expect(errors).toEqual([]);
});

test('scheduler input updates timetable, export modal, and share link', async ({ page }) => {
  const errors = watchUnexpectedErrors(page);
  await openApp(page);
  await enterOneBossSchedule(page);

  await page.screenshot({ path: screenshotPath('timetable-after-scheduler'), fullPage: true });

  await page.locator('#exportTimetableButton').click();
  await expect(page.locator('#export-modal')).toBeVisible();
  await page.locator('#export-content-options [data-content-type="next"]').click();
  await page.screenshot({ path: screenshotPath('export-modal'), fullPage: true });
  await page.locator('#close-export-modal').click();
  await expect(page.locator('#export-modal')).not.toBeVisible();

  await page.locator('#nav-share').click();
  await expect(page.locator('#share-screen')).toHaveClass(/active/);
  await expect(page.locator('#shareMessage')).toContainText(/클립보드|공유 링크/);
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('https://tinyurl.test/boss-alarm-e2e');
  await page.screenshot({ path: screenshotPath('share'), fullPage: true });

  expect(errors).toEqual([]);
});

test('fixed alarm can be added and appears in timetable', async ({ page }) => {
  const errors = watchUnexpectedErrors(page);
  await openApp(page);

  await page.locator('#nav-settings').click();
  await expect(page.locator('#settings-screen')).toHaveClass(/active/);

  const alarm = await page.evaluate(() => {
    const target = new Date(Date.now() + 10 * 60 * 1000);
    const hh = String(target.getHours()).padStart(2, '0');
    const mm = String(target.getMinutes()).padStart(2, '0');
    return {
      rawTime: `${hh}${mm}`,
      name: `E2E 고정알림 ${hh}:${mm}`
    };
  });

  await page.locator('#add-fixed-alarm-button').click();
  await expect(page.locator('#fixed-alarm-modal')).toBeVisible();
  await page.locator('#fixed-alarm-time-input').fill(alarm.rawTime);
  await page.locator('#fixed-alarm-name-input').fill(alarm.name);
  await page.locator('#save-fixed-alarm-button').click();

  await expect(page.locator('#fixed-alarm-modal')).not.toBeVisible();
  await expect(page.locator('#fixedAlarmList')).toContainText(alarm.name);
  await page.screenshot({ path: screenshotPath('fixed-alarm-settings'), fullPage: true });

  await page.locator('#nav-timetable').click();
  await expect(page.locator('#timetable-screen')).toHaveClass(/active/);
  await expect(page.locator('#bossListCardsContainer')).toContainText(alarm.name);
  await page.screenshot({ path: screenshotPath('timetable-fixed-alarm'), fullPage: true });

  expect(errors).toEqual([]);
});
