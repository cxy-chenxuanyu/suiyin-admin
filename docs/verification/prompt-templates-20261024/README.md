# Prompt 管理与模型目录验证（0.3.0，进行中）

合同：SPEC-SUIYIN-ADMIN-092@0.3.0。日期：2026-10-24。本文记录本地原型分工的证据，不表示生产上线或最终整体验收。

## 实现范围

- `prototype/admin-prompt-templates.js/.css`：同一六列表格，保留原租户模板、局部创建／编辑／删除及深圳日报扩展。完整正文与分组子正文通过文本控件原样显示，不执行其业务指令或HTML。
- 场景切换更新正文标题、填写标签、定时启动说明、模型候选和分组区域。标签场景无现存子提示词时仍按已采schema显示“添加分组”。切出适用场景隐藏分组且保留草稿，切回恢复验证。
- 标签使用可搜索多选下拉。已采确认零选项与尚未采集分别展示。分组在列表名称下显示摘要，编辑器默认折叠现有组，新组展开；主正文／子正文独立保留。
- 分页始终显示20条/页、左右箭头及页码。未采且列表未完成、没有来源记录时显示“总条数待采集”；已采确认空列表显示“共 0 条”，避免把访问失败解释为无模板。不存在模板、部分采样、访问待核验均按各租户来源状态展示。
- `prototype/admin-quality-models.js/.css`：所有租户从同一私有JSON读取各自模型目录，六列只读；候选过滤与Prompt页共用模型目录。采样日期使用当前私有租户快照`capturedAt`，按上海日期显示，不再沿用旧页面fixture的日期或说明按钮；未采及日期缺失明确显示未知。深圳日报合成候选单独标识，其他租户不出现该演示目录。
- `navigation-snapshot.json`、四份content菜单及`admin-menu-state.js`：新增`huamei-xian`、`aoli-xian`、`jbfs`、`hqjd`的本地Prompt／模型入口，保持既有菜单、名称、排序、显式隐藏和全隐藏状态。前两家导航已实证；后两家当前已登录，但菜单无AI管理，提示词／模型直达均返回销售管理。本地保留预留入口，不声称真实入口已开通。

## 可重复验证

| 检查 | 结果 | 证据 |
|---|---:|---|
| `node prototype/checks/prompt-templates-check.cjs` | 45项通过 | `check.json` |
| `node prototype/checks/prompt-navigation-check.cjs` | 28项通过 | `navigation-check.json` |
| `node prototype/checks/quality-daily-model-check.cjs --write` | 18场景、445断言通过 | `../chat-quality-daily-20261024/model-check.json` |
| `node prototype/checks/quality-daily-menu-check.cjs` | 69项通过 | `../chat-quality-daily-20261024/menu-check.json` |
| 最终私有JSON逐租户DOM复核 | 15家已采、2家已登录但页面不可用；57主正文及1子正文逐字一致；150场景组合通过 | `private-dom-summary.json` |
| `node prototype/checks/shell-tab-restore-check.cjs` | 18项通过 | `../chat-quality-daily-20261024/shell-tab-restore-check.json` |

上述检查使用合成正文或公开菜单元数据，未把真实业务正文写入仓库。Prompt检查覆盖旧模板与日报同表、主子正文完整保留、场景条件、模型过滤、存储失败、跨编辑器和Shell关闭的脏编辑保护，以及标签搜索、分组折叠和分页。

Chrome发现刷新恢复多个页签时，后台iframe可能保持空白。`admin-navigation.js`已去掉恢复阶段预建全部iframe的循环：保留全部合法页签及原顺序，只创建当前页；其他页签首次访问由原`openPage`按需创建。18项合成回归覆盖4页签恢复只建1个iframe、URL优先、旧session恢复、去重与权限过滤、侧栏首次访问、已访问页复用、关闭未访问页／当前页／全部页、关闭其他页的脏编辑拦截，以及不触碰其他业务存储。本检查不读取用户浏览器localStorage；实际浏览器资源缓存及iframe加载由主代理另行复核。

私有DOM复核脚本位于本机输出目录：`E:/AI 项目/outputs/admin-prompts-complete-20261024/check-private-prompt-dom.cjs`。它读取当前私有JSON，逐租户逐条只读打开编辑器，核对主／子正文逐字相等、切场景条件、定时说明、标签与分组选项的ID／文案／禁用状态、模型候选与只读目录；新建分组只在未保存编辑器内添加后删除，不保存本地业务修改，不调用生产或模型接口。结果仅输出计数、字符长度和哈希到同目录的`private-prompt-dom-check.json`，仓库仅保留无正文摘要`private-dom-summary.json`。

最终私有快照SHA-256为`5d7c47243f997768f75dde5c749bdc26c4a41b56704196cc9f78fd911ee91e26`。15家采集完成的租户包含57份主正文，共149695字符；成都另有1份6411字符子正文，DOM值全部逐字相等。各租户共111条真实来源模型目录按租户独立投影，150个场景切换的正文标题、定时说明、填写标签、分组与模型候选符合各自schema。北京已采确认模板和标签选项均为0，显示“当前没有可选标签”。本次未发现UI与该快照之间的差异；这证明来源到DOM的完整性，不代替线上采集证据与Chrome外观验收。

## 待最终验收

本轮17家中15家已采集并通过上述DOM复核；`jbfs`及`hqjd`已登录并完成访问核验，均为`accessStatus: authenticated_route_unavailable`、`captureReason: page_not_available_for_current_login`。两家菜单无AI管理，两个已知直达地址均返回销售管理；模板与模型数量、正文仍未知，保持`status: not-captured`及`listComplete: false`，不写确认零条、不借用其他租户数据，也不推断具体权限或开通原因。提示词页与模型页均逐字展示该租户私有快照的实证说明；提示词页脚为“总条数待采集”，创建按钮禁用。

对应证据在本机输出目录的`jbfs-access-evidence.json`和`hqjd-access-evidence.json`。最后一次私有DOM复核同时验证上述原因、未知总数与北京确认零条的区分。后续采集变化须重新运行检查并记录新哈希。总交付状态、Chrome最终验收及Tasks由主代理维护，本文件不单独宣布整个任务完成。

本轮没有生产写入、真实模型调用、真实定时执行或发布。真实来源与合成日报状态保持独立；模型目录中的展示地址不会由本页面发起请求。
