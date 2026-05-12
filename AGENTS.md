# AGENTS.md - 接入平台 2.0 协作上下文

## Codex 使用说明

本文件用于在 `/Users/abe/Desktop/Projects/omnicore_v2` 项目中为 Codex 提供长期协作上下文。后续讨论、需求文档撰写、Demo 分析、页面截图说明、状态机/流程图生成、1.0 与 2.0 对比，都应优先参考本文档。

### 信息来源

- 原始文档：`/Users/abe/Downloads/2.0产品设计.md`
- 文档版本：`v2.0.0`
- 日期：`2026-05-07`
- 状态：待评审
- 产品模块：接入平台 · Channel Integration
- 作者：PalmPay Payment Network 产品团队

### 使用原则

- 不篡改原始设计含义；涉及不确定内容时标记为“待确认”。
- 不遗漏原文中的功能、交互、数据结构、风险和待确认事项。
- 需求评审表达可以重组叙事，但必须能追溯到本文档原文。
- 代码/Demo 分析时，应以本文档作为产品意图基线，而不是仅以当前实现为准。
- 涉及删除文件或目录时，遵守本项目安全约束：禁止批量删除文件或目录；如需批量删除，应停止并请求用户手动处理。

### 快速索引

- 1.0 vs 2.0 差异：见 `1.2 版本对比`
- 设计背景与目标：见 `二、背景与目标`
- 核心概念：见 `三、概念设计`
- 页面导航与数据流：见 `四、整体架构设计`
- 功能优先级：见 `五、功能清单`
- Channel List：见 `6.1`
- Business Type：见 `6.2`
- metaData：见 `6.3`
- matchCapability：见 `6.4`
- Config Integration：见 `6.5`、`6.6`
- Code Integration：见 `6.7`
- 发布流程：见 `七、发布流程设计`
- 全局交互：见 `八、全局交互规范`
- 数据结构：见 `九、数据结构参考`
- 非功能需求：见 `十、非功能性需求`
- 待确认与风险：见 `十一、待确认事项与风险`

---

以下为 2026-05-07 产出的《Channel Integration 2.0 产品设计文档》原文完整收录。

---

# Channel Integration 2.0 产品设计文档
> **文档版本**：v2.0.0  
**状态**：待评审  
**产品模块**：接入平台 · Channel Integration  
**日期**：2026-05-07  
**作者**：PalmPay Payment Network 产品团队
>

---

## 目录
1. 文档说明与阅读指引
2. 背景与目标
3. 概念设计（核心概念定义）
4. 整体架构设计
5. 功能清单
6. 模块详细设计
    - 6.1 Channel List
    - 6.2 Business Type 配置
    - 6.3 metaData（Security / outboundEndpoints / inboundEndpoints）
    - 6.4 matchCapability
    - 6.5 Config Integration — BT & Ability 列表
    - 6.6 Config Integration — Flow 编排（核心模块）
    - 6.7 Code Integration
7. 发布流程设计
8. 全局交互规范
9. 数据结构参考
10. 非功能性需求
11. 待确认事项与风险

---

## 一、文档说明与阅读指引
### 1.1 文档目的
本文档是 Channel Integration 2.0 模块的完整产品设计规范，供以下角色使用：

| 角色 | 用途 |
| --- | --- |
| 前端研发 | 页面结构、组件设计、交互逻辑实现 |
| 后端研发 | 数据结构、接口设计、业务逻辑对齐 |
| 测试工程师 | 测试用例设计依据 |
| 产品评审 | 功能完整性确认 |


### 1.2 版本对比（1.0 vs 2.0）
| 设计维度 | 1.0 | 2.0 |
| --- | --- | --- |
| 配置入口 | Channel 维度单页多 Tab | Channel List + 6个独立操作入口 |
| Flow 编排 | 空白画板，用户自行搭建 | **Step 驱动预生成**，模板骨架 + 局部增删 |
| Context 管理 | 分散在各 L3 节点抽屉中 | **统一 Context 面板**，Ability 级共享 |
| 渠道接入方式 | 仅 Config 接入 | Config Integration + **Code Integration 双轨** |
| 路由匹配 | 不支持 | **matchCapability 独立模块**，Channel 级配置 |
| 发布管理 | 场景维度发布 | **BT & Ability 维度**，多云多环境 |


---

## 二、背景与目标
### 2.1 背景
1.0 版本接入平台在实际渠道接入过程中暴露出以下问题：

+ **配置门槛高**：Flow 画板从空白开始，接入工程师需要熟悉全量组件才能开始配置
+ **入站路由缺失**：Callback / INBOUND 类请求无法通过平台配置实现自动路由，依赖硬编码
+ **Code 接入无平台管理**：非 Config 接入的渠道无法纳入平台发布管控体系
+ **Context 信息分散**：Endpoint / Credential / 全局变量等配置散落在各节点抽屉中，难以全局管理

### 2.2 设计目标
| 目标 | 衡量标准 |
| --- | --- |
| 降低接入配置门槛 | 新渠道 Config 接入配置时长 ≤ 1 天 |
| 统一入站请求路由 | 所有 Callback/INBOUND 请求通过平台配置路由，无需硬编码 |
| 双轨接入管理 | Config 与 Code 接入渠道统一纳入平台发布管控 |
| 上下文集中管理 | Endpoint / Credential / 变量在 Ability 级统一管理，全局可见 |


---

## 三、概念设计
### 3.1 核心概念层级
```plain
Channel（渠道）
  └── Business Type（业务类型，如 COLLECTION / DISBURSEMENT）
          └── Ability（能力，如 CARD_PAY / BANK_TRF）
                  └── Action（动作，如 TRANSACTION / QUERY / REVERSAL）
                          └── Step（步骤，一个 Action 可含多个 Step）
                                  └── Flow（单步内的组件编排，含主Flow/Requery/Callback）
```

### 3.2 概念解释
| 概念 | 定义 | 举例 |
| --- | --- | --- |
| **Channel** | 代表一条支付渠道的完整配置集合，以渠道代码唯一标识 | `GTB_NG`（GTB 尼日利亚渠道） |
| **Business Type (BT)** | 业务类型，代表该渠道支持的交易方向 | `COLLECTION`（收款）/ `DISBURSEMENT`（付款） |
| **Ability** | BT 下的具体支付能力，代表一种支付方式 | `CARD_PAY`（银行卡支付）/ `USSD_PAY`（USSD 支付） |
| **Action** | Ability 下的操作类型，区分请求发起方向 | `TRANSACTION`（上游发起）/ `INBOUND_TRANSACTION`（外部发起） |
| **Step** | 一个 Action 可由多个有序步骤组成，每步有独立的终态获取机制 | `Authorization` → `Capture` → `Settle` |
| **Flow** | 每个 Step 对应的实际组件编排，分主Flow、Requery Flow、Callback Flow | Authorization 主 Flow：`initOrder → network → updateOrder` |
| **接入方式** | 每个 BT 维度的技术接入模式，决定该 BT 下能力的实现方式 | `Config Integration`（平台配置）/ `Code Integration`（代码实现） |
| **Context** | Ability 级共享的运行时上下文，包含 SPI 字段、Credential、全局变量等 | `spi.request.amount` / `credential.apiKey` |


### 3.3 接入方式对比
| 维度 | Config Integration | Code Integration |
| --- | --- | --- |
| 实现方式 | 在平台上通过 Flow 画板配置组件编排 | 工程师编写代码实现 SPI 接口 |
| 适用场景 | 标准化程度高、字段映射明确的渠道 | 逻辑复杂、高度定制化的渠道 |
| 平台管理 | 完整支持（配置版本 + 发布管控） | 完整支持（代码版本 + 发布管控） |
| 编排画板 | ✅ 有 Flow 画板 | ❌ 无画板，进入代码引导页 |


### 3.4 Action 分类
| 分类 | Action 枚举 | 触发方向 | 说明 |
| --- | --- | --- | --- |
| 上游触发 | TRANSACTION | 平台 → 外部渠道 | 标准支付交易 |
| 上游触发 | QUERY | 平台 → 外部渠道 | 主动查询交易状态 |
| 上游触发 | VERIFY | 平台 → 外部渠道 | 验证类（如 OTP 验证） |
| 上游触发 | CANCEL | 平台 → 外部渠道 | 取消交易 |
| 上游触发 | REVERSAL | 平台 → 外部渠道 | 冲正 |
| 外部触发 | INBOUND_TRANSACTION | 外部渠道 → 平台 | 渠道主动推送交易通知 |
| 外部触发 | INBOUND_QUERY | 外部渠道 → 平台 | 渠道主动查询 |


### 3.5 终态获取机制
每个 Step 支持以下一种或多种终态获取方式：

