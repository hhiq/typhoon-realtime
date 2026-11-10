/* =========================================================
 * UI 渲染：预警横幅 / 台风实况卡片 / 分级预警联动
 * 兼容三种数据源：真实活跃台风、真实“无台风”态、演示数据回退
 * ========================================================= */

function val(v, suffix) {
  return (v === null || v === undefined || v === "") ? "—" : (v + (suffix || ""));
}

/* 演示数据标注：仅当 isSample 为真时显示，接入真实数据后自动隐藏 */
function applyDemoVisibility(data) {
  var isSample = !!(data && data.meta && data.meta.isSample === true);
  var ds = document.getElementById("demoStrip"); if (ds) ds.style.display = isSample ? "" : "none";
  var td = document.getElementById("ty-demo"); if (td) td.style.display = isSample ? "" : "none";
  document.querySelectorAll(".demo-pill").forEach(function (el) { el.style.display = isSample ? "" : "none"; });
  var mapCard = document.getElementById("map");
  if (mapCard) {
    mapCard.closest(".card").querySelectorAll(".demo-tag").forEach(function (el) {
      el.style.display = isSample ? "" : "none";
    });
  }
}

function renderBanner(banner, badge, sub, color) {
  banner.style.background = color || "#5d6b7d";
  banner.innerHTML =
    '<div class="banner-inner"><span class="badge">' + badge + "</span><span>" + sub + "</span></div>";
}

function renderWarnings(warn) {
  var wl = document.getElementById("warnings");
  wl.innerHTML = "";
  WARNING_LEVELS.forEach(function (w) {
    var active = w.key === (warn && warn.level);
    var li = document.createElement("div");
    li.className = "wcard" + (active ? " active" : "");
    li.style.borderLeftColor = w.color;
    var acts = w.actions.map(function (a) { return "<li>" + a + "</li>"; }).join("");
    li.innerHTML =
      '<div class="wcard-head">' +
        '<span class="wdot" style="background:' + w.color + '"></span>' +
        "<strong>" + w.name + "</strong> <span class=\"wlevel\">" + w.level + "</span>" +
        (active ? ' <span class="wcur">当前</span>' : "") +
      "</div>" +
      '<div class="wstd">' + w.standard + "</div>" +
      '<ul class="wacts">' + acts + "</ul>";
    wl.appendChild(li);
  });
  if (warn && warn.note) {
    var note = document.createElement("p");
    note.className = "sec-disc";
    note.textContent = "※ " + warn.note;
    wl.appendChild(note);
  }
}

function renderActive(data) {
  var meta = data.meta, cur = data.current, warn = data.warning;
  var lv = WARNING_LEVELS.find(function (w) { return w.key === (warn && warn.level); });
  var banner = document.getElementById("banner");
  if (lv) {
    renderBanner(banner, lv.name, lv.level + " ｜ " + lv.actions[0], lv.color);
  } else {
    renderBanner(banner, "无生效预警信号", (warn && warn.note) ? warn.note : "请关注官方发布", "#5d6b7d");
  }
  banner.innerHTML += '<div class="banner-sub">发布：' + warn.issuedBy + " · " + warn.issuedTime + "</div>";

  document.getElementById("ty-name").textContent = meta.name;
  document.getElementById("ty-number").textContent = meta.number;
  document.getElementById("ty-category").textContent = meta.category;
  document.getElementById("ty-en").textContent = meta.enName;

  document.getElementById("pos-coord").textContent =
    cur.lat.toFixed(1) + "°N, " + cur.lon.toFixed(1) + "°E";
  document.getElementById("pos-near").textContent = cur.near;

  document.getElementById("move-dir").textContent = cur.moveDir;
  document.getElementById("move-speed").textContent = val(cur.moveSpeed, " km/h");

  document.getElementById("wind-level").textContent = val(cur.maxWindLevel, " 级");
  document.getElementById("wind-speed").textContent = val(cur.maxWindSpeed, " m/s");
  document.getElementById("wind-pressure").textContent = val(cur.pressure, " hPa");

  var radii;
  if (cur.radius7 != null && cur.radius10 != null)
    radii = "7级风圈 " + cur.radius7 + "km · 10级风圈 " + cur.radius10 + "km";
  else if (cur.radius7 != null) radii = "7级风圈 " + cur.radius7 + "km";
  else if (cur.radius10 != null) radii = "10级风圈 " + cur.radius10 + "km";
  else radii = "风圈数据暂缺";
  document.getElementById("wind-radii").textContent = radii;

  renderWarnings(warn);

  document.getElementById("update-time").textContent = meta.updateTime;
  document.getElementById("source").textContent = meta.source;

  initMap(data);
}

function renderIdle(data) {
  var banner = document.getElementById("banner");
  renderBanner(banner, "当前无活跃台风",
    (data && data.message) ? data.message : "西北太平洋暂无编号台风活动", "#5d6b7d");
  banner.innerHTML += '<div class="banner-sub">数据来源：' +
    ((data && data.source) || "浙江省水利厅台风路径系统") + "</div>";

  document.getElementById("ty-name").textContent = "无活跃台风";
  document.getElementById("ty-number").textContent = "（浙江省水利厅台风路径系统）";
  document.getElementById("ty-category").textContent = "—";
  document.getElementById("ty-en").textContent = "";

  document.getElementById("pos-coord").textContent = "—";
  document.getElementById("pos-near").textContent = "暂无台风位置信息";
  document.getElementById("move-dir").textContent = "—";
  document.getElementById("move-speed").textContent = "—";
  document.getElementById("wind-level").textContent = "—";
  document.getElementById("wind-speed").textContent = "—";
  document.getElementById("wind-pressure").textContent = "—";
  document.getElementById("wind-radii").textContent = "—";

  renderWarnings({ note: "当前未发布台风预警信号；以下为四级预警释义，供沿海居民了解。" });

  document.getElementById("update-time").textContent = (data && data.fetchedAt) ? data.fetchedAt : "—";
  document.getElementById("source").textContent = (data && data.source) || "浙江省水利厅台风路径系统";

  initMap(data);
}

function render(data) {
  applyDemoVisibility(data);
  if (!data || data.active === false) renderIdle(data);
  else renderActive(data);
}

document.addEventListener("DOMContentLoaded", function () {
  loadTyphoon().then(render).catch(function () {
    renderIdle({ message: "数据加载失败，请稍后刷新重试" });
  });
});
