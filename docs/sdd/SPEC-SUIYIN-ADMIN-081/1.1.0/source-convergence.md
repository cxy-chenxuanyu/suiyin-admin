---
ledger_id: CONVERGENCE-SUIYIN-ADMIN-081
spec_id: SPEC-SUIYIN-ADMIN-081
spec_version: 1.1.0
status: verified
prepared_by: Codex
prepared_at: 2026-10-12
---

# 扫街轨迹 — Source Convergence Ledger

## 1. 收敛摘要

本轮明确完整推送，081@1.1.0为当前唯一扫街轨迹行为合同。用户将1.0.0推荐的15租户范围改为所有医美租户，当前8医美验收。源码、导航、设计入口、PRD与工程合同共同采用该范围；旧的本地15租户报告只保留作历史。

## 2. Source Ledger

| Source ID | Old Source | Conflict / Superseded Rule | Resolution | Evidence | Remaining |
|---|---|---|---|---|---|
| S001 | 081 spec.md §1/§3/§4/§6/§9/§12、plan.md | 15个有拉新入口的租户，排除两西安 | updated | 同文件已改所有医美、当前8及西安必要父级；§14保存范围变更历史 | none |
| S002 | prototype导航/普通菜单/平台定义/演示模型 | 15租户扫街业务入口和模型 | updated | checks/nav-check.json与浏览器8医美/9非医美隔离验证；allMenu定义不产生非医美权限 | none |
| S003 | README.md、CLAUDE.md、docs/design-spec.md、prd/admin-live-reference.md、flowcharts/admin-live-reference.md | 当前814入口/90路由；没有扫街说明 | updated | 当前口径822入口/91路由，新增8仅属原型扩展，实站783队列/741已采/42隐藏不变；见delivery/source-search.txt | none |
| S004 | SPEC-APP-080@1.0.2及DR-099的原APP范围 | 原任务不做Admin地图；前端定位/上报已撤销 | intentional-history | APP历史合同的排除只约束APP任务；081明确独立Admin展示与工程依赖，不恢复APP上报设计；见issue-handoff.md | none |
| S005 | SPEC-SUIYIN-ADMIN-068@1.0.0 | 平台默认/租户局部排序和隐藏优先级可能被硬插新项覆盖 | updated | 新route通过同一有效树登记，仅默认未改位置使用拉新锚点；原隐藏/祖先约束及显式排序经缓存回归保留 | none |
| S006 | checks/evidence/2026-10-12T13-51-53-583Z、tasks.md T001–T008 | 1.0.0旧15租户本地检查 | intentional-history | verification.md以1.1.0最新结果为主，旧目录只存历史；tasks明确T009之后为新版交付 | none |

## 3. Search Proof

| Search ID | Pattern / Old Term | Scope | Command / Method | Result | Evidence |
|---|---|---|---|---|---|
| Q001 | 15租户/两西安不新增/未授权完整推送 | 当前SPEC、Plan、Tasks、verification | rg按文件搜索并区分§14与历史任务 | 当前规则为所有医美；15只剩显式旧建议/来源事实/历史检查 | delivery/source-search.txt |
| Q002 | 814/90路由/90种路由/90 种路由 | 当前README、CLAUDE、设计规范、总PRD及总流程 | rg搜索当前5份入口 | 当前数量已替换；8148预览端口与808/90历史基线非当前库存 | delivery/source-search.txt |
| Q003 | streetTrajectories | 导航、content、模型、有效树 | nav-check动态遍历逐tenant核对，浏览器直达负例 | 8医美唯一入口，9非医美无业务权限，平台唯一登记 | checks/nav-check.json |
| Q004 | Admin地图/位置上报/DR-099 | 081、APP080、工程Issue合同 | 本轮逐项对比范围；工程单不定义APP采集频率 | 0 active conflicts；APP原范围排除保留历史，真实轨迹服务仍须工程核实 | issue-handoff.md；test-contract.md |

## 4. Verification Gate

- [x] 当前SPEC为1.1.0，最新完整推送指令直接批准范围。
- [x] §4.1每个冲突来源均有处置，旧合同不追溯改写。
- [x] 每行Resolution合法且Remaining为none。
- [x] 搜索区分历史版本与当前实现，不只追加说明。
- [x] validate-source-convergence.mjs检查通过。

**结论**：verified
**审核人**：Codex（按用户直接授权核对）
**审核日期**：2026-10-12

## 5. Change Control

当前SPEC升版即stale，新增冲突须补入后复验。当前包证明原型范围收敛，不代表生产实现完成。
