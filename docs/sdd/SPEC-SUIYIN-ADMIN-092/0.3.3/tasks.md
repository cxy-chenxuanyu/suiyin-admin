# Tasks — 企微与个微会话质检日报

> Spec: SPEC-SUIYIN-ADMIN-092@0.3.3
> Plan: plan.md
> Status: static-accepted-0.3.3; full-push-authorized; remote-delivery-pending; two-tenants-deferred-by-user; api-paused; runtime-version-alignment-pending

- [x] T001 读取既有入口、批准SPEC、运行边界（R001 R015）
- [x] T002 本地双渠道数据、证据、统计与配置快照（R003–R008 R012 R014 R018）
- [x] T003 独立日报页面和七模块（R001 R002 R005 R007）
- [x] T004 证据、复核、处理与权限状态（R006 R008 R009 R010）
- [x] T005 现有提示词管理增加两份模板、试跑和共同规则（R011 R012 R013 R018）
- [x] T006 既有Shell／菜单及页面联动，无其他租户泄漏（R010 R015）
- [x] T007 静态模型和交互核验及原有页面回归（全部R；R016/R017仅状态投影）
- [x] T008 Chrome预览、截图、实际结果说明（R015 R016 R017）
- [x] T009 按房总反馈将两个日报移入聊天管理并迁移旧缓存（R001 R015）
- [x] T010 核对线上Prompt/模型管理、统一提示词列表并演示模型配置关联（R010 R011 R012）
- [x] T011 当前修正回归、Chrome截图与核验说明（R001 R011 R015）
- [x] T012 根据用户本轮直接授权修订0.3.0 SPEC／Plan，登记只读采样、Codex离线及私有数据边界（R019–R024）
- [x] T013 通用Prompt私有快照模块、条件字段、完整分组子提示词、模型筛选、租户隔离及与日报扩展同表桥接；相关合成DOM检查45项（R019 R020）
- [x] T014 完成17租户入口／访问状态矩阵；15个可访问租户逐条采集完整正文与条件字段，另2个由历史登录失败更新为已登录但无AI入口/直达页回销售管理，保留证据（R019）
- [x] T015 写入本机ignored Prompt JSON，57主正文及1子正文逐字核验，完整性／条件字段／模型及Git排除通过（R019 R020）
- [x] T016 深圳指定两日双渠道只读采集、规范化、算术准备和字段缺失清单；不作为语义完成证明（R021 R023）
- [x] T017 原v1.4真实阅读后记录语义证据；1105有效直接记录及2091相同可见序列复用覆盖3196应分析会话，270系统-only排除；逐条阅读与复用分别记录（R021 R022 R023）
- [x] T018 用source-event-v3.1合并四组合候选和确定性统计，unknown／证据／身份校验通过；生成私有真实来源JSON（R020–R024）
- [x] T019 接入真实只读renderer；Chrome16项覆盖四组合、来源切换、筛选、证据和未采状态，真实/合成来源隔离；刷新页签按需加载修复并通过18项恢复回归（R024）
- [x] T020 0.3.0结构／运行边界、私有排除、脚本语法和相关回归通过，最新交付说明按15/17租户及四报告实际覆盖记录；无发布／推送／生产写入（R019–R024）
- [ ] T021 [deferred-by-user-2026-10-25] 锦帛美学jbfs、厚全鸡蛋hqjd登录已恢复，但当前账号无AI入口且两目标路由返回销售管理，内容及数量未知。用户明确两家先不管，本轮不补采、不阻塞深圳；保留未完成状态，不宣称全17租户已抄全（E026，R019，AC-R019-03）
- [x] T022 核实两租户登录后实际入口状态，原型分别显示当前原因、未知总数和禁用编辑；不改线上功能或权限（R019 R020）

