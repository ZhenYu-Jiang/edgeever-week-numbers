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
.wn-root { padding: 16px 20px; font-family: inherit; color: inherit; }
.wn-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
.wn-nav button {
  padding: 6px 12px; font-size: 13px; cursor: pointer;
  border: 1px solid rgba(128,128,128,0.35); border-radius: 8px;
  background: transparent; color: inherit;
}
.wn-nav button:hover { background: rgba(128,128,128,0.12); }
.wn-year { flex: 1; text-align: center; font-size: 18px; font-weight: 600; min-width: 90px; }
.wn-summary { margin-bottom: 12px; font-size: 13px; opacity: 0.7; }
.wn-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.wn-table th, .wn-table td { padding: 7px 12px; text-align: left; border-bottom: 1px solid rgba(128,128,128,0.18); }
.wn-table th { font-weight: 600; opacity: 0.6; font-size: 13px; }
.wn-table tr.wn-current td { background: rgba(22,160,110,0.14); font-weight: 600; }
.wn-table tr.wn-current td:first-child { color: #16a06e; }
.wn-foot { margin-top: 12px; font-size: 13px; opacity: 0.6; }
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
            description: "每周从周一开始，第 1 周包含 1 月 4 日",
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
          root.replaceChildren();

          // 顶部：年份切换
          const nav = document.createElement("div");
          nav.className = "wn-nav";
          const prev = document.createElement("button");
          prev.textContent = "‹ 上一年";
          prev.onclick = () => { year -= 1; render(); };
          const label = document.createElement("div");
          label.className = "wn-year";
          label.textContent = `${year} 年`;
          const next = document.createElement("button");
          next.textContent = "下一年 ›";
          next.onclick = () => { year += 1; render(); };
          const todayBtn = document.createElement("button");
          todayBtn.textContent = "回到今年";
          todayBtn.onclick = () => { year = today.isoYear; render(); };
          nav.append(prev, label, next, todayBtn);
          root.append(nav);

          // 当前周摘要
          const sum = document.createElement("div");
          sum.className = "wn-summary";
          const t = isoWeekYearOf(new Date());
          sum.textContent = `今天是 ${t.isoYear} 年第 ${t.week} 周`;
          root.append(sum);

          // 周数表
          const weeks = weeksInISOYear(year);
          const table = document.createElement("table");
          table.className = "wn-table";
          const thead = document.createElement("thead");
          thead.innerHTML =
            "<tr><th>周数</th><th>开始日期（周一）</th><th>结束日期（周日）</th></tr>";
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
            c1.textContent = `第${w}周${isCurrent ? "（本周）" : ""}`;
            const c2 = document.createElement("td");
            c2.textContent = fmt(m);
            const c3 = document.createElement("td");
            c3.textContent = fmt(s);
            tr.append(c1, c2, c3);
            tbody.append(tr);
          }
          table.append(tbody);
          root.append(table);

          const foot = document.createElement("div");
          foot.className = "wn-foot";
          foot.textContent = `${year} 年共 ${weeks} 周`;
          root.append(foot);

          // 自动滚动到当前周
          if (year === today.isoYear) {
            const cur = root.querySelector(".wn-current");
            if (cur) cur.scrollIntoView({ block: "center" });
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
