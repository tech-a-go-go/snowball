class FinancialEvent {
    constructor(url, fetchHtml) {
        this.url = url;
      
        this._fetchHtml = fetchHtml || (async (u) => {
          const res = await fetch(u, { credentials: "include" });
          if (!res.ok) throw new Error(`HTTP ${res.status} for ${u}`);
          return await res.text();
        });
      }
  
    /**
     * イベント配列を返す
     * @param {string[]} [countries] 国名の配列（例: ["日本","米","英"]）。未指定ならフィルタなし。
     * @returns {Promise<Array<Object>>}
     */
    async getEvents(countries) {
      const want = Array.isArray(countries) ? countries.map(this.#norm) : null;
  
      const doc = await this.#loadDocument(this.url);
      const root = doc.querySelector(".c-shihyo-calendar");
      if (!root) return [];
  
      const tables = Array.from(root.querySelectorAll("table"));
      const out = [];
  
      for (let t = 0; t < tables.length; t++) {
        const grid = this.#tableToGrid(tables[t]);
        const { headerNames, headerRowCount } = this.#buildHeader(grid);
        const rows = this.#gridToObjects(grid, headerNames, headerRowCount);
  
        const width = Math.max(...grid.map(r => r.length));
        const timeCol = this.#detectTimeCol(grid, headerRowCount, width);
        const countryCol = this.#detectCountryCol(grid, headerRowCount, width, timeCol, headerNames);
        const rankCol = this.#detectRankCol(grid, headerRowCount, width, headerNames);
  
        const enriched = rows.map((rowObj, i) => {
          const rIdx = headerRowCount + i;
  
          const time = this.#extractTimeFromRow(grid, rIdx, timeCol, rowObj);
          const country = this.#extractCountryFromRow(grid, rIdx, countryCol);
          const rank = this.#extractRankFromRow(grid, rIdx, rankCol);
  
          const eventLike =
            rowObj["指標"] ?? rowObj["内容"] ?? rowObj["タイトル"] ??
            rowObj["題名"] ?? rowObj["名称"] ?? rowObj["title"] ?? "";
          const actualLike = rowObj["結果"] ?? rowObj["実績"] ?? rowObj["速報"] ?? "";
          const forecastLike = rowObj["予想"] ?? "";
          const previousLike = rowObj["前回"] ?? "";
          const unitLike = rowObj["単位"] ?? "";
  
          return {
            table_index: t,
            time,
            country,
            rank,
            event: eventLike,
            actual: actualLike,
            forecast: forecastLike,
            previous: previousLike,
            unit: unitLike,
            raw: rowObj,
          };
        });
  
        out.push(...enriched);
      }
  
      // 国フィルタ（指定があれば）
      if (want && want.length) {
        return out.filter(r => want.some(w => this.#norm(String(r.country)).includes(w)));
      }
      return out;
    }
  
    // ===== private: fetch & DOM =====
    async #loadDocument(url) {
      const html = await this._fetchHtml(url);
      const parser = new DOMParser();
      return parser.parseFromString(html, "text/html");
    }
  
    // ===== private: parsing core =====
    #norm = (s) => String(s || "").replace(/\u00A0/g, " ").trim().toLowerCase();
    #normText = (el) => this.#norm(el.innerText).replace(/\s+/g, " ");
  
    #cellInfo(cell) {
      return {
        text: this.#normText(cell),
        html: (cell.innerHTML || "").trim(),
        rowSpan: Number(cell.getAttribute("rowspan") || 1),
        colSpan: Number(cell.getAttribute("colspan") || 1),
        isHeader: cell.tagName.toLowerCase() === "th",
      };
    }
  
    #tableToGrid(tableEl) {
      const grid = [];
      const rows = Array.from(tableEl.querySelectorAll("tr"));
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (!grid[r]) grid[r] = [];
        let c = 0;
        while (grid[r][c] && grid[r][c].__filled) c++;
        const cells = Array.from(row.children).filter(n => /^(td|th)$/i.test(n.tagName));
        for (const cell of cells) {
          while (grid[r][c] && grid[r][c].__filled) c++;
          const info = this.#cellInfo(cell);
          for (let rr = 0; rr < info.rowSpan; rr++) {
            const rIdx = r + rr;
            if (!grid[rIdx]) grid[rIdx] = [];
            for (let cc = 0; cc < info.colSpan; cc++) {
              const cIdx = c + cc;
              if (rr === 0 && cc === 0) {
                grid[rIdx][cIdx] = { ...info, rowIndex: rIdx, colIndex: cIdx, __filled: false };
              } else {
                grid[rIdx][cIdx] = { __filled: true, masterRow: r, masterCol: c };
              }
            }
          }
          c += info.colSpan;
        }
      }
      // 代理セル → 本体参照
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < (grid[r]?.length || 0); c++) {
          const cell = grid[r][c];
          if (cell && cell.__filled === true) {
            const m = grid[cell.masterRow][cell.masterCol];
            grid[r][c] = m;
          }
        }
      }
      return grid;
    }
  
    #buildHeader(grid) {
      let headerRowCount = 0;
      for (let r = 0; r < grid.length; r++) {
        const hasTH = grid[r]?.some(cell => cell?.isHeader);
        if (hasTH) headerRowCount++;
        else break;
      }
      if (headerRowCount === 0) headerRowCount = 1;
  
      const width = Math.max(...grid.map(row => row.length));
      const colHeaders = Array.from({ length: width }, () => []);
  
      for (let r = 0; r < headerRowCount; r++) {
        for (let c = 0; c < (grid[r]?.length || 0); c++) {
          const cell = grid[r][c];
          if (!cell) continue;
          const label = (cell.isHeader ? cell.text : "").trim();
          if (!label) continue;
          const span = cell.colSpan || 1;
          for (let cc = 0; cc < span; cc++) colHeaders[c + cc].push(label);
        }
      }
  
      const headerNames = colHeaders.map((stack, i) => {
        const name = stack
          .filter(Boolean)
          .map(s => s.replace(/\s+/g, " ").trim())
          .filter((s, k, arr) => s && (k === 0 || s !== arr[k - 1]))
          .join(" / ")
          .replace(/^[\/\s]+|[\/\s]+$/g, "");
        return name || `F${i + 1}`;
      });
  
      return { headerNames, headerRowCount };
    }
  
    #gridToObjects(grid, headerNames, headerRowCount) {
      const rows = [];
      for (let r = headerRowCount; r < grid.length; r++) {
        const row = grid[r];
        if (!row || row.every(c => !c || !c.text)) continue;
        const obj = {};
        for (let c = 0; c < headerNames.length; c++) {
          const cell = row[c];
          const key = headerNames[c] ?? `F${c + 1}`;
          obj[key] = cell ? cell.text : "";
        }
        rows.push(obj);
      }
      return rows;
    }
  
    // ===== private: detectors & extractors =====
    #TIME_RE = /^\s*\d{1,2}:\d{1,2}\s*$/;
    #IMG_ALT_RE = /<img\b[^>]*\balt\s*=\s*"([^"]*)"/i;
  
    #RANK_MAP = [
      [/class\s*=\s*"[^"]*\bicon-maru2\b[^"]*"/i, "◎"],
      [/class\s*=\s*"[^"]*\bicon-maru\b[^"]*"/i,  "○"],
      [/class\s*=\s*"[^"]*\bicon-san\b[^"]*"/i,   "△"],
      [/class\s*=\s*"[^"]*\bicon-batu\b[^"]*"/i,  "×"],
      [/class\s*=\s*"[^"]*\bicon-nasi\b[^"]*"/i,  "-"],
      [/class\s*=\s*"[^"]*\bicon-ss\b[^"]*"/i,    "SS"],
      [/class\s*=\s*"[^"]*\bicon-s\b[^"]*"/i,     "S"],
      [/class\s*=\s*"[^"]*\bicon-aa\b[^"]*"/i,    "AA"],
      [/class\s*=\s*"[^"]*\bicon-a\b[^"]*"/i,     "A"],
      [/class\s*=\s*"[^"]*\bicon-bb\b[^"]*"/i,    "BB"],
      [/class\s*=\s*"[^"]*\bicon-b\b[^"]*"/i,     "B"],
      [/class\s*=\s*"[^"]*\bicon-c\b[^"]*"/i,     "C"],
    ];
  
    #CNTRY_ALIASES = [
      "日本","米","米国","アメリカ","ユーロ圏","英国","イギリス","中国","豪","オーストラリア",
      "ニュージーランド","加","カナダ","スイス","独","ドイツ","仏","フランス","南アフリカ","トルコ","メキシコ"
    ];
  
    #detectTimeCol(grid, headerRowCount, width) {
      let timeCol = -1, best = 0;
      for (let c = 0; c < width; c++) {
        let cnt = 0;
        for (let r = headerRowCount; r < grid.length; r++) {
          const t = grid[r]?.[c]?.text || "";
          if (this.#TIME_RE.test(t)) cnt++;
        }
        if (cnt > best) { best = cnt; timeCol = c; }
      }
      if (timeCol === -1) {
        outer: for (let c = 0; c < width; c++) {
          for (let r = headerRowCount; r < grid.length; r++) {
            const t = grid[r]?.[c]?.text || "";
            if (this.#TIME_RE.test(t)) { timeCol = c; break outer; }
          }
        }
      }
      return timeCol;
    }
  
    #detectCountryCol(grid, headerRowCount, width, timeCol) {
      let countryCol = -1, best = -1;
      for (let c = 0; c < width; c++) {
        let score = 0;
        for (let r = headerRowCount; r < grid.length; r++) {
          const cell = grid[r]?.[c];
          if (!cell) continue;
          const html = cell.html || "";
          const text = cell.text || "";
          if (this.#IMG_ALT_RE.test(html)) score += 3;
          else if (this.#CNTRY_ALIASES.some(w => text.includes(w))) score += 1;
          if (/\/fximg\/.+\.(gif|png|jpe?g)/i.test(html)) score += 1;
        }
        if (score > best || (score === best && c === timeCol + 1)) {
          best = score; countryCol = c;
        }
      }
      if (countryCol === -1 && timeCol >= 0 && timeCol + 1 < width) countryCol = timeCol + 1;
      return countryCol;
    }
  
    #detectRankCol(grid, headerRowCount, width, headerNames) {
      const looksRank = (cell) => {
        if (!cell) return 0;
        const h = cell.html || "";
        const t = cell.text || "";
        for (const [re] of this.#RANK_MAP) if (re.test(h)) return 5;
        if (/[◎○△×\-]/.test(t) || /(SS|AA|[SABC])/.test(t)) return 2;
        if (/class\s*=\s*"[^"]*\brank\b[^"]*"/i.test(h)) return 1;
        return 0;
      };
      let rankCol = -1, best = -1;
      for (let c = 0; c < width; c++) {
        let score = 0;
        for (let r = headerRowCount; r < grid.length; r++) score += looksRank(grid[r]?.[c]);
        if ((headerNames[c] || "").includes("ランク")) score += 1;
        if (score > best) { best = score; rankCol = c; }
      }
      if (rankCol === -1 && width >= 4) rankCol = 3; // フォールバック：4カラム目
      return rankCol;
    }
  
    #extractTimeFromRow(grid, rIdx, timeCol, rowObj) {
      let time = "";
      if (timeCol >= 0) time = (grid[rIdx]?.[timeCol]?.text || "").trim();
      if (!time) {
        for (const v of Object.values(rowObj)) {
          if (this.#TIME_RE.test(String(v))) { time = String(v).trim(); break; }
        }
      }
      return time;
    }
  
    #extractCountryFromRow(grid, rIdx, countryCol) {
      let country = "";
      if (countryCol >= 0) {
        const cell = grid[rIdx]?.[countryCol];
        if (cell) {
          const m = this.#IMG_ALT_RE.exec(cell.html || "");
          country = (m && m[1]) ? m[1].trim() : (cell.text || "").trim();
        }
      }
      return country;
    }
  
    #extractRankFromRow(grid, rIdx, rankCol) {
      if (rankCol < 0) return "";
      const cell = grid[rIdx]?.[rankCol];
      if (!cell) return "";
      const html = cell.html || "";
      const text = cell.text || "";
      for (const [re, val] of this.#RANK_MAP) if (re.test(html)) return val;
      const t = (text || "").replace(/\s+/g, "");
      if (/[◎○△×\-]/.test(t)) return t.match(/[◎○△×\-]/)[0];
      const m = t.match(/SS|AA|[SABC]/);
      return m ? m[0] : "";
    }
  }
  