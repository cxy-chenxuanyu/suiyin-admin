---
plan_for: SPEC-SUIYIN-ADMIN-081
spec_version: 1.1.0
status: approved
artifact_class: static-html
exception_status: not-required
exception_approved_by: none
exception_approved_at: none
operational_profile: none
last_updated: 2026-10-12
---

# Prototype Plan — 扫街轨迹

2026-10-12房总「按这个做」批准SPEC及推荐交互。本计划将该方案映射到现有HTML，不新增业务规则。

## 1. Constitution Check

| 原则 | 结论 | 证据 / 例外理由 |
|---|---|---|
| 用户结果优先 | PASS | 选择人员和日期，10秒内看完行程 |
| 事实与推断分离 | PASS | Q001/Q002已批准；合成数据有标识 |
| 逻辑先于界面 | PASS | SPEC 9条规则、13项验收 |
| 状态完整 | PASS | 空/单点/错误/切换/关闭/权限已定义 |
| 平台与租户边界 | PASS | 仅Admin8医美租户，原权限与覆盖保留 |
| 真实能力承诺 | PASS | 本地地图示意与合成轨迹 |
| 运行类型与生产隔离 | PASS | 纯静态HTML/CSS/JS，无设备定位 |
| 精确依赖与证据闭环 | PASS | 080@1.0.2、068@1.0.0有效 |

## 2. Artifact Boundary

- **运行类型**：static-html。
- **为什么**：复用现有静态Shell，浏览器读取同源静态文件和合成样本，动画仅显示这些坐标；无真实业务服务。
- **有状态信号**：无。
- **例外**：not-required。
- **Operational Profile**：none。
- **生产边界**：不进入PetWebOrg Flutter / React / Go仓；不新增认证、服务端API、共享持久化、数据库或migration。
- **执行方式**：现有项目不迁移编排骨架；将导航数据与专用UI分配为互不重叠文件，由主代理整合、复核。

## 3. 复用地图

| 类型 | 复用对象 | 路径 / 组件 | 复用理由 | 需要调整 |
|---|---|---|---|---|
| HTML | 管理Shell | prototype/_shell.html、admin-navigation.js | 导航/页签/iframe一致 | 仅必要生命周期通知 |
| Token | 后台表格按钮 | admin-content.css | 与截图一致 | 新CSS限定页面作用域 |
| Component | 日期范围 | admin-filter-calendars.js | 已有日历交互 | 在页面及弹窗接入 |
| Component | 菜单有效树 | admin-menu-state.js | 原隐藏/排序/权限 | 新项迁移，保留原覆盖 |
| Mock | 专用模型 | data/street-trajectories.js | 独立人员/轨迹 | 合成地图坐标，不混入旧拉新样本 |

## 4. 文件与路由

| 文件 | 路由 / 页面 | 动作 | 对应规则 |
|---|---|---|---|
| prototype/data/navigation-snapshot.json | 8医美租户侧栏 | 新增streetTrajectories，拉新锚点之后 | R001 |
| prototype/data/content/8个医美租户.json | menu及专用页面metadata | 新增对应菜单行/路由；bzds含allMenu唯一平台行 | R001 |
| prototype/admin-menu-state.js | 旧本地菜单接续 | 如必要最小迁移，不清旧覆盖 | R001 |
| prototype/admin-street-trajectories.js/css | streetTrajectories | 人员列表、日期、地图弹窗、动画及状态 | R002–R009 |
| prototype/data/street-trajectories.js | 本地样本和筛选 | 隔离数据、合法日期/分段/时间轴 | R002、R003、R005–R009 |
| prototype/assets/street-trajectories/ | 本地地图资源（如需） | 可用内嵌SVG替代，无网络资源 | R004、R009 |
| prototype/admin-content.html/js | 内容加载 | 接入专用模块/样式和权限检查 | R001、R008、R009 |
| prototype/admin-navigation.js | 页签切换 | 如原机制未通知隐藏iframe，补作用域限定生命周期消息 | R008 |
| prototype-sdd/specs/081-admin-street-trajectories/checks/ | 本地验证 | 精简行为/视觉证据，工程Test Contract另行承接生产验收 | 全部AC |

## 5. 信息结构

