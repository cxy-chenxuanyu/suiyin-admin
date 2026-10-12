---
handoff_id: HANDOFF-SUIYIN-ADMIN-081
spec_id: SPEC-SUIYIN-ADMIN-081
spec_version: 1.1.0
status: issued
prepared_by: Codex
prepared_at: 2026-10-12
actual_issue_creation: true
---

# 扫街轨迹 — Issue Handoff

## 1. 交接摘要

管理者无法从拉新记录直接查看扫街人员走过的地点与先后。完成后可选择人员和日期，在地图上10秒内看完全部有效行程。源合同为[SPEC-SUIYIN-ADMIN-081@1.1.0](https://github.com/xfang9528-glitch/suiyin-admin/blob/v2026-10-12-admin-street-trajectories/docs/sdd/SPEC-SUIYIN-ADMIN-081/1.1.0/spec.md)，Constitution为prototype-sdd@1.4.1。

提出环境：深圳艺星；提出人（群内昵称）：孤狼。用户已确认谢东华在该来源群使用此昵称。适用所有医美租户；原型8个ID仅作验收样本。负责人王梓先（build996）。

## 2. Source Contract

唯一行为真源为spec.md，Issue只承接切片，不另定规则。080@1.0.2提供扫街人角色语义；068@1.0.0提供菜单有效树和覆盖优先级。生产在正式工作区走独立worktree、Phase 1→2→3、PR和房总review，本原型工作区不改生产代码。

## 3. Issue Slices

| Slice ID | Issue Title | Target Repo | Tenant | Platform | Reporter | Rules | Acceptance | Test IDs | User Problem | User Outcome | Issue Ref | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| I001 | feat(admin): 医美租户扫街人员轨迹查询及全程十秒回放（管理者可以按日期在10秒内看完一个人的全部扫街行程） | PetWebOrg/suiyin-admin | 深圳艺星 | PC | 孤狼 | R001、R002、R003、R004、R005、R006、R007、R008、R009 | AC-R001-01、AC-R001-02、AC-R002-01、AC-R003-01、AC-R003-02、AC-R004-01、AC-R005-01、AC-R005-02、AC-R006-01、AC-R007-01、AC-R007-02、AC-R008-01、AC-R009-01 | T-R001-01、T-R001-02、T-R002-01、T-R003-01、T-R003-02、T-R004-01、T-R005-01、T-R005-02、T-R006-01、T-R007-01、T-R007-02、T-R008-01、T-R009-01、T-R004-02 | 管理者无法查看人员在指定日期的行程 | 选择人员和日期后10秒内看完全部有效扫街路线 | https://github.com/PetWebOrg/suiyin-admin/issues/486 | created |

## 4. I001 工程切片

- 医美行业能力判定、导航/menu/allMenu、扫街角色人员列表、姓名搜索和分页；保留原权限、隐藏与局部排序。
- 有拉新记录的医美环境默认紧随其后；无旧入口时增加必要数据展示父级和扫街轨迹，不制造拉新业务页。
- 按tenantId/personId查询；日期为Asia/Shanghai闭开整日区间，不限制用户可选跨度。真实结果全部纳入同一不超过10000ms回放预算，不能采样丢掉行程或每段各播10秒。
- 地图适配全程、逐步绘线和移动标记、时间/进度、完成保留与重播；跨日、断轨和坏点不伪连。
- 空、单点、读取/地图失败、无权、全部坏点和部分坏点分别反馈。切人、租户、日期、页签和关闭使旧请求/动画失效。
- R009的静态无外部请求/无定位约束适用于本次HTML原型；正式Admin需在工程环境按实际授权接入地图及轨迹查询服务，不能把mock、QA开关、8ID名单或浏览器菜单隐藏当成正式鉴权。
- Phase 1先核实真实人员角色来源、医美行业登记、轨迹查询/分段接口、权限与可用数据量、地图供应方式。若依赖缺失，在本Issue记录负责人/关联任务和阻塞，完整能力待依赖落实后验收；不得以接入演示数据关闭本单。
- 本单不恢复APP已撤销的位置上报设计，不新增采集频率、后台定位、考勤、效率排名或权限弹窗。APP #8116是独立二维码任务，不是Admin地图已实现的证据。跨仓依赖须按独立正式流程承接。

## 5. 验收与证据

全部13项AC与14个测试见test-contract.md；自动化报告须保留Test ID/AC-ID。prototype verification仅证明静态交互，不能将生产测试标为verified。工程Issue发布前必须具备真实地图/服务集成和全部MUST验收证据。

## 6. Change Control

SPEC升版立即使本合同stale。规则变化先回源审核；生产完成状态由工程PR/CI/人工证据决定。
