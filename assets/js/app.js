/* =========================================================
 * UI 渲染：预警横幅 / 台风实况卡片 / 分级预警联动
 * ========================================================= */

function render(data) {
  var meta = data.meta, cur = data.current, warn = data.warning;

  // 预警横幅（按当前级别上色）
  var lv = WARNING_LEVELS.find(function (w) { return w.key === warn.level; });
  var banner = document.getElementById("banner");
  banner.style.background = lv.color;
  banner.innerHTML =
    '<div class="banner-inner">' +
      '<span class="badge">' + lv.name + "</span>" +
      '<span>' + lv.level + " ｜ " + lv.actions[0] + "</span>" +
    "</div>" +
    '<div class="banner-sub">发布：' + warn.issuedBy + " · " + warn.issuedTime + "</div>";

  // 台风基本信息
  document.getElementById("ty-name").textContent = meta.name;
  document.getElementById("ty-number").textContent = meta.number;
  document.getElementById("ty-category").textContent = meta.category;
  document.getElementById("ty-en").textContent = meta.enName;

  // 当前位置
  document.getElementById("pos-coord").textContent =
    cur.lat.toFixed(1) + "°N, " + cur.lon.toFixed(1) + "°E";
  document.getElementById("pos-near").textContent = cur.near;

  // 移动
  document.getElementById("move-dir").textContent = cur.moveDir;
  document.getElementById("move-speed").textContent = cur.moveSpeed + " km/h";

  // 风力
  document.getElementById("wind-level").textContent = cur.maxWindLevel + " 级";
  document.getElementById("wind-speed").textContent = cur.maxWindSpeed + " m/s";
  document.getElementById("wind-pressure").textContent = cur.pressure + " hPa";
  document.getElementById("wind-radii").textContent =
    "7级风圈 " + cur.radius7 + "km · 10级风圈 " + cur.radius10 + "km";

  // 分级预警卡片
  var wl = document.getElementById("warnings");
  wl.innerHTML = "";
  WARNING_LEVELS.forEach(function (w) {
    var active = w.key === warn.level;
    var li = document.createElement("div");
    li.className = "wcard" + (active ? " active" : "");
    li.style.borderLeftColor = w.color;
    var acts = w.actions.map(function (a) { return "<li>" + a + "</li>"; }).join("");
    li.innerHTML =
      '<div class="wcard-head">' +
        '<span class="wdot" style="background:' + w.color + '"></span>' +
        "<strong>" + w.name + "</strong>" +
        ' <span class="wlevel">' + w.level + "</span>" +
        (active ? ' <span class="wcur">当前</span>' : "") +
      "</div>" +
      '<div class="wstd">' + w.standard + "</div>" +
      '<ul class="wacts">' + acts + "</ul>";
    wl.appendChild(li);
  });

  // 底部信息
  document.getElementById("update-time").textContent = meta.updateTime;
  document.getElementById("source").textContent = meta.source;

  // 演示数据标注：仅当 isSample 为真时显示；接入真实数据后自动隐藏
  var isSample = meta.isSample === true;
  document.getElementById("demoStrip").style.display = isSample ? "" : "none";
  document.getElementById("ty-demo").style.display = isSample ? "" : "none";
  document.getElementById("map").closest(".card").querySelectorAll(".demo-tag").forEach(function (el) {
    el.style.display = isSample ? "" : "none";
  });
  document.querySelectorAll(".demo-pill").forEach(function (el) {
    el.style.display = isSample ? "" : "none";
  });

  // 地图
  initMap(data);
}

document.addEventListener("DOMContentLoaded", function () {
  loadTyphoon().then(render);
});
