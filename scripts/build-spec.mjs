import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
const name = 'Kiseki Architecture & Technical Scope';
await mkdir('docs/archive', { recursive: true });
for (const extension of ['html', 'pdf']) {
  const target = `docs/archive/kiseki-scope-0.0.2.${extension}`;
  try {
    await access(target);
  } catch {
    await copyFile(`${name}.${extension}`, target);
  }
}
const scope = JSON.parse(await readFile('docs/scope.json', 'utf8'));
const css =
  '@page{size:A4;margin:15mm 16mm 17mm}*{box-sizing:border-box}body{margin:0;color:#253148;font:10pt/1.5 "Segoe UI",sans-serif}.sheet{break-before:page}.sheet:first-child{break-before:auto}header{border-bottom:2px solid #b58b42;padding-bottom:12px;margin-bottom:20px}h1{font:25pt/1.25 Georgia,serif;color:#10213b;margin:0 0 8px}h2{font-size:16pt;font-weight:500;color:#152743;margin:0 0 16px}h3{font-size:11pt;color:#243e62;margin:17px 0 6px}p{margin:7px 0}ul{padding-left:19px;margin:7px 0}li{margin:5px 0}table{border-collapse:collapse;width:100%;margin:12px 0;font-size:9pt}th,td{border:1px solid #d9dde5;padding:7px 9px;vertical-align:top;text-align:left}th{background:#eef1f6}pre{font:8.5pt/1.5 Consolas,monospace;white-space:pre-wrap;background:#f2f4f7;padding:13px;border-left:3px solid #b58b42}.small,.meta{color:#66748a;font-size:8pt}.note{background:#f7f3e9;border-left:3px solid #b58b42;padding:12px;margin:16px 0}tr,pre,.note{break-inside:avoid}';
const header = `<header><h1>Kiseki · 奇跡</h1><p>The Micro-Wins Jar · Product &amp; Technical Scope</p><p class="meta">Version ${scope.version} · ${scope.date} · Full PWA release scope</p></header>`;
const body = scope.sections
  .map(
    (s, i) =>
      `<section class="sheet">${i === 0 ? header : ''}<h2>${s.title}</h2>${s.body}</section>`,
  )
  .join('');
await writeFile(
  `${name}.html`,
  `<!doctype html><html lang="el"><head><meta charset="UTF-8"><title>Kiseki Scope ${scope.version}</title><style>${css}</style></head><body>${body}</body></html>`,
);
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
  headless: true,
});
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve(`${name}.html`)).href);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: `${name}.pdf`,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="font-size:8px;color:#718096;width:100%;text-align:center">Kiseki · ${scope.version} &nbsp; · &nbsp; <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
  });
  console.log(`Generated scope HTML/PDF ${scope.version}`);
} finally {
  await browser.close();
}
