/* 客服回覆文本（原 CSR v1.6.0）整合版
   放在主視窗的 Shadow DOM 裡，樣式不會和代辦頁互相干擾，顏色跟著 ⚙ 配色走。
   - 分類、群組、對話框、小按鈕：存在桌面端的 csr-data.json（瀏覽器預覽時用 localStorage）
   - 右側「重要注意事項」：直接讀寫代辦的 ⚠️ 重要注意事項（state.imp），兩邊是同一份資料
   - 程式更新：跟著主程式（GitHub Releases），不再使用 .csupdate
   需要主程式先建立 window.FT（見 index.html）。 */
(() => {
"use strict";
const FT = window.FT;
const host = document.getElementById("csrHost");
if (!FT || !host) return;
const root = host.attachShadow({ mode: "open" });

root.innerHTML = `<style>
:host{
  --panel:var(--card);
  --ink-soft:var(--muted);
  --accent-deep:color-mix(in srgb,var(--accent) 78%,var(--ink));
  --sun:color-mix(in srgb,var(--accent) 22%,var(--card));
  --soft2:color-mix(in srgb,var(--accent) 9%,var(--card));
  --line:color-mix(in srgb,var(--accent) 32%,var(--card));
  --danger:color-mix(in srgb,#d93025 82%,var(--ink));
  --red:color-mix(in srgb,#d0102a 82%,var(--ink));
  --z:1;
  --side-w:250px; --notes-w:310px; --composer-h:170px; --nform-h:190px;
  display:flex;flex-direction:column;flex:1;min-height:0;position:relative;
  background:var(--bg);color:var(--ink);font-size:calc(16px * var(--z));line-height:1.6;
}
:host(.hidden){display:none !important}
*{box-sizing:border-box}
::-webkit-scrollbar{width:8px;height:6px}
::-webkit-scrollbar-thumb{background:var(--line);border-radius:4px}
::-webkit-scrollbar-track{background:transparent}
button,textarea,input,select{font:inherit;color:inherit}
button{cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

.top{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:6px 10px;background:var(--card);border-bottom:1px solid var(--line);flex:none}
.top .grow{flex:1}

.btn{border:2px solid var(--accent);background:var(--panel);color:var(--accent-deep);font-weight:700;padding:6px 14px;border-radius:8px;min-height:38px}
.btn:hover{background:var(--sun);color:var(--ink)}
.btn.primary{background:var(--accent);color:#fff}
.btn.primary:hover{background:var(--accent-deep);border-color:var(--accent-deep);color:#fff}
.btn.danger{border-color:var(--danger);color:var(--danger)}
.btn.danger:hover{background:var(--danger);color:#fff}
.btn.small{padding:3px 10px;min-height:32px;font-size:calc(14px * var(--z))}
.top .btn{min-height:30px;padding:2px 10px;font-size:13px;border-width:1px}

.shell{flex:1;min-height:0;display:flex}
.side{width:var(--side-w);flex:none;background:var(--panel);border-right:2px solid var(--line);display:flex;flex-direction:column;min-height:0}
.side h2{font-size:calc(14px * var(--z));margin:0;padding:14px 16px 6px;color:var(--ink-soft);font-weight:700}
.cats{list-style:none;margin:0;padding:4px 10px;overflow:auto;flex:1;display:flex;flex-direction:column;gap:4px}
.cat{width:100%;text-align:left;display:flex;justify-content:space-between;gap:8px;align-items:center;border:2px solid transparent;background:none;padding:9px 10px;border-radius:8px;font-weight:500}
.cat:hover{background:var(--soft2)}
.cat[aria-current="true"]{background:var(--sun);border-color:var(--accent);font-weight:700}
.cat .n{font-size:calc(13px * var(--z));font-variant-numeric:tabular-nums;background:var(--panel);border:1px solid var(--line);border-radius:99px;padding:0 8px;flex:none}
.cat span:first-child{overflow-wrap:anywhere}
.side .add{margin:10px}

.main{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0}
.head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:12px 20px;border-bottom:2px solid var(--line)}
.head h1{font-size:calc(22px * var(--z));margin:0;margin-right:auto;font-weight:900;overflow-wrap:anywhere}
.search{border:2px solid var(--line);background:var(--panel);border-radius:8px;padding:5px 10px;min-height:38px;width:180px}
.list{flex:1;overflow:auto;padding:18px 20px;display:flex;flex-direction:column;gap:14px}
.bubble{max-width:760px;width:fit-content;min-width:min(320px,100%);background:var(--panel);border:2px solid var(--line);border-left:8px solid var(--accent);border-radius:4px 16px 16px 16px;padding:12px 14px 8px;box-shadow:0 2px 0 color-mix(in srgb,var(--accent) 18%,transparent)}
.bubble .txt{white-space:pre-wrap;overflow-wrap:anywhere;font-size:calc(16.5px * var(--z))}
.bubble .acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;padding-top:8px;border-top:1px dashed var(--line)}
.bubble textarea{width:100%;min-height:110px}
.empty{color:var(--ink-soft);border:2px dashed var(--line);border-radius:12px;padding:24px;max-width:520px}

textarea{border:2px solid var(--line);background:var(--card);border-radius:8px;padding:8px 10px;resize:vertical;line-height:1.6}
textarea:focus,input:focus{border-color:var(--accent);outline:none}
.composer{background:var(--panel);padding:10px 20px 12px;display:flex;gap:10px;align-items:flex-end;height:var(--composer-h);flex:none}
.composer textarea{flex:1;min-height:0;resize:none}
.composer .hint{font-size:calc(13px * var(--z));color:var(--ink-soft);display:block;margin-top:2px}

.notes{width:var(--notes-w);flex:none;background:var(--soft2);border-left:2px solid var(--line);display:flex;flex-direction:column;min-height:0}
.notes h2{margin:0;padding:10px 14px;font-size:calc(17px * var(--z));font-weight:900;background:var(--sun);border-bottom:2px solid var(--line);display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap}
.notes h2 .n{font-size:calc(13px * var(--z));font-weight:700;background:var(--panel);border:1px solid var(--line);border-radius:99px;padding:0 8px;font-variant-numeric:tabular-nums}
.notes h2 select{flex:1;min-width:0;max-width:none;font-weight:700}
.ncap{font-size:calc(12px * var(--z));color:var(--ink-soft);padding:6px 14px 0}
.nlist{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px}
.note{background:var(--panel);border:2px solid var(--line);border-radius:10px;padding:10px 12px 8px}
.note.pinned{border-color:var(--accent);box-shadow:inset 0 5px 0 var(--accent)}
.note .pin{display:inline-block;font-size:calc(12.5px * var(--z));font-weight:700;background:var(--accent);color:#fff;border-radius:99px;padding:0 9px;margin:4px 0 6px}
.note .txt{white-space:pre-wrap;overflow-wrap:anywhere}
.note .acts{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px;padding-top:8px;border-top:1px dashed var(--line)}
.note textarea{width:100%;min-height:90px}
.red{color:var(--red);font-weight:700}
.btn.redmark{border-color:var(--red);color:var(--red)}
.btn.redmark:hover{background:var(--red);color:#fff}
.nform{height:var(--nform-h);flex:none;padding:8px 12px 10px;display:flex;flex-direction:column;gap:8px;background:var(--panel)}
.nform textarea{flex:1;min-height:0;resize:none}
.nform .row{display:flex;gap:6px;justify-content:space-between;flex-wrap:wrap}
.nform .hint{font-size:calc(13px * var(--z));color:var(--ink-soft)}
@media (max-width:1080px){
  .shell{flex-wrap:wrap;overflow:auto}
  .main{min-height:75%;flex-basis:calc(100% - var(--side-w) - 10px)}
  .split[data-k="notesW"]{display:none}
  .notes{width:100%;border-left:0;border-top:2px solid var(--line);min-height:auto}
  .nlist{overflow:visible}
}

.groups{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:10px 20px;border-bottom:2px solid var(--line);background:var(--soft2)}
.groups .lbl{font-weight:700;font-size:calc(14px * var(--z));color:var(--ink-soft)}
.chip{border:2px solid var(--line);background:var(--panel);border-radius:99px;padding:3px 12px;font-weight:500;min-height:34px}
.chip:hover{border-color:var(--accent)}
.chip[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:700}
.chip .n{font-variant-numeric:tabular-nums;margin-left:4px}
.gtools{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto}
.tag{display:inline-block;font-size:calc(13px * var(--z));font-weight:700;background:var(--sun);color:var(--ink);border:1px solid var(--accent);border-radius:99px;padding:0 10px;margin-bottom:6px}
select{font:inherit;color:var(--ink);border:2px solid var(--line);background:var(--card);border-radius:8px;padding:2px 6px;min-height:32px;font-size:calc(14px * var(--z));max-width:180px}
button:disabled,.btn:disabled,.btn.primary:disabled,.btn:disabled:hover{background:color-mix(in srgb,var(--ink) 9%,var(--card));border-color:color-mix(in srgb,var(--ink) 22%,var(--card));color:var(--muted);cursor:not-allowed}

.split{flex:none;background:var(--line);position:relative;touch-action:none}
.split.v{width:10px;cursor:col-resize}
.split.hz{height:10px;cursor:row-resize}
.split::after{content:"";position:absolute;inset:0;margin:auto;background:var(--accent-deep);border-radius:9px}
.split.v::after{width:4px;height:44px}
.split.hz::after{height:4px;width:44px}
.split:hover,.split.drag,.split:focus-visible{background:var(--accent)}
.split:hover::after,.split.drag::after,.split:focus-visible::after{background:#fff}
:host(.dragging){user-select:none}
:host(.dragging.col) *{cursor:col-resize !important}
:host(.dragging.row) *{cursor:row-resize !important}
.selbtn{position:fixed;z-index:15;display:none;background:var(--ink);color:var(--card);border:2px solid var(--card);border-radius:8px;font-weight:700;padding:5px 12px;font-size:calc(14px * var(--z));box-shadow:0 3px 10px rgba(0,0,0,.35)}
.selbtn.on{display:block}
.selbtn:hover{background:var(--accent);color:#fff}
::selection{background:var(--accent);color:#fff}
.setrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.setrow input[type=range]{flex:1;min-width:160px;accent-color:var(--accent);height:28px}
.setrow output{font-weight:900;font-variant-numeric:tabular-nums;min-width:3.2em;text-align:right}
.sample{border:2px dashed var(--line);border-radius:8px;padding:10px 12px;background:var(--card);font-size:calc(16.5px * var(--z))}

.bhead{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
.bhead .tag{margin-bottom:0}
.btitle{font-weight:900;font-size:calc(17px * var(--z));color:var(--accent-deep);overflow-wrap:anywhere}
.tinput{border:2px solid var(--line);background:var(--card);border-radius:8px;padding:5px 10px;width:100%;font-weight:700;margin-bottom:6px}
.btn.tiny{padding:0 8px;min-height:26px;font-size:calc(12.5px * var(--z));border-width:1px}

.cat .fx{font-size:calc(12px * var(--z));font-weight:700;border:1px solid var(--accent);color:var(--accent-deep);background:var(--panel);border-radius:99px;padding:0 7px;flex:none;margin-left:auto}
.dlg select{width:100%;max-width:none;min-height:40px;font-size:calc(16px * var(--z))}

.btn.plus{margin-left:auto;width:36px;min-height:36px;padding:0;border-radius:50%;font-size:calc(22px * var(--z));line-height:1;font-weight:900;flex:none}
.subs{margin-top:10px;padding-top:10px;border-top:1px dashed var(--line);display:flex;flex-direction:column;gap:8px}
.subbar{display:flex;gap:6px;flex-wrap:wrap}
.chip.sub{font-weight:700;border-color:var(--accent);color:var(--accent-deep)}
.chip.sub[aria-expanded="true"]{background:var(--accent);color:#fff}
.subpanel{background:var(--bg);border:2px solid var(--accent);border-radius:10px;padding:10px 12px 8px}
.subpanel .sname{font-weight:900;color:var(--accent-deep);margin-bottom:4px}
.subpanel .txt.none{color:var(--ink-soft)}
.subpanel textarea{width:100%;min-height:90px}

.veil{position:absolute;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:16px;z-index:20}
.veil.on{display:flex}
.dlg{background:var(--panel);border:3px solid var(--accent);border-radius:14px;padding:20px;width:min(560px,100%);max-height:90%;overflow:auto;display:flex;flex-direction:column;gap:12px}
.dlg h3{margin:0;font-size:calc(19px * var(--z))}
.dlg p{margin:0}
.dlg input[type=text]{border:2px solid var(--line);background:var(--card);border-radius:8px;padding:8px 10px;width:100%}
.dlg textarea{width:100%;min-height:160px;font-size:calc(14px * var(--z))}
.dlg .row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.dlg label{font-weight:700}

@media (max-width:720px){
  .shell{flex-direction:column;overflow:auto}
  .side{width:auto;border-right:0;border-bottom:2px solid var(--line);flex-direction:row;align-items:center}
  .side h2{display:none}
  .cats{flex-direction:row;overflow-x:auto;padding:8px}
  .cat{width:auto;white-space:nowrap}
  .side .add{margin:8px;flex:none}
  .head{padding:10px 12px}
  .search{width:100%}
  .groups{padding:8px 12px}
  .list{padding:12px;overflow:visible}
  .bubble{min-width:0;width:100%}
  .composer{flex-direction:column;align-items:stretch;padding:10px 12px;height:auto}
  .composer textarea{min-height:90px;resize:vertical}
  .shell{flex-wrap:nowrap}
  .main{flex-basis:auto;min-height:60vh;flex:none}
  .side,.notes{flex:none}
  .split.v,.split.hz{display:none}
  .nform{height:auto}
  .nform textarea{min-height:80px;resize:vertical}
}
</style>
<header class="top">
  <button class="btn" id="btnSettings" type="button">文字與版面</button>
  <span class="grow"></span>
  <button class="btn" id="btnExport" type="button">匯出 .txt 備份</button>
  <button class="btn" id="btnImport" type="button">匯入 .txt</button>
</header>

<div class="shell">
  <nav class="side" aria-label="分類">
    <h2>分類頁面</h2>
    <ul class="cats" id="cats"></ul>
    <button class="btn add" id="btnAddCat" type="button">＋ 新增分類</button>
  </nav>
  <div class="split v" data-k="sideW" role="separator" aria-orientation="vertical" aria-label="調整分類欄寬度" tabindex="0"></div>

  <main class="main">
    <div class="head">
      <h1 id="catTitle"></h1>
      <input class="search" id="search" type="search" placeholder="搜尋名稱或內容" aria-label="搜尋此分類">
      <button class="btn small" id="btnRename" type="button">重新命名</button>
      <button class="btn small danger" id="btnDelCat" type="button">刪除分類</button>
    </div>
    <div class="groups" id="groups"></div>
    <div class="list" id="list"></div>
    <div class="split hz" data-k="composerH" role="separator" aria-orientation="horizontal" aria-label="調整輸入區高度" tabindex="0"></div>
    <form class="composer" id="composer">
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;align-self:stretch">
        <input class="tinput" id="newTitle" type="text" maxlength="60" placeholder="對話框名稱（可不填）" aria-label="對話框名稱">
        <textarea id="newText" placeholder="輸入一段回覆文本，按「新增」建立對話框" aria-label="新增回覆文本"></textarea>
        <span class="hint">Ctrl + Enter 可快速新增</span>
      </div>
      <button class="btn primary" type="submit">新增</button>
    </form>
  </main>
  <div class="split v" data-k="notesW" role="separator" aria-orientation="vertical" aria-label="調整注意事項欄寬度" tabindex="0"></div>

  <aside class="notes" aria-label="重要注意事項">
    <h2><span>⚠️ 注意事項</span><select id="noteCat" aria-label="注意事項分類"></select><span class="n" id="noteCount"></span></h2>
    <div class="ncap">和代辦頁的 ⚠️ 重要注意事項是同一份資料</div>
    <div class="nlist" id="nlist"></div>
    <div class="split hz" data-k="nformH" role="separator" aria-orientation="horizontal" aria-label="調整注意事項輸入區高度" tabindex="0"></div>
    <form class="nform" id="nform">
      <textarea id="newNote" placeholder="輸入注意事項" aria-label="新增注意事項"></textarea>
      <span class="hint">先選取文字，再按「標紅字」可標成重點紅字</span>
      <div class="row">
        <button class="btn small redmark" type="button" id="btnRedNew">標紅字</button>
        <button class="btn small primary" type="submit">新增注意事項</button>
      </div>
    </form>
  </aside>
</div>

<button class="selbtn" id="selBtn" type="button">複製選取的文字</button>
<div class="veil" id="veil"><div class="dlg" id="dlg" role="dialog" aria-modal="true"></div></div>
<input type="file" id="file" accept=".txt,text/plain" hidden>`;

/* ===== 資料與版本 =====
   SCHEMA：資料格式版本。之後改版若資料格式有變，在 MIGRATIONS 加一段升級函式，舊資料會自動延續。
   注意事項（notes）已移到主程式的 state.imp；舊資料或 .txt 裡的注意事項會搬過去。 */
const SCHEMA = 6;
const KEY = "cs-reply-texts";
const NOTE_CAT_NAME = "客服注意事項";
const MIGRATIONS = {
  2: d => { if (!Array.isArray(d.notes)) d.notes = []; return d; },
  3: d => { d.categories.forEach(c => { if (!Array.isArray(c.groups)) c.groups = []; c.items.forEach(i => { if (i.group === undefined) i.group = null; }); }); return d; },
  4: d => { if (!d.settings || typeof d.settings !== "object") d.settings = {}; return d; },
  5: d => d,
  6: d => d     // v1.0.0 整合版：notes 改存到 state.imp（由 adoptNotes 處理）
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function defaults(){
  const g1 = uid(), g2 = uid();
  return { schema: SCHEMA, settings: {}, notes: [], categories: [
    { id: uid(), name: "退件進度查詢", groups: [{ id: g1, name: "進度回覆" }, { id: g2, name: "退款時程" }], items: [
      { id: uid(), group: g1, text: "（範例）您好，已為您查詢退件進度，目前包裹已由物流收回，預計 3–5 個工作天內完成驗收，完成後會再通知您。" },
      { id: uid(), group: g2, text: "（範例）您好，退款將於驗收完成後 7–14 個工作天內退回原付款方式，再請您留意帳戶明細，謝謝。" }
    ]}
  ]};
}
/* 固定分類：不能刪除、可以改名。用 fixed 這個代號辨識（改名後仍認得）。 */
const FIXED = [{ key: "work", name: "工作訊息回覆" }, { key: "safety", name: "職安注意事項" }];
function ensureFixed(d){
  const add = [];
  FIXED.forEach(f => {
    if (d.categories.some(c => c.fixed === f.key)) return;
    const same = d.categories.find(c => !c.fixed && c.name === f.name);
    if (same) same.fixed = f.key; else add.push({ id: uid(), name: f.name, fixed: f.key, groups: [], items: [] });
  });
  d.categories.unshift(...add);
  return d;
}
function migrate(d){
  if (!d || !Array.isArray(d.categories)) return defaults();
  let v = d.schema || 1;
  while (v < SCHEMA) { v++; if (MIGRATIONS[v]) d = MIGRATIONS[v](d); }
  d.schema = SCHEMA;
  if (!Array.isArray(d.notes)) d.notes = [];
  if (!d.settings || typeof d.settings !== "object") d.settings = {};
  d.categories.forEach(c => { if (!Array.isArray(c.groups)) c.groups = []; if (!Array.isArray(c.items)) c.items = []; });
  return d;
}
const DESKTOP = window.desktop && window.desktop.csrLoad ? window.desktop : null;
let loadFailed = false;
function load(){
  if (DESKTOP) {
    const raw = DESKTOP.csrLoad();
    if (raw) { try { return migrate(JSON.parse(raw)); } catch(e){ loadFailed = true; } }
    return defaults();
  }
  try { const raw = localStorage.getItem(KEY); if (raw) return migrate(JSON.parse(raw)); } catch(e){}
  return defaults();
}
let storageOk = true;
function save(){
  if (loadFailed) { loadFailed = false; if (DESKTOP) DESKTOP.csrKeepBroken(); }
  const json = JSON.stringify(data);
  if (DESKTOP) { if (!DESKTOP.csrSave(json) && storageOk) { storageOk = false; toast("資料檔寫入失敗，請先匯出 .txt 備份"); } return; }
  try { localStorage.setItem(KEY, json); }
  catch(e){ if (storageOk) toast("此瀏覽器無法儲存，請記得匯出 .txt 備份"); storageOk = false; }
}

let data = ensureFixed(load());
let currentId = data.categories[0] ? data.categories[0].id : null;
let editingId = null;
let groupFilter = "all";   // "all"｜"none"（未分組）｜群組 id
const $ = id => root.getElementById(id);
const cur = () => data.categories.find(c => c.id === currentId) || null;

/* ===== 注意事項：存在主程式的 state.imp =====
   條列事項 { id, cat, t, u, pin }，紅字標記寫成 [[文字]]。 */
const imp = () => FT.imp();
function noteCat(create){
  const cats = imp().cats;
  let c = cats.find(x => x.id === data.settings.noteCat);
  if (!c) c = cats.find(x => x.name === NOTE_CAT_NAME);
  if (!c && create) { c = { id: uid(), name: NOTE_CAT_NAME, u: Date.now() }; cats.push(c); }
  if (c && data.settings.noteCat !== c.id) { data.settings.noteCat = c.id; save(); }
  return c || null;
}
const catNotes = c => c ? imp().items.filter(i => i.cat === c.id) : [];
// 舊格式的 notes（.txt 匯入或舊資料）搬到 state.imp；重複的內容不再加
function adoptNotes(notes, replace){
  if (!notes || !notes.length) { if (!replace) return 0; }
  const c = noteCat(true), now = Date.now();
  if (replace) catNotes(c).forEach(i => FT.markDeleted(i.id));
  const items = imp().items, have = new Set(replace ? [] : catNotes(c).map(i => i.t));
  if (replace) imp().items = items.filter(i => i.cat !== c.id);
  let n = 0;
  (notes || []).forEach(x => { if (have.has(x.text)) return; have.add(x.text); imp().items.push({ id: uid(), cat: c.id, t: x.text, u: now, pin: !!x.pinned || undefined }); n++; });
  FT.saveImp();
  return n;
}
if (data.notes.length) { adoptNotes(data.notes); data.notes = []; save(); }

/* ===== .txt 格式（可匯出再匯入；和舊版客服回覆文本相容）===== */
const TXT_HEAD = "#!客服回覆文本 備份 格式=6";
const needsEsc = l => /^(\\|#|===|---|\+\+\+|:::)/.test(l);
function toTxt(){
  const out = [TXT_HEAD, "# 匯出時間：" + new Date().toLocaleString("zh-TW"), "# 程式版本：" + FT.version(),
    "# 此檔可用「匯入 .txt」還原。請勿更動 ===、+++、::: 與 --- 開頭的標記行。", "# 注意事項裡的 [[文字]] 代表重點紅字。", ""];
  const body = t => t.split("\n").forEach(l => out.push(needsEsc(l) ? "\\" + l : l));
  out.push("+++ 重要注意事項 +++");
  sortedNotes(catNotes(noteCat(false))).forEach(n => { out.push(n.pin ? "--- 注意事項 釘選 ---" : "--- 注意事項 ---"); body(n.t); });
  out.push("");
  data.categories.forEach(c => {
    out.push("=== " + c.name.replace(/\s*\n\s*/g, " ") + " ===");
    if (c.fixed) out.push("::: 固定 " + c.fixed + " :::");
    c.groups.forEach(g => out.push("::: 群組 " + g.name + " :::"));
    c.items.forEach(i => {
      const g = c.groups.find(x => x.id === i.group);
      out.push(g ? "--- 對話框 @" + g.name + " ---" : "--- 對話框 ---");
      if (i.title) out.push("::: 名稱 " + i.title.replace(/\s*\n\s*/g, " ") + " :::");
      body(i.text);
      (i.subs || []).forEach(sb => { out.push("--- 小按鈕 " + sb.name.replace(/\s*\n\s*/g, " ") + " ---"); body(sb.text); });
    });
    out.push("");
  });
  return out.join("\r\n");
}
function fromTxt(txt){
  const lines = txt.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");
  if (!lines[0] || !lines[0].startsWith("#!客服回覆文本")) throw new Error("這不是客服回覆文本匯出的備份檔（缺少第一行標記）。");
  const cats = [], notes = []; let cat = null, buf = null, inNotes = false, pin = false, grp = null, ttl = "", last = null, sub = null;
  const getG = name => { let g = cat.groups.find(x => x.name === name); if (!g) { g = { id: uid(), name }; cat.groups.push(g); } return g.id; };
  const flush = () => { if (buf) { while (buf.length && buf[buf.length-1] === "") buf.pop(); const text = buf.join("\n");
    if (inNotes) notes.push({ id: uid(), pinned: pin, text }); else if (sub !== null) { if (last) last.subs.push({ id: uid(), name: sub, text }); }
    else if (cat) { last = { id: uid(), group: grp, title: ttl, text, subs: [] }; cat.items.push(last); } } buf = null; sub = null; };
  for (let k = 1; k < lines.length; k++){
    const l = lines[k]; let m;
    if (/^\+\+\+ 重要注意事項 \+\+\+\s*$/.test(l)) { flush(); inNotes = true; cat = null; }
    else if ((m = /^--- 注意事項( 釘選)? ---\s*$/.exec(l))) { flush(); if (inNotes) { buf = []; pin = !!m[1]; } }
    else if ((m = /^=== (.*) ===\s*$/.exec(l))) { flush(); inNotes = false; last = null; cat = { id: uid(), name: m[1].trim() || "未命名分類", groups: [], items: [] }; cats.push(cat); }
    else if (buf && !buf.length && !inNotes && (m = /^::: 名稱 (.+?) :::\s*$/.exec(l))) ttl = m[1].trim();
    else if (!buf && cat && (m = /^::: 固定 (work|safety) :::\s*$/.exec(l))) { if (!cats.some(x => x.fixed === m[1])) cat.fixed = m[1]; }
    else if ((m = /^::: 群組 (.+?) :::\s*$/.exec(l))) { flush(); if (cat) getG(m[1].trim()); }
    else if ((m = /^--- 小按鈕 (.+?) ---\s*$/.exec(l))) { flush(); if (cat && last) { buf = []; sub = m[1].trim(); } }
    else if ((m = /^--- 對話框(?: @(.+?))? ---\s*$/.exec(l))) { flush(); if (cat) { buf = []; ttl = ""; grp = m[1] ? getG(m[1].trim()) : null; } }
    else if (l.startsWith("#") && !buf) { /* 註解 */ }
    else if (buf) buf.push(l.startsWith("\\") ? l.slice(1) : l);
  }
  flush();
  if (!cats.length && !notes.length) throw new Error("檔案裡找不到任何分類或注意事項。");
  return { cats, notes };
}
/* 合併分類：同一個 id、同一個固定分類或同名的分類併在一起；群組依名稱對應；重複的文本（同 id 或同內容）不再加 */
function mergeCats(target, cats){
  let added = 0;
  cats.forEach(c => {
    const ex = target.find(x => x.id === c.id) || target.find(x => (c.fixed && x.fixed === c.fixed) || x.name === c.name);
    if (!ex) { target.push(c); added += c.items.length; return; }
    const map = {}; (c.groups || []).forEach(g => { let t = ex.groups.find(x => x.name === g.name); if (!t) { t = g; ex.groups.push(g); } map[g.id] = t.id; });
    (c.items || []).forEach(i => { if (!ex.items.some(x => x.id === i.id || x.text === i.text)) { i.group = i.group ? (map[i.group] || null) : null; ex.items.push(i); added++; } });
  });
  return added;
}

/* ===== 畫面 ===== */
function render(){
  renderNotes();
  if (!cur() && data.categories[0]) currentId = data.categories[0].id;
  const c = cur();
  const ul = $("cats"); ul.textContent = "";
  data.categories.forEach(cat => {
    const li = document.createElement("li"), b = document.createElement("button");
    b.type = "button"; b.className = "cat"; if (cat.id === currentId) b.setAttribute("aria-current", "true");
    const s = document.createElement("span"); s.textContent = cat.name;
    const n = document.createElement("span"); n.className = "n"; n.textContent = cat.items.length;
    b.append(s); if (cat.fixed) b.append(h("span", "固定", "fx")); b.append(n);
    b.onclick = () => { currentId = cat.id; editingId = null; groupFilter = "all"; $("search").value = ""; render(); };
    li.append(b); ul.append(li);
  });
  $("catTitle").textContent = c ? c.name : "尚無分類";
  ["btnRename","btnDelCat","search","newText"].forEach(id => $(id).disabled = !c);
  const locked = !!(c && c.fixed);
  $("btnDelCat").disabled = !c || locked; $("btnDelCat").textContent = locked ? "固定分類，不能刪除" : "刪除分類";
  const list = $("list"); list.textContent = "";
  if (c && groupFilter !== "all" && groupFilter !== "none" && !c.groups.some(g => g.id === groupFilter)) groupFilter = "all";
  renderGroups(c);
  if (!c) { list.append(emptyBox("請先按「＋ 新增分類」建立分類頁面。")); return; }
  const q = $("search").value.trim().toLowerCase();
  const inG = i => groupFilter === "all" || (groupFilter === "none" ? !i.group : i.group === groupFilter);
  const items = c.items.filter(i => inG(i) && (!q || i.text.toLowerCase().includes(q) || (i.title || "").toLowerCase().includes(q) || (i.subs || []).some(sb => (sb.name + "\n" + sb.text).toLowerCase().includes(q))));
  if (!items.length) { list.append(emptyBox(q ? "找不到符合「" + q + "」的文本。" : groupFilter !== "all" ? "這個群組還沒有文本。在下方輸入內容後按「新增」，會直接放進這個群組。" : "這個分類還沒有文本。在下方輸入內容後按「新增」。")); return; }
  items.forEach(i => list.append(i.id === editingId ? editBubble(c, i) : viewBubble(c, i)));
}
function renderGroups(c){
  const bar = $("groups"); bar.textContent = "";
  if (!c) { bar.style.display = "none"; return; }
  bar.style.display = "";
  bar.append(h("span", "分類群組", "lbl"));
  const chip = (key, label, n) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.setAttribute("aria-pressed", String(groupFilter === key));
    b.append(label); const s = h("span", String(n), "n"); b.append(s);
    b.onclick = () => { groupFilter = key; editingId = null; render(); };
    bar.append(b);
  };
  chip("all", "全部", c.items.length);
  c.groups.forEach(g => chip(g.id, g.name, c.items.filter(i => i.group === g.id).length));
  if (c.groups.length) chip("none", "未分組", c.items.filter(i => !i.group).length);
  bar.append(mkBtn("＋ 新增群組", "", () => nameDlg("新增分類群組", "", v => {
    if (c.groups.some(g => g.name === v)) { toast("已經有同名的群組"); return; }
    const g = { id: uid(), name: v }; c.groups.push(g); groupFilter = g.id; save(); render();
  })));
  const g = c.groups.find(x => x.id === groupFilter);
  if (g) {
    const tools = h("div", null, "gtools");
    tools.append(
      mkBtn("重新命名群組", "", () => nameDlg("重新命名群組", g.name, v => {
        if (c.groups.some(x => x !== g && x.name === v)) { toast("已經有同名的群組"); return; }
        g.name = v; save(); render(); })),
      mkBtn("複製整組文本", "primary", () => {
        const t = c.items.filter(i => i.group === g.id).map(i => i.text);
        if (!t.length) { toast("這個群組還沒有文本"); return; }
        copyText(t.join("\n\n")); }),
      mkBtn("刪除群組", "danger", () => confirmDlg("刪除群組「" + g.name + "」？", "只會刪除群組標記，裡面的文本會保留並改為「未分組」。", "刪除群組", () => {
        c.items.forEach(i => { if (i.group === g.id) i.group = null; });
        c.groups = c.groups.filter(x => x.id !== g.id); groupFilter = "all"; save(); render(); toast("已刪除群組"); }))
    );
    bar.append(tools);
  }
}
function moveDlg(c, i){
  const others = data.categories.filter(x => x.id !== c.id);
  if (!others.length) { toast("沒有其他分類可以移動"); return; }
  openDlg(d => {
    const sc = document.createElement("select"); sc.id = "mvCat";
    others.forEach(x => { const o = document.createElement("option"); o.value = x.id; o.textContent = x.name; sc.append(o); });
    const sg = document.createElement("select"); sg.id = "mvGrp";
    const curG = c.groups.find(g => g.id === i.group);
    const fill = () => {
      const t = others.find(x => x.id === sc.value); sg.textContent = "";
      const o0 = document.createElement("option"); o0.value = ""; o0.textContent = t.groups.length ? "未分組" : "未分組（這個分類還沒有群組）"; sg.append(o0);
      t.groups.forEach(g => { const o = document.createElement("option"); o.value = g.id; o.textContent = g.name; sg.append(o); });
      const same = curG && t.groups.find(g => g.name === curG.name); sg.value = same ? same.id : "";
    };
    sc.onchange = fill; fill();
    const l1 = h("label", "移動到哪個分類"); l1.htmlFor = "mvCat";
    const l2 = h("label", "放進哪個群組"); l2.htmlFor = "mvGrp";
    const row = h("div", null, "row");
    row.append(dBtn("取消", "", closeDlg), dBtn("移動", "primary", () => {
      const t = others.find(x => x.id === sc.value); if (!t) return;
      c.items = c.items.filter(x => x !== i); i.group = sg.value || null; t.items.push(i);
      editingId = null; save(); render(); closeDlg(); toast("已移動到「" + t.name + "」");
    }));
    const pv = h("p", (i.title ? "【" + i.title + "】" : "") + i.text.slice(0, 70) + (i.text.length > 70 ? "…" : "")); pv.style.overflowWrap = "anywhere";
    d.append(h("h3", "移動對話框"), pv, l1, sc, l2, sg, row);
  });
}
function groupSelect(c, i){
  const sel = document.createElement("select"); sel.id = "grp-" + i.id; sel.setAttribute("aria-label", "分類群組");
  const o0 = document.createElement("option"); o0.value = ""; o0.textContent = "未分組"; sel.append(o0);
  c.groups.forEach(g => { const o = document.createElement("option"); o.value = g.id; o.textContent = "群組：" + g.name; sel.append(o); });
  sel.value = i.group || "";
  sel.onchange = () => { i.group = sel.value || null; save(); render(); toast(i.group ? "已標記群組" : "已改為未分組"); };
  if (!c.groups.length) { sel.disabled = true; o0.textContent = "尚無群組"; }
  return sel;
}
function emptyBox(t){ const d = document.createElement("div"); d.className = "empty"; d.textContent = t; return d; }
function mkBtn(label, cls, fn){ const b = document.createElement("button"); b.type = "button"; b.className = "btn small " + (cls||""); b.textContent = label; b.onclick = fn; return b; }
function viewBubble(c, i){
  const el = document.createElement("article"); el.className = "bubble";
  const t = document.createElement("div"); t.className = "txt"; t.textContent = i.text;
  const a = document.createElement("div"); a.className = "acts";
  a.append(
    mkBtn("複製", "primary", () => copyText(i.text)),
    mkBtn("編輯", "", () => { editingId = i.id; render(); }),
    mkBtn("刪除", "danger", () => confirmDlg("刪除這段文本？", i.text.slice(0, 80) + (i.text.length > 80 ? "…" : ""), "刪除", () => {
      c.items = c.items.filter(x => x.id !== i.id); save(); render(); toast("已刪除");
    }))
  );
  a.append(mkBtn("移動", "", () => moveDlg(c, i)));
  a.append(groupSelect(c, i));
  const g = c.groups.find(x => x.id === i.group);
  const safety = c.fixed === "safety";   // 「職安注意事項」專屬：事項裡可以加小按鈕
  if (g || i.title || safety) {
    const hd = h("div", null, "bhead");
    if (g) hd.append(h("div", g.name, "tag"));
    if (i.title) { hd.append(h("div", i.title, "btitle")); const cb = mkBtn("複製名稱", "tiny", () => copyText(i.title, "已複製名稱")); hd.append(cb); }
    if (safety) {
      const add = mkBtn("＋", "plus", () => nameDlg("新增小按鈕（輸入按鈕名稱）", "", v => {
        const sb = { id: uid(), name: v, text: "" }; (i.subs = i.subs || []).push(sb);
        openSub[i.id] = sb.id; editingSub = sb.id; save(); render();
      }));
      add.setAttribute("aria-label", "新增小按鈕"); add.title = "新增小按鈕"; hd.append(add);
    }
    el.append(hd);
  }
  el.append(t);
  if (safety && i.subs && i.subs.length) el.append(subArea(i));
  el.append(a); return el;
}
const openSub = {};
let editingSub = null;
function subArea(i){
  const box = h("div", null, "subs"), bar = h("div", null, "subbar");
  i.subs.forEach(sb => {
    const b = document.createElement("button"); b.type = "button"; b.className = "chip sub"; b.textContent = sb.name;
    b.setAttribute("aria-expanded", String(openSub[i.id] === sb.id));
    b.onclick = () => { openSub[i.id] = openSub[i.id] === sb.id ? null : sb.id; editingSub = null; render(); };
    bar.append(b);
  });
  box.append(bar);
  const sb = i.subs.find(x => x.id === openSub[i.id]);
  if (!sb) return box;
  const panel = h("div", null, "subpanel"), acts = h("div", null, "acts");
  panel.append(h("div", sb.name, "sname"));
  if (editingSub === sb.id) {
    const ta = document.createElement("textarea"); ta.id = "sub-" + sb.id; ta.value = sb.text; ta.placeholder = "輸入「" + sb.name + "」的內容"; ta.setAttribute("aria-label", "小按鈕內容");
    const done = () => { sb.text = ta.value.trim(); editingSub = null; save(); render(); toast("已儲存"); };
    ta.onkeydown = e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") done(); if (e.key === "Escape") { e.stopPropagation(); editingSub = null; render(); } };
    acts.append(mkBtn("儲存", "primary", done), mkBtn("取消", "", () => { editingSub = null; render(); }));
    panel.append(ta, acts); setTimeout(() => ta.focus(), 0);
  } else {
    const t = h("div", sb.text || "還沒有內容，請按「編輯內容」輸入。", "txt" + (sb.text ? "" : " none"));
    acts.append(
      mkBtn("複製", "primary", () => sb.text ? copyText(sb.text) : toast("還沒有內容可以複製")),
      mkBtn("編輯內容", "", () => { editingSub = sb.id; render(); }),
      mkBtn("重新命名", "", () => nameDlg("重新命名小按鈕", sb.name, v => { sb.name = v; save(); render(); })),
      mkBtn("刪除按鈕", "danger", () => confirmDlg("刪除小按鈕「" + sb.name + "」？", "按鈕和它的內容會一起刪除。", "刪除", () => {
        i.subs = i.subs.filter(x => x.id !== sb.id); openSub[i.id] = null; save(); render(); toast("已刪除"); }))
    );
    panel.append(t, acts);
  }
  box.append(panel); return box;
}
function editBubble(c, i){
  const el = document.createElement("article"); el.className = "bubble"; el.style.width = "100%";
  const ta = document.createElement("textarea"); ta.value = i.text; ta.id = "edit-" + i.id; ta.setAttribute("aria-label", "編輯文本");
  const ti = document.createElement("input"); ti.type = "text"; ti.className = "tinput"; ti.id = "etitle-" + i.id; ti.maxLength = 60; ti.value = i.title || ""; ti.placeholder = "對話框名稱（可不填）"; ti.setAttribute("aria-label", "對話框名稱");
  const a = document.createElement("div"); a.className = "acts";
  const done = () => { const v = ta.value.trim(); if (!v) { toast("內容不能是空白"); return; } i.text = v; i.title = ti.value.trim(); editingId = null; save(); render(); toast("已儲存"); };
  a.append(mkBtn("儲存", "primary", done), mkBtn("取消", "", () => { editingId = null; render(); }));
  ta.onkeydown = e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") done(); if (e.key === "Escape") { e.stopPropagation(); editingId = null; render(); } };
  ti.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); ta.focus(); } if (e.key === "Escape") { e.stopPropagation(); editingId = null; render(); } };
  el.append(ti, ta, a); setTimeout(() => ta.focus(), 0); return el;
}

