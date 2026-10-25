# 碎银 Admin 原型维护入口

2026-10-25会话质检日报以[092@0.3.3](docs/sdd/SPEC-SUIYIN-ADMIN-092/0.3.3/spec.md)为当前规则；用户已确认“原型图OK了，完整推送”。当前静态行为已验收，远端交付须实际回执，不能用本文预先宣称完成。维护前读[PRD](prd/chat-quality-daily.md)、[流程](flowcharts/chat-quality-daily.md)、[设计规范](docs/design-spec.md)及[来源账本](docs/sdd/SPEC-SUIYIN-ADMIN-092/0.3.3/source-convergence.md)。历史0.3.x过程记录只证明当时状态。

092固定边界：

- 两日报在聊天管理，路由`wecomQualityDaily`／`wechatQualityDaily`；AI管理中的`promptTemplate`／`aiEntModelConfig`仍独立，不把日报放回AI菜单。
- 当前真实报告标题内日期，七页签在KPI前；工作号筛选和搜索在相应名单内，来源说明在页尾。不要恢复顶部综合／分组过滤器或旧右上折叠筛选。完整布局使用`admin-quality-report.js/.css`，只重聚合已保存结论，不新增语义判断。
- 原文用`admin-quality-chat-drawer.js/.css`与`admin-quality-pc-messages.js/.css`的右侧只读PC时间轴，客户左我方右，证据按所选occurrence及自身seq定位；禁止回退居中原文对话框。关闭／Esc／遮罩恢复页签、名单状态、滚动与焦点；无发送／转发／撤回。
- 日报模板与普通模板在同一六列表格，操作都是编辑／删除，不出现查看日报链接。编辑高级设置保留；本地删除只停用目标渠道，取消／写入失败不改变原配置，历史日报、另一渠道、共用规则、模型和正文备份保持，不另造恢复重建流程。
- `data/private/prompt-templates.json`、真实报告bundle、聊天显示侧车及含真实原文的截图仅本机Git忽略，不得打入公开仓、构建、单文件或版本化SDD。公开`quality-public-demo.json`只从旧合成model fixture生成四报告，经独立installPublic校验，复用最终日报和PC抽屉；本机优先私有，仅404可回退公开合成，明确无实际AI，其他错误不能吞成合成成功。构建须递归排除private，并正确解析带缓存版本参数的资源路径。
- 15家Prompt采样完成、2家已登录但入口不可用且用户延期；北京确认0与未知总数区分，不借bzds替代其他租户。深圳真实样本限2026-10-19／20双渠道，已存分析来源Codex／`apiExecuted=false`，不能改为DeepSeek或重新生成时间。
- API执行暂停；独立runtime-plan、Operational Profile、provider及本机服务未执行／未验收，不随静态交付包打入，也不从日报插入运行面板或请求业务API。本轮无工程Issue与开发进度表更新。

2026-10-12新增[扫街轨迹](prd/street-trajectories.md)：所有医美租户可选人员与日期，在地图上10秒内回放全部有效行程。当前覆盖六艺星及画美/傲丽两个西安租户；无旧拉新入口的两店补必要数据展示父级。非医美不开放。详见[081@1.1.0](docs/sdd/SPEC-SUIYIN-ADMIN-081/1.1.0/README.md)与[流程](flowcharts/street-trajectories.md)。本地示意地图和合成数据不代表真实轨迹已接入。

