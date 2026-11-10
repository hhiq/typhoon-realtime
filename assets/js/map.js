/* =========================================================
 * 地图渲染：优先 Leaflet（在线），失败则降级为离线 SVG 示意地图
 * ========================================================= */

function initMap(data) {
  var container = document.getElementById("map");
  if (typeof L !== "undefined") {
    try {
      var map = L.map("map", { scrollWheelZoom: false }).setView([data.current.lat, data.current.lon], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 10
      }).addTo(map);

      var past = data.track.past.map(function (p) { return [p.lat, p.lon]; });
      var fc = data.track.forecast.map(function (p) { return [p.lat, p.lon]; });
      var all = past.concat(fc);

      L.polyline(past, { color: "#1e88e5", weight: 3 }).addTo(map);
      L.polyline(all.slice(past.length - 1), { color: "#e53935", weight: 3, dashArray: "6,6" }).addTo(map);

      past.forEach(function (p) {
        L.circleMarker([p.lat, p.lon], { radius: 4, color: "#1e88e5", fillColor: "#1e88e5", fillOpacity: 1 })
          .addTo(map).bindTooltip(p.t);
      });
      fc.forEach(function (p) {
        L.circleMarker([p.lat, p.lon], { radius: 4, color: "#e53935", fillColor: "#fff", fillOpacity: 1 })
          .addTo(map).bindTooltip(p.t);
      });

      var icon = L.divIcon({ className: "typhoon-icon", html: "🌀", iconSize: [28, 28] });
      L.marker([data.current.lat, data.current.lon], { icon: icon })
        .addTo(map)
        .bindPopup(data.meta.name + "：" + data.current.lat.toFixed(1) + "°N, " + data.current.lon.toFixed(1) + "°E")
        .openPopup();

      map.fitBounds(L.latLngBounds(all).pad(0.35));
      return;
    } catch (e) {
      /* 落到 SVG 降级 */
    }
  }
  renderSvgMap(container, data);
}

/* 离线降级：等距圆柱投影画示意地图，保证路径/位置始终可见 */
function renderSvgMap(container, data) {
  container.innerHTML = "";
  var W = 600, H = 400, pad = 30;
  var latMin = 8, latMax = 26, lonMin = 102, lonMax = 126;

  function px(lon, lat) {
    var x = pad + (lon - lonMin) / (lonMax - lonMin) * (W - 2 * pad);
    var y = pad + (latMax - lat) / (latMax - latMin) * (H - 2 * pad);
    return [x, y];
  }

  var svg = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="100%" ' +
    'preserveAspectRatio="xMidYMid meet" style="background:#eaf3fb">';

  // 经纬网
  for (var la = 10; la <= 25; la += 5) {
    var a = px(lonMin, la), b = px(lonMax, la);
    svg += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="#cfe0ee" stroke-width="1"/>';
  }
  for (var lo = 105; lo <= 125; lo += 5) {
    var c = px(lo, latMin), d = px(lo, latMax);
    svg += '<line x1="' + c[0] + '" y1="' + c[1] + '" x2="' + d[0] + '" y2="' + d[1] + '" stroke="#cfe0ee" stroke-width="1"/>';
  }

  var past = data.track.past;
  var fc = data.track.forecast;

  var dPast = past.map(function (p, i) {
    var c = px(p.lon, p.lat);
    return (i ? "L" : "M") + c[0] + " " + c[1];
  }).join(" ");
  svg += '<path d="' + dPast + '" fill="none" stroke="#1e88e5" stroke-width="3"/>';

  var all = past.concat(fc);
  var dFc = all.map(function (p, i) {
    var c = px(p.lon, p.lat);
    return (i ? "L" : "M") + c[0] + " " + c[1];
  }).join(" ");
  svg += '<path d="' + dFc + '" fill="none" stroke="#e53935" stroke-width="3" stroke-dasharray="6,6"/>';

  past.forEach(function (p) {
    var c = px(p.lon, p.lat);
    svg += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="4" fill="#1e88e5"/>';
  });
  fc.forEach(function (p) {
    var c = px(p.lon, p.lat);
    svg += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="4" fill="#fff" stroke="#e53935" stroke-width="2"/>';
  });

  var cc = px(data.current.lon, data.current.lat);
  svg += '<circle cx="' + cc[0] + '" cy="' + cc[1] + '" r="9" fill="#e53935" stroke="#fff" stroke-width="2"/>';
  svg += '<text x="' + cc[0] + '" y="' + (cc[1] - 14) + '" text-anchor="middle" font-size="12" fill="#16202e">🌀 ' + data.meta.name + "</text>";
  svg += "</svg>";

  container.innerHTML = svg;
  var note = document.createElement("div");
  note.className = "map-note";
  note.textContent = "示意地图（离线模式，未加载在线地图）";
  container.appendChild(note);
}
