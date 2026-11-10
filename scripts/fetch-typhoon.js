#!/usr/bin/env node
/**
 * 浙江省水利厅台风路径实时发布系统 —— 公开数据抓取脚本
 * ----------------------------------------------------------------
 * 数据源：https://typhoon.slt.zj.gov.cn （浙江省水利厅台风路径系统）
 *   - 列表： /Api/TyphoonList/{year}
 *   - 详情： /Api/TyphoonInfo/{tfid}
 * 该接口为公开数据，无需鉴权；请求需带 Referer。
 *
 * 输出： data/realtime.json （本站点的实时数据结构，供 GitHub Pages 静态读取）
 * 由 GitHub Actions 每 15 分钟调用一次；也可本地手动运行（node scripts/fetch-typhoon.js）。
 *
 * 设计原则：
 *   - 超时 / 网络异常时“不覆盖”已有文件，保留上一次成功结果，保证站点不空白。
 *   - 无活跃台风时输出 {active:false}，前端展示“当前无台风”，不编造数据。
 *   - 本脚本只搬运官方数据并做字段映射，不修改气象结论，防灾请以官方发布为准。
 */

const fs = require("fs");
const path = require("path");

const BASE = "https://typhoon.slt.zj.gov.cn";
const HEADERS = { "Referer": BASE + "/", "User-Agent": "Mozilla/5.0" };
const TIMEOUT_MS = 20000;
const SOURCE = "浙江省水利厅台风路径实时发布系统 (typhoon.slt.zj.gov.cn)";

// 沿海参考城市：用于估算“距某市约 X 公里（方位）”
const CITIES = [
  { name: "温州市", lat: 28.0, lng: 120.7 },
  { name: "台州市", lat: 28.7, lng: 121.4 },
  { name: "宁波市", lat: 29.9, lng: 121.6 },
  { name: "福州市", lat: 26.1, lng: 119.3 },
  { name: "厦门市", lat: 24.5, lng: 118.1 },
  { name: "上海市", lat: 31.2, lng: 121.5 },
  { name: "杭州市", lat: 30.3, lng: 120.2 },
  { name: "广州市", lat: 23.1, lng: 113.3 },
  { name: "湛江市", lat: 21.2, lng: 110.4 },
  { name: "海口市", lat: 20.0, lng: 110.3 }
];

// 官方预警级别映射（仅蓝/黄/橙/红纳入四级预警高亮；white 等不强行着色）
const WARNING_MAP = { blue: "blue", yellow: "yellow", orange: "orange", red: "red" };

function fetchJSON(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return fetch(url, { headers: HEADERS, signal: ctrl.signal })
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status + " @ " + url);
      // 上游有时以 text 返回 JSON，强制按 JSON 解析
      return r.json();
    })
    .finally(() => clearTimeout(timer));
}

function haversine(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

// 计算从 A 指向 B 的方位（中文八向）
function bearing(aLat, aLng, bLat, bLng) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(bLng - aLng)) * Math.cos(toRad(bLat));
  const x =
    Math.cos(toRad(aLat)) * Math.sin(toRad(bLat)) -
    Math.sin(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.cos(toRad(bLng - aLng));
  const deg = (toDeg(Math.atan2(y, x)) + 360) % 360;
  const dirs = ["正北", "东北", "正东", "东南", "正南", "西南", "正西", "西北"];
  return dirs[Math.round(deg / 45) % 8];
}

function nearestCity(lat, lng) {
  let best = null;
  for (const c of CITIES) {
    const d = haversine(lat, lng, c.lat, c.lng);
    if (!best || d < best.dist) best = { name: c.name, lat: c.lat, lng: c.lng, dist: d };
  }
  return best;
}

function num(v, def) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : def;
}

// 找到“中国”机构预报，其次取第一个机构的预报点
function pickForecast(lastPoint) {
  const fc = lastPoint.forecast || [];
  if (!fc.length) return [];
  const china = fc.find((f) => (f.tm || "") === "中国");
  const agency = china || fc[0];
  return (agency.forecastpoints || []).map((p) => ({
    t: p.time,
    lat: num(p.lat, 0),
    lon: num(p.lng, 0)
  }));
}

