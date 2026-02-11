import { chromium } from 'playwright';

const base = 'https://lzh20260211.pages.dev';
const out = '/root/.openclaw/workspaces/builder/lzh20260211/evidence';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.screenshot({ path: `${out}/01-home.png`, fullPage: true });

await page.selectOption('#subjectFilter', '数学');
await page.selectOption('#levelFilter', 'easy');
await page.click('#startBtn');
await page.waitForSelector('#quizPanel:not([hidden])');
await page.screenshot({ path: `${out}/02-quiz.png`, fullPage: true });

const firstOpt = page.locator('#qOptions .opt').first();
if (await firstOpt.count()) {
  await firstOpt.click();
}
await page.click('#submitBtn');
await page.waitForTimeout(300);
await page.click('#nextBtn');
await page.waitForTimeout(200);

for (let i = 0; i < 40; i++) {
  const submitVisible = await page.locator('#submitBtn').isVisible().catch(() => false);
  const resultVisible = await page.locator('#resultPanel:not([hidden])').count();
  if (resultVisible) break;
  if (submitVisible) {
    const opt = page.locator('#qOptions .opt').first();
    if (await opt.count()) await opt.click();
    else {
      const ta = page.locator('#qTextAnswer');
      if (await ta.isVisible()) await ta.fill('测试答案');
    }
    await page.click('#submitBtn');
    await page.waitForTimeout(150);
  }
  const nextVisible = await page.locator('#nextBtn').isVisible().catch(() => false);
  if (nextVisible) await page.click('#nextBtn');
  await page.waitForTimeout(150);
}

await page.waitForSelector('#resultPanel:not([hidden])', { timeout: 10000 });
await page.screenshot({ path: `${out}/03-result.png`, fullPage: true });
await browser.close();
console.log('screenshots done');
