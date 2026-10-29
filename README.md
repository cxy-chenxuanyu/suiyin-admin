# 碎银管理后台 HTML 原型

> 2026-10-29日报工程候选：[092@0.4.0](docs/sdd/SPEC-SUIYIN-ADMIN-092/0.4.0/README.md)已获陈宣宇本轮实施授权，源资料正式合入待审。新日报采用工作号自然日、通用AI Task、独立规则指标页、原模板唯一cron开关及拖动排序；下面092@0.3.3描述保留为已发布历史，不代表本候选设计。其余模块合同不变。

2026-10-25：房总已确认“原型图OK了，完整推送”。会话质检日报按[092@0.3.3](docs/sdd/SPEC-SUIYIN-ADMIN-092/0.3.3/spec.md)进入静态交付：企微、个微分别从**聊天管理**进入；沿南京参考的七页签布局，使用碎银青绿色。标题内切换日期，各模块名单内筛选工作号／搜索，原文从右侧PC只读聊天抽屉打开。两条日报模板并入AI提示词库同一表格，操作统一编辑／删除。见[产品说明](prd/chat-quality-daily.md)、[交互流程](flowcharts/chat-quality-daily.md)、[设计规则](docs/design-spec.md#会话质检日报092033)和[来源收敛](docs/sdd/SPEC-SUIYIN-ADMIN-092/0.3.3/source-convergence.md)。远端commit／tag／部署以本次发布回执为准，文档不提前代表已经推送。

完整Prompt、深圳真实名称／聊天原文、私有报告JSON及截图只留本机，**不包含在远端或离线单文件中**。公开包使用`quality-public-demo.json`中仅由旧合成fixture生成的19/20双渠道四报告，独立`installPublic`校验后复用同一新版日报及PC抽屉，明确标“合成／无实际AI”。本机先读私有结果，只有404才回退公开合成；其他错误不掩盖，不替换真实结果。API继续暂停，未执行／未验收的runtime合同与服务不随本包交付；本次不证明DeepSeek调用、每天出报或04:00–08:00目标已经达成。

2026-10-12新增[扫街轨迹](prd/street-trajectories.md)：所有医美租户可选人员与日期，在地图上10秒内回放全部有效行程。当前覆盖六艺星及画美/傲丽两个西安租户；无旧拉新入口的两店补必要数据展示父级。非医美不开放。详见[081@1.1.0](docs/sdd/SPEC-SUIYIN-ADMIN-081/1.1.0/README.md)与[流程](flowcharts/street-trajectories.md)。本地示意地图和合成数据不代表真实轨迹已接入。

2026-10-02：[全部账号状态](https://suiyin-admin.pages.dev/prototype/_shell.html?tenant=bzds&page=allWeChatStatus)已对齐真实总览结构，统计列固定为个微、企微、汇总，在线/掉线名单各按两类分组。账号类型使用创建时的既定类型，页面没有第三分类。当前静态样例为43环境、1,139账号和118代理卡，名称内手机号已掩码；本地原始采集不公开。见[产品说明](prd/all-account-status.md)、[交互流程](flowcharts/all-account-status.md)、[0.2.0版本合同](docs/sdd/SPEC-SUIYIN-ADMIN-ACCOUNT-TYPE-001/0.2.0/README.md)及[验收记录](docs/sdd/SPEC-SUIYIN-ADMIN-ACCOUNT-TYPE-001/0.2.0/verification.md)。工程待办为[Admin #458](https://github.com/PetWebOrg/suiyin-admin/issues/458)，负责人/提出人房昕，提出环境佰智德三；生产尚未实现。

2026-09-30文案调整：全部17租户的「系统管理 → 菜单管理」第二列表头统一显示「仅超级管理员可见」，列宽为180px，保持单行。沿用已有菜单字段及权限合同；见[菜单产品说明](prd/tenant-menu-drag.md)、[交互流程](flowcharts/tenant-menu-drag.md)和[本次验收](docs/verification/menu-label-20260930/README.md)。

这是十七租户的静态管理后台原型，用于对照真实页面、评审操作和统计规则。以下为2026-10-12历史导航快照：**17个租户、822个租户×页面入口、91种路由**，不包含后续092新增入口。其中783个入口属于2026-09-27源环境采集队列，741个可见页面已有有效DOM和截图，42个保持源隐藏状态；另有13个既有AI费用、6个艺星回访规则、6个艺星辅助线管理和画美/傲丽各3个当时待采集入口，以及8个医美扫街轨迹原型入口。工具管理是结构父级，不计业务路由；新增原型不计入实站采集页数，采集覆盖不等于全部页面、全部状态逐像素一致。

2026-09-30按[076@1.0.1](docs/sdd/SPEC-SUIYIN-ADMIN-076/1.0.1/README.md)与[077@1.0.1](docs/sdd/SPEC-SUIYIN-ADMIN-077/1.0.1/README.md)新增画美医美-西安、傲丽医美-西安；全部租户账号入口统一为「碎银账号」。六个现有艺星及这两租户的系统人员称谓为「咨询」，原销售角色回显为「线上咨询」，另有「现场咨询」「科室助理」可多选，其他角色和既有权限保留。同一八租户移除账号顶部与系统设置的上下班时间入口；上班记录、在线状态和「离开状态可转交」保持。普通/平台菜单状态在表内直接选「显示 / 隐藏」并保存，失败回滚，原作用范围不变。两新租户只有独立最小原型框架，真实菜单、账号和业务资料待采集，不扩散艺星回访或辅助线能力。见[产品说明](prd/admin-account-menu-status.md)与[流程](flowcharts/admin-account-menu-status.md)。

2026-09-29的[073@1.0.0](docs/sdd/SPEC-SUIYIN-ADMIN-073/1.0.0/README.md)把当时15租户原一级话术的位置改为「工具管理 → 话术管理」，保留原路由、隐藏/权限和本地话术状态；所有艺星另有「辅助线管理」，自行维护分类、透明PNG、顺序与启停，显式保存草稿并预览PC效果。现有默认和门店来源均可编辑，每个租户一套独立配置。初始16类129条123文件来自本地PC原型，明确为演示来源，不证明各店最新生产清单已经迁移。

2026-09-27按各租户来源刷新导航、品牌和专用页面，新增录音及喜报共25个租户×页面；2026-09-28回访规则覆盖深圳、成都、北京、广州、杭州、嘉兴六艺星并补齐15个回访基准，见071合同。数据包含本租户脱敏采样、明确标识的参考样本和合成演示；不是实时后台，所有修改只影响本地原型。

2026-09-29话术管理按15租户本轮来源重新对齐：保留各自1246个分类节点、真实父子关系、按钮状态和默认未选分类画面；已采42个已采列表分类、155条列表样本、48条话术详情，16项图片/视频采用占位符。分类、标题和安全模板正文尽量保留本租户内容；未采集的详情、范围和选项保持未知，不填统一话术。见[话术产品说明](prd/language-manage.md)、[051@1.1.0本轮交付补充](docs/sdd/SPEC-SUIYIN-ADMIN-051/1.1.0/deliveries/20260929-language-parity/README.md)与[验收范围](docs/verification/language-parity-20260929/README.md)。

- [好友列表](https://suiyin-admin.pages.dev/prototype/_shell.html?tenant=bzds&page=customerManagement) · [录音管理](https://suiyin-admin.pages.dev/prototype/_shell.html?tenant=rxxz&page=recordingAdmin) · [喜报设置](https://suiyin-admin.pages.dev/prototype/_shell.html?tenant=yestar-hz&page=goodNewsSettings)
- 工具管理 → 话术管理：[深圳艺星](https://suiyin-admin.pages.dev/prototype/_shell.html?tenant=yestar-sz&page=languageManage) · [佰智德三](https://suiyin-admin.pages.dev/prototype/_shell.html?tenant=bzds&page=languageManage) · [萌爪](https://suiyin-admin.pages.dev/prototype/_shell.html?tenant=mengzhua&page=languageManage) · [话术交互流程](flowcharts/language-manage.md)
- 工具管理 → 辅助线管理：[深圳艺星](https://suiyin-admin.pages.dev/prototype/_shell.html?tenant=yestar-sz&page=guideLineManage) · [北京艺星](https://suiyin-admin.pages.dev/prototype/_shell.html?tenant=yestar-bj&page=guideLineManage) · [073交付合同](docs/sdd/SPEC-SUIYIN-ADMIN-073/1.0.0/README.md)
- 回访规则：[深圳](https://suiyin-admin.pages.dev/prototype/_shell.html?tenant=yestar-sz&page=revisitRules) · [成都](https://suiyin-admin.pages.dev/prototype/_shell.html?tenant=yestar&page=revisitRules) · [北京](https://suiyin-admin.pages.dev/prototype/_shell.html?tenant=yestar-bj&page=revisitRules) · [广州](https://suiyin-admin.pages.dev/prototype/_shell.html?tenant=yestar-gz&page=revisitRules) · [杭州](https://suiyin-admin.pages.dev/prototype/_shell.html?tenant=yestar-hz&page=revisitRules) · [嘉兴](https://suiyin-admin.pages.dev/prototype/_shell.html?tenant=yestar-jx&page=revisitRules) · [071@1.3.1交付合同](docs/sdd/SPEC-SUIYIN-ADMIN-071/1.3.1/README.md)
- [当前产品说明](prd/admin-live-reference.md) · [交互流程](flowcharts/admin-live-reference.md) · [设计规范](docs/design-spec.md)
- [2026-09-27刷新合同](docs/sdd/SPEC-SUIYIN-ADMIN-REFRESH-001/0.2.0/README.md) · [公开验证摘要](docs/verification/live-refresh-20260927/README.md) · [公开样本审计](docs/verification/live-refresh-20260927/public-data-audit.md)
- [验收与已知边界](docs/verification/admin-live-reference.md) · [离线单文件](prototype/_shell_inline.html)

## 会话质检日报

当前入口为`prototype/_shell.html?tenant=yestar-sz&page=wecomQualityDaily`与`page=wechatQualityDaily`。AI管理只保留提示词／模型配置入口，不承载日报；提示词行也没有“查看日报”快捷链接。深圳真实视图范围固定为2026-10-19／20两日双渠道，仍是Codex已保存离线候选（`apiExecuted=false`），统计分母及分析时间不会因显示迭代改变。工作号按稳定ID映射账号状态中的人设号名字，不能据此推断实际操作人。

17租户提示词状态按本次各自证据保留：15家已采57份完整主正文、1份成都分组子正文及各自场景／标签／分组／模型选项；北京确认0模板。锦帛美学、厚全鸡蛋已登录但当前账号无AI入口、直达目标页返回销售管理，数量未知，按用户要求延期。画美、傲丽本轮提示词及模型已采，不能再按9月最小框架当作其当前Prompt状态；其他业务采集不由本轮补齐。

原文抽屉复用PC布局，客户左、我方右，问题按本会话证据定位；只有已有音频源才提供播放，转写、图片缺失及发送来源保持真实可得状态。关闭按钮／Esc／遮罩恢复原页签、滚动与入口焦点。新日报模板的保存／试跑／发布和删除都为本地演示；删除仅停用目标渠道，确认／取消／失败明确，保留历史、另一渠道、共用规则、模型和正文备份。

静态验收：[右侧抽屉](docs/verification/chat-quality-daily-20261025/chat-drawer.md)。0.3.0／0.3.1及早期版式记录是当时的过程证据，旧顶部筛选、居中原文弹窗、AI菜单日报入口、独立日报模板表及查看日报操作均已被092@0.3.3替代。完整推送不新增工程Issue、不更新开发进度表。

## 艺星回访规则

按 [071@1.3.1](docs/sdd/SPEC-SUIYIN-ADMIN-071/1.3.1/README.md)，六个现有艺星租户各自提供「聊天管理 → 回访规则」；普通菜单同步本租户入口，德三平台菜单复用唯一对应定义，不向非艺星新增。一条“添加好友后回访”规则包含第3、5、7天等节点，名称、目的、账号群组/账号、回访基准和每日筛选时间共用；节点独立配置选中与排除，继承群发21项选中、26项排除维度。节点条件可复制，但目标天数、说明和共享设置不变；后续各自独立，保存整条规则才生效。回访基准在原下拉中直接选择15项：5个日期（含预约日期）、成为A/B/C/D级，以及首次/最近一次到店、购买、划扣6个独立选项；等级另选人工或AI，事件无需再选一次取值方式。

账号群组表示渠道归属；应回访好友仅对具有其所属账号接待权限的咨询可见。当前仅交付管理页和权限行为合同，PC真实名单、真实定时筛选、自动发送及执行质检均未实施。示例试算使用本租户独立的固定合成数据，已排除、未入选和无法判断分别显示；新增五店不借用深圳账号、人员或好友充当该店事实。规则只在当前浏览器按租户保存；深圳既有稳定ID、用户规则和菜单调整保留，新版v2与旧版v1分开，旧规则只读保留，可明确开始新版示例或逐条导入未启用草稿，不自动猜测合并。

等级按所选来源最近一次真正进入目标等级起算，同级重复评定不重置；后来变为其他等级不会自动加上当前等级筛选。事件只使用截至运行时已发生的记录，未知或损坏历史显示无法判断，明确空历史或尚未发生则未入选；不从当前等级或其他日期猜测。原5日期与旧事件配置兼容，打开、取消不迁写旧存储。

此前撤回的是移动到群发、增加群发规则及向全部系统租户扩展的提议；六艺星已按后续明确授权补齐，非艺星不增加入口。1.0.0将时间节点拆成顶层规则的模型已由1.1.0替代，1.2.0继续沿用共享设置与独立节点；旧版仅保留为历史。

## 2026-09-27刷新实际验证

| 范围 | 结果 |
|---|---|
| 当轮导航与完整库存 | 15租户；保留源隐藏项、平台限制和本地改名/隐藏/拖动覆盖；7项设置迁移检查通过 |
| 普通及艺星好友 | 15租户，381项几何、161项交互/控件检查通过 |
| 通用列表 | 410份布局配置中395页实际测量通过，15页由专用渲染器承接；覆盖64种路由＋表头组合 |
| 录音、喜报、质检、词库与平台专用主体 | 54个租户×页面通过；专用弹层12项交叉检查通过 |
| 备注需求词库及拉新 | 65项本地检查通过；需求组、警示空态、日期与导出边界按本租户保留 |
| 专用统计及主列表尾差 | 初轮107项、最终补充81项几何通过；后者包括厚全商品榜、成都拉群、瑞熙小周统计、销售管理及全部账号状态 |

同源视口与DPR对照采用1 CSS px几何容差；395个通用列表的表格起点纵向最大偏差0.006px、横向0px、宽度最大偏差0.409px。记录中的JS错误与外部请求均为0。上述分组可能覆盖相同页面，不相加作为独立页面数；截图行内容、头像、实时总量及未采曲线不纳入全图像素相等声明。

## 保留的行为合同

| 合同 | 当前职责 |
|---|---|
| [092@0.3.3](docs/sdd/SPEC-SUIYIN-ADMIN-092/0.3.3/spec.md) | 企微／个微独立日报、当前七模块版式、PC原文抽屉、统一提示词编辑／本地删除、共用规则与私有来源边界；API暂停，runtime不打包 |
| [076@1.0.1](docs/sdd/SPEC-SUIYIN-ADMIN-076/1.0.1/README.md) | 两个西安租户、全部租户碎银账号名称、八租户移除时间配置、菜单表内状态胶囊及失败回滚；仅指定两个功能进入本轮工程Issue |
| [077@1.0.1](docs/sdd/SPEC-SUIYIN-ADMIN-077/1.0.1/README.md) | 八租户咨询称谓与三类岗位；原销售默认线上咨询，多选与其他角色保留，不定义岗位差异权限 |
| [073@1.0.0](docs/sdd/SPEC-SUIYIN-ADMIN-073/1.0.0/README.md) | 原15租户工具父级及话术入口迁移；全部艺星辅助线分类/图片自助维护、租户隔离草稿、异常重试、离开守卫与PC效果预览；限定替代旧一级话术和固定库在Admin中的范围 |
| [071@1.3.1](docs/sdd/SPEC-SUIYIN-ADMIN-071/1.3.1/README.md) | 六个现有艺星租户回访规则；共享设置与独立时间节点、节点条件复制、15个回访基准、账号接待权限合同、独立合成数据与存储、旧配置兼容 |
| [REFRESH-001@0.2.0](docs/sdd/SPEC-SUIYIN-ADMIN-REFRESH-001/0.2.0/README.md) | 录音与喜报三新页面、对应入口迁移、本地演示及证据边界；既有页面继续各自原合同 |
| [051@1.1.0](docs/sdd/SPEC-SUIYIN-ADMIN-051/1.1.0/README.md)及[9月29日话术交付补充](docs/sdd/SPEC-SUIYIN-ADMIN-051/1.1.0/deliveries/20260929-language-parity/README.md) | 十五租户、Shell、领域页面及公开样本基线；话术树、末级列表、编辑表单与按租户采样，沿用既有R/AC |
| [052@1.2.0](docs/sdd/SPEC-SUIYIN-ADMIN-052/1.2.0/README.md) | 变声独立任务首次成功计次；失败、试听、重复回调不重复计 |
| [053@1.0.2](docs/sdd/SPEC-SUIYIN-ADMIN-053/1.0.2/README.md) | 销售使用统计分组、日期、部门、小计/合计及租户隔离 |
| [054@1.0.0](docs/sdd/SPEC-SUIYIN-ADMIN-054/1.0.0/README.md)、[055@1.1.0](docs/sdd/SPEC-SUIYIN-ADMIN-055/1.1.0/README.md)、[056@1.0.0](docs/sdd/SPEC-SUIYIN-ADMIN-056/1.0.0/README.md) | 页面证据、筛选与表头冻结、领域结构 |
| [060@1.1.0](docs/sdd/SPEC-SUIYIN-ADMIN-060/1.1.0/README.md)、[068@1.0.0](docs/sdd/SPEC-SUIYIN-ADMIN-068/1.0.0/README.md) | 平台默认结构、各租户菜单拖动、局部覆盖与同租户导航联动 |
| [062@1.0.0](docs/sdd/SPEC-SUIYIN-ADMIN-062/1.0.0/README.md) | 四个既有预约入口的列表/总量/柱线组合图 |
| [058@1.2.0](docs/sdd/SPEC-SUIYIN-ADMIN-058/1.2.0/README.md) | 13租户AI费用、82天固定合成样本、分类趋势与模型 |

菜单表与导航共用有效完整树。平台提供默认顺序和归属，租户明确调整的同级列表及被移动项父级优先；平台当前祖先链隐藏、删除和原权限始终生效。073只迁移指定工具/话术层级，其他合法覆盖保留，隐藏话术不复活；平台登记辅助线不授予非艺星业务权限。旧快照中的默认位置不当作用户明确拖动，也不删除已批准的拖动、预约图表和统计扩展。

变声页保留本轮已见的人员姓名筛选（八目标租户称咨询，其余称销售），仍按稳定销售身份计次，姓名相同不合并。销售使用统计只读取本租户专用快照；未知日期或未采集时保留表头与说明，不补0或借其他租户总量。工作账号样本汇总不冒充跨账号去重人数。

## 预览与发布边界

在仓根运行 `python -m http.server 8148 --bind 127.0.0.1`，用Google Chrome打开 `http://127.0.0.1:8148/prototype/_shell.html?tenant=yestar-sz&page=guideLineManage`，也可从工具管理进入话术。业务演示状态按租户与路由隔离；辅助线未解决队列和草稿均受离开保护，已保存为空不恢复默认。验收使用隔离浏览器或独立QA存储。单文件由生成器产出，不手工编辑。

真实后台只读；不接真实认证、发送、录音上传、共享数据库或生产写接口。原始客户截图、DOM捕获、连接配置和本机诊断资料不放入公开包。未采曲线点、其他筛选区间和未查看详情继续明确为未知或未采集。

历史交付标签`v2026100201-admin-account-type-status`与`v2026093002-admin-menu-permission-label`只证明各自当时范围。2026-10-25的092交付提交、单文件验收、tag推送和远端部署以 [release.json](release.json) 与本轮实际发布回执为准；文档链接不单独证明已经部署。旧 [2026-09-20纠偏](docs/verification/pixel-correction-20260920.md)、[冻结验收](docs/verification/filters-sticky-20260920.md) 和版本化SDD保留历史属性。旧主题及好友独立页见 [历史入口](docs/history/before-admin-live-reference/README.md)，不作为当前Shell实现指令。

原型发布不等于生产上线。073的既有Admin工程Issue为[#442](https://github.com/PetWebOrg/suiyin-admin/issues/442)，负责人王梓先（`build996`），提出环境佰智德三、提出人房昕，当前为`status:todo`；执行以[073交接合同](docs/sdd/SPEC-SUIYIN-ADMIN-073/1.0.0/issue-handoff.md)与[Test Contract](docs/sdd/SPEC-SUIYIN-ADMIN-073/1.0.0/test-contract.md)为准。既有销售变声[#401](https://github.com/PetWebOrg/suiyin-admin/issues/401)、AI费用[#402](https://github.com/PetWebOrg/suiyin-admin/issues/402)、预约图表[#404](https://github.com/PetWebOrg/suiyin-admin/issues/404)、租户菜单[#432](https://github.com/PetWebOrg/suiyin-admin/issues/432)仍由各自精确合同承接。当前17租户是原型验证清单，不是生产白名单；本轮工程只交接时间入口移除与菜单状态胶囊，两新租户登记和077术语/角色不扩为工程任务。不更新开发进度表。

## 本轮工程待办

仅截图第3、4项已建立生产待办：[时间配置入口移除 #448](https://github.com/PetWebOrg/suiyin-admin/issues/448)、[菜单状态胶囊 #449](https://github.com/PetWebOrg/suiyin-admin/issues/449)。两张均指派王争（kitesky），提出人房昕，提出环境佰智德三；原型发布不代表这两项生产功能已经上线。

扫街轨迹工程待办：[Admin #486](https://github.com/PetWebOrg/suiyin-admin/issues/486)，负责人王梓先（build996），提出环境深圳艺星、提出人孤狼，适用所有医美租户。当前为原型交付，生产实现待完成。
