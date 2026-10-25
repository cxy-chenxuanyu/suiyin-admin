# 092@0.3.3 本轮发布前离线验证

2026-10-25 执行，**12 组检查全部通过，共 75,837 项断言 / 重复变异检查，0 失败**。机器可读清单、脚本和回执 SHA-256 见 [release-check-summary.json](release-check-summary.json)。模型的 18 个场景内含 445 项断言，未重复计数；抽屉的 74,959 项包括逐会话和逐字段变异，不能解释为同等数量的独立产品需求。

| 脚本 | 通过数 | 本轮回执 |
| --- | ---: | --- |
| `quality-daily-model-check.cjs` | 445 | [model-check.json](model-check.json) |
| `quality-daily-prompt-delete-check.cjs` | 60 | [prompt-delete-check.json](prompt-delete-check.json) |
| `quality-daily-menu-check.cjs` | 69 | [menu-check.json](menu-check.json) |
| `quality-daily-view-check.cjs` | 43 | [view-check.json](view-check.json) |
| `quality-daily-prompts-check.cjs` | 60 | [prompts-check.json](prompts-check.json) |
| `prompt-templates-check.cjs` | 45 | [prompt-templates-check.json](prompt-templates-check.json) |
| `prompt-navigation-check.cjs` | 28 | [prompt-navigation-check.json](prompt-navigation-check.json) |
| `shell-tab-restore-check.cjs` | 18 | [shell-tab-restore-check.json](shell-tab-restore-check.json) |
| `quality-real-renderer-check.cjs` | 47 | [real-renderer-check.json](real-renderer-check.json) |
| `quality-real-bundle-check.cjs` | 23 | [real-bundle-check.json](real-bundle-check.json) |
| `check-quality-chat-drawer.cjs` | 74,959 | [chat-drawer-check.json](chat-drawer-check.json) |
| `quality-public-demo-check.cjs` | 40 | [public-demo-check.json](public-demo-check.json) |

本轮以当前源文件运行，没有修改产品实现。旧检查所用的顶部工作号筛选和证据弹窗已经由用户批准移除或替换，因此新增 `quality-real-renderer-check.cjs` 使用当前七模块、模块内部搜索和 PC 聊天抽屉进行 JSDOM 交互验证。保留导入来源、引用隔离、未知分母、系统消息排除、转写折叠、原文与 AI 摘要分别展示、关闭恢复和只读边界断言。原来的外部旧版检查及旧回执均未覆盖。

真实数据仅在本机读取：4 份报告、3,466 个会话、20,113 条报告导入消息、30,861 条显示侧车消息。全部会话侧车通过来源及字段一致性校验；跨租户、渠道、日期、账号、原消息篡改和非法入口均拒绝。回执只含计数、固定检查标签、文件散列及来源字段分类，不含客户名称、原始 ID、消息正文或完整提示词。私有 bundle SHA-256：`68932b8f2f75703926bef20de63f30b4434435fedd4cb59e4ab762e47d5fa0e3`。

公开演示单独验证了：引擎为 `none`、`apiExecuted:false`、合成报告标记、七模块和同款聊天抽屉；远端默认只读取公共合成文件，loopback 默认优先私有数据且仅在 404 时回退。私有请求的 403 / 500 错误和显式 URL 失败不会被公共成功结果掩盖。合成抽屉不会请求私有侧车。此项使用内存 fetch stub，实际网络请求为零。

## 重复执行

在仓库根目录执行 PowerShell。`QUALITY_CHECK_OUTPUT_DIR` 指定本轮或新的验证目录，避免覆盖历史证据；`QUALITY_CHECK_SPEC` 只标识实际验证版本，不改变产品规则。

```powershell
$env:QUALITY_CHECK_OUTPUT_DIR = Join-Path (Get-Location) 'docs/verification/chat-quality-release-20261025'
$env:QUALITY_CHECK_SPEC = 'SPEC-SUIYIN-ADMIN-092@0.3.3'
node prototype/checks/quality-daily-model-check.cjs --write
$checks = @(
  'quality-daily-prompt-delete-check.cjs',
  'quality-daily-menu-check.cjs',
  'quality-daily-view-check.cjs',
  'quality-daily-prompts-check.cjs',
  'prompt-templates-check.cjs',
  'prompt-navigation-check.cjs',
  'shell-tab-restore-check.cjs',
  'quality-real-renderer-check.cjs',
  'quality-real-bundle-check.cjs',
  'check-quality-chat-drawer.cjs',
  'quality-public-demo-check.cjs'
)
foreach ($check in $checks) {
  node (Join-Path 'prototype/checks' $check)
  if ($LASTEXITCODE -ne 0) { throw "Check failed: $check" }
}
```

DOM 检查需要本机 `jsdom`；可通过 `QUALITY_JSDOM_ROOT` 指向安装目录，默认使用当前工作区已有依赖。真实 bundle 检查还需要已授权的本机采集目录，可用 `QUALITY_PRIVATE_INPUT_ROOT` 显式指定；其中包括 `FINAL-STATISTICS.json` 指向的规范消息、身份映射和分析前备份。抽屉检查需要仓库忽略目录中的真实 bundle 与显示侧车。它们不应随公开发布包分发；缺少私有输入时应如实报告未执行，不应生成通过回执。

## 验证范围

本轮未操作用户 Chrome、未调用任何模型 / API、未读写生产服务、未修改用户浏览器存储。以上是静态原型及隔离 VM / JSDOM 证据，不代替主线程的构建、发布产物检查、实际浏览器验收或远端部署验证，也不表示本地 DeepSeek 运行闭环或 04:00–08:00 调度已经完成。