const toast = msg => FT.toast(msg);
async function copyText(text, msg){
  const ok = await FT.copyText(text);
  toast(ok ? (msg || "已複製") : "無法自動複製，請手動選取文字");
}

/* ===== 對話視窗 ===== */
function openDlg(build){ const d = $("dlg"); d.textContent = ""; build(d); $("veil").classList.add("on"); const f = d.querySelector("input,textarea,button"); if (f) f.focus(); }
function closeDlg(){ $("veil").classList.remove("on"); }
$("veil").addEventListener("mousedown", e => { if (e.target === $("veil")) closeDlg(); });
root.addEventListener("keydown", e => { if (e.key === "Escape") closeDlg(); });
function h(tag, text, cls){ const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
function dBtn(label, cls, fn){ const b = h("button", label, "btn " + (cls||"")); b.type = "button"; b.onclick = fn; return b; }
function confirmDlg(title, body, okLabel, onOk){
  openDlg(d => { const row = h("div", null, "row");
    row.append(dBtn("取消", "", closeDlg), dBtn(okLabel, "danger", () => { closeDlg(); onOk(); }));
    d.append(h("h3", title), h("p", body), row); });
}
function nameDlg(title, initial, onOk){
  openDlg(d => {
    const inp = document.createElement("input"); inp.type = "text"; inp.id = "dlgName"; inp.value = initial; inp.maxLength = 40; inp.setAttribute("aria-label", "名稱");
    const go = () => { const v = inp.value.trim(); if (!v) { toast("請輸入名稱"); return; } closeDlg(); onOk(v); };
    inp.onkeydown = e => { if (e.key === "Enter") go(); };
    const row = h("div", null, "row"); row.append(dBtn("取消", "", closeDlg), dBtn("確定", "primary", go));
    d.append(h("h3", title), inp, row);
  });
}

/* ===== 分類操作 ===== */
$("btnAddCat").onclick = () => nameDlg("新增分類", "", v => { const c = { id: uid(), name: v, groups: [], items: [] }; data.categories.push(c); currentId = c.id; save(); render(); });
$("btnRename").onclick = () => { const c = cur(); if (c) nameDlg("重新命名分類", c.name, v => { c.name = v; save(); render(); }); };
$("btnDelCat").onclick = () => { const c = cur(); if (!c || c.fixed) return;
  confirmDlg("刪除分類「" + c.name + "」？", "分類內的 " + c.items.length + " 段文本會一起刪除，無法復原。建議先匯出 .txt 備份。", "刪除分類", () => {
    data.categories = data.categories.filter(x => x.id !== c.id); currentId = data.categories[0] ? data.categories[0].id : null; save(); render(); toast("已刪除分類"); }); };
$("search").oninput = render;

/* ===== 新增文本 ===== */
$("composer").addEventListener("submit", e => {
  e.preventDefault(); const c = cur(), ta = $("newText"), v = ta.value.trim();
  if (!c || !v) return;
  c.items.push({ id: uid(), group: (groupFilter !== "all" && groupFilter !== "none") ? groupFilter : null, title: $("newTitle").value.trim(), text: v }); ta.value = ""; $("newTitle").value = ""; $("search").value = ""; save(); render();
  const list = $("list"); list.scrollTop = list.scrollHeight; ta.focus();
});
$("newTitle").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $("newText").focus(); } });
$("newText").addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") $("composer").requestSubmit(); });

