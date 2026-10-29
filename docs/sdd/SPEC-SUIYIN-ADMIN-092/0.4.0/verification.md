# 候选资料校验记录（2026-10-29）

责任：陈宣宇 / Codex，SPEC-092@0.4.0源资料提交任务。

- 原型四输入与已确认本机副本逐字节一致，SHA-256见`source-hashes.json`。Plan只调整授权状态、来源链接、实施基线与公开资料脱敏；完整六条AC未变。API合同来自同次工程细化，已核对无范围或交互变化。
- Node 20.12.2：`node --check quality-daily-demo-data.js`、`node --check quality-daily-metrics.js`、`node --check quality-daily-ui.js`通过。
- 在此目录运行`node prototype-check.cjs`通过：48合成会话、172回复事件、964分钟；两分母33.3%/50%、零分母空值、红线明确认定、未知保留、数值count/sum/avg/min/max、稳定枚举ID及七生成状态。第一次在仓根执行时因相对输入路径报ENOENT；修正工作目录后执行的是此候选副本，未修改用例绕过失败。
- 对`prototype.html`的四段内联脚本用`vm.Script`解析通过；独立存储适配在隔离Map存储中验证保存、恢复及存储失败传播。它只补足原宿主widgetState能力，不接真实API。
- `git diff --check`通过。相对链接和公开内容检查只覆盖本次文件；未包含真实客户原文、附件、联系方式、凭证或本机路径。旧0.3.3目录没有修改。
- 新导出包装的浏览器冒烟未完成：本次Computer Use返回“Local browser use is disabled in Work settings”。不绕过权限，不把脚本检查当成浏览器验收；保留此项待实际浏览器验证。原合成原型已完成的交互评审仅覆盖相同四文件输入，不能推导工程页面、接口、数据库、权限、计费或夜间容量通过。

本资料PR不执行生产操作、正式审批或部署。六条工程AC及真实环境验证由Go #5055 / Admin #606承担。