2026-10-02全部账号状态执行[ACCOUNT-TYPE-001@0.2.0](docs/sdd/SPEC-SUIYIN-ADMIN-ACCOUNT-TYPE-001/0.2.0/README.md)：佰智德三平台总览使用43个环境、1139个真实采集账号及118张代理卡片；统计和在线/掉线名单只按个微、企微分类，统计末行汇总，不存在第三分类。类型读取创建时已保存的属性，名称匹配仅用于静态采集构建，生产以稳定账号ID关联。公开数据中的13处手机号已遮罩；原始采集与私人诊断只留本地。见[产品说明](prd/all-account-status.md)、[流程](flowcharts/all-account-status.md)和[工程Issue #458](https://github.com/PetWebOrg/suiyin-admin/issues/458)，生产实现仍待正式工程流程。

2026-09-30表头表达调整：所有17租户的普通菜单管理第二列显示「仅超级管理员可见」，宽180px。`admin-menu-tree.js`只映射表头展示，内部「超级权限」字段继续索引、保存和导航投影；本轮是L0，不新建行为合同。见[菜单说明](prd/tenant-menu-drag.md)与[验收](docs/verification/menu-label-20260930/README.md)。

更新：2026-09-30。[076@1.0.1](docs/sdd/SPEC-SUIYIN-ADMIN-076/1.0.1/README.md)登记画美/傲丽两西安租户、全部租户「碎银账号」名称、八租户时间入口移除与菜单状态胶囊；[077@1.0.1](docs/sdd/SPEC-SUIYIN-ADMIN-077/1.0.1/README.md)定义八租户咨询称谓及线上咨询、现场咨询、科室助理三类岗位。两新租户只有独立最小框架，真实账号/业务仍待采集，不扩散艺星回访及辅助线能力。见[产品说明](prd/admin-account-menu-status.md)与[流程](flowcharts/admin-account-menu-status.md)。

2026-09-29工具管理及辅助线执行[073@1.0.0](docs/sdd/SPEC-SUIYIN-ADMIN-073/1.0.0/README.md)：当时15租户原一级话术位置迁为工具父级及二级话术；艺星能力登记有效的租户另有辅助线管理，每租户一套可编辑配置。话术页面继续[051@1.1.0交付补充](docs/sdd/SPEC-SUIYIN-ADMIN-051/1.1.0/deliveries/20260929-language-parity/README.md)的R002–R006、R008–R010，原路由、隐藏、权限和状态保持；15租户分类树、六列列表和弹窗由专用模块承接。[话术验收](docs/verification/language-parity-20260929/README.md)仅证明记录内几何，不外推全部状态逐像素一致。073新页面不冒充实站采样。

2026-09-28回访规则执行[071@1.3.1](docs/sdd/SPEC-SUIYIN-ADMIN-071/1.3.1/README.md)：深圳、成都、北京、广州、杭州、嘉兴六个现有艺星租户各自提供「聊天管理 → 回访规则」，`revisitRules`为合成原型扩展。原基准下拉现有15个直接选项：5日期、4个成为A/B/C/D级和6个首次/最近一次到店/购买/划扣；事件不再使用二级“事件取值”控件，等级仍另选人工/AI。共享规则设置与多个独立时间节点是当前模型；1.0.0“每节点一条顶层规则”的方案已被替代。用户此前撤回的移动到群发、增加群发规则和向全部系统租户扩展仍不实施；六艺星补齐授权继续有效，本次只补基准，非艺星不加入口。

2026-09-27新增录音/喜报三页及对应入口迁移由[REFRESH-001@0.2.0](docs/sdd/SPEC-SUIYIN-ADMIN-REFRESH-001/0.2.0/README.md)承接；当前基线为 SPEC-SUIYIN-ADMIN-051@1.1.0；本轮销售变声统计 052@1.2.0、使用统计纠偏 053@1.0.2、全页对齐 054@1.0.0、055@1.1.0、056@1.0.0 分别拥有自己的行为范围；AI费用、分类趋势与专属模型执行 058@1.2.0。预约记录总量、每日柱形与期间累计折线执行062@1.0.0；仅现有四个入口，保留默认列表及全量筛选，源样本与合成演示分离。先读 README.md、docs/design-spec.md 和相应版本化 SDD。050 仅在未被后续合同替代的导航范围内适用。当前筛选与表头冻结见 [验收记录](docs/verification/filters-sticky-20260920.md)；上一轮四页截图纠偏与证据边界见 [发布勘误](docs/sdd/pixel-correction-20260920.md) 和 [实测记录](docs/verification/pixel-correction-20260920.md)。

## 运行与交付

- 纯 HTML/CSS/JavaScript、静态 JSON/资源及本地演示，不接真实认证或写 API。
- 真实后台只读；查看或展开后取消，不保存、删除、发送或发布。
- 只维护本仓，不进入 Flutter / React / Go 生产仓。
- 日常仅迭代原型并尝试 Google Chrome 预览；明确“完整推送”才同步 PRD、流程、设计、单文件和远端 SDD，并按工作区规则 direct-master commit/push/tag。
- 不创建、更新或对账 APP/PC 开发进度表；工程 Issue 需另行明确指令。以真实远端回执判定交付，不把本机检查当部署。

## 主线结构

- `admin-quality-model.js`、`admin-quality-daily.js/css`：双渠道独立合成演示、模板／规则版本及本地状态；不代替真实运行。
- `admin-quality-real.js/css`、`admin-quality-report.js/css`：本机私有保存报告与七模块版式；`admin-quality-chat-drawer.js/css`、`admin-quality-pc-messages.js/css`承载右侧原文。
- `admin-prompt-templates.js/css`、`admin-quality-prompts.js/css`、`admin-quality-models.js/css`：各租户自己的采样列表、日报模板同表扩展、企业只读模型目录。

- `prototype/_shell.html`、`admin-navigation.js/css`、`admin-menu-state.js`：租户、导航、页签、菜单本地覆盖。
- `admin-account-profile.js`：076默认账号名称与八租户时间字段能力；077八租户系统称谓与角色适配。按tenant和稳定route处理，保留字段键、自由文本、统计口径和其他角色，不全仓替换销售。
- `admin-content.html/js/css`：内容入口、来源表单、筛选及列表基础。
- `admin-all-account-status.js/css`、`data/all-account-status.js`：仅接管 `bzds/allWeChatStatus`，独立维护微信/代理页签、环境名称三态排序与滚动位置；显式个微/企微类型校验失败时保留已有正确内容，禁止回退通用演示名单。其他租户仍走原入口。
- `admin-domain-views.js`、`admin-expanded-flows.js`、`admin-extra-flows.js`、`admin-chat.js`、`admin-page-editors.js`：领域结构与本地交互。
- `admin-menu-tree.js/css`：普通及平台菜单专用树表。
- `admin-language-manage.js/css`、`data/language-manage.json`：十五租户话术管理专用树、列表与本地编辑；`admin-domain-views.js`的`languageManage`路由直接调用此模块。旧`scriptWorkspace`和通用`data/content/`中的话术文本仅留作历史兼容，不是本路由的渲染或数据入口。
- `admin-guide-lines-model.js`、`admin-guide-lines.js/css`、`admin-guide-lines-preview.js/css`、`data/guide-lines.js`、`assets/guide-lines/`：073辅助线租户模型、管理草稿与逐项处理、PC效果预览及轻量本地素材；`guideLineManage`由内容入口专用分支挂载，Shell等待其离开确认。
- `admin-sales-voice-stats.js/css`、`admin-sales-usage.js/css`：独立变声计数、使用统计分组和租户隔离。
- `admin-ai-cost-stats.js/css`：AI费用统计、82天固定合成样本、模型快照及分类趋势；路由 aiCostStats。
- `admin-revisit-rules-model.js`、`admin-revisit-rules.js/css`：按tenant创建独立回访模型、合成事件/条件计算与规则内节点编辑；基准目录独立于21/26筛选；`revisitRules`只匹配 `yestar-sz`、`yestar`、`yestar-bj`、`yestar-gz`、`yestar-hz`、`yestar-jx`，未知租户不回退深圳。
- `admin-stats-date-picker.js/css`、`admin-filter-calendars.js/css`：日期输入、选择、草稿和取消。
- `admin-table-sticky.js/css`：所有当前 Shell 管理表格在所属滚动区内冻结表头，支持多层表头、横向对齐、弹窗及重绘。
- `admin-new-added-records.js/css`、`admin-message-stats-aligned.js/css`、`admin-ai-stats-aligned.js/css`：7租户当日已采拉新空态、消息单卡图表、AI同租户专用统计。
- `admin-pixel-parity.css`、`admin-voice-pixel.css`：共享白色内容背景与使用/变声颜色纠偏；页面几何仍各自负责。
- `admin-sales-dashboard.js/css`、`admin-appointment-aligned.js`、`admin-customer-source-controls.js`：领域纠偏。
- `admin-live-ui.css`、`data/live-ui-reference.js`、`data/form-schemas.js`、`data/button-states.js`、`data/page-evidence.js`：来源样式、表单、按钮与证据边界。
- `data/navigation-snapshot.json`、`data/content/`、`data/sales-usage/`、`data/sales-dashboard/`、`data/ai-stats/`：分租户数据；`data/new-added-records.js`保存7租户各自已采日期与确认空态。以实际加载引用为准，不能把旧通用内容矩阵当作专用模块的有效来源。
- `_shell_inline.html`：生成的单文件，不手工修改派生产物。

## 当前约定

1. 2026-10-12当前导航登记17租户、822页面入口、91路由；783个源队列入口中741可见已采、42保持隐藏，另有13个AI费用、6个现有艺星回访规则、6个辅助线管理及两新租户各3个待采集框架入口，以及本轮8个医美扫街轨迹原型入口；工具管理仅为结构父级，不计业务route。不从平台目录或PC注册表新增环境，辅助线按显式艺星能力登记开放；平台定义不授予非艺星业务权限。796/88、802/89和808/90分别只对应09-27、09-28、09-29历史基线。新租户不借用既有租户业务样本或艺星专属权限。
2. 同名菜单按稳定 route/identity 区分；菜单表与导航由同一有效完整树派生，隐藏库存独立保留。DR-095：数据展示新增项同次补齐适用租户菜单管理和已有平台定义。普通 menu 按 068@1.0.0 在当前全部 17 租户支持一级整组、二级组内/跨组拖动，六列顺序只读，编辑不再输入排序号；成功、撤销、刷新联动本租户侧栏。060@1.1.0 的平台拖动继续有效；平台提供默认顺序与归属，租户明确调整过的同级列表及被跨组移动项的父级按 068 优先，其余继续跟平台。平台当前祖先链隐藏/删除及原权限独立生效，不能通过跨组绕过。旧060版本包保持历史，不用于否定068的限定覆盖。原型17租户是验证清单，不是生产白名单。
3. Shell 青绿不等于各页主按钮青绿。既有回访统计 `revisitStats` 的搜索保留截图蓝色；新增回访规则 `revisitRules` 按071新设计使用 #07c160 主操作，不冒充实站采样。2026-09-20 用户提供使用统计实站截图后，使用/变声主操作修正为 #00c4af。AI 搜索为 #07c160；其他页面按各自证据保留。
4. 字段、按钮、日期、列对齐、分页按来源，禁止无条件加汇总卡、工具栏或分页。菜单、聊天、配置、图表、好友页保留专用结构。
5. 实体选项严格租户及页面边界。来源说明区分本租户采样、部分样本、参考、演示、未采集；加载中不是确认空态。销售使用与 AI 专用统计不跨租户回退。深圳 AI 为 22 行截图部分样本，多部门缺分配时不向首部门归数；拉新仅对已采日期及条件显示真实零条。
6. 变声首次成功独立任务计 1，失败/试听/同任务重试不重复计。其日期与部门继续复用使用统计的单日/范围、日历、快捷日和搜索/重置/导出，本轮追加源已见销售姓名框；模式和输入为草稿，快捷日立即查询并保留当前模式，重置回单日今天。两页保留各自来源，不用样本日替换运行日。使用统计无分页，销售组排序不拆散小计，CSV 不重复计合计；变声保留次数分页与全筛选导出。
7. AI辅助消息统计业务继续 009@1.0.0，工作账号触达继续 042@1.0.0；不能以视觉修复改指标。人工操作和视觉按真实覆盖报告，DOM通过不能证明全部像素一致。
8. 所有管理表格表头在各自滚动可见区顶部冻结，表格结束后退出；多行表头整体保留且不覆盖，横向与正文同步，原排序/选择/焦点仍可操作。短表不造滚动，空态不造行，不改字段、数据和分页；日历、下拉及弹窗层级保持可用。
9. 2026-09-27的15租户导航与741个可见源页已采，395个通用列表、15租户好友及专用页面按记录范围验证；当前结果见[公开摘要](docs/verification/live-refresh-20260927/README.md)。752入口等旧数字只作历史。未采图表点和展开状态仍未知，不用本地检查或发布成功宣称全部状态像素一致。
10. 既有销售变声工程已创建 [管理页销售变声统计 #401](https://github.com/PetWebOrg/suiyin-admin/issues/401)：深圳艺星 / ZHONG / PC，负责人陈宣宇（cxy-chenxuanyu），绑定 052@1.2.0。工程覆盖生产租户注册表中全部适用租户；本原型 15 个租户仅为验证清单，不能限制生产范围。状态与测试映射以远端 Handoff 为准；此授权不等于在本仓流程中实现生产代码或将全部表格冻结扩成另一个工程任务。

11. AI费用统计按 058@1.2.0：13 个已有 AI 父级的租户追加同一 aiCostStats；jbfs/hqjd不新增父级。四列为分析项目、专属模型、分析次数、费用；固定 2026-07-01 至 09-20 共 82 天。类别只影响趋势，表格保持五类；金额未知不为零，业务次数不等于模型请求或辅助消息数。模型使用记录快照；10份reference配置标演示，不编版本或独占训练能力。工程执行只回链058 Handoff，不复用052的Issue授权和范围。

12. 回访071@1.3.1：整条规则共用名称/目的、账号群组与账号、回访基准、每日时间和启停；节点只设非重复的第N天、说明及独立21项选中/26项排除。选中AND、排除OR；节点到期与附加日期约束共同满足，不依赖上一节点完成。复制只替换目标节点条件，目标时间/身份/说明和共享设置不变；有旧条件明确确认替换，保存整条才生效。不得恢复顶层逐节点规则或整套复制入口。至少一个节点、失败与取消守卫保留。

13. 原5日期anchor ID与计算保持，appointment基准显示“预约日期”，21/26条件的源拼写“未次预约日期”保留；不改成预约创建时间。旧事件的anchor与anchorOccurrence合法配对映射到6个直接选项，打开/取消不迁写；次数缺失或非法显示“请选择有效的回访基准”，必须显式修复，不默改首次或最近一次。回访存储使用 `admin-revisit-rules:v2:<tenant>`，六艺星的账号、人员、地区、好友、规则与状态均按tenant隔离，不把其他租户或深圳的实体作为缺省值。新增五店使用独立合成示例并明确标识；深圳既有模型API、稳定ID及原存储键和值保持兼容。`qa=1`使用独立 `admin-qa-` 前缀；旧v1键只读保留，不静默清除或自动合并。逐条导入只有唯一明确的日期relative-day条件才能转为基准与单节点，其余条件保留，先成为未启用草稿；不明确时说明原因。保存失败不改变已存规则，损坏数据先重试或明确恢复。咨询结果按当前账号接待权限可见是合同，不代表PC名单界面、真实调度、共享持久化或发送已经实施。

14. 六艺星各自 `menu` 和侧栏均登记一次 `revisitRules`，成都/北京挂 `group-9`，深圳/广州/杭州/嘉兴挂 `group-10`；德三 `allMenu` 复用已有唯一平台定义，不重复插入，也不因此向非艺星开放。新增五店菜单迁移按缓存revision对应的已发布完整基线比较，保留更老fallback、删除、隐藏、改名与排序；沿用 `revisit-rules-v1` 迁移标记，深圳既有用户选择不重新激活。

15. 回访基准15项由5日期、4等级、6个明确事件选项组成，首次/最近一次在原下拉直接选。等级人工/AI独立，以截至运行时最近真正进入目标等级为基准；from等于to不重置，当前后来变级不隐式增加等级筛选。历史缺失/坏值unknown，完整空历史或截至时点无已发生事件not-matched；未来事件不提前使用，同日按北京时间第0天。所有历史仅为合成演示；购买发生不等于按商品筛选，Q005延期。

16. 话术使用2026-09-29本轮15租户数据，1246分类节点、42已采列表分类、155列表样本、48已采详情和16媒体占位。同名分类保留不同身份，搜索保留匹配祖先；不默认选首条。未采分类/正文/部门/销售/商品选项分别保留`not-captured`，不填其他租户内容或把缺失当空值事实。当前冻结树内`n0`等ID稳定；后续重新采集若改变节点顺序，必须处理身份迁移，不按新序号盲合并旧本地修改。`captureRevision`更新采用字段级本地覆盖，保存、取消、刷新和租户隔离继续校验。`sanitize-public-data.mjs --check`必须检查独立话术数据，不能将其再次替换为统一演示文本。

17. 073的工具/话术是指定入口迁移：原位置变工具父级，话术保留原route、业务状态键、隐藏和权限；工具按可见子项出现。平台、menu与侧栏同一有效树，其他合法菜单调整不被重置。辅助线只对艺星显式能力有效，当前六店是验收清单，不是生产白名单；非艺星直达不可读取配置。

18. 辅助线默认/门店来源均可编辑，每租户一套；16类129条123PNG仅为030本地初始演示，不能写成已核对各店最新生产清单或用户修改后的固定数量。分类图片CRUD/排序/启停先改草稿；透明PNG逐项处理，失败可重试/重选/移除，处理中及失败队列也算dirty。替换保身份和顺序，删除/放弃/旧租户迟到结果失效；清空保存不复活默认。保存失败保草稿与旧配置；应用内离开必须等待保存/放弃/继续，原生刷新关闭只触发浏览器提示。PC预览深复制当前草稿，只展示启用分类与纯缩略图，不回写配置、不宣称真实PC同步。工程Issue已创建为[#442](https://github.com/PetWebOrg/suiyin-admin/issues/442)，负责人王梓先（`build996`），提出环境佰智德三、提出人房昕，`status:todo`；执行以[073交接合同](docs/sdd/SPEC-SUIYIN-ADMIN-073/1.0.0/issue-handoff.md)为准，不把本地原型检查当作生产验收。

19. 076/077目标租户为 `yestar-sz,yestar,yestar-bj,yestar-gz,yestar-hz,yestar-jx,huamei-xian,aoli-xian`。账号顶部与系统设置不显示或提交上下班时间，旧配置保留但不回填UI；其他九租户保持。系统人员称谓使用咨询，销售额、销售金额、销售量、销售收入等指标及用户文本不改。旧销售角色显示为线上咨询，三类岗位可多选，其他角色保留；打开/取消不迁写，失败保留草稿，不吞并原多角色。

20. menu/allMenu共用显示/隐藏胶囊；点不同值即提交，同值无操作，与编辑弹窗共用状态。持久化成功后再传播导航与记录，失败恢复原值。普通仅本租户；平台按060/068默认、局部覆盖、祖先隐藏和原权限约束。显示选中不代表突破父级限制，点击不触发拖动。

旧主题、菜单及好友独立页已归档，只解释历史。030原PC已发布快照保持不变，固定目录/来源和旧五城不约束073的Admin自助配置。当前指令以本文件、设计规范和对应精确版本合同为准。

AI费用统计工程Issue已建立：[#402](https://github.com/PetWebOrg/suiyin-admin/issues/402)，陈宣宇（cxy-chenxuanyu），提出人房昕、环境佰智德三、平台PC。原型发布标签 `v2026092004-admin-ai-cost-stats`；实现与生产验收待正式工程流程。

扫街轨迹工程待办：[Admin #486](https://github.com/PetWebOrg/suiyin-admin/issues/486)，负责人王梓先（build996），提出环境深圳艺星、提出人孤狼，适用所有医美租户。当前为原型交付，生产实现待完成。