- [x] T023 按2026-10-25用户直接授权更新0.3.1 SPEC／Plan／Tasks，登记深圳真实显示例外、两家延期及后续功能阶段；执行SPEC与Plan校验（R019 R020 R025–R027）
- [x] T024 只读核对深圳管理页“微信管理 → 账号状态”的人设号名字及稳定账号ID，在私有outputs保存来源与映射；同名／改名／缺失或冲突明确处理，不取salesName或分配人替代（R025）
- [x] T025 [0.3.1历史验收] 仅在深圳指定两日双渠道ignored JSON和只读renderer补真实名称、原始消息与显示修订；AI摘要另标、模板成员按自身消息定位。该版关联证据展开／上下文折叠方式现由E029的右侧PC时间轴替代，历史完成不自动证明新交互通过（R020 R024 R025 R026）
- [x] T026 校验稳定身份、原始证据／seq、所有分析结论和分母不变、系统-only不进入意向、操作人／媒体unknown及私有排除；既有合成演示和其他租户保持（R023 R025 R026）
- [x] T027 Chrome逐项验收深圳两日双渠道的人设号名字、筛选、会话／问题原文与AI摘要、未知状态和原统计；含真实信息的截图仅保存在私有outputs，记录0.3.1静态验收（R025 R026 R027）

- [x] T028 按2026-10-25本回合E029直接授权同步0.3.2 SPEC／Plan／Tasks，记录旧默认折叠展示冲突、显示侧车及仅静态范围；SPEC与Plan校验均0错误／0警告，不改runtime-plan或engine合同（R026，AC-R026-01/02/03/04）
- [x] T029 从PC主消息模板抽取admin-quality-pc-messages.js/.css只读组件，配合admin-quality-chat-drawer.js/.css右侧抽屉，admin-quality-real.js仅改evidence调用、admin-content.html接入：全部已导入消息、客户左我方右、可靠头像／昵称／时间／发送来源与unknown，问题按所选occurrence及自身证据ID高亮定位；AI摘要独立，无发送／转发／撤回（R023 R025 R026，AC-R026-01）
- [x] T030 实现关闭按钮／Esc／遮罩关闭及原报告滚动位置、页签、筛选和入口焦点恢复；长时间轴独立滚动，不触发新业务取数或写入（R026，AC-R026-03）
- [x] T031 双渠道／两日回归与Chrome验证右侧布局、问题及会话入口、跨客户证据拒绝／定位、元信息unknown、三种关闭方式、显示侧车完整性及原bundle／结论／分母不变；截图只在私有outputs，新增回执不冒用0.3.1结果（R025 R026，AC-R026-01/02/03/04）
- [x] T032 从同范围既有本机冻结采集输入生成Git忽略的quality-chat-view-yestar-sz-20261019-20.json显示侧车，记录来源摘要、稳定会话／seq、记录数及显示修订；从旧20113条证据／上下文补齐至本机已有30861条消息记录，不调用API，不改原bundle分析、证据引用与分母，来源／状态／实际人缺失unknown（R020 R023 R026，AC-R026-04）

- [x] T033 按E031本回合截图直接授权同步0.3.3 SPEC／Plan／Tasks，登记操作列冲突及本地删除边界，完成SPEC与Plan校验；不另起SPEC、不重复问批、不修改runtime合同（R011，AC-R011-04/05）
- [x] T034 两条日报模板与同表普通行统一编辑／删除文案、样式和排列，移除查看日报快捷链接；保留原编辑高级设置／脏保护与旧模板CRUD，聊天管理日报入口保持（R011，AC-R011-04）
- [x] T035 实现本地删除确认、取消与存储失败保留；成功后仅目标渠道模板隐藏并停用且刷新保持，历史日报／快照、对方渠道、共同规则、模型与正文／版本备份不变；无API或新增恢复重建流程（R011，AC-R011-05）
- [x] T036 增量检查与Chrome核验两日报行操作一致、编辑保持、删除取消／失败／成功／重载及单渠道影响；证实历史可读、备份与其他配置不变、无API调用，记录实际回执后再标完成（R011，AC-R011-04/05）