/* ===== 重要注意事項（右側欄，資料在 state.imp）===== */
let editingNote = null;
const RED = /\[\[([\s\S]+?)\]\]/g;
const plain = t => t.replace(RED, "$1");
const sortedNotes = list => list.filter(n => n.pin).concat(list.filter(n => !n.pin));
function fillRed(el, text){
  let last = 0, m; RED.lastIndex = 0;
  while ((m = RED.exec(text))) {
    if (m.index > last) el.append(text.slice(last, m.index));
    const s = document.createElement("span"); s.className = "red"; s.textContent = m[1]; el.append(s);
    last = m.index + m[0].length;
  }
  if (last < text.length) el.append(text.slice(last));
}
function wrapRed(ta){
  const s = ta.selectionStart, e = ta.selectionEnd;
  if (s === e) { toast("請先選取要標成紅字的文字"); ta.focus(); return; }
  ta.value = ta.value.slice(0, s) + "[[" + ta.value.slice(s, e) + "]]" + ta.value.slice(e);
  ta.focus(); ta.setSelectionRange(s, e + 4);
}
const touch = n => { n.u = Date.now(); FT.saveImp(); };
function renderNoteCats(c){
  const sel = $("noteCat"); sel.textContent = "";
  const cats = imp().cats;
  if (!c) { const o = document.createElement("option"); o.value = ""; o.textContent = NOTE_CAT_NAME + "（新增第一則時建立）"; sel.append(o); }
  cats.forEach(x => { const o = document.createElement("option"); o.value = x.id; o.textContent = x.name; sel.append(o); });
  sel.value = c ? c.id : "";
}
$("noteCat").onchange = () => { data.settings.noteCat = $("noteCat").value || null; editingNote = null; save(); renderNotes(); };
function renderNotes(){
  const c = noteCat(false);
  renderNoteCats(c);
  const box = $("nlist"); box.textContent = "";
  const list = catNotes(c);
  $("noteCount").textContent = list.length;
  if (!list.length) { box.append(emptyBox("還沒有注意事項。在下方輸入後按「新增注意事項」。")); return; }
  sortedNotes(list).forEach(n => {
    const el = document.createElement("article"); el.className = "note" + (n.pin ? " pinned" : "");
    const a = document.createElement("div"); a.className = "acts";
    if (n.id === editingNote) {
      const ta = document.createElement("textarea"); ta.value = n.t; ta.id = "nedit-" + n.id; ta.setAttribute("aria-label", "編輯注意事項");
      const done = () => { const v = ta.value.trim(); if (!v) { toast("內容不能是空白"); return; } n.t = v; editingNote = null; touch(n); renderNotes(); toast("已儲存"); };
      ta.onkeydown = e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") done(); if (e.key === "Escape") { e.stopPropagation(); editingNote = null; renderNotes(); } };
      a.append(mkBtn("儲存", "primary", done), mkBtn("標紅字", "redmark", () => wrapRed(ta)), mkBtn("取消", "", () => { editingNote = null; renderNotes(); }));
      el.append(ta, a); setTimeout(() => ta.focus(), 0);
    } else {
      if (n.pin) el.append(h("div", "已釘選", "pin"));
      const t = document.createElement("div"); t.className = "txt"; fillRed(t, n.t);
      a.append(
        mkBtn("複製", "primary", () => copyText(plain(n.t))),
        mkBtn("編輯", "", () => { editingNote = n.id; renderNotes(); }),
        mkBtn(n.pin ? "取消釘選" : "釘選", "", () => { n.pin = !n.pin || undefined; touch(n); renderNotes(); toast(n.pin ? "已釘選到最上方" : "已取消釘選"); }),
        mkBtn("刪除", "danger", () => confirmDlg("刪除這則注意事項？", plain(n.t).slice(0, 80), "刪除", () => {
          FT.markDeleted(n.id); imp().items = imp().items.filter(x => x !== n); FT.saveImp(); renderNotes(); toast("已刪除"); }))
      );
      el.append(t, a);
    }
    box.append(el);
  });
}
$("btnRedNew").onclick = () => wrapRed($("newNote"));
$("nform").addEventListener("submit", e => {
  e.preventDefault(); const ta = $("newNote"), v = ta.value.trim(); if (!v) return;
  const c = noteCat(true);
  imp().items.push({ id: uid(), cat: c.id, t: v, u: Date.now() }); ta.value = ""; FT.saveImp(); renderNotes(); ta.focus();
});
$("newNote").addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") $("nform").requestSubmit(); });