| 方式 | 说明 | 对应 Flow |
| --- | --- | --- |
| **requery** | 平台主动轮询渠道查询终态 | 生成 Requery Flow |
| **callback** | 等待渠道异步回调通知终态 | 生成 Callback Flow |
| **sync** | 当次请求同步返回终态 | 不生成额外 Flow |


### 3.6 Flow 类型对照
| Flow 类型 | 图标 | 触发条件 | 生成规则 |
| --- | --- | --- | --- |
| 上游触发主 Flow | 🔼 | Step 1，Action 为上游触发 | 必有 |
| 外部触发主 Flow | 🌐 | Step 1，Action 为 INBOUND_* | 必有 |
| 事件触发主 Flow | 🔔 | Step 2+，由前序 Step 产生的事件触发 | 必有 |
| Requery Flow | ⏱️ | Step 终态获取方式含 requery | 按配置生成 |
| Callback Flow | 📥 | Step 终态获取方式含 callback | 按配置生成 |


---

## 四、整体架构设计
### 4.1 页面导航结构（最终版）
```plain
接入平台主界面
├── Basic Info（主入口一，复用 1.0）
└── Channel Integration（主入口二）
        └── Channel List（第一个落地页）
                │
                │  每行 Channel 展示：
                │  Channel Code / Country / Party / Channel Status
                │
                └── 操作项（6个，每个进入独立子页面）
                        │
                        ├── Party ──────────────────→ Party 配置页
                        ├── Country ────────────────→ Country 配置页
                        ├── Business Type ──────────→ BT 配置页
                        │                              （维护 Channel×BT 关系 + 接入方式）
                        ├── Credential ─────────────→ Credential 配置页
                        │
                        ├── metaData ──────────────→ 3 个独立二级页面：
                        │                              ├── Security
                        │                              ├── outboundEndpoints
                        │                              └── inboundEndpoints
                        │
                        └── Integration ───────────→ 3 个独立二级页面：
                                                       ├── matchCapability
                                                       ├── Config Integration
                                                       │       └── BT & Ability 列表
                                                       │               └── Flow 编排页
                                                       │                       └── 二级画板
                                                       └── Code Integration
                                                               └── BT & Ability 列表
                                                                       └── 代码接入引导页
```

### 4.2 关键数据流
```plain
[Business Type 配置]
  ↓ 确定 BT 接入方式（Config / Code）
  
[Config Integration — BT & Ability 列表]
  ↓ 只展示接入方式为 Config 的 BT
  ↓ 维护 Ability 粒度配置
  
[Config Integration — Flow 编排页]
  ↓ Action Tab 选择
  ↓ Step 配置 → 预生成 Flow 骨架
  ↓ Flow 画板编排（组件 + Context 字段映射）
  ↓ Submit → 生成版本
  
[Deploy 发布]
  ↓ 选云 + 应用
  ↓ 自动判断目标环境（测试 → PRE → 生产，不可跳级）
  ↓ 门禁检查通过后完成发布
```

---

## 五、功能清单
| 模块 | 功能项 | 优先级 |
| --- | --- | --- |
| Channel List | 渠道列表展示（Code/Country/Party/Status） | P0 |
| Channel List | 新建渠道（弹窗，Code 唯一性校验） | P0 |
| Channel List | 操作项展开（6个入口，含下拉菜单） | P0 |
| Business Type | BT 与 Channel 关系维护 | P0 |
| Business Type | BT 接入方式配置（Config/Code） | P0 |
| metaData | Security 配置 | P1 |
| metaData | outboundEndpoints 管理 | P0 |
| metaData | inboundEndpoints 管理 | P0 |
| matchCapability | 按 inboundEndpoint 分组配置 | P0 |
| matchCapability | 类型 A：基于单号匹配 | P0 |
| matchCapability | 类型 B：基于字段组合匹配，含规则表、拖拽排序、冲突检测 | P0 |
| Config Integration | BT & Ability 列表（含发布状态 Badge） | P0 |
| Config Integration | 新增 Ability（BT 自动过滤） | P0 |
| Config Integration | Action Tab 切换 + Step 自动弹窗 | P0 |
| Config Integration | Step 配置弹窗（分屏，Step 数量 → 逐步配置） | P0 |
| Config Integration | Flow 画板预生成（按 Step 分 Block） | P0 |
| Config Integration | 二级画板三列布局（Context + 组件库 + 画板） | P0 |
| Config Integration | Context 面板（SPI/GeneratedFields/GlobalVar/Endpoint/Credential） | P0 |
| Config Integration | network 组件抽屉（Endpoint 选择 + 字段映射三种模式） | P0 |
| Config Integration | Change Step（增减 Step，含警告） | P1 |
| Config Integration | Save Draft / Submit / 版本生成 | P0 |
| Code Integration | BT & Ability 列表（与 Config 结构一致） | P0 |
| Code Integration | 代码接入引导页（SDK / 接口规范 / 代码示例） | P1 |
| 发布流程 | Deploy 弹窗（选云+应用，环境自动判断） | P0 |
| 发布流程 | Status 弹窗（各云/应用/环境状态） | P0 |
| 发布流程 | Control 弹窗（版本回滚/切流） | P1 |
| 发布流程 | Log 弹窗（编辑操作日志） | P1 |
| 全局 | 面包屑导航（逐级返回） | P0 |
| 全局 | 离开页面保护（未保存修改提示） | P1 |
| 全局 | Toast 操作反馈 | P0 |


---

## 六、模块详细设计
---

### 6.1 Channel List
#### 6.1.1 页面设计
**页面类型**：全宽列表页，无侧边栏。

**页面结构**：

```plain
┌──────────────────────────────────────────────────────────────────────────┐
│  Channel Integration                               [+ New Channel]        │
│──────────────────────────────────────────────────────────────────────────│
│  🔍 Search by Channel Code                                                │
│──────────────────────────────────────────────────────────────────────────│
│  Channel Code   Country            Party          Status    操作          │
│  ────────────   ────────────────   ────────────   ──────    ───────────── │
│  GTB_NG         Nigeria            PalmPay NG     ● Active   [操作 ▾]     │
│                 ↓ 点击展开操作项                                            │
│                 [Party] [Country] [Business Type] [Credential]             │
│                 [metaData ▾] [Integration ▾]                               │
│  ────────────   ────────────────   ────────────   ──────    ───────────── │
│  ZENITH_NG      Nigeria +1         PalmPay NG     ○ Inactive [操作 ▾]     │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 6.1.2 列表字段规范
| 字段 | 类型 | 展示规则 |
| --- | --- | --- |
| Channel Code | String | 纯文本 |
| Country | String[] | Tag 形式，超出 2 个折叠为 `+N`，hover 展示 Tooltip 全量 |
| Party | String | 纯文本 |
| Channel Status | Enum | Active = 绿色圆点 + 文字；Inactive = 灰色圆点 + 文字 |


> **设计约束**：❌ 不展示 Channel Name，❌ 不展示 Deploy Status（发布状态仅在 Integration 子页面中展示）
>

#### 6.1.3 操作项展开交互
**触发**：点击行右侧「操作 ▾」按钮，同行操作区展开（不影响其他行）。

**展开内容**：

```plain
[Party]  [Country]  [Business Type]  [Credential]  [metaData ▾]  [Integration ▾]
```

**metaData ▾ 下拉菜单**：

+ Security → 跳转 metaData Security 独立页面
+ outboundEndpoints → 跳转 metaData outboundEndpoints 独立页面
+ inboundEndpoints → 跳转 metaData inboundEndpoints 独立页面

**Integration ▾ 下拉菜单**：

+ matchCapability → 跳转 matchCapability 独立页面
+ Config Integration → 跳转 Config Integration 独立页面
+ Code Integration → 跳转 Code Integration 独立页面

**同时只允许一行展开操作项**（展开另一行时，前一行自动收起）。

#### 6.1.4 搜索功能
+ **搜索范围**：Channel Code 字段前端实时过滤
+ **触发时机**：实时（onChange）
+ **空结果状态**：展示 Empty 组件，文案「未找到匹配的 Channel Code」

#### 6.1.5 新建 Channel 弹窗
**触发**：点击「+ New Channel」按钮。

**弹窗字段**：

| 字段 | 组件 | 校验规则 |
| --- | --- | --- |
| Channel Code | Input | 必填；仅允许大写字母+数字+下划线；失焦时校验唯一性，重复则报错「Channel Code 已存在」；创建后不可修改 |
| Country | Select（multi） | 必填；枚举由后端接口提供 |
| Party | Select（单选） | 必填；枚举由后端接口提供 |
| Status | Radio | 必填；默认 Inactive |


**交互流程**：

```plain
点击 [+ New Channel]
  → 弹出弹窗
  → 填写表单
  → 点击 [Create]
    → 前端表单校验（必填项 + 格式校验）
    → 通过 → 调用创建接口
      → 成功：关闭弹窗 + 列表末尾追加新行 + 新行背景色 #e6f4ff 高亮 2 秒 + Toast「Channel created successfully」
      → 失败：弹窗内顶部 Banner 报错（接口返回的错误信息）
    → 不通过 → 字段下方行内报错提示
  → 点击 [Cancel] → 弹出「当前修改将丢失，是否确认退出？」确认框