- [x] T037 按E032最终“原型图OK了，完整推送”授权收敛README／CLAUDE／设计／PRD／流程与canonical来源账本，明确最终布局与旧0.3.x历史，完成SPEC／Plan／convergence校验；保持0.3.3行为版本（R001 R011 R015 R020 R026）
- [ ] T038 [package-freeze: remote-receipt-pending] 由交付主线程完成安全构建、单文件及版本化SDD校验、原型仓commit／push／tag和远端回读。此不可变0.3.3包冻结时远端步骤保持待回执，后续完成以该tag对应提交及独立发布回执证明，不为修改包内checkbox重复推送；私有JSON／原文／截图／未执行runtime不入包，不更新进度表、不建Issue（E032，R015 R020）

2026-10-25用户最终批准当前原型并明确完整推送。静态功能已验收，T037／T038为交付收敛，不是新行为实现；当前远端状态待实际回执。原0.3.0／0.3.1／0.3.2过程与测试记录继续保留为历史，不替代最终布局和操作。

本轮完整推送的新增公开分发／构建检查以主线程JSDOM／VM及已存在视觉确认记录为准；未取得本轮线上DOM验收，不把本机检查或历史Chrome验收表述为线上页面已验证。远端发布与线上视觉证据分别记录。

T037校验回执（2026-10-25）：SPEC为approved、27条规则、48个验收；Plan为static-html、精确引用092@0.3.3；source-convergence为verified、25项来源、10项定向搜索。三个校验器均0错误／0警告；原型仓五份本轮文档的`git diff --check`通过。核心spec／plan／tasks／source-convergence可冻结复制入版本化SDD；T038继续按冻结时点保留远端待回执。

0.3.3按2026-10-25 E031直接授权修订，仅统一两条日报模板操作列及本地单渠道删除状态。T033–T036已完成：主线程Chrome核验8行操作栏统一apt-row-actions类及编辑／删除按钮，两日报编辑打开后取消正常，企微删除弹窗及取消保留8行正常，截图视觉对齐与UI／model语法检查通过。真实Chrome未确认删除，当前仍8行，用户原有浏览器存储未被测试改写。

确认删除、存储失败和隔离边界通过隔离内存检查：实际质量模型＋提示词UI的jsdom集成12/12通过（操作一致、取消保留、Storage失败保留行／弹窗、确认后仅目标隐藏、另一渠道配置逐字不变、两渠道独立；0网络）。模型删除专项VM60/60通过（不复活、幂等、刷新保持、旧编辑阻断、失败原样及渠道／规则／模型／历史隔离）；既有模型18场景445断言全部通过。没有借用0.3.2抽屉回执证明本轮行为。API继续暂停，runtime版本对齐留在独立合同范围；本轮仅本地静态验收，无线上删除、生产写入或发布。

2026-10-25，0.3.3合同校验各执行一次：`node scripts/validate-spec.mjs specs/092-admin-chat-quality-daily/spec.md --json`通过（approved、27条规则、48个验收场景、0错误／0警告）；`node scripts/validate-plan-boundary.mjs specs/092-admin-chat-quality-daily/plan.md --json`通过（源SPEC 0.3.3、static-html、0错误／0警告）。这些结果仅证明合同结构与静态边界，不替代删除状态回归或独立runtime验收。

当前Plan边界：E032授权静态原型代码、安全文档及合成示例完整推送，未取得远端实际回执前不标交付完成；不运行产品模型业务API，不写生产。完整Prompt、真实名称、会话原文及截图只保存在本机outputs与Git忽略私有JSON，不进入远端／单文件；未执行runtime合同及运行产物也不打包。E027仅允许指定深圳两日双渠道本机真实显示，既有Codex结果仍apiExecuted=false。本任务不发送通知、不建Issue、不更新开发进度表。