/* ===== 匯出 .txt ===== */
function stamp(){ const d = new Date(), p = n => String(n).padStart(2, "0"); return d.getFullYear() + p(d.getMonth()+1) + p(d.getDate()) + "_" + p(d.getHours()) + p(d.getMinutes()); }
async function doExport(){
  const txt = toTxt(), filename = "客服回覆文本_備份_" + stamp() + ".txt";
  if (DESKTOP) {
    const r = await DESKTOP.csrSaveTxt(filename, "﻿" + txt);
    if (r && r.status === "saved") { toast("已匯出到 " + r.path); return; }
    if (r && r.status === "error") { toast("匯出失敗：" + r.error); return; }
    toast("已取消匯出"); return;
  }
  openDlg(d => {
    const ta = document.createElement("textarea"); ta.readOnly = true; ta.value = txt; ta.id = "dlgExport"; ta.setAttribute("aria-label", "備份內容");
    const row = h("div", null, "row"); row.append(dBtn("關閉", "", closeDlg), dBtn("複製全部", "primary", () => copyText(txt)));
    d.append(h("h3", "匯出備份"), h("p", "預覽版無法直接存檔。請複製以下內容，貼到記事本並存成 .txt，之後可用「匯入 .txt」還原。"), ta, row);
  });
}
$("btnExport").onclick = () => doExport();

