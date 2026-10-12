# 扫街轨迹本地验收

- 当前 SPEC：**SPEC-SUIYIN-ADMIN-081@1.1.0**。2026-10-12 房总明确修订为所有医美租户，并授权完整推送及工程建单。
- 当前原型验收集合：`yestar-sz`、`yestar`、`yestar-bj`、`yestar-gz`、`yestar-hz`、`yestar-jx`、`huamei-xian`、`aoli-xian`，共 8 个医美租户；不是生产永久白名单。
- 排除 9 个非医美租户：`bzds`、`jbfs`、`mengzhua`、`crrm`、`hqjd`、`ykjl`、`ruixi-kh-xiaowen`、`rxxz`、`yzhb`。德三 `allMenu` 只保留唯一平台目录定义，不授予本业务入口。
- 当前预览：`http://127.0.0.1:5218/prototype/_shell.html?tenant=yestar-sz&page=streetTrajectories`。

## 1.1.0 实际结果

浏览器最终报告：[15 组 PASS / 0 FAIL](checks/evidence/2026-10-12T15-09-26-468Z/verification.json)。运行使用隔离 Google Chrome、随机本地端口及独立上下文，不读取用户浏览器资料；所有网络请求受同源检查。

| 验证 | 结果 | 证据 |
|---|---|---|
| 导航、旧缓存、隐藏、排序、隔离与行业范围 | 1032 断言 PASS；8 适用 / 9 排除 | [nav-check.json](checks/nav-check.json) |
| 8 租户真实 Shell / menu，平台 allMenu | 各租户入口与菜单仅登记一次；六艺星位于拉新记录后，两西安在新增数据展示父级中 | 浏览器报告中的静态矩阵、实际 Shell 两组 |
| 西安旧缓存迁移 | 两租户均从真实 `2026-09-30-admin076-pending-capture-v1-public-demo-identities-v1` 基线与旧 enabled 列表迁移成功；原本机名称及扩展字段保留 | 浏览器报告中的西安旧缓存组 |
| 西安父级隐藏 | `dataDisplay` 隐藏后，扫街轨迹不显示且内容直达拒绝；恢复默认后可访问 | 同上 |
| 9 非医美租户 | 模型查询拒绝、导航无入口、内容直达无人员或轨迹；平台目录不能放开能力 | 浏览器报告中的数据、导航、访问隔离组 |
| 9 非医美旧缓存退役 | v1 / v2 共 18 个实际浏览器缓存场景全部通过；仅移除未发布轨迹行，原本机名称、extra、config 保留，侧栏与内容直达均拒绝 | 浏览器报告中的未发布缓存退役组 |
| 单日真实时钟 | DOM 完成观测 **9505.70ms**；RAF elapsed **9504.30ms**；完整 2 段 / 15 点及终点一致 | 单日真实时钟组 |
| 7 日回放 | 控制浏览器时钟，完整 14 段 / 107 点，完成时刻 9728ms | 多日期范围组 |
| 30 日回放 | 控制浏览器时钟，完整 60 段 / 460 点，完成时刻 9728ms | 同上 |
| 365 日回放 | 控制浏览器时钟，完整 730 段 / 5596 点，完成时刻 9728ms | 同上 |
| 日历与筛选 | 地图日历可操作；Escape 先取消日历；未提交草稿不改结果；非法范围阻断；关闭后列表日历重新可用 | 日历、日期草稿两组 |
| 人员与中断 | 姓名搜索、分页、同名不同 ID、关闭、换范围、换人、切页签及跨租户通过 | 人员列表、中断、隔离组 |
| 数据与异常 | 无点、单点、范围外空态、读取失败与重试、部分坏点断段、全部无效、无权、高密度均通过 | 数据合同、空态、错误组 |
| 回放完整性 | 每条 SVG 路径逐点对照源结果；每段独立、不跨日或跨断点伪连；结束标记位于最后有效点；重播不循环 | 完整路径比较与重播组 |
| 网络与权限调用 | 外网请求 0、真实定位调用 0、浏览器脚本错误 0 | 浏览器报告末组与报告数组 |
| 公开数据检查 | 17 租户 / 785 页面 / 11356 行；2456 identity cells / 36 secrets；0 failures | nav-check.json 的 publicDataAudit |

动画名义时长 9500ms，全部所选片段共享同一时间轴。单日结果来自真实浏览器时钟及 DOM 状态观测；7 / 30 / 365 日使用 Playwright 可控时钟验证中间态、时间预算和全部路径/点/终点。可控时钟测试不代表未知规模真实设备全年轨迹的性能已得到验证。

## 截图与重现

- [人员列表](checks/evidence/2026-10-12T15-09-26-468Z/01-list.png)
- [动态回放](checks/evidence/2026-10-12T15-09-26-468Z/02-map-playing.png)
- [完成后的全程](checks/evidence/2026-10-12T15-09-26-468Z/03-map-completed.png)
- [多日中间态](checks/evidence/2026-10-12T15-09-26-468Z/04-multiday-playing.png)
- [365 日完成态](checks/evidence/2026-10-12T15-09-26-468Z/05-year-completed.png)
- [地图日期日历](checks/evidence/2026-10-12T15-09-26-468Z/06-map-calendar.png)
- [无记录](checks/evidence/2026-10-12T15-09-26-468Z/empty.png) / [单点](checks/evidence/2026-10-12T15-09-26-468Z/single-point.png)

在当前工作区运行 `node prototype-sdd/specs/081-admin-street-trajectories/checks/verify-browser.cjs` 可重现浏览器验收；脚本自行启动和关闭临时本地静态服务、隔离 Chrome，结果保存在带执行时间的 `checks/evidence/` 目录。

所有地图和轨迹均为本地合成示意，本文件证明本地静态原型的已验行为。远端分支/tag、版本化合同、真实 Issue 与通知的完成状态，以各交付回读记录为准；不把原型验收当作定位采集链路或生产实现验收。

## 1.0.0 历史证据

[2026-10-12T13-51-53-583Z/verification.json](checks/evidence/2026-10-12T13-51-53-583Z/verification.json) 是此前 15 租户建议范围的 13 组通过记录，保留作历史。其 15 适用 / 2 排除的范围已被 1.1.0 的明确医美范围替代，不能用作当前租户验收结论。此前的实钟 9508.20ms 也是历史观测；当前以本文件上方 1.1.0 的新报告为准。

## 单文件最终验收

HTTP与file://共9组PASS / 0 FAIL，最终报告checks/inline-evidence/2026-10-12T15-09-43-239Z/report.json。最终单文件SHA256：bb50d43c6a3e1c9749a4bdc73edd7e23f06e28fb5f2590f47017eaee2002d624；16,289,854 bytes。两种入口均9515ms可控时钟完成；外网/额外资源/真实定位/脚本错误为0。
