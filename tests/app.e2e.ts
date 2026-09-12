import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Backup } from '../src/lib/models';
const evidence = join(tmpdir(), 'kiseki-qa');
test('long multilingual Wrapped text fits above the footer', async ({ page }) => {
  await ready(page);
  const previous = new Date();
  previous.setDate(1);
  previous.setMonth(previous.getMonth() - 1);
  const jarId = crypto.randomUUID();
  const backup: Backup = {
    format: 'kiseki',
    version: 1,
    exportedAt: Date.now(),
    jars: [
      {
        id: jarId,
        title: '',
        theme: 'kyoto-night',
        createdAt: previous.getTime(),
        archivedAt: null,
      },
    ],
    stars: ['界'.repeat(180), 'W'.repeat(180), 'Μια μικρή στιγμή. '.repeat(10)].map((text, i) => ({
      id: crypto.randomUUID(),
      jarId,
      text,
      category: 'rest',
      colorId: 'lavender',
      createdAt: new Date(previous.getFullYear(), previous.getMonth(), i + 1).getTime(),
      isFavorite: false,
    })),
    preferences: {
      id: 'user',
      language: 'en',
      soundVolume: 0,
      ambientMuted: true,
      reducedMotion: true,
      motionEnabled: false,
    },
  };
  await settings(page);
  await page.locator('input[type=file]').setInputFiles({
    name: 'long.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole('button', { name: 'Add these memories', exact: true }).click();
  await expect(page.locator('.import-preview')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await dismissBanner(page);
  await page.evaluate(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    const calls: { text: string; y: number; width: number }[] = [];
    Object.defineProperty(window, 'cardTextCalls', { value: calls });
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      calls.push({ text, y, width: this.measureText(text).width });
      if (maxWidth === undefined) return original.call(this, text, x, y);
      return original.call(this, text, x, y, maxWidth);
    };
  });
  await page.getByRole('button', { name: 'Wrapped', exact: true }).click();
  await page.getByRole('radio', { name: 'Your words' }).click();
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
  const calls = await page.evaluate(() =>
    (
      window as unknown as { cardTextCalls: { text: string; y: number; width: number }[] }
    ).cardTextCalls.filter(
      (c) => c.text.includes('界') || c.text.includes('WW') || c.text.includes('Μια'),
    ),
  );
  expect(calls.length).toBeGreaterThan(10);
  for (const call of calls) {
    expect(call.y).toBeLessThan(1680);
    expect(call.width).toBeLessThanOrEqual(821);
  }
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  await (await event).saveAs(join(evidence, 'wrapped-long.png'));
});
test('physics stops when settled and while a modal is open', async ({ page }) => {
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window),
      cancel = window.cancelAnimationFrame.bind(window);
    const pending = new Set<number>();
    Object.defineProperty(window, 'pendingFrames', { get: () => pending.size });
    window.requestAnimationFrame = (callback) => {
      const id = request((time) => {
        pending.delete(id);
        callback(time);
      });
      pending.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      pending.delete(id);
      cancel(id);
    };
  });
  await ready(page);
  await add(page, 'A settled star');
  await expect
    .poll(
      () => page.evaluate(() => (window as unknown as { pendingFrames: number }).pendingFrames),
      { timeout: 20000 },
    )
    .toBe(0);
  await settings(page);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { pendingFrames: number }).pendingFrames))
    .toBe(0);
  await page.getByRole('checkbox', { name: 'Gentler movement' }).click();
  await expect(page.getByRole('checkbox', { name: 'Gentler movement' })).toBeChecked();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { pendingFrames: number }).pendingFrames))
    .toBe(0);
  await page.setViewportSize({ width: 320, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Small things. Real miracles.' })).toBeVisible();
  await expect(page.locator('.boot-screen')).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('.app-header')).not.toContainText('奇跡');
  await expect(page.getByRole('link', { name: 'Kiseki' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function dismissBanner(page: Page) {
  const banner = page.locator('.update-banner');
  if (await banner.isVisible()) await banner.getByRole('button', { name: 'Dismiss' }).click();
}
async function continueAdd(page: Page) {
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What kind of Kiseki is this?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Fold a Kiseki', exact: true })).toBeVisible();
}
async function add(page: Page, text: string) {
  await page.getByRole('button', { name: 'Add a Kiseki', exact: true }).click();
  await page.getByRole('textbox', { name: 'Your Kiseki' }).fill(text);
  await continueAdd(page);
  await page.getByRole('button', { name: 'Fold a Kiseki', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function settings(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
}
async function readDb(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('KisekiDatabase');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const get = (name: string) =>
      new Promise<unknown[]>((resolve, reject) => {
        const r = db.transaction(name).objectStore(name).getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    const [stars, jars] = await Promise.all([get('stars'), get('jars')]);
    db.close();
    return { stars, jars };
  });
}
test('first win, persistence, favorites, recall, draft and deletion', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  await page.screenshot({ path: join(evidence, 'desktop.png'), fullPage: true });
  await add(page, 'I took a small, quiet break.');
  await expect(page.locator('.jar-count')).toContainText('1 / 45');
  await page.reload();
  await expect(page.locator('.jar-count')).toContainText('1 / 45');
  await dismissBanner(page);
  await page.getByRole('button', { name: 'Memories', exact: true }).click();
  await page.getByRole('button', { name: 'Keep as a favorite', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove from favorites' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Recall a memory', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('I took a small, quiet break.');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Your jar', exact: true }).click();
  await page.getByRole('button', { name: 'Add a Kiseki', exact: true }).click();
  await page.getByRole('textbox').fill('A draft that stays');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Add a Kiseki', exact: true }).click();
  await expect(page.getByRole('textbox')).toHaveValue('A draft that stays');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Memories', exact: true }).click();
  await page.locator('.memory-open').click();
  await page.getByRole('button', { name: 'Delete memory', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('This cannot be undone');
  await page.getByRole('button', { name: 'Delete memory', exact: true }).click();
  await expect(page.locator('.memory-row')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('failed write keeps draft and never adds a phantom star', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Add a Kiseki', exact: true }).click();
  await page.getByRole('textbox').fill('Still here if storage fails.');
  await continueAdd(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add;
    Object.defineProperty(window, 'restoreIDBAdd', {
      value: () => {
        IDBObjectStore.prototype.add = original;
      },
      configurable: true,
    });
    IDBObjectStore.prototype.add = function (...args: Parameters<IDBObjectStore['add']>) {
      if (this.name === 'stars') throw new DOMException('Test quota', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Fold a Kiseki', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Your text is still here');
  await expect(page.getByRole('textbox')).toHaveValue('Still here if storage fails.');
  expect((await readDb(page)).stars).toHaveLength(0);
  await page.evaluate(() => {
    (window as unknown as { restoreIDBAdd: () => void }).restoreIDBAdd();
  });
  await continueAdd(page);
  await page.getByRole('button', { name: 'Fold a Kiseki', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await readDb(page)).stars).toHaveLength(1);
});
test('backup export/import, duplicate merge and exact Wrapped PNG', async ({ page }) => {
  await ready(page);
  await add(page, 'Backup memory');
  await settings(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const file = await download;
  const path = await file.path();
  const backup = JSON.parse(await readFile(path!, 'utf8')) as Backup;
  expect(backup.stars).toHaveLength(1);
  const prev = new Date();
  prev.setDate(1);
  prev.setMonth(prev.getMonth() - 1);
  const key = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  backup.jars[0].id = crypto.randomUUID();
  backup.jars[0].createdAt = prev.getTime();
  backup.stars = Array.from({ length: 3 }, (_, i) => ({
    ...backup.stars[0],
    id: crypto.randomUUID(),
    jarId: backup.jars[0].id,
    text:
      i === 0
        ? 'Μια μικρή νίκη που κράτησα.'
        : i === 1
          ? '今日は自分に優しくできた。'
          : 'A moment I almost forgot.',
    createdAt: new Date(prev.getFullYear(), prev.getMonth(), i + 1, 9).getTime(),
  }));
  await page.locator('input[type=file]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.locator('.import-preview')).toContainText('Memories in this backup');
  await page.getByRole('button', { name: 'Add these memories', exact: true }).click();
  await expect(page.locator('.import-preview')).toHaveCount(0);
  expect((await readDb(page)).stars).toHaveLength(4);
  await page.locator('input[type=file]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole('button', { name: 'Add these memories', exact: true }).click();
  await expect(page.locator('.import-preview')).toHaveCount(0);
  expect((await readDb(page)).stars).toHaveLength(4);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await dismissBanner(page);
  await page.getByRole('button', { name: 'Wrapped', exact: true }).click();
  await page.getByLabel('Month', { exact: true }).selectOption(key);
  await page.getByRole('radio', { name: 'Your words' }).click();
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
  const pngDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const png = await pngDownload;
  const bytes = await readFile((await png.path())!);
  expect(bytes.readUInt32BE(16)).toBe(1080);
  expect(bytes.readUInt32BE(20)).toBe(1920);
  await png.saveAs(join(evidence, 'wrapped.png'));
  await page.screenshot({ path: join(evidence, 'wrapped-screen.png'), fullPage: true });
});
test('full jar rotates on confirmation and never deletes prior stars', async ({ page }) => {
  await ready(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('KisekiDatabase');
      r.onsuccess = () => resolve(r.result);
    });
    const jars = await new Promise<{ id: string }[]>((resolve) => {
      const r = db.transaction('jars').objectStore('jars').getAll();
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('stars', 'readwrite');
      for (let i = 0; i < 45; i++)
        tx.objectStore('stars').add({
          id: crypto.randomUUID(),
          jarId: jars[0].id,
          text: `Test moment ${i + 1}`,
          category: 'effort',
          colorId: 'gold',
          createdAt: Date.now() - i * 1000,
          isFavorite: false,
        });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.locator('.jar-count')).toContainText('45 / 45');
  await page.getByRole('button', { name: 'Add a Kiseki', exact: true }).click();
  await page.getByRole('textbox').fill('The next chapter');
  await continueAdd(page);
  await page.getByRole('button', { name: 'Fold a Kiseki', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Your 45 stars are safe');
  expect((await readDb(page)).stars).toHaveLength(45);
  await page.getByRole('button', { name: 'Keep this jar & start another' }).click();
  await expect(page.locator('.jar-count')).toContainText('1 / 45');
  const data = await readDb(page);
  expect(data.stars).toHaveLength(46);
  expect(data.jars).toHaveLength(2);
});
test('offline cold boot, lazy Wrapped and Japanese fonts after first install', async ({
  page,
  context,
}) => {
  await ready(page);
  await add(page, 'Offline memory');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.jar-count')).toContainText('1 / 45');
  await dismissBanner(page);
  await settings(page);
  await page.getByLabel('Language', { exact: true }).selectOption('ja');
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page.getByRole('heading', { name: '小さなこと。本当の奇跡。' })).toBeVisible();
  await page.getByRole('button', { name: 'Wrapped', exact: true }).click();
  await expect(page.getByRole('button', { name: 'PNGを保存' })).toBeEnabled();
  await page.screenshot({ path: join(evidence, 'japanese-offline.png'), fullPage: true });
  await context.setOffline(false);
});
test('mobile layout, keyboard dialog, grapheme limit and all languages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await dismissBanner(page);
  await page.screenshot({ path: join(evidence, 'mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Add a Kiseki', exact: true }).click();
  await page.getByRole('textbox').fill('👨‍👩‍👧‍👦'.repeat(180));
  await expect(page.locator('#char-count')).toHaveText('180 / 180');
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
  await page.getByRole('textbox').fill('👨‍👩‍👧‍👦'.repeat(181));
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  await page.getByRole('textbox').fill('I made time to rest.');
  await page.screenshot({ path: join(evidence, 'mobile-add.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add a Kiseki', exact: true })).toBeFocused();
  await settings(page);
  await page.getByLabel('Language', { exact: true }).selectOption('el');
  await page.getByRole('button', { name: 'Κλείσιμο', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Μικρές στιγμές. Αληθινά θαύματα.' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
