# 好友申请时间展示与范围筛选 1.0.0

当前有效版本：1.0.0，状态accepted，2026-11-23。用户批准设计与开发，不代表代码/生产已交付。

- [正式SPEC](spec.md) · [实施与历史数据计划](plan.md)
- [普通/艺星交互演示](../../../../prototype/friend_request_time.html)
- [现有普通列表](../../../../prototype/_shell.html?tenant=bzds&page=customerManagement)
- [现有艺星列表](../../../../prototype/_shell.html?tenant=yestar-sz&page=yxCustomerList)

主页面保留原样本，新增时间全部未知；独立交互切片使用纯合成数据，演示正常、失败、空值、多账号和日期边界，不连接业务接口、不冒充真实客户事实。

当前发布补充已包含真实导出接口5000每页/50000深度的兼容说明，见正式SPEC末节；状态仍accepted，原批准范围与生产写入边界保持。