/* ===== 匯入 .txt（也用來把舊版客服回覆文本的資料搬過來）===== */
let pending = "";
$("btnImport").onclick = () => {
  pending = "";
  openDlg(d => {
    const pick = dBtn("選擇 .txt 檔案", "", () => $("file").click());
    const ta = document.createElement("textarea"); ta.id = "dlgImport"; ta.placeholder = "或把備份檔的文字內容貼在這裡"; ta.setAttribute("aria-label", "備份內容");
    const info = h("p", "尚未選擇檔案。"); info.id = "importInfo";
    const run = mode => {
      let cats, notes; try { ({ cats, notes } = fromTxt(pending || ta.value)); } catch(err){ toast(err.message); return; }
      const n = cats.reduce((s, c) => s + c.items.length, 0);
      let nn;
      if (mode === "replace") { data.categories = cats; nn = adoptNotes(notes, true); }
      else { mergeCats(data.categories, cats); nn = adoptNotes(notes, false); }
      ensureFixed(data);
      currentId = data.categories[0] ? data.categories[0].id : null; editingId = null; save(); render(); closeDlg();
      toast("已匯入 " + cats.length + " 個分類、" + n + " 段文本、" + nn + " 則注意事項");
    };
    const row = h("div", null, "row");
    row.append(dBtn("取消", "", closeDlg), dBtn("取代全部資料", "danger", () => run("replace")), dBtn("合併到現有資料", "primary", () => run("merge")));
    d.append(h("h3", "匯入 .txt 備份"), pick, info, ta,
      h("p", "合併：同名分類會併在一起，重複的文本和注意事項不會再加一次。取代：分類和文本全部換成備份檔內容，「" + NOTE_CAT_NAME + "」裡的注意事項也會換掉。"),
      h("p", "從舊版「客服回覆文本」搬資料：在舊程式按「匯出 .txt 備份」，再到這裡選那個檔案按「合併到現有資料」。"), row);
  });
};
$("file").addEventListener("change", e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { pending = String(r.result); const i = $("importInfo"); if (i) i.textContent = "已讀取：" + f.name; };
  r.onerror = () => toast("讀不到這個檔案，請再試一次");
  r.readAsText(f, "utf-8"); e.target.value = "";
});