```

#### 6.1.6 空状态设计
列表无数据时展示：

```plain
[ 图标 ]
暂无渠道数据
点击「+ New Channel」创建第一个渠道
```

---

### 6.2 Business Type 配置页
#### 6.2.1 页面设计
```plain
┌──────────────────────────────────────────────────────────┐
│  Channel Integration / GTB_NG / Business Type            │
│──────────────────────────────────────────────────────────│
│  Business Type 配置                [+ Add Business Type] │
│──────────────────────────────────────────────────────────│
│  Business Type   接入方式                       操作      │
│  ─────────────   ─────────────────────────────  ──────   │
│  COLLECTION      ● Config Integration  ○ Code   Delete   │
│  DISBURSEMENT    ○ Config Integration  ● Code   Delete   │
└──────────────────────────────────────────────────────────┘
```

#### 6.2.2 功能职责（严格边界）
**此页面仅做两件事**：

1. ✅ 维护该 Channel 支持哪些 Business Type（勾选关系）
2. ✅ 维护每个 BT 的接入方式（Config Integration / Code Integration）

**此页面不做**：

+ ❌ 不维护 Ability（Ability 在 Integration 子页面维护）
+ ❌ 不展示发布状态
+ ❌ 不执行发布操作

#### 6.2.3 接入方式修改交互
**行为**：接入方式列为行内 Radio，用户点击切换时触发确认弹窗。

**确认弹窗内容**：

```plain
标题：确认切换接入方式

内容：切换「{BT名称}」的接入方式为「{新接入方式}」后，
     该 BT 下已有的 Ability 配置将全部清除，且不可恢复。
     是否继续？

按钮：[Cancel]  [Confirm]
```

**交互细节**：

+ 用户点击新 Radio 后，**Radio 不立即切换**，等弹窗确认后再切换
+ 点击 Cancel：Radio 恢复原值，弹窗关闭
+ 点击 Confirm：执行切换 + 清除对应 BT 下的 Ability 配置 + Toast「接入方式已更新」

#### 6.2.4 新增 BT 弹窗
**触发**：点击「+ Add Business Type」

**弹窗字段**：

| 字段 | 组件 | 规则 |
| --- | --- | --- |
| Business Type | Select | 必填；枚举全量由后端提供；已存在的 BT 从选项中移除（不可重复添加） |
| 接入方式 | Radio | 必填；默认 Config Integration |


#### 6.2.5 删除 BT
**触发**：点击行内 Delete 按钮

**确认弹窗**：

```plain
标题：确认删除

内容：删除「{BT名称}」后，该 BT 下已有的 Ability 配置将全部清除，且不可恢复。

按钮：[Cancel]  [Confirm Delete（红色）]
```

---

### 6.3 metaData 子页面
metaData 包含三个独立子页面，通过 Channel List 操作项 → metaData ▾ 下拉菜单分别进入。

#### 6.3.1 Security 页面
**功能**：管理渠道签名与加密配置。

**字段设计**：

| 字段 | 组件 | 说明 |
| --- | --- | --- |
| 签名算法 | Select | 枚举：MD5 / SHA256 / RSA / HMAC-SHA256 |
| 签名密钥 | Input（Password） | 输入后脱敏展示 `••••••••`，提供「显示/隐藏」切换 |
| 加密方式 | Select | 枚举：无 / AES / RSA |
| 加密密钥 | Input（Password） | 同签名密钥，脱敏处理 |


**操作按钮**：[Save]（保存草稿）[Submit]（提交生效）

#### 6.3.2 outboundEndpoints 页面
**功能**：管理该渠道的出站接口端点列表，供 Config Integration Flow 画板中的 network 组件引用。

**页面结构**：

```plain
┌────────────────────────────────────────────────────────────────────┐
│  [← 返回]  GTB_NG · outboundEndpoints         [+ Add Endpoint]     │
│────────────────────────────────────────────────────────────────────│
│  Endpoint Name      URL                        Method    操作       │
│  ──────────────     ─────────────────────────  ──────    ────────── │
│  charge_endpoint    https://api.gtb.ng/charge  POST      Edit Delete│
│  query_endpoint     https://api.gtb.ng/query   GET       Edit Delete│
└────────────────────────────────────────────────────────────────────┘
```

**Endpoint 详情字段**（新增/编辑弹窗）：

| 字段 | 组件 | 说明 |
| --- | --- | --- |
| Endpoint Name | Input | 必填，唯一，供 Flow 画板选择引用 |
| URL | Input | 必填，HTTP/HTTPS URL |
| Method | Select | 必填，枚举：GET / POST / PUT / DELETE |
| Headers | KV 列表 | 可选，支持新增/删除 KV 行 |
| 字段结构定义 | Schema 编辑器 | 定义 Request / Response 的字段列表（字段名 + 类型），供 Flow 画板字段映射时使用 |


**删除保护**：若该 Endpoint 已被 Flow 画板的 network 组件引用，删除前弹警告，列出引用位置。

#### 6.3.3 inboundEndpoints 页面
**功能**：管理该渠道的入站接口端点列表，供 matchCapability 配置使用。

**字段设计与 outboundEndpoints 基本一致**，额外包含：

+ 入站字段结构定义（Request 字段列表），供 matchCapability 配置匹配字段时选择

---

### 6.4 matchCapability 页面
#### 6.4.1 设计概述
**模块定位**：将外部入站请求（渠道 Callback / INBOUND 类）路由到正确的 BT + Ability + Action。

**维度**：**Channel 级别**，统一入口；内部按 inboundEndpoint 分组，**每个 inboundEndpoint 独立配置一套匹配规则**。

**页面结构**：

```plain
┌──────────────────────────────────────────────────────────────────────┐
│  [← 返回]  GTB_NG · matchCapability             [Save]  [Submit]     │
│──────────────────────────────────────────────────────────────────────│
│                                                                       │
│  ▼ callback_endpoint                                                  │
│  ─────────────────────────────────────────────────────────────────── │
│  Match 类型：● 基于单号匹配   ○ 基于字段组合匹配 Ability              │
│  ...（配置内容）                                                       │
│                                                                       │
│  ▶ notify_endpoint                                                    │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

+ **inboundEndpoint 列表来源**：metaData → inboundEndpoints 中已配置的端点
+ 每个 inboundEndpoint 为一个折叠/展开块（Collapse Panel），Panel 标题 = Endpoint 名称
+ **若 inboundEndpoints 为空**，页面展示空状态 + 提示「请先在 metaData → inboundEndpoints 中配置入站端点」

#### 6.4.2 Match 类型 A — 基于单号匹配
**适用场景**：入站请求报文中携带平台单号，可通过单号直接反查对应订单，从而确定 BT / Ability / Action。

**配置内容**：

```plain
单号字段：
请选择入站请求中哪个字段携带了平台单号：

[Select 下拉，枚举来自该 inboundEndpoint 的字段结构定义]
例：body.orderId

提示：平台将用该字段的值检索订单，自动路由到对应 Ability。
```

#### 6.4.3 Match 类型 B — 基于字段组合匹配 Ability
**适用场景**：入站请求不携带平台单号，需通过字段值组合来判断该请求属于哪个 Ability + Action。

**配置分两步**：

**Step 1 — 选择参与匹配的字段**：

```plain
参与匹配的字段（多选）：
[Tag Select，options 来自该 inboundEndpoint 的字段结构]
已选：[body.transType ×]  [body.channel ×]
```

**Step 2 — 配置规则表**：