E034公开分发边界：quality-public-demo.json仅来自旧合成model fixture，提供19/20双渠道四份合成报告，由installPublic独立校验并用同一最终日报／PC抽屉显示。本机先私有，404才公开回退；公开来源明确合成、无实际AI，非404错误不掩盖。生成、安全构建和远端回执由T038负责，不把私有原文带入公开包。

0.3.2的E029授权仅替换原文详情展示和关闭交互及同范围本机已采集消息的显示投影；同一范围不重复询问批准。T029–T032已依据本轮独立UI、侧车检查及Chrome验收完成，回执见原型仓`docs/verification/chat-quality-daily-20261025/chat-drawer.md`，未借用0.3.1历史结果。API执行继续暂停；独立runtime-plan及engine合同未修改，仍引用其0.3.1基线，版本尚待对齐。本次只确认静态抽屉完成，不宣称本地功能版、生产功能或发布完成。

2026-10-25，0.3.2规范校验：`node scripts/validate-spec.mjs specs/092-admin-chat-quality-daily/spec.md --json`通过（approved、27条规则、46个验收场景、0错误／0警告）；`node scripts/validate-plan-boundary.mjs specs/092-admin-chat-quality-daily/plan.md --json`通过（源SPEC 0.3.2、static-html、0错误／0警告）。本回执仅证明三份canonical文档结构和静态运行边界，不证明新增抽屉UI或独立runtime已验收。

2026-10-25，0.3.2抽屉静态验收：主线程重复执行`node prototype/checks/check-quality-chat-drawer.cjs`，74959项通过、0失败，覆盖3466个会话、20113条原有证据／上下文和30861条本机已采集显示记录；相关3个JavaScript文件语法、侧车`--check`及`git check-ignore`均通过。Chrome验证深圳两日双渠道的问题／会话入口、右侧PC布局、证据切换与高亮、语音转写、关闭恢复及只读边界，最终开发错误日志为`[]`。侧车SHA256为`79c0af32a25963c0f583fda0e15677ce7a61cffd291a9529f6d77dbdd2491619`；原分析bundle SHA256仍为`68932b8f2f75703926bef20de63f30b4434435fedd4cb59e4ab762e47d5fa0e3`。本轮无生产调用、消息发送或发布，不重跑独立runtime。

后续阶段已授权且T027原型验收前置已满足；不属于本static-html交付包。独立runtime-plan.md及operational-profile.md未执行／未验收，API当前暂停，既有DeepSeek配置、无生产副作用适配和输出格式仍待核实。后续先分别跑通企微、个微真实调用与持久化回读，再验证04:00启动／08:00前完成；静态完整推送不代替这些运行证据（E028，R016 R017 R027）。

验收记录：E:/AI 项目/佰智德三/碎银原型/suiyin-admin/docs/verification/chat-quality-daily-20261024/README.md。
0.3.0最新交付状态：同目录v0.3.0-delivery.md；v0.3.0-in-progress.md保留过程记录。历史0.2.1检查不自动证明新增真实采样／离线语义工作完成。

2026-10-24，0.2.1修正：模型18场景/429断言、菜单69项、提示词60项、视图状态43项、本轮Chrome实际交互18项通过；新增/修改脚本语法、SPEC结构及Plan运行边界检查通过。原0.2.0的Chrome24项记录保留为历史。R016真实功能闭环、R017代表规模耗时与08:00按时率均未执行，不能据此宣称生产完成。

2026-10-25，0.3.1静态验收：Chrome 9/9、实际私有JSON 33/33、renderer 43/43、导航页签恢复18/18通过。私有bundle SHA256：68932b8f2f75703926bef20de63f30b4434435fedd4cb59e4ab762e47d5fa0e3。证据：outputs/shenzhen-chat-quality-20261019-20/identity-20261025/prototype-browser-check.json、analysis/final-real-bundle-runtime-check.json、prep/real-renderer-check.json；导航证据见原型仓docs/verification/chat-quality-daily-20261024/shell-tab-restore-check.json。此处runtime-check是本机VM的静态renderer检查名称，不是DeepSeek功能版调用证明。
