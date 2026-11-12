import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.clock.setFixedTime(new Date('2026-11-12T12:00:00'));await page.goto('/');});
test('跨年 ISO 周与闰日查询，52/53 周和日期范围正确',async({page})=>{
  await page.getByLabel('查询日期').fill('2021-01-01');await expect(page.locator('.wn-eyebrow')).toHaveText('所选周 · ISO 2020');await expect(page.locator('.wn-week')).toHaveText('第 53 周');await expect(page.locator('.wn-range')).toHaveText('2020-12-28 — 2021-01-03');await expect(page.locator('tbody tr')).toHaveCount(53);
  await page.getByLabel('查询日期').fill('2024-02-29');await expect(page.locator('.wn-week')).toHaveText('第 9 周');await expect(page.locator('.wn-range')).toHaveText('2024-02-26 — 2024-03-03');await expect(page.locator('tbody tr')).toHaveCount(52);
});
test('选择任意周并复制、插入日期范围与周报模板',async({page})=>{
  await page.getByRole('button',{name:'选择第 2 周',exact:true}).click();await expect(page.locator('.wn-range')).toHaveText('2026-01-05 — 2026-01-11');
  await page.getByRole('button',{name:'复制日期范围'}).click();expect(await page.evaluate(()=>host.copied[0])).toBe('第2周（2026，2026-01-05 — 2026-01-11）');
  await page.getByRole('button',{name:'插入日期范围'}).click();await expect(page.getByRole('status')).toContainText('已插入');expect(await page.evaluate(()=>host.inserted[0])).toContain('2026-01-05');
  await page.getByRole('button',{name:'插入周报模板'}).click();await expect(page.getByRole('status')).toContainText('空白周报模板');
  const report=await page.evaluate(()=>host.inserted[1]);
  expect(report.match(/^### .+$/gm)).toEqual(['### 本周完成工作','### 下周工作计划','### 本周工作总结','### 需协调与帮助']);
  expect(report).not.toMatch(/[\p{N}〇零一二三四五六七八九十百千万亿两]/u);
  expect(report.replace(/^### .+$/gm,'').trim()).toBe('');
});
test('回到本周和原命令使用最新日期，不保留打开面板时的旧周',async({page})=>{
  await page.clock.setFixedTime(new Date('2027-01-04T12:00:00'));await page.getByRole('button',{name:'回到本周'}).click();await expect(page.locator('.wn-year')).toHaveText('2027 年');await expect(page.locator('.wn-week')).toHaveText('第 1 周');
  await expect(page.locator('.wn-current .wn-week-choice')).toHaveText('W01');await page.evaluate(()=>host.run('insert-week-number'));expect(await page.evaluate(()=>host.inserted[0])).toBe('第1周（2027）');
});
test('复制和插入失败可重试，保存期间不重复提交',async({page})=>{
  await page.evaluate(()=>host.failCopy=true);await page.getByRole('button',{name:'复制日期范围'}).click();await expect(page.getByRole('status')).toContainText('复制失败');
  await page.evaluate(()=>host.failInsert=true);await page.getByRole('button',{name:'插入日期范围'}).click();await expect(page.getByRole('status')).toContainText('插入失败');
  await page.evaluate(()=>{host.failInsert=false;host.delay=200;});await page.getByRole('button',{name:'插入日期范围'}).click();await expect(page.getByRole('button',{name:'插入日期范围'})).toBeDisabled();await expect(page.getByRole('status')).toContainText('已插入');expect(await page.evaluate(()=>host.inserted.length)).toBe(1);
});
test('深色窄屏和仅表格内部滚动，键盘可选择周次',async({page})=>{
  await page.setViewportSize({width:360,height:1000});await page.goto('/?dark');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const b=page.getByRole('button',{name:'选择第 8 周',exact:true});await b.focus();await b.press('Enter');await expect(page.locator('.wn-week')).toHaveText('第 8 周');await expect(page.getByRole('button',{name:'选择第 8 周',exact:true})).toBeFocused();
  await page.screenshot({path:'test-results/week-numbers-narrow.png',fullPage:true});await page.evaluate(()=>host.deactivate());expect(await page.evaluate(()=>host.disposed)).toBe(3);
});