```plain
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ≡  body.transType    body.channel    →  BT              Ability      Action      操作 │
│──────────────────────────────────────────────────────────────────────────────────│
│  ≡  [purchase      ]  [card       ]  →  [COLLECTION ▾]  [CARD_PAY ▾] [TRANS.. ▾] 🗑️  │
│  ≡  [purchase      ]  [ussd       ]  →  [COLLECTION ▾]  [USSD_PAY ▾] [TRANS.. ▾] 🗑️  │
│  ≡  [transfer      ]  [*          ]  →  [DISBURSEM.. ▾] [BANK_TRF ▾] [TRANS.. ▾] 🗑️  │
│──────────────────────────────────────────────────────────────────────────────────│
│  [+ Add Rule]（虚线按钮，block 宽度）                                              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**规则表设计规范**：

| 元素 | 说明 |
| --- | --- |
| 字段列 | 按 Step 1 选定的字段动态渲染（最多展示参与匹配的字段列） |
| 通配符 `*` | 表示该字段任意值均命中此规则 |
| BT 下拉 | 枚举来自该渠道 Business Type 配置页中已添加的 BT |
| Ability 下拉 | 根据 BT 值过滤，枚举来自 Integration → Config/Code Integration 中已添加的 Ability |
| Action 下拉 | 枚举：TRANSACTION / QUERY / VERIFY / CANCEL / REVERSAL |
| 规则优先级 | 从上到下依次匹配，命中第一条即停止 |
| 拖拽排序 | 每行左侧 `≡` 拖拽手柄，支持拖拽调整规则顺序 |
| 冲突检测 | 字段值组合完全相同（非通配符）的规则冲突：冲突行整行红色背景 `#fff2f0`，右侧 Tooltip 提示「规则冲突：与第 N 条重复」 |


#### 6.4.4 Save / Submit 行为
| 操作 | 行为 |
| --- | --- |
| Save | 保存当前配置为草稿，不提交生效，Toast「Saved successfully」 |
| Submit | 提交配置，与 Config Integration 发布流程联动（进入「待发布」状态） |


---

### 6.5 Config Integration — BT & Ability 列表
#### 6.5.1 页面设计
```plain
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  [← 返回]  GTB_NG · Integration · Config Integration          [+ Add Ability]         │
│──────────────────────────────────────────────────────────────────────────────────────│
│  Business Type  Ability    发布状态                                    操作            │
│  ─────────────  ─────────  ──────────────────────────────────────────  ─────────────  │
│  COLLECTION     CARD_PAY   [AWS · 生产] [GCP · 测试]                   Modify Detail  │
│                                                                        Deploy Status  │
│                                                                        Log    Control │
│  ─────────────  ─────────  ──────────────────────────────────────────  ─────────────  │
│  COLLECTION     USSD_PAY   草稿                                        Modify Delete  │
│  ─────────────  ─────────  ──────────────────────────────────────────  ─────────────  │
│  DISBURSEMENT   BANK_TRF   待发布                                      Modify Detail  │
│                                                                        Deploy Status  │
│                                                                        Log    Control │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

#### 6.5.2 发布状态列设计
| 状态值 | 视觉展示 | 颜色 |
| --- | --- | --- |
| `draft`（草稿） | Tag「草稿」 | 灰色 |
| `pending`（待发布） | Tag「待发布」 | 橙色 |
| `published`（已发布） | Badge `[云名 · 环境层级]` | 蓝色 |


**Badge 规则**：

+ 格式：`[{CloudName} · {EnvLevel}]`，如 `[AWS · 生产]` / `[GCP · PRE]` / `[GCP · 测试]`
+ 环境层级枚举：**测试 / PRE / 生产**
+ 同一 Ability 可发布到多云多环境，每个组合一个 Badge，行内换行展示
+ 超出 2 个时折叠为 `+N`，hover 展开 Tooltip 显示全量

#### 6.5.3 操作项规则
| 操作 | 可用条件 | 跳转/行为 |
| --- | --- | --- |
| **Modify** | 始终可用 | 进入 Flow 编排页（编辑态） |
| **Detail** | 有已提交版本（状态非草稿） | 进入 Flow 编排页（只读态），顶部版本选择器 |
| **Deploy** | 状态为「待发布」或「已发布」 | 打开 Deploy 弹窗 |
| **Status** | 有任意已发布记录 | 打开 Status 弹窗 |
| **Log** | 始终可用 | 打开 Log 弹窗 |
| **Control** | 有已发布记录 | 打开 Control 弹窗 |
| **Delete** | 仅「草稿」状态 | 二次确认弹窗，确认后删除（不可恢复） |


**操作项显示规则**：

+ 草稿状态：仅显示 Modify + Delete
+ 其他状态：显示 Modify / Detail / Deploy / Status / Log / Control

#### 6.5.4 新增 Ability
**BT 数据来源**：自动过滤 Business Type 配置页中接入方式为「Config Integration」的 BT。用户无需手动区分，平台自动隔离。

**弹窗设计**：

```plain
┌────────────────────────────────────────────┐
│  Add Ability                               │
│  ──────────────────────────────────────────│
│  Business Type:                            │
│  [下拉选择，枚举=Config Integration的BT ▾] │
│                                            │
│  Ability:                                  │
│  [下拉选择，由BT过滤后的枚举 ▾]            │
│                                            │
│                   [Cancel]  [Confirm]       │
└────────────────────────────────────────────┘
```

**Ability 枚举映射**（参考，实际以后端枚举为准）：

+ COLLECTION → CARD_PAY / USSD_PAY / WALLET_PAY / BANK_TRANSFER_IN 等
+ DISBURSEMENT → BANK_TRF / WALLET_OUT 等

**创建后**：新行追加到列表末尾，状态为「草稿」，自动触发跳转至 Flow 编排页（Modify）。

---

### 6.6 Config Integration — Flow 编排页（核心模块）
#### 6.6.1 编排页整体布局
```plain
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  [← 返回]  GTB_NG · COLLECTION · CARD_PAY · Config Integration                           │
│──────────────────────────────────────────────────────────────────────────────────────────│
│  [TRANSACTION] [QUERY] [VERIFY] [CANCEL] [REVERSAL] [INBOUND_TRANSACTION] [INBOUND_QUERY]│
│──────────────────────────────────────────────────────────────────────────────────────────│
│                                            [Change Step]  [Save Draft]  [Submit]          │
│                                                                                           │
│  Flow 画板区（Step 提交后渲染 FlowCanvas）                                                 │
│  或                                                                                       │
│  空状态（首次进入 / 未配置 Step）：「点击 Change Step 开始配置」                             │
│                                                                                           │
│  ─────────────────（点击 Flow 卡片 Edit 后，下方展开二级画板）─────────────────            │
│                                                                                           │
│  二级画板：三列布局（Context 面板 | 组件库 | 画板区）                                       │
│                                                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 6.6.2 Action Tab 设计
| Tab | 触发方向 | 说明 |
| --- | --- | --- |
| TRANSACTION | 上游触发 | 标准支付交易主流程 |
| QUERY | 上游触发 | 主动查询交易状态 |
| VERIFY | 上游触发 | 验证类操作（如 OTP） |
| CANCEL | 上游触发 | 取消交易 |
| REVERSAL | 上游触发 | 冲正操作 |
| INBOUND_TRANSACTION | 外部触发 | 渠道主动推送交易通知 |
| INBOUND_QUERY | 外部触发 | 渠道主动发起查询 |


**Tab 切换行为**：

+ 切换到**未配置 Step** 的 Tab → 自动弹出 Step 配置弹窗
+ 切换到**已配置 Step** 的 Tab → 直接展示该 Action 对应的 FlowCanvas
+ **Context 面板切换规则**：仅 SPI 模块随 Action Tab 切换而刷新；其余模块（Endpoint / Credential / Global Variable / Generated Fields）内容保持不变（Ability 级共享）

**顶部右侧常驻按钮**：

| 按钮 | 触发条件 | 行为 |
| --- | --- | --- |
| **Change Step** | 始终可用 | 打开 Step 配置弹窗（已有配置时传入已有 Steps） |
| **Save Draft** | 有修改时高亮 | 保存草稿，不提交，Toast「Saved successfully」 |
| **Submit** | 始终可用 | 提交当前配置，生成版本号，状态变为「待发布」，Toast「Submitted, version vX.X.X generated」 |


**离开保护**：有未保存修改时切换 Tab 或点击返回，弹确认弹窗（见全局规范 8.2）。

---

#### 6.6.3 Step 配置弹窗
##### 触发时机
+ 首次进入某 Action Tab → **自动弹出**
+ 点击「Change Step」按钮 → 手动触发

##### 弹窗设计（分屏流程）
**第一屏 — Step 数量输入**：

```plain
┌───────────────────────────────────────────────────┐
│  Configure Steps                                  │
│  Action: TRANSACTION                              │
│  ─────────────────────────────────────────────────│
│  该 Action 共有几个交易步骤？                       │
│                                                   │
│  Step Count:   [ 3 ▲▼ ]   （min=1，无上限）        │
│                                                   │
│  💡 每个 Step 对应一个独立的 Flow 编排单元           │
│                                                   │
│                          [Cancel]  [Next →]       │
└───────────────────────────────────────────────────┘
```