/* ===== 設定：文字大小、區塊大小（存在 data.settings）===== */
const DEF = { fontScale: 100, sideW: 250, notesW: 310, composerH: 170, nformH: 190 };
const LIM = { fontScale: [80, 200], sideW: [150, 520], notesW: [200, 720], composerH: [140, 560], nformH: [130, 560] };
const CSSVAR = { sideW: "--side-w", notesW: "--notes-w", composerH: "--composer-h", nformH: "--nform-h" };
const setting = k => { const v = Number(data.settings[k]); return Number.isFinite(v) ? Math.min(LIM[k][1], Math.max(LIM[k][0], v)) : DEF[k]; };
function applySettings(){
  const r = host.style;
  r.setProperty("--z", String(setting("fontScale") / 100));
  Object.keys(CSSVAR).forEach(k => r.setProperty(CSSVAR[k], setting(k) + "px"));
}
function setSetting(k, v, persist){
  data.settings[k] = Math.round(Math.min(LIM[k][1], Math.max(LIM[k][0], v)));
  applySettings(); if (persist) save();
}
root.querySelectorAll(".split").forEach(sp => {
  const k = sp.dataset.k, vertical = sp.classList.contains("v");
  const sign = k === "sideW" ? 1 : -1;
  let start = 0, base = 0, on = false;
  sp.addEventListener("pointerdown", e => {
    on = true; start = vertical ? e.clientX : e.clientY; base = setting(k);
    sp.setPointerCapture(e.pointerId); sp.classList.add("drag"); host.classList.add("dragging", vertical ? "col" : "row"); e.preventDefault();
  });
  sp.addEventListener("pointermove", e => { if (on) setSetting(k, base + sign * ((vertical ? e.clientX : e.clientY) - start), false); });
  const end = () => { if (!on) return; on = false; sp.classList.remove("drag"); host.classList.remove("dragging", "col", "row"); save(); };
  sp.addEventListener("pointerup", end); sp.addEventListener("pointercancel", end);
  sp.addEventListener("dblclick", () => setSetting(k, DEF[k], true));
  sp.addEventListener("keydown", e => {
    const d = vertical ? (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0) : (e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0);
    if (d) { e.preventDefault(); setSetting(k, setting(k) + sign * d * 16, true); }
  });
});
$("btnSettings").onclick = () => openDlg(d => {
  const row = h("div", null, "setrow");
  const lab = h("label", "文字顯示大小"); lab.htmlFor = "setFont";
  const rng = document.createElement("input"); rng.type = "range"; rng.id = "setFont"; rng.min = LIM.fontScale[0]; rng.max = LIM.fontScale[1]; rng.step = 5; rng.value = setting("fontScale");
  const out = document.createElement("output"); out.textContent = setting("fontScale") + "%";
  const upd = (v, persist) => { setSetting("fontScale", v, persist); rng.value = setting("fontScale"); out.textContent = setting("fontScale") + "%"; };
  rng.oninput = () => upd(+rng.value, false);
  rng.onchange = () => upd(+rng.value, true);
  row.append(lab, dBtn("A−", "", () => upd(setting("fontScale") - 10, true)), rng, dBtn("A＋", "", () => upd(setting("fontScale") + 10, true)), out);
  const btns = h("div", null, "row");
  btns.append(dBtn("恢復預設文字大小", "", () => upd(DEF.fontScale, true)),
    dBtn("恢復預設區塊大小", "", () => { Object.keys(CSSVAR).forEach(k => { data.settings[k] = DEF[k]; }); applySettings(); save(); toast("區塊大小已恢復預設"); }),
    dBtn("關閉", "primary", closeDlg));
  d.append(h("h3", "文字與版面"), row, h("div", "預覽：您好，已為您查詢退件進度，謝謝您的耐心等候。", "sample"),
    h("p", "區塊大小：用滑鼠拖曳各區塊之間的分隔條即可調整，雙擊分隔條恢復該區塊的預設大小。顏色請到右上角 ⚙ 設定 → 配色。"), btns);
});

