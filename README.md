# 台风实况信息展示网站

面向**沿海居民**的台风实况信息网站：实时、易读、带分级预警，帮助普通人快速了解"台风叫什么、在哪、往哪走、风多大、要不要防范"。

## 在线访问

- **GitHub Pages 已上线**：https://hhiq.github.io/typhoon-realtime/
- 数据来源：**浙江省水利厅台风路径实时发布系统**（公开数据，无需鉴权）

## 核心信息字段

1. 台风名称 / 编号
2. 当前位置（经纬度、距沿海参照城市的方位与距离）
3. 移动路径与方向（历史实线 + 预报虚线 + 移速）
4. 风力强度（最大风力、风速、气压、风圈半径）
5. 分级预警（蓝 / 黄 / 橙 / 红）

## 数据源与自动更新

- **数据源**：`https://typhoon.slt.zj.gov.cn`（浙江省水利厅台风路径系统）
  - 列表：`/Api/TyphoonList/{year}`
  - 详情：`/Api/TyphoonInfo/{tfid}`
- **抓取脚本**：`scripts/fetch-typhoon.js` —— 筛选活跃台风，映射为本站结构，输出 `data/realtime.json`。
- **自动更新**：GitHub Actions（`.github/workflows/fetch-typhoon.yml`）每 **15 分钟**运行一次并commit最新数据，GitHub Pages 随之刷新。
- **前端读取**：`assets/js/data.js` 的 `loadTyphoon()` 优先读取 `data/realtime.json`（no-store），抓取/网络异常时回退到内置演示数据（此时页面会显示"演示数据"标注）。

> 说明：本仓库已提交的 `data/realtime.json` 是一份真实数据快照；接入自动抓取 Action 后会被每 15 分钟刷新。

## 技术栈

- 纯静态 HTML + CSS + 原生 JS（零构建、易部署，GitHub Pages 直接托管）
- 地图：Leaflet（CDN，在线加载）；加载失败时自动降级为离线 SVG 示意地图
- 预警信号：蓝 / 黄 / 橙 / 红四级（当浙江发布对应预警时横幅自动着色；距我省较远未发预警时显示中性提示）

## 目录结构

```
typhoon/
├── index.html                      # 页面结构（移动端优先）
├── assets/
│   ├── css/style.css               # 样式与四级预警配色
│   └── js/
│       ├── data.js                 # 数据接入(loadTyphoon) + 四级预警定义
│       ├── map.js                  # Leaflet 地图 / SVG 降级
│       └── app.js                  # UI 渲染与预警联动(含无台风态)
├── scripts/
│   └── fetch-typhoon.js            # 浙江台风数据抓取脚本(生成 data/realtime.json)
├── data/
│   └── realtime.json               # 自动生成/提交的实时数据
├── .github/workflows/
│   └── fetch-typhoon.yml           # 每15分钟抓取 Action
├── docs/计划书.md                   # 项目计划书
└── README.md
```

## 本地运行

```bash
# 启动本地服务
python3 -m http.server 8099
# 浏览器打开 http://127.0.0.1:8099
```

手动抓取一次真实数据（需联网）：

```bash
node scripts/fetch-typhoon.js
```

## 说明

本网站展示的气象数据均以来源官方发布为准，仅为便民信息聚合与可视化，不作为应急决策唯一依据。防灾避险请务必以中央气象台、浙江省气象台等官方预警为准。