**第 N 屏 — Step N 详细配置**：

```plain
┌────────────────────────────────────────────────────────────┐
│  Configure Steps  ●──●──○  Step 2 / 3                     │
│  ──────────────────────────────────────────────────────────│
│  Step Name:                                                │
│  [ Capture                                              ]  │
│                                                            │
│  触发方式（只读，由 Action 类型自动决定）:                  │
│  ▶ 上游触发（INBOUND_* 类型显示「外部触发」）               │
│                                                            │
│  终态获取方式（必选，多选）:                                │
│  ☑ requery    ☐ callback    ☐ sync                         │
│                                                            │
│  产生事件（本步骤完成后产生的事件，非最后 Step 必填）:       │
│  [CAPTURE_SUCCESS ×]  [CAPTURE_FAILED ×]  [+]              │
│  （枚举来自后端事件字典，支持搜索）                          │
│                                                            │
│  触发事件（Step 2 起必填，枚举=前序所有 Step 产生事件之和）: │
│  [AUTH_SUCCESS ×]  [+]                                     │
│                                                            │
│                             [← Back]  [Next →]             │
└────────────────────────────────────────────────────────────┘
```

**最后一屏末尾按钮**：`[← Back]  [Submit Steps]`

##### Step 字段规范
| 字段 | 必填规则 | 特殊规则 |
| --- | --- | --- |
| Step Name | 必填 | 同一 Action 内唯一，不允许重复 |
| 触发方式 | 只读 | INBOUND_* = 外部触发；其余 = 上游触发 |
| 终态获取方式 | 必选，至少一项 | 多选：requery / callback / sync |
| 产生事件 | Step 1 ~ N-1 必填 | 最后一个 Step 不展示此字段 |
| 触发事件 | Step 2 起必填 | 枚举 = 前序所有 Step 的 produceEvents 并集（去重） |


##### Change Step 修改行为
| 操作 | 规则 |
| --- | --- |
| 增加 Step | 在末尾新增，需配置新 Step 的 Name / 终态获取方式 / 触发事件（枚举来自已有 Steps 产生事件），已有 Steps 配置不受影响 |
| 减少 Step | 先弹警告弹窗，列出将被删除的 Flow 清单（Step N - {Name} - 主 Flow / Requery / Callback），确认后删除 |


**减少 Step 警告弹窗**：

```plain
⚠️ 减少 Step 将删除以下 Flow 的全部配置，且不可恢复：
   · Step 3 - Settle - 主 Flow
   · Step 3 - Settle - Requery Flow

请确认是否继续？

              [Cancel]  [Confirm Delete（红色）]
```

---

#### 6.6.4 Flow 画板区（FlowCanvas）
##### Step 提交后自动渲染
Step 配置完成后，画板区自动渲染 FlowCanvas，按 Step 分 Block 展示。

**FlowCanvas 结构示例**（3 Steps，TRANSACTION Action）：

```plain
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 1 · Authorization                                                   │
│  ┌────────────────────────┐  ┌────────────────────────┐                  │
│  │ 🔼 上游触发             │  │ ⏱️ Requery              │                  │
│  │ Authorization 主 Flow   │  │ Authorization Requery   │                  │
│  │ ○ 未开始                │  │ ○ 未开始                │                  │
│  │               [Edit]   │  │               [Edit]   │                  │
│  └────────────────────────┘  └────────────────────────┘                  │
├──────────────────────────────────────────────────────────────────────────┤
│  Step 2 · Capture                                                         │
│  ┌────────────────────────┐  ┌────────────────────────┐                  │
│  │ 🔔 事件触发             │  │ ⏱️ Requery              │                  │
│  │ 触发事件：AUTH_SUCCESS  │  │ Capture Requery         │                  │
│  │ Capture 主 Flow         │  │ ○ 未开始                │                  │
│  │ ○ 未开始                │  │               [Edit]   │                  │
│  │               [Edit]   │  └────────────────────────┘                  │
│  └────────────────────────┘                                               │
├──────────────────────────────────────────────────────────────────────────┤
│  Step 3 · Settle                                                          │
│  ┌────────────────────────┐  ┌────────────────────────┐                  │
│  │ 🔔 事件触发             │  │ ⏱️ Requery              │                  │
│  │ 触发事件：CAPTURE_SUCCESS│  │ Settle Requery          │                  │
│  │ Settle 主 Flow          │  │ ○ 未开始                │                  │
│  │ ○ 未开始                │  │               [Edit]   │                  │
│  │               [Edit]   │  └────────────────────────┘                  │
│  └────────────────────────┘                                               │
└──────────────────────────────────────────────────────────────────────────┘
```

##### Flow 卡片状态
| 状态 | 标识 | 卡片边框颜色 | 说明 |
| --- | --- | --- | --- |
| 未开始 | ○ 未开始 | `#d9d9d9`（灰色） | 尚未进入编辑 |
| 编辑中 | 🔵 编辑中 | `#1677ff`（蓝色） | 有修改未保存 |
| 已完成 | ✅ 已完成 | `#52c41a`（绿色） | 配置完整无错误 |
| 有错误 | ⚠️ 有错误 | `#ff4d4f`（红色） | 存在校验错误 |


##### Flow 卡片尺寸规范
| 属性 | 值 |
| --- | --- |
| 宽度 | 220px |
| 最小高度 | 130px |
| 圆角 | 8px |
| 阴影 | `0 2px 8px rgba(0,0,0,0.1)` |
| 边框 | 2px solid（颜色按状态） |
| 卡片间距 | margin: 8px |


---

#### 6.6.5 二级画板（Flow 组件编排页）
点击任意 Flow 卡片的 `[Edit]` → 在 FlowCanvas 下方以 Collapse 展开方式显示二级画板（路由跳转）。

##### 三列布局
```plain
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  [← 收起]  CARD_PAY · TRANSACTION · Step1 Authorization · 主 Flow          [Done]        │
├────────────────────┬────────────────────────┬──────────────────────────────────────────────┤
│  Context 面板       │  组件库                 │  画板（组件编排区）                             │
│  (240px, 固定宽)   │  (280px, 固定宽)        │  (剩余宽度，flex: 1)                           │
│  overflow-y: auto  │  overflow-y: auto       │  overflow-y: auto, background: #fafafa        │
└────────────────────┴────────────────────────┴──────────────────────────────────────────────┘
```

---

#### 6.6.6 Context 面板详细设计
##### 面板模块汇总
| 模块 | 共享维度 | 交互能力 | 路径前缀 | Tag 颜色 |
| --- | --- | --- | --- | --- |
| **SPI** | Action 级（切 Tab 刷新） | 眼睛图标查看完整结构 | `spi.request.xxx` / `spi.response.xxx` | 🔵 蓝色 |
| **Generated Fields** | Ability 级 | `[+]` 配置新字段（规则：随机数/时间戳） | `generatedFields.xxx` | 🟢 绿色 |
| **Global Variable** | Ability 级 | `[+]` KV 输入 | `globalVar.xxx` | 🟣 紫色 |
| **Endpoint** | Ability 级 | 纯回显，network 组件选择后自动同步 | 不直接引用 | — |
| **Credential** | Ability 级 | 纯回显，永久脱敏 | `credential.xxx` | 🟠 橙色 |


> **不在 Context 面板的内容**：❌ Country ❌ Party ❌ Line（与 1.0 设计不同，已移除）
>

##### SPI 模块设计
```plain
SPI  [👁️]
─────────────────────────
request
  ├─ 🔵 spi.request.amount
  ├─ 🔵 spi.request.currency
  ├─ 🔵 spi.request.merchantId
  ├─ 🔵 spi.request.orderId
  └─ 🔵 spi.request.cardNo
response
  ├─ 🔵 spi.response.status
  ├─ 🔵 spi.response.code
  └─ 🔵 spi.response.channelRef
```

+ **眼睛图标** → 弹 Modal，以 Tree 组件展示完整字段结构样例（字段名 + 类型 + 示例值）
+ 字段 Tag 可点击，点击后触发 Context 选择联动（见下方联动设计）

##### Generated Fields 配置弹窗
```plain
┌────────────────────────────────────────────┐
│  Add Generated Field                       │
│  ──────────────────────────────────────────│
│  Field Name:  [ refNo                   ]  │
│                                            │
│  生成规则：                                 │
│  ● 随机数                                  │
│    位数：[ 16 ▲▼ ]   样例：8372910284756392│
│  ○ 时间戳                                  │
│    格式：[ yyyyMMddHHmmssSSS ]             │
│    样例：20260507143022123                 │
│                                            │
│                    [Cancel]  [Confirm]      │
└────────────────────────────────────────────┘
```

