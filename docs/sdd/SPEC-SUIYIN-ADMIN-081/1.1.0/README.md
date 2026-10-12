# SPEC-SUIYIN-ADMIN-081@1.1.0 — 扫街轨迹交付

适用所有医美租户；当前Admin六艺星、画美西安、傲丽西安共8个验收环境。提出环境深圳艺星；提出人孤狼；王梓先（build996）实施[Admin #486](https://github.com/PetWebOrg/suiyin-admin/issues/486)，当前待实现。

- [SPEC](spec.md) · [Plan](plan.md) · [Tasks](tasks.md)
- [来源收敛](source-convergence.md) · [Issue Handoff](issue-handoff.md) · [Test Contract](test-contract.md)
- [原型验收记录](verification.md) · [导航/旧缓存检查](checks/nav-check.json)
- [浏览器最新报告](checks/evidence/2026-10-12T15-09-26-468Z/verification.json) · [单文件最新报告](checks/inline-evidence/2026-10-12T15-09-43-239Z/report.json)
- [人员列表](checks/list-preview.png) · [地图示意](checks/map-preview.png)
- [在线交互原型](https://suiyin-admin.pages.dev/prototype/_shell.html?tenant=yestar-sz&page=streetTrajectories)
- [离线单文件](https://github.com/xfang9528-glitch/suiyin-admin/blob/v2026-10-12-admin-street-trajectories/prototype/_shell_inline.html)

精确依赖：[APP080@1.0.2](https://github.com/xfang9528-glitch/suiyin-app-chat/blob/v2026-10-12-app-street-promoter/docs/sdd/SPEC-APP-080/1.0.2/spec.md)、[Admin068@1.0.0](../../SPEC-SUIYIN-ADMIN-068/1.0.0/spec.md)；[DR-099快照](DR-099-app-location-permission-required.md)保留APP责任分工。

所有有效行程共用一次不超过10秒预算，跨日/断轨不伪连。原型使用合成人员与本地SVG地图；正式查询服务/地图/鉴权与真实数据规模由工程核实并实现。原型验证不是生产验收，Test Contract生产证据均为planned。

本包冻结发布前的合同及静态证据；实际commit/tag、GitHub远端字节和部署/通知收据在工程Issue交付评论回链。不能仅凭本文件推断推送已经成功。

checks脚本保留本工作区执行路径及固定Git基线1788b8e4521cd4024f0a94cb6f4df8d057f9e179；外部环境复验需配置原型仓位置与Playwright，或按Test Contract独立实现。不要把本机路径当工程合同链接。
