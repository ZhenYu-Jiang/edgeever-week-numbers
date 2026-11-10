// 周数表插件 —— ISO 8601 周数日历
// 无需联网，纯本地计算。功能：
//   1. 命令「打开周数表」→ 打开全年周数面板（可切换年份、高亮当前周）
//   2. 命令「插入当前周数」→ 在光标处插入「第N周（YYYY）」

// ---------- ISO 8601 工具函数 ----------

// 某 ISO 年第 week 周的周一（UTC 日期对象）
function mondayOfISOWeek(year, week) {
  // ISO 第 1 周是包含 1 月 4 日的那一周
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7; // 1=周一 ... 7=周日
  const week1Monday = new Date(Date.UTC(year, 0, 4 - (day - 1)));
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return monday;
}

// 某 ISO 年一共有几周（52 或 53）
function weeksInISOYear(year) {
  const w1 = mondayOfISOWeek(year, 1);
  const w1Next = mondayOfISOWeek(year + 1, 1);
  return Math.round((w1Next - w1) / (7 * 86400000));
}

// 某个日期属于哪个 ISO 年、第几周
function isoWeekYearOf(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day); // 该周的周四
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { isoYear, week };
}

// 格式化为 YYYY-MM-DD
function fmt(d) {
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

const STYLE = `
.wn-root {
  --wn-accent: #168363;
  --wn-surface: Canvas;
  --wn-quiet: color-mix(in srgb, currentColor 58%, transparent);
  --wn-line: color-mix(in srgb, currentColor 10%, transparent);
  --wn-hover: color-mix(in srgb, currentColor 4%, transparent);
  --wn-selected: color-mix(in srgb, var(--wn-accent) 9%, var(--wn-surface));
  box-sizing: border-box; width: 100%; height: min(640px, 70dvh);
  display: grid; grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 18px; padding: 20px; min-width: 0; min-height: 0;
  font-family: inherit; font-size: 13px; line-height: 1.5;
  color: inherit; background: var(--wn-surface);
  container-type: inline-size;
}
.wn-root *, .wn-root *::before, .wn-root *::after { box-sizing: border-box; }
@media (prefers-color-scheme: dark) {
  .wn-root { color-scheme: dark; --wn-accent: #65c7a5; }
}
:where([data-theme="dark"], .dark) .wn-root {
  color-scheme: dark; --wn-accent: #65c7a5;
}
:where([data-theme="light"], .light) .wn-root {
  color-scheme: light; --wn-accent: #168363;
}
.wn-summary { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.wn-summary-copy { display: grid; gap: 4px; min-width: 0; }
.wn-eyebrow { color: var(--wn-quiet); font-size: 12px; }
.wn-week { font-size: 30px; line-height: 1.2; font-weight: 650; letter-spacing: -0.04em; }
.wn-range, .wn-year, .wn-table { font-variant-numeric: tabular-nums; }
.wn-range { color: var(--wn-quiet); font-size: 12px; }
.wn-summary-mark { color: var(--wn-accent); font-size: 11px; border: 1px solid var(--wn-line); padding: 3px 8px; border-radius: 5px; white-space: nowrap; }
.wn-nav { display: flex; align-items: center; gap: 6px; padding-top: 14px; border-top: 1px solid var(--wn-line); }
.wn-nav button {
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0; min-width: 32px; height: 32px; padding: 0 9px;
  border: 1px solid transparent; border-radius: 5px;
  background: transparent; color: inherit; font: inherit; cursor: pointer;
}
.wn-nav button:hover { background: var(--wn-hover); border-color: var(--wn-line); }
.wn-nav button:focus-visible, .wn-scroll:focus-visible { outline: 2px solid var(--wn-accent); outline-offset: 2px; }
.wn-nav .wn-arrow { font-size: 23px; line-height: 1; }
.wn-year { font-weight: 600; font-size: 14px; text-align: center; min-width: 76px; }
.wn-nav .wn-today { margin-left: auto; font-size: 12px; color: var(--wn-quiet); border-color: var(--wn-line); }
.wn-scroll { min-width: 0; min-height: 0; overflow: auto; overscroll-behavior: contain; scrollbar-width: thin; border: 1px solid var(--wn-line); border-radius: 6px; }
.wn-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; text-align: left; white-space: nowrap; }
.wn-table th, .wn-table td { height: 39px; padding: 8px 14px; text-align: left; }
.wn-table th { position: sticky; top: 0; z-index: 1; height: 34px; background: var(--wn-surface); color: var(--wn-quiet); font-size: 11px; font-weight: 500; border-bottom: 1px solid var(--wn-line); }
.wn-table th:first-child { width: 36%; }
.wn-table td { border-bottom: 1px solid color-mix(in srgb, currentColor 5%, transparent); }
.wn-table tbody tr:last-child td { border-bottom: 0; }
.wn-table tbody tr:hover td { background: var(--wn-hover); }
.wn-table .wn-current td, .wn-table .wn-current:hover td { background: var(--wn-selected); }
.wn-table .wn-current td:first-child { box-shadow: inset 2px 0 var(--wn-accent); color: var(--wn-accent); font-weight: 600; }
.wn-date-year { display: block; color: var(--wn-quiet); font-size: 10px; line-height: 1.2; }
.wn-week-label { display: inline-block; min-width: 33px; }
.wn-badge { margin-left: 7px; font-size: 10px; font-weight: 500; }
.wn-foot { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px 12px; color: var(--wn-quiet); font-size: 11px; }
@container (max-width: 340px) {
  .wn-table th, .wn-table td { padding-inline: 9px; }
  .wn-table th:first-child { width: 32%; }
  .wn-week { font-size: 26px; }
  .wn-badge { margin-left: 4px; }
}
@media (max-width: 420px) { .wn-root { padding: 14px; gap: 14px; } }
`;

export default {
  activate(context) {
    // 命令 1：打开周数表面板
    const disposeOpen = context.commands.register({
      id: "open-week-numbers",
      title: "打开周数表",
      listed: true,
      async run() {
        await context.ui.panels.open("week-numbers-panel");
      },
    });

    // 命令 2：把当前周数插入光标处
    const disposeInsert = context.commands.register({
      id: "insert-week-number",
      title: "插入当前周数",
      listed: true,
      async run() {
        const now = new Date();
        const { isoYear, week } = isoWeekYearOf(now);
        const text = `第${week}周（${isoYear}）`;
        try {
          await context.editor.insertAtCursor(text);
          context.ui.showNotice(`已插入：${text}`);
        } catch (e) {
          context.ui.showNotice("插入失败：请先打开一篇笔记并进入编辑状态");
        }
      },
    });

    // 面板：全年周数表
    const disposePanel = context.ui.panels.register({
      id: "week-numbers-panel",
      title: "周数表",
      purpose: "dashboard",
      presentation: "dialog",
      mount(container, { shell }) {
        shell.set({
          header: {
            title: "周数表（ISO 8601）",
            description: "查看全年周次与日期范围",
          },
        });

        const today = isoWeekYearOf(new Date());
        let year = today.isoYear;

        const style = document.createElement("style");
        style.textContent = STYLE;
        container.append(style);

        const root = document.createElement("div");
        root.className = "wn-root";
        container.append(root);

        function render() {
          root.replaceChildren(style);

          // 当前周摘要：复用已有日期函数，仅调整展示
          const sum = document.createElement("div");
          sum.className = "wn-summary";
          const t = isoWeekYearOf(new Date());
          const start = mondayOfISOWeek(t.isoYear, t.week);
          const end = new Date(start);
          end.setUTCDate(start.getUTCDate() + 6);
          const copy = document.createElement("div");
          copy.className = "wn-summary-copy";
          const eyebrow = document.createElement("div");
          eyebrow.className = "wn-eyebrow";
          eyebrow.textContent = "当前周 · ISO " + t.isoYear;
          const headline = document.createElement("div");
          headline.className = "wn-week";
          headline.textContent = "第 " + t.week + " 周";
          const range = document.createElement("div");
          range.className = "wn-range";
          range.textContent = fmt(start) + " — " + fmt(end);
          copy.append(eyebrow, headline, range);
          const mark = document.createElement("span");
          mark.className = "wn-summary-mark";
          mark.textContent = "本周";
          sum.append(copy, mark);
          root.append(sum);

          // 年份切换
          const nav = document.createElement("div");
          nav.className = "wn-nav";
          const prev = document.createElement("button");
          prev.type = "button";
          prev.className = "wn-arrow";
          prev.textContent = "‹";
          prev.title = "上一年";
          prev.setAttribute("aria-label", "上一年");
          prev.onclick = () => { year -= 1; render(); };
          const label = document.createElement("div");
          label.className = "wn-year";
          label.textContent = `${year} 年`;
          const next = document.createElement("button");
          next.type = "button";
          next.className = "wn-arrow";
          next.textContent = "›";
          next.title = "下一年";
          next.setAttribute("aria-label", "下一年");
          next.onclick = () => { year += 1; render(); };
          const todayBtn = document.createElement("button");
          todayBtn.type = "button";
          todayBtn.className = "wn-today";
          todayBtn.textContent = "回到今年";
          todayBtn.onclick = () => { year = today.isoYear; render(); };
          nav.append(prev, label, next, todayBtn);
          root.append(nav);

          // 周数表
          const weeks = weeksInISOYear(year);
          const scroller = document.createElement("div");
          scroller.className = "wn-scroll";
          scroller.tabIndex = 0;
          scroller.setAttribute("role", "region");
          scroller.setAttribute("aria-label", year + "年周数表，可滚动");
          const table = document.createElement("table");
          table.setAttribute("aria-label", "ISO " + year + "年周数与日期范围");
          table.className = "wn-table";
          const thead = document.createElement("thead");
          thead.innerHTML =
            '<tr><th scope="col">周次</th><th scope="col">周一</th><th scope="col">周日</th></tr>';
          table.append(thead);

          const tbody = document.createElement("tbody");
          for (let w = 1; w <= weeks; w++) {
            const m = mondayOfISOWeek(year, w);
            const s = new Date(m);
            s.setUTCDate(m.getUTCDate() + 6);
            const isCurrent = year === today.isoYear && w === today.week;
            const tr = document.createElement("tr");
            if (isCurrent) tr.className = "wn-current";
            const c1 = document.createElement("td");
            const weekLabel = document.createElement("span");
            weekLabel.className = "wn-week-label";
            weekLabel.textContent = "W" + String(w).padStart(2, "0");
            c1.append(weekLabel);
            if (isCurrent) {
              tr.setAttribute("aria-current", "date");
              const badge = document.createElement("span");
              badge.className = "wn-badge";
              badge.textContent = "本周";
              c1.append(badge);
            }
            const c2 = document.createElement("td");
            c2.textContent = fmt(m).slice(5).replace("-", ".");
            if (m.getUTCFullYear() !== year) {
              const dateYear = document.createElement("span");
              dateYear.className = "wn-date-year";
              dateYear.textContent = m.getUTCFullYear();
              c2.prepend(dateYear);
            }
            c2.title = fmt(m);
            const c3 = document.createElement("td");
            c3.textContent = fmt(s).slice(5).replace("-", ".");
            if (s.getUTCFullYear() !== year) {
              const dateYear = document.createElement("span");
              dateYear.className = "wn-date-year";
              dateYear.textContent = s.getUTCFullYear();
              c3.prepend(dateYear);
            }
            c3.title = fmt(s);
            tr.append(c1, c2, c3);
            tbody.append(tr);
          }
          table.append(tbody);
          scroller.append(table);
          root.append(scroller);

          const foot = document.createElement("div");
          foot.className = "wn-foot";
          const rule = document.createElement("span");
          rule.textContent = "周一开始 · ISO 8601";
          rule.title = "第 1 周是包含 1 月 4 日的那一周";
          const count = document.createElement("span");
          count.textContent = "全年 " + weeks + " 周";
          foot.append(rule, count);
          root.append(foot);

          // 自动滚动到当前周
          if (year === today.isoYear) {
            const cur = root.querySelector(".wn-current");
            if (cur) {
              // 只滚动表格，不移动宿主笔记页面。
              const offset = cur.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
              scroller.scrollTop = Math.max(0, offset - (scroller.clientHeight - cur.clientHeight) / 2);
            }
          }
        }

        render();

        return () => root.remove();
      },
    });

    return () => {
      [disposeOpen, disposeInsert, disposePanel].forEach((f) => {
        if (typeof f === "function") f();
      });
    };
  },
};