##### 引用计数与删除保护
+ 每个被 Flow 内组件引用的 Context 字段，右侧显示引用计数 `[N]`
+ 尝试删除引用次数 > 0 的字段时，弹警告弹窗：

```plain
⚠️ 该字段被以下组件引用，删除后这些组件的配置将失效：
   · network 组件（Step 1 主 Flow）- merchantId 字段
   · network 组件（Step 2 Requery）- merchantId 字段

确认删除？
              [Cancel]  [Confirm Delete（红色）]
```

##### Context 与画板联动交互
触发场景：用户在 network 组件抽屉中点击某个字段输入框（需要选择 Context 字段时）。

**交互流程**：

```plain
点击抽屉字段输入框
  → 输入框边框变蓝（激活状态）
  → 左侧 Context 面板整体高亮放大（其余区域降低透明度至 0.4）
  → 用户在 Context 面板点击目标字段 Tag
    → 字段路径回填到抽屉输入框
    → Context 面板恢复正常尺寸和透明度
    → 输入框显示已选字段名（带颜色标识）
```

##### 字段颜色规范（全局统一）
| 字段来源 | 颜色 | 示例 |
| --- | --- | --- |
| spi.request / spi.response | 🔵 蓝色 `#1677ff` | `spi.request.amount` |
| globalVar | 🟣 紫色 `#722ed1` | `globalVar.currency` |
| generatedFields | 🟢 绿色 `#52c41a` | `generatedFields.refNo` |
| credential | 🟠 橙色 `#fa8c16`（永久脱敏） | `credential.apiKey` |
| 条件赋值结果 | 🟡 黄色 `#faad14` | — |


---

#### 6.6.7 组件库设计
##### 组件分组
**Outbound 组件**（处理向外部发起请求的场景）：

| 组件名 | 图标 | 说明 |
| --- | --- | --- |
| `network` | 🌐 | 向渠道发起 HTTP 请求，核心必选组件，点击配置字段映射 |
| `generateReference` | 🔢 | 生成平台侧参考号，写入 generatedFields |
| `condition` | 🔀 | 条件分支逻辑（AND / OR / 多路 / DEFAULT） |
| `initOrder` | 📋 | 在平台创建订单记录 |
| `updateOrder` | ✏️ | 更新订单状态 |


**Inbound 组件**（处理外部入站请求相关）：

| 组件名 | 图标 | 说明 |
| --- | --- | --- |
| `parseInboundRequest` | 📨 | 解析渠道入站请求报文，提取字段到 Context |
| `buildInboundResponse` | 📤 | 构造返回给渠道的响应报文 |
| `sendInboundResponse` | 📮 | 发送响应给渠道 |
| `sendMockOrderMQ` | 📡 | 发送 MQ 消息触发订单处理流程 |
| `requestBusinessAccessLayer` | 🔗 | 请求内部业务接入层处理 |
| `queryOrder` | 🔍 | 查询平台订单信息 |


##### 完全不对用户渲染的组件
以下组件为系统底层处理，不在画板中展示，不出现在组件库中：

| 组件 | 原因 |
| --- | --- |
| `eventListener` | 系统内部事件监听机制 |
| `sendCompleteMQ` | 系统内部完成态消息发送 |
| `parseServletRequest` | HTTP 层统一处理，外层已处理 |
| `matchCapability` | 已通过 matchCapability 模块独立配置 |


##### 组件拖拽交互
+ 组件库面板中每个组件为可拖拽卡片（`draggable=true`）
+ 拖拽到右侧画板区的目标位置后松手 → 组件插入到目标位置
+ 插入后画板区自动滚动显示新增组件

---

#### 6.6.8 画板区（组件编排）设计
##### 各 Action / Flow 类型预置模板组件
> **设计原则**：平台根据 Action 类型和 Flow 类型自动预生成模板骨架，用户在骨架基础上局部增删，无需从空白开始。
>

---

**TRANSACTION / VERIFY / CANCEL / REVERSAL**（四者模板一致）

| Flow 类型 | 预置组件序列 |
| --- | --- |
| 上游触发 - Step 1 主 Flow | `initOrder` → `network` → `updateOrder` |
| 事件触发 - Step 2+ 主 Flow | `network` → `updateOrder` |
| Requery Flow | `network` → `updateOrder` |
| Callback Flow | `parseInboundRequest` → `updateOrder` → `buildInboundResponse` → `sendInboundResponse` |


可选追加组件：`generateReference` / `network`（额外调用）/ `condition`

---

**QUERY**

| Flow 类型 | 预置组件序列 |
| --- | --- |
| 上游触发 - 主 Flow | `network` |
| 事件触发 - 其他 Flow | `network` → `updateOrder` |
| Requery Flow | `network` → `updateOrder` |


---

**INBOUND_TRANSACTION**

| Flow 类型 | 预置组件序列 | 特殊说明 |
| --- | --- | --- |
| 外部触发 - 主 Flow | `parseInboundRequest` → `initOrder`（可删）→ `sendMockOrderMQ` → `buildInboundResponse` → `sendInboundResponse` | `initOrder` 为可选：不需要落单时直接删除，无需切换模板 |
| 事件触发 - 其他 Flow | `network` → `updateOrder` | — |


---

**INBOUND_QUERY**

| Flow 类型 | 预置组件序列 | 特殊说明 |
| --- | --- | --- |
| 外部触发 - 主 Flow | `parseInboundRequest` → `[互斥单选]` → `buildInboundResponse` → `sendInboundResponse` | 中间节点为互斥单选：`requestBusinessAccessLayer`（内部请求）or `queryOrder`（网关直返），二选一 |


---

##### 组件节点设计
```plain
┌──────────────────────────────────────────────────────────┐
│  ≡  [🌐 network]  [点击配置]                        [×]  │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│  ≡  [📋 initOrder]  [可删除]                        [×]  │
└──────────────────────────────────────────────────────────┘
```

| 元素 | 说明 |
| --- | --- |
| `≡` 拖拽手柄 | 左侧，灰色，hover 变深，cursor: grab |
| 组件图标 + 名称 | 固定 |
| 辅助 Tag | `[点击配置]`（network 组件）/ `[可删除]`（INBOUND_TX 中的 initOrder） |
| `[×]` 删除按钮 | 右侧，默认隐藏，hover 组件节点时显示 |


**节点高度**：48px  
**节点样式**：白色背景，`#e8e8e8` 边框，hover 时边框变 `#1677ff`，圆角 6px，margin-bottom: 8px

##### INBOUND_QUERY 互斥组件交互
```plain
┌────────────────────────────────────────────────────────────────┐
│  请选择处理模式（二选一）：                                       │
│  ● requestBusinessAccessLayer（请求内部业务接入层）               │
│  ○ queryOrder（网关直接查询订单后返回）                           │
└────────────────────────────────────────────────────────────────┘
```

+ Radio 切换时，画板显示对应模式的提示说明
+ 两者互斥，选择后另一个从组件库中移除（不可再拖入）

---

#### 6.6.9 network 组件抽屉详细设计
点击画板中 `network` 组件 → 右侧弹出抽屉，width=620px，placement=right。

##### 抽屉结构
```plain
┌──────────────────────────────────────────────────────────────────────────────┐
│  network 组件配置                                                      [✕]   │
│──────────────────────────────────────────────────────────────────────────────│
│  Endpoint:                                                                    │
│  [下拉选择，枚举来自 outboundEndpoints ______________________ ▾]              │
│  选择后自动同步到左侧 Context 面板 Endpoint 模块                               │
│──────────────────────────────────────────────────────────────────────────────│
│  字段映射配置（选择 Endpoint 后展示）                                          │
│                                                                               │
│  Endpoint字段     赋值模式        配置区域                  类型    Operation  │
│  ───────────────  ─────────────   ────────────────────────  ──────  ─────────  │
│  merchantId       [直接取值 ▾]    [spi.request.merchantId]  String  [无转换▾]  │
│  amount           [条件赋值 ▾]    → 展开条件配置区域...                        │
│  currency         [直接取值 ▾]    [globalVar.currency    ]  String  [无转换▾]  │
│  sign             [固定值   ▾]    [ SHA256               ]  String            │
│  callbackUrl      [直接取值 ▾]    [点击选择 Context 字段  ]  String  [无转换▾]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

##### 三种赋值模式详细设计
**模式一：直接取值**

+ 配置区域展示只读 Input
+ placeholder = 「点击选择 Context 字段」
+ 点击 Input → **左侧 Context 面板高亮放大**（其余区域遮罩），用户点选字段 Tag → 路径回填
+ 已选字段以对应颜色的 Tag 展示在 Input 内（如蓝色 `spi.request.amount`）

**模式二：条件赋值**

```plain
条件配置区域展开：