/* ===== 只複製滑鼠選取的文字 ===== */
const selBtn = $("selBtn");
const getSel = () => (root.getSelection ? root.getSelection() : window.getSelection());
function selText(){
  const sel = getSel();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
  if (!node || !node.closest || !node.closest(".bubble .txt, .note .txt, .subpanel .txt")) return null;
  const t = sel.toString(); return t.trim() ? { t, rect: sel.getRangeAt(0).getBoundingClientRect() } : null;
}
function placeSelBtn(){
  const s = selText();
  if (!s) { selBtn.classList.remove("on"); return; }
  selBtn.classList.add("on");
  const w = selBtn.offsetWidth, hgt = selBtn.offsetHeight;
  let top = s.rect.top - hgt - 8; if (top < 40) top = s.rect.bottom + 8;
  selBtn.style.top = Math.min(window.innerHeight - hgt - 4, top) + "px";
  selBtn.style.left = Math.max(4, Math.min(window.innerWidth - w - 4, s.rect.left + s.rect.width / 2 - w / 2)) + "px";
}
root.addEventListener("mouseup", () => setTimeout(placeSelBtn, 0));
root.addEventListener("keyup", e => { if (e.shiftKey || e.key === "Shift") placeSelBtn(); });
document.addEventListener("selectionchange", () => { if (!selText()) selBtn.classList.remove("on"); });
root.addEventListener("scroll", () => selBtn.classList.remove("on"), true);
selBtn.addEventListener("mousedown", e => e.preventDefault());
selBtn.onclick = () => { const s = selText(); if (s) copyText(s.t, "已複製選取的文字"); selBtn.classList.remove("on"); };