async function findActiveTfid() {
  const now = new Date();
  const years = [now.getUTCFullYear(), now.getUTCFullYear() - 1]; // 兼顾跨年台风
  const active = [];
  for (const y of years) {
    try {
      const list = await fetchJSON(`${BASE}/Api/TyphoonList/${y}`);
      for (const it of list || []) {
        if (String(it.isactive) === "1") active.push(String(it.tfid));
      }
    } catch (e) {
      console.warn(`[warn] 获取 ${y} 年列表失败：${e.message}`);
    }
  }
  return active;
}

function buildFromDetail(d) {
  const points = (d.points || []).slice().sort((a, b) =>
    (a.time || "").localeCompare(b.time || "")
  );
  if (!points.length) throw new Error("详情无轨迹点");

  const last = points[points.length - 1];
  const curLat = num(last.lat, 0);
  const curLng = num(last.lng, 0);
  const city = nearestCity(curLat, curLng);

  const tfid = String(d.tfid || "");
  const year = tfid.slice(0, 4);
  const no = parseInt(tfid.slice(4), 10) || 0;

  const warnRaw = String(d.warnlevel || "").toLowerCase();
  const warnLevel = WARNING_MAP[warnRaw] || null;
  let warnNote = "";
  if (warnLevel) {
    warnNote = "";
  } else if (warnRaw === "white" || warnRaw === "") {
    warnNote = "浙江省暂未发布台风预警信号（台风距我省较远）";
  } else {
    warnNote = `数据源预警级别：${warnRaw}`;
  }

  const r7 = num(last.radius7, null);
  const r10 = num(last.radius10, null);

  return {
    active: true,
    fetchedAt: new Date().toISOString(),
    meta: {
      number: `${year}年第${no}号`,
      name: d.name || "未命名",
      enName: d.enname || "",
      category: last.strong || "",
      isSample: false,
      updateTime: `${last.time}（浙江省水利厅）`,
      source: SOURCE
    },
    current: {
      lat: curLat,
      lon: curLng,
      near: `距${city.name}约 ${city.dist} 公里（${bearing(city.lat, city.lng, curLat, curLng)}）`,
      moveDir: String(last.movedirection || "—"),
      moveSpeed: num(last.movespeed, 0),
      maxWindLevel: num(last.power, null),
      maxWindSpeed: num(last.speed, null),
      pressure: num(last.pressure, null),
      radius7: r7,
      radius10: r10
    },
    warning: {
      level: warnLevel,
      issuedBy: "浙江省水利厅台风路径系统",
      issuedTime: last.time,
      note: warnNote
    },
    track: {
      past: points.map((p) => ({
        t: p.time,
        lat: num(p.lat, 0),
        lon: num(p.lng, 0)
      })),
      forecast: pickForecast(last)
    }
  };
}

async function main() {
  const outPath = path.join(__dirname, "..", "data", "realtime.json");

  const activeIds = await findActiveTfid();
  if (!activeIds.length) {
    const noData = {
      active: false,
      fetchedAt: new Date().toISOString(),
      message: "当前西北太平洋无活跃台风",
      source: SOURCE,
      isSample: false
    };
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(noData, null, 2) + "\n", "utf8");
    console.log("[ok] 无活跃台风，已写入空态数据。");
    return;
  }

  // 取第一个活跃台风（如需多台风可在此扩展）
  const tfid = activeIds[0];
  console.log(`[info] 活跃台风：${activeIds.join(", ")}，抓取 ${tfid}`);
  const detail = await fetchJSON(`${BASE}/Api/TyphoonInfo/${tfid}`);
  const out = buildFromDetail(detail);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(
    `[ok] 已写入 ${out.meta.number} ${out.meta.name}（${out.meta.category}），` +
      `风力 ${out.current.maxWindLevel} 级 / ${out.current.maxWindSpeed} m/s，` +
      `预警：${out.warning.level || out.warning.note || "无"}`
  );
}

main().catch((e) => {
  // 抓取失败时不要覆盖已有文件，保留上一次成功结果
  console.error("[error] 抓取失败，保留既有数据：", e.message);
  process.exit(0);
});