IF  [字段路径 Input▸]  [ == ▾]  [ NGN    ]  →  [spi.request.amount  ▸]  [×]
IF  [字段路径 Input▸]  [ == ▾]  [ GHS    ]  →  [spi.request.amount  ▸]  [×]
默认  ───────────────────────────────────────────  [spi.request.amount  ▸]

[+ Add Condition]（dashed Button）
```

| 元素 | 说明 |
| --- | --- |
| 字段路径 Input | readOnly，点击触发 Context 面板高亮选择 |
| 操作符 Select | 枚举：== / != / > / < / >= / <= |
| 值 Input | 普通文本输入，也可点击选择 Context 字段 |
| 结果 Input | readOnly，点击触发 Context 面板高亮选择 |
| 默认值 | 必填，无条件命中时使用 |
| [+ Add Condition] | 追加新条件行，支持多条件分支 |


**模式三：固定值**

+ 配置区域展示普通 Input，直接输入常量字符串

##### Operation（类型转换）
| 值 | 说明 | 额外参数 |
| --- | --- | --- |
| 无转换 | 原值直接传递 | — |
| 乘以 N | 金额单位换算 | 展示 InputNumber（倍数，如 100） |
| 字符串格式化 | 日期格式转换等 | 展示格式模板 Input |
| 自定义表达式 | 支持简单表达式 | 展示表达式 Input |


---

## 七、发布流程设计
### 7.1 发布状态流转
```plain
草稿（draft）
  ↓ [Submit]
待发布（pending）
  ↓ [Deploy]
测试环境已发布
  ↓ [Deploy]（门禁：Happy Path 全部通过）
PRE 环境已发布
  ↓ [Deploy]（门禁：全套件通过 + 覆盖率 ≥ 80%）
生产环境已发布
```

**核心约束**：

+ **不可跳级**：测试 → PRE → 生产，严格顺序，不可跳过
+ **每次 Submit 生成一个版本号**（如 v1.0.0 / v1.0.1）
+ **同一 Ability 可发布到多云多环境**，每个组合独立管理

### 7.2 Deploy 弹窗
```plain
┌───────────────────────────────────────────────────────────────────┐
│  Deploy  COLLECTION · CARD_PAY                                    │
│  ─────────────────────────────────────────────────────────────────│
│  版本：v1.2.0（2026-05-07 14:30 提交）                             │
│                                                                   │
│  部署目标 - 云（多选）：                                            │
│  ☑ AWS    ☑ GCP    ☐ Azure                                        │
│                                                                   │
│  部署目标 - 应用（多选）：                                          │
│  ☑ payment-core    ☐ payment-gateway                              │
│                                                                   │
│  目标环境（系统自动判断，不可手动选择）：                             │
│  AWS    →   测试（当前最高：未发布）                                │
│  GCP    →   PRE（当前最高：测试 ✅ Happy Path 已通过）              │
│                                                                   │
│  ⚠️ GCP 晋级到 PRE 需确认 Happy Path 测试已通过                    │
│     [查看测试报告 →]                                               │
│                                                                   │
│                               [Cancel]  [Confirm Deploy]          │
└───────────────────────────────────────────────────────────────────┘
```

**目标环境判断逻辑**：

+ 该云 + 应用组合**从未发布** → 目标环境 = **测试**
+ 测试已通过 Happy Path 门禁 → 目标环境 = **PRE**
+ PRE 已通过全套件门禁 → 目标环境 = **生产**

### 7.3 环境晋级门禁
| 晋级方向 | 门禁条件 | 未通过时的 UI |
| --- | --- | --- |
| 测试 → PRE | Happy Path 全部测试用例通过 | Deploy 按钮 disabled，提示「Happy Path 未通过，请先完成测试」 |
| PRE → 生产 | 全套件测试通过 + 分支覆盖率 ≥ 80% | Deploy 按钮 disabled，提示「测试门禁未通过，请查看测试报告」 |


### 7.4 Status 弹窗
```plain
┌──────────────────────────────────────────────────────────────────────┐
│  发布状态  COLLECTION · CARD_PAY                              [✕]    │
│──────────────────────────────────────────────────────────────────────│
│  云      应用              环境      版本      状态                   │
│  ─────   ──────────────   ──────    ──────    ──────────────────────  │
│  AWS     payment-core     生产       v1.2.0    ● 运行中               │
│  AWS     payment-gateway  生产       v1.2.0    ● 运行中               │
│  GCP     payment-core     PRE        v1.2.0    ● 运行中               │
│  GCP     payment-core     测试       v1.1.0    ● 运行中               │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.5 Control 弹窗（版本回滚/切流）
```plain
┌──────────────────────────────────────────────────────────────────────┐
│  版本管控  CARD_PAY · AWS · 生产                              [✕]    │
│──────────────────────────────────────────────────────────────────────│
│  当前运行版本：v1.2.0  [蓝色 Badge]                                   │
│──────────────────────────────────────────────────────────────────────│
│  版本      提交时间              状态           操作                  │
│  ──────    ──────────────────   ──────────     ──────────────────────│
│  v1.2.0   2026-05-07 14:30    ● 运行中        [回滚到此版本（禁用）]  │
│  v1.1.0   2026-04-20 09:10    ○ 已停用         [切换到此版本]         │
│  v1.0.0   2026-03-15 16:45    ○ 已停用         [切换到此版本]         │
└──────────────────────────────────────────────────────────────────────┘
```

**切换版本交互**：点击「切换到此版本」→ Popconfirm「确认切换到 v1.1.0？切换后将立即生效，当前版本 v1.2.0 将停用。」→ 确认执行。

### 7.6 Log 弹窗
展示该 Ability 的操作历史日志：

| 字段 | 说明 |
| --- | --- |
| 时间 | 操作时间，精确到秒 |
| 操作人 | 操作者账号 |
| 操作类型 | 创建 / 编辑 / 提交 / 发布 / 回滚 |
| 版本 | 操作关联的版本号 |
| 说明 | 操作备注（提交时可填写） |


---

### 7.7 Code Integration 发布机制
**Code Integration 与 Config Integration 完全共用同一套发布机制**：

+ BT & Ability 列表结构一致（相同操作项、相同发布状态 Badge）
+ Deploy / Status / Log / Control 弹窗完全复用
+ 发布状态流转、环境门禁规则完全一致
+ **唯一区别**：Modify 进入后是「代码接入引导页」，不是 Flow 画板

---

### 6.7 Code Integration
#### 6.7.1 BT & Ability 列表
**结构与 Config Integration 完全一致**（参考 6.5 节），区别：

+ **BT 数据来源**：自动过滤接入方式为「Code Integration」的 BT
+ **Modify 跳转目标**：进入代码接入引导页

