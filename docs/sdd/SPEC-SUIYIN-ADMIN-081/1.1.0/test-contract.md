---
test_contract_id: TEST-CONTRACT-SUIYIN-ADMIN-081
spec_id: SPEC-SUIYIN-ADMIN-081
spec_version: 1.1.0
status: approved
prepared_by: Codex
prepared_at: 2026-10-12
---

# 扫街轨迹 — Test Contract

## 1. 测试摘要

源规格SPEC-SUIYIN-ADMIN-081@1.1.0，Handoff HANDOFF-SUIYIN-ADMIN-081。以下为生产验收计划；路径为建议，由正式工程工作区选框架。现有静态HTML证据见verification.md，不代表生产完成。

## 2. Coverage Matrix

| Test ID | Slice ID | Rule | Acceptance | Layer | Automation | Target Repo | Planned Test Path | Oracle | CI Evidence | Manual Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| T-R001-01 | I001 | R001 | AC-R001-01 | parameterized | automated | PetWebOrg/suiyin-admin | tests/admin/street-trajectories/T-R001-01.test | 所有医美按行业登记开放；当前8样本正确位置且唯一；非医美9无业务入口，平台定义不授予访问 | planned | — |
| T-R001-02 | I001 | R001 | AC-R001-02 | security | automated | PetWebOrg/suiyin-admin | tests/admin/street-trajectories/T-R001-02.test | 原排序/隐藏/父级约束保留；隐藏后直达拒绝；租户间配置互不影响 | planned | — |
| T-R002-01 | I001 | R002 | AC-R002-01 | integration | automated | PetWebOrg/suiyin-admin | tests/admin/street-trajectories/T-R002-01.test | 同名不同ID查询各自轨迹，搜索分页与逐行操作正确；无轨迹人员仍保留 | planned | — |
| T-R003-01 | I001 | R003 | AC-R003-01 | contract | automated | PetWebOrg/suiyin-admin | tests/admin/street-trajectories/T-R003-01.test | 1/7/30/365日及更长按北京时间整日过滤；草稿不改结果；查询后页面/弹窗范围一致 | planned | — |
| T-R003-02 | I001 | R003 | AC-R003-02 | e2e | automated | PetWebOrg/suiyin-admin | tests/admin/street-trajectories/T-R003-02.test | 缺失/反向日期不可提交；取消恢复生效范围；不新起动画或误标旧结果 | planned | — |
| T-R004-01 | I001 | R004 | AC-R004-01 | e2e | automated | PetWebOrg/suiyin-admin | tests/admin/street-trajectories/T-R004-01.test | 打开自动一次回放，地图容纳全部点，移动标记/绘线/时间/进度一致 | planned | — |
| T-R005-01 | I001 | R005 | AC-R005-01 | integration | automated | PetWebOrg/suiyin-admin | tests/admin/street-trajectories/T-R005-01.test | 前台无中断实际时间<=10000ms；全部有效段和点参与最终线条；单日/7/30/365日/高密度/更长范围分别测量，不能靠丢点通过 | planned | — |
| T-R005-02 | I001 | R005 | AC-R005-02 | e2e | automated | PetWebOrg/suiyin-admin | tests/admin/street-trajectories/T-R005-02.test | 完成保留且不循环；重播首点重计时；失焦后以真实经过时间恢复终态，无定时器积压 | planned | — |
| T-R006-01 | I001 | R006 | AC-R006-01 | unit | automated | PetWebOrg/suiyin-admin | tests/admin/street-trajectories/T-R006-01.test | 按时间有序；跨日/显式断段/无效点两侧无伪连接；边界标记跳到下一段起点 | planned | — |
| T-R007-01 | I001 | R007 | AC-R007-01 | e2e | automated | PetWebOrg/suiyin-admin | tests/admin/street-trajectories/T-R007-01.test | 零点空态禁用重播；单点位置和时间；多个独立单点不画移动路线 | planned | — |
| T-R007-02 | I001 | R007 | AC-R007-02 | integration | automated | PetWebOrg/suiyin-admin | tests/admin/street-trajectories/T-R007-02.test | 加载、读取/地图失败、部分坏点与全部无效分别呈现；重试恢复且旧线不复活 | planned | — |
| T-R008-01 | I001 | R008 | AC-R008-01 | integration | automated | PetWebOrg/suiyin-admin | tests/admin/street-trajectories/T-R008-01.test | 关闭/切人/切范围/租户/页签撤销旧动画与回调；延迟响应不能覆盖新上下文 | planned | — |
| T-R009-01 | I001 | R009 | AC-R009-01 | security | automated | PetWebOrg/suiyin-admin | tests/admin/street-trajectories/T-R009-01.test | 正式接口按租户/人员及权限鉴权；未知/无权不回退默认数据；原型无真实定位/上传/外网请求并标演示 | planned | — |
| T-R004-02 | I001 | R004 | AC-R004-01 | visual | manual | PetWebOrg/suiyin-admin | docs/verification/street-trajectories/visual.md | 深圳及西安宽/窄窗口地图和弹窗可读可关闭，移动标记沿当前段运动，多日线条和起终点清楚 | planned | 视觉连续性与压缩行程辨识度不能由DOM断言替代；人工录屏并逐状态留截图、视口和判定 |

## 3. Test Data & Profiles

- 当前8医美原型样本加9非医美否定样本；正式测试补新增医美租户，证明不是8ID白名单。
- 同名不同ID、不同租户同名、无轨迹人员、单点、多段单点、跨午夜/断段/坏点、乱序时间、真实服务拒绝访问/延迟/失败。
- 单日、7/30/365日及超一年/高密度：从接口完整结果记录有效段点集合；以真实前台时钟测量一次总动画预算，最终几何集合相等且最后标记正确。CPU/渲染延迟应计入演示测量，不只检测常量9500。
- 用合成轨迹/授权测试账号，不公开真实人员位置。正式接口身份及数据范围不能只靠前端参数。

## 4. CI Gates 与 Evidence

每个自动化Test ID保留CI链接与报告；人工项保留录像/截图和判断理由。生产全部项目目前planned；王梓先在PR阶段提供证据。没有完整真实数据源和地图集成不得将Issue关闭为已实现；依赖缺失在Issue显式阻塞，不拿mock替代。

## 5. Change Control

SPEC变化后合同stale；不得靠降低Oracle让测试通过。生产实施只在独立正式工作区。