页面标题和小型演示说明；日期范围/姓名搜索/查询；稳定三列表格及分页。每行蓝色「轨迹展示」。地图大弹窗顶部姓名、日期，主区为清晰本地城市路网，底部回放进度与当前记录时间、重播。关闭/Escape回列表。

## 6. 交互实现

| 触发 | 默认态 | 进行中 | 成功 | 失败 | 取消 / 重试 | 规则 |
|---|---|---|---|---|---|---|
| 进入 | 今天、全部人员 | 读取本地样本 | 表格 | 错误卡 | 重试 | R002、R009 |
| 日期查询 | 草稿 | 校验 | 生效日期 | 行内错误 | 日历取消不应用 | R003 |
| 轨迹展示 | 指定人员 | 清旧结果、加载 | 自动播一次 | 独立错误 | 重新读取 | R004、R007 |
| 动画 | 全部有效片段 | RAF按单一经过时间推进 | 完整路线 | 数据错误不伪连 | 重播重新计时 | R005、R006 |
| 切换/关闭 | 当前上下文 | 取消RAF/计时回调 | 新上下文/列表 | 不显示旧数据 | 重开重查 | R008 |

## 7. Mock 方案

8医美租户独立合成人员，双键tenant/person；至少包含无点、单点、同名不同ID、多日和明确断段。按北京时间今天固定种子生成365日记录，选取任意范围只返回已有样本；无效数据、读取失败和无权通过仅QA参数模拟。地图为本地SVG城市示意，有道路、街区、绿地和少量地名，路线与道路几何吻合。坐标为示意坐标，禁止冒充真实GPS。

回放使用不超过10000ms的统一时间预算，目标9500ms，为下一绘制帧留出余量；所有片段按时间排序并以片段内有效时间分配预算，段间空档跳过。帧率变化不累计逐点延迟，最终完整绘制所有片段。断段和单点不相连。

## 8. 验证计划

| 验收 ID | 操作路径 | 预期 | 视觉检查 |
|---|---|---|---|
| AC-R001-01/02 | 8医美租户新入口/menu/allMenu，旧覆盖隐藏恢复 | 唯一、正确位置、配置保留 | 首租户及不同拉新路由 |
| AC-R002-01 | 同名人员、搜索、分页 | 按ID正确对应 | 姓名列和操作对齐 |
| AC-R003-01/02 | 1/7/30/365日，反向、取消 | 整日范围，草稿不混结果 | 日历浮层 |
| AC-R004-01 | 点第一人 | 自动播、全程适配 | 路网/移动标记/起终点 |
| AC-R005-01/02 | 实际时钟及可控时钟，多范围/高密度 | 全部片段完成，<=10秒 | 完成线条与终点 |
| AC-R006-01 | 跨日/断段 | 无伪连 | 地图分段 |
| AC-R007-01/02 | 无点/单点/坏点/错误重试 | 明确区分 | 空错态布局 |
| AC-R008-01 | 播放中换范围/关闭/切页签/切租户 | 旧任务取消 | 回列表焦点 |
| AC-R009-01 | 非适用/未知/无权、网络检查 | 隔离及无定位网络调用 | 演示标识 |

## 9. 风险与回退

菜单新增保留原revision的基线，并验证已有隐藏/排序不被重置；专用模块只处理streetTrajectories，旧newAddedRecords/salesStatsReferral内容原样保留。改动前仓干净。回退只撤销本次明确文件改动；不批量清理其他工作。

## 10. 预览计划

复用或启动仓内serve.js的本地静态服务。Google Chrome打开 `http://127.0.0.1:<port>/prototype/_shell.html?tenant=yestar-sz&page=streetTrajectories`，验证后保留人员列表，便于用户自行点开动画。生成列表/地图中途/完成截图作为本地证据。2026-10-12已授权完整推送；构建Admin单文件、同步文档/版本化SDD、推送原型master和tag、验证远端，并创建生产工程Issue。

## 11. 1.1.0 范围与交付修订

六艺星保留拉新记录后入口；huamei-xian/aoli-xian补数据展示父级及本页；其余9租户撤销未发布的新功能，bzds仅保留allMenu平台定义。正式能力按医美行业登记而非原型8ID白名单。原型发布与生产Issue为独立交付层，生产代码不在本工作区改动。