/* ===== 給主程式用：繼承檔、備份、注意事項同步 ===== */
window.CSR = {
  // 繼承檔／備份信裡的客服資料（注意事項已在 state.imp 裡）
  exportData: () => ({ schema: SCHEMA, categories: data.categories, settings: data.settings }),
  count: () => data.categories.reduce((n, c) => n + c.items.length, 0),
  // 繼承檔合併：先算出結果（預覽用），確認後再 apply
  mergePreview(inc){
    const copy = JSON.parse(JSON.stringify(data.categories));
    if (!inc || !Array.isArray(inc.categories)) return { categories: copy, added: 0, settings: null };
    const incCats = JSON.parse(JSON.stringify(inc.categories)).map(c => ({ ...c, groups: c.groups || [], items: c.items || [] }));
    const added = mergeCats(copy, incCats);
    return { categories: copy, added, settings: inc.settings || null };
  },
  apply(r){
    data.categories = r.categories;
    if (r.settings && !data.settings.noteCat && r.settings.noteCat) data.settings.noteCat = r.settings.noteCat;
    ensureFixed(data); save(); render();
  },
  flush: () => save(),
  notesChanged: () => { if (editingNote && !catNotes(noteCat(false)).some(n => n.id === editingNote)) editingNote = null; renderNotes(); },
  shown: () => { render(); }
};

applySettings();
render();
if (loadFailed) toast("客服資料檔讀取失敗，目前顯示的是預設內容。請用「匯入 .txt」還原備份。");
})();
