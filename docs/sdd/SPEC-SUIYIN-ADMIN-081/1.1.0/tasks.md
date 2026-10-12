# Tasks — 扫街轨迹

> Spec: SPEC-SUIYIN-ADMIN-081@1.1.0
> Plan: plan.md
> Status: in-progress (authorized full delivery)

- [x] T001 房总「按这个做」批准方案，锁定依赖与static-html边界（R001–R009）。
- [x] T002 15租户导航/menu/allMenu登记，兼容旧覆盖（R001）。
- [x] T003 独立合成数据、日期过滤和分段模型（R002、R003、R006、R009）。
- [x] T004 人员列表/搜索/日期/分页与地图弹窗（R002–R004）。
- [x] T005 全部行程统一10秒内回放、重播及断轨显示（R005、R006）。
- [x] T006 空/单点/错误重试/权限隔离及生命周期取消（R007–R009）。
- [x] T007 验证全部13项AC、15租户及旧拉新页回归，保留实际证据（R001–R009）。
- [x] T008 Chrome预览已实现深圳扫街轨迹（R001–R009）。

2026-10-12已授权完整推送及王梓先工程建单；不改开发进度表。T001–T008记录1.0.0本地验证历史，1.1.0以以下新增任务为准。

- [x] T009 按当前8医美租户修订导航、数据和隔离，复验。
- [x] T010 更新PRD/流程图/设计规范、构建Admin单文件，验证。
- [x] T011 来源收敛、Handoff/Test Contract、真实Issue与远端SDD回链。
- [ ] T012 原型master/tag推送，远端包与部署检查。
- [ ] T013 SCRUM分别送达原型摘要与真实@王梓先工程安排，回读收据。

实际证据见 verification.md。Chrome预览：http://127.0.0.1:5218/prototype/_shell.html?tenant=yestar-sz&page=streetTrajectories 。

发布包冻结说明：T012/T013为推送后的远端与通知动作，实际收据将追加到Admin #486交付评论；包内不提前标记完成。最终静态报告为15组浏览器/1032导航断言与9组HTTP及file单文件检查。