#### 6.7.2 代码接入引导页
```plain
┌──────────────────────────────────────────────────────────────────────────┐
│  [← 返回]  GTB_NG · COLLECTION · CARD_PAY · Code Integration             │
│──────────────────────────────────────────────────────────────────────────│
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  📦 SDK 依赖                                                         │ │
│  │  <dependency>                                                        │ │
│  │    <groupId>com.palmpay</groupId>                                    │ │
│  │    <artifactId>channel-sdk</artifactId>                              │ │
│  │    <version>2.0.1</version>                                          │ │
│  │  </dependency>                                      [Copy]           │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  📋 接口规范                                                          │ │
│  │  需实现以下 SPI 接口：                                                 │ │
│  │  · ITransactionHandler                                               │ │
│  │  · IQueryHandler                                                     │ │
│  │                                          [View Interface Docs →]     │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  💻 代码示例                                                          │ │
│  │  [TRANSACTION] [QUERY] [VERIFY]                                      │ │
│  │  （Tab 切换，各 Action 对应代码示例）                                  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│                                    [Save Draft]  [Submit]                 │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 八、全局交互规范
### 8.1 面包屑导航
所有二级及以上页面顶部展示面包屑，支持逐级点击返回。

**格式**：`Channel Integration  /  GTB_NG  /  Integration  /  Config Integration  /  CARD_PAY`

**交互规则**：

+ 面包屑各节点可点击跳转（最后一级为当前页，不可点击）
+ 跳转前若有未保存修改，触发离开保护弹窗

### 8.2 离开页面保护
有未保存修改时，以下操作触发确认弹窗：

+ 切换 Action Tab
+ 点击面包屑返回
+ 点击浏览器返回
+ 路由跳转

**确认弹窗**：

```plain
标题：离开页面
内容：当前页面有未保存的修改，离开后将丢失。
按钮：[返回编辑]  [继续离开（红色）]
```

### 8.3 操作反馈规范
| 操作场景 | 反馈方式 | 文案 | 持续时间 |
| --- | --- | --- | --- |
| 保存草稿成功 | Toast success | 「Saved successfully」 | 2s |
| Submit 成功 | Toast success | 「Submitted, version v{X.X.X} generated」 | 3s |
| Deploy 成功 | Toast success | 「Deployed to {环境} successfully」 | 3s |
| 复制成功 | Toast success | 「已复制」 | 2s |
| 接口报错 | Toast error | 「Error: {errorCode} - {errorMessage}」 + 支持复制错误信息 | 5s |
| 表单校验失败 | 字段行内报错 | 各字段具体错误文案 | 持续显示直到修正 |


### 8.4 空状态规范
| 场景 | 文案 |
| --- | --- |
| Channel List 无数据 | 「暂无渠道数据，点击「+ New Channel」创建第一个渠道」 |
| BT 配置无数据 | 「暂无 Business Type，点击「+ Add Business Type」添加」 |
| BT & Ability 列表无数据 | 「暂无 Ability 配置，点击「+ Add Ability」创建」 |
| Flow 画板无组件 | 「从左侧组件库拖拽组件到此处」 |
| matchCapability 无 inboundEndpoint | 「请先在 metaData → inboundEndpoints 中配置入站端点」 |
| Config Integration 未配置 Step | 「点击右上角 Change Step 开始配置」 |


### 8.5 二次确认规范
以下操作**必须经过二次确认弹窗**方可执行：

| 操作 | 确认文案重点 |
| --- | --- |
| 删除 Channel | 不可恢复，影响所有关联配置 |
| 删除 BT | 清除该 BT 下全部 Ability 配置 |
| 修改 BT 接入方式 | 清除该 BT 下全部 Ability 配置 |
| 删除 Ability（草稿） | 不可恢复 |
| 减少 Step 数量 | 列出将被删除的 Flow 清单 |
| 删除被引用的 Context 字段 | 列出引用该字段的组件位置 |
| 版本切换（Control） | 切换后当前版本立即停用 |


---

## 九、数据结构参考
> 以下为前后端对齐的参考数据结构，最终以接口文档为准。
>

### 9.1 Channel
```typescript
interface Channel {
  code: string              // 渠道代码，唯一，创建后不可修改
  country: string[]         // 支持国家列表
  party: string             // 签约主体
  status: 'Active' | 'Inactive'
  createdAt: string
  updatedAt: string
}
```

### 9.2 BusinessType
```typescript
interface BusinessType {
  channelCode: string
  bt: string                // 业务类型，如 COLLECTION
  integrationMode: 'Config Integration' | 'Code Integration'
}
```

### 9.3 Ability
```typescript
interface Ability {
  channelCode: string
  bt: string
  ability: string           // 能力，如 CARD_PAY
  publishStatus: 'draft' | 'pending' | 'published'
  publishBadges: Array<{
    cloud: string           // 云名，如 AWS / GCP
    env: 'testing' | 'pre' | 'production'
    version: string
  }>
  createdAt: string
  updatedAt: string
}
```

### 9.4 StepConfig
```typescript
interface StepConfig {
  stepIndex: number
  name: string
  triggerMode: 'upstream' | 'external'
  finalStateMode: Array<'requery' | 'callback' | 'sync'>
  produceEvents: string[]   // 非最后 Step 必有
  triggerEvents: string[]   // Step 2+ 必有
}
```

### 9.5 FlowConfig
```typescript
interface FlowConfig {
  channelCode: string
  bt: string
  ability: string
  action: string            // TRANSACTION / QUERY / ...
  steps: StepConfig[]
  flows: Array<{
    stepIndex: number
    flowType: 'main' | 'requery' | 'callback'
    components: Array<{
      componentName: string
      config: Record<string, unknown>   // 各组件的具体配置
    }>
    status: 'idle' | 'editing' | 'done' | 'error'
  }>
  version: string
  publishStatus: 'draft' | 'pending' | 'published'
}
```

### 9.6 MatchCapabilityRule
```typescript
interface MatchCapabilityRule {
  channelCode: string
  inboundEndpointName: string
  matchType: 'A' | 'B'
  // 类型 A
  singleNoField?: string
  // 类型 B
  matchFields?: string[]
  rules?: Array<{
    id: string
    fieldValues: Record<string, string>   // fieldName -> value（* 为通配）
    targetBt: string
    targetAbility: string
    targetAction: string
    priority: number                       // 规则顺序，越小越优先
  }>
}
```

---

## 十、非功能性需求
| 维度 | 要求 |
| --- | --- |
| **安全** | Credential 字段全平台永久 mask，任何接口不返回明文；操作日志完整记录所有写操作 |
| **性能** | Channel List 首屏加载 ≤ 1.5s；Flow 画板渲染 ≤ 500ms；Context 联动响应 ≤ 100ms |
| **可用性** | 关键路径（配置 + 发布）支持服务降级，避免单点故障影响渠道接入 |
| **兼容性** | 支持 Chrome 100+ / Firefox 100+ / Edge 100+；屏幕分辨率 ≥ 1440px（推荐，画板三列布局） |
| **操作回滚** | 所有发布操作支持版本回滚；草稿阶段配置支持前端「撤销」（Ctrl+Z，至少 10 步） |


---

## 十一、待确认事项与风险
### 11.1 待后端确认事项
| 编号 | 问题 | 影响模块 | 优先级 |
| --- | --- | --- | --- |
| B-01 | BT 枚举、Ability 枚举的完整列表及映射关系由哪个接口提供？ | BusinessType / AbilityList | P0 |
| B-02 | 事件枚举（produceEvents）的完整字典由哪个接口提供，是否支持搜索？ | Step 配置弹窗 | P0 |
| B-03 | 版本号生成规则（语义化版本还是时间戳）？Submit 时由前端传入还是后端生成？ | 发布流程 | P0 |
| B-04 | matchCapability 的配置是与 Ability 配置一起提交，还是独立接口管理？ | matchCapability | P1 |
| B-05 | 测试门禁（Happy Path / 全套件）是否有独立的测试平台接口对接？ | Deploy 门禁 | P1 |
| B-06 | Flow 组件配置（network 字段映射等）的存储格式（DSL 结构） | Config Integration | P0 |


### 11.2 已知风险
| 风险 | 影响 | 缓解措施 |
| --- | --- | --- |
| Flow 画板三列布局在低分辨率屏幕（<1440px）下空间不足 | 组件库 / Context 面板显示不全 | 支持折叠组件库面板；Context 面板支持最小化 |
| 条件赋值配置复杂度较高，用户学习成本大 | Config Integration 使用率低 | 提供条件赋值使用示例 + Tooltip 引导 |
| Step 减少操作不可恢复 | 误操作导致配置丢失 | 二次确认弹窗 + 草稿自动保存（30s 间隔） |


---

_文档结束 · Channel Integration 2.0 产品设计文档 v2.0.0_

---

<<<[TOOL_REQUEST]>>>  
tool_name:「始」DailyNote「末」,  
command:「始」create「末」,  
maid:「始」金融网络渠道「末」,  
Date:「始」2026-05-07「末」,  
Content:「始」[今日] 产出可评审的 Channel Integration 2.0 完整产品设计文档

## 文档结构
共 11 章：文档说明 / 背景目标 / 概念设计 / 整体架构 / 功能清单 / 模块详细设计 / 发布流程 / 全局交互规范 / 数据结构参考 / 非功能性需求 / 待确认事项

## 文档核心内容覆盖
+ 概念层级：Channel→BT→Ability→Action→Step→Flow 完整定义
+ 接入方式对比：Config（画板编排）vs Code（代码实现），共用发布机制
+ 7 种 Action 分类：4种上游触发 + 2种外部触发
+ 终态获取机制：requery/callback/sync 三种
+ Step 弹窗分屏设计：数量输入→逐步配置，含触发事件枚举规则
+ Flow 模板体系：5类Action各自的预置组件序列，4个不渲染组件
+ 二级画板三列布局：Context(240px)+组件库(280px)+画板区
+ Context面板5个模块：SPI/GeneratedFields/GlobalVar/Endpoint/Credential，含颜色规范
+ network组件抽屉：3种赋值模式（直接取值/条件赋值/固定值）+Operation类型转换
+ matchCapability：Channel级，inboundEndpoint分组，A/B两种匹配类型
+ 发布流程：草稿→待发布→测试→PRE→生产，2个门禁条件
+ 4个弹窗设计：Deploy/Status/Control/Log
+ 数据结构：6个核心接口定义
+ 待后端确认6项，风险3条

## 文档定位
可直接用于与研发评审，包含功能/页面/交互/概念四个维度
