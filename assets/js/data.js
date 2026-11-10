/* =========================================================
 * 数据层（示例 / 模拟数据）
 * ---------------------------------------------------------
 * 上线时请把 loadTyphoon() 替换为真实接口调用，例如：
 *   fetch('https://www.nmc.cn/rest/findTyphoon')
 * 字段结构保持不变即可，UI 与地图无需改动。
 * ========================================================= */

const TYPHOON = {
  meta: {
    number: "2026年第7号",
    name: "木兰",
    enName: "MULAN",
    category: "台风级",
    isSample: true,
    updateTime: "2026-11-10 08:00（示例）",
    source: "示例数据 · 实际请接入中央气象台 nmc.cn"
  },
  current: {
    lat: 18.5,            // 北纬
    lon: 113.2,           // 东经
    near: "距湛江市约 380 公里（东南方向）",
    moveDir: "西北",
    moveSpeed: 18,        // km/h
    maxWindLevel: 12,     // 级
    maxWindSpeed: 35,     // m/s
    pressure: 975,        // hPa
    radius7: 250,         // 7级风圈半径 km
    radius10: 80          // 10级风圈半径 km
  },
  warning: {
    level: "orange",      // blue | yellow | orange | red
    issuedBy: "中央气象台（示例）",
    issuedTime: "2026-11-10 06:00"
  },
  track: {
    // 已发生路径（实线）
    past: [
      { t: "11-08 08时", lat: 14.2, lon: 118.5 },
      { t: "11-09 08时", lat: 15.8, lon: 116.3 },
      { t: "11-10 08时", lat: 18.5, lon: 113.2 }
    ],
    // 预报路径（虚线）
    forecast: [
      { t: "11-11 08时", lat: 20.8, lon: 111.0 },
      { t: "11-12 08时", lat: 22.6, lon: 110.5 },
      { t: "11-13 08时", lat: 23.5, lon: 110.0 }
    ]
  }
};

/* 四级预警定义（中国气象预警信号体系） */
const WARNING_LEVELS = [
  {
    key: "blue", color: "#1e88e5", name: "蓝色预警", level: "IV级 · 一般",
    standard: "24小时内可能或已经受影响，平均风力达 6 级以上。",
    actions: ["关注台风动态与官方预警", "固定或收回阳台、窗外物品", "海上船只注意避风"]
  },
  {
    key: "yellow", color: "#f9a825", name: "黄色预警", level: "III级 · 较重",
    standard: "24小时内风力达 8 级以上。",
    actions: ["停止露天集体活动与高空作业", "渔船回港避风、加固渔排", "检查门窗、广告牌、临时搭建物"]
  },
  {
    key: "orange", color: "#fb8c00", name: "橙色预警", level: "II级 · 严重",
    standard: "12小时内风力达 10 级以上。",
    actions: ["中小学、幼儿园停课", "危房及海上作业人员转移", "切勿随意外出，远离海边、山体"]
  },
  {
    key: "red", color: "#e53935", name: "红色预警", level: "I级 · 特别严重",
    standard: "6小时内风力达 12 级以上。",
    actions: ["紧急撤离危险区域，听从政府安排", "全员避险，停止一切户外活动", "确保通讯畅通，准备应急物资"]
  }
];

/* 真实数据接入位（预留）：返回结构与上方 TYPHOON 一致即可 */
function loadTyphoon() {
  // 示例：return fetch(API).then(r => r.json());
  return Promise.resolve(TYPHOON);
}
