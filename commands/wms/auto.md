---
description: 智能超级命令（统一入口）- 动态能力发现 + WMS 领域感知 + Quest Map + 智能路由
---

# /wms:auto — 智能超级命令

> 上下文扫描 → WMS 领域加载 → 能力统筹 + Quest Map → 逐关执行 → 整合验证 → 提交 → 知识沉淀

---

## ⚠️ HARD CONSTRAINTS（不可绕过）

### 约束 1：顺序锁定
PHASE 1 → 2 → 3 → 4 → 5 → 6，不可跳过、合并、重排。
- IF 没有输出能力健康检查报告 → 不可进入 PHASE 2
- IF 没有调用 `Agent({ subagent_type: "quest-designer" })` → 不可进入 PHASE 3
- IF 没有 Quest Map → 禁止编辑任何代码文件

### 约束 2：quest-designer 必须被调用
PHASE 2 的唯一合法操作是调用 `Agent({ subagent_type: "quest-designer" })`。不可用"自己分析"替代，不可因"任务简单"跳过。

### 约束 3：代码修改前置条件
满足以下全部才能使用 Edit/Write：
1. PHASE 1 健康检查报告已输出
2. quest-designer Agent 已返回 Quest Map
3. Quest Map 已展示给用户

### 约束 4：无简单任务豁免
哪怕改一个变量名，也要走完 6 个 PHASE。

**自检**：每个 PHASE 开始前，检查上一 PHASE 产出是否存在。不存在则回退执行。

---

## PHASE 1: DISCOVER — 扫描项目上下文 + 能力清单

> 健壮原则：目录不存在不崩溃，只输出 WARNING。

### 1.0 缓存检查

```bash
Bash("mkdir -p .auto/cache")
Read(".auto/cache/capability-snapshot.json")
```

如存在且有效（<24h + 文件数匹配）→ 跳到 1.4 输出报告。
如不存在/过期/失效 → 执行 1.1-1.3 完整扫描。
（缓存验证：检查 created_at 时间戳 < 86400s 且 file_counts 与当前目录文件数一致）

### 1.0a 上下文压缩检查（长对话场景）

```javascript
import { compressContext, CONTEXT_COMPRESSION } from 'src/utils.js';

// 获取当前对话消息列表（Claude Code 内部可访问）
const messages = getConversationMessages(); // Claude Code 内置能力

if (messages && messages.length >= CONTEXT_COMPRESSION.MESSAGE_THRESHOLD) {
  const result = compressContext(messages, {
    threshold: CONTEXT_COMPRESSION.MESSAGE_THRESHOLD,
    maxEntries: CONTEXT_COMPRESSION.MAX_COMPRESSED_ENTRIES
  });

  if (result.compressed) {
    // 输出压缩摘要，让用户了解上下文已被压缩
    console.log(result.summary);
    // 输出提示信息
    console.log(`[上下文压缩] 对话过长（${messages.length} 条），已压缩至 ${result.keptCount} 条关键消息。`);
    console.log('[上下文压缩] 压缩策略：保留含关键词的消息 + 最近的消息。');
  }
}
```

> 设计原则：静默压缩，不打断工作流。仅在日志中记录，不阻塞 PHASE 流程。

### 1.1 技术栈 + 项目上下文（并行）

```
Glob("REPO_MAP.md") → 如存在则 Read（跳过 1.3 的 src/ 扫描）
Glob("package.json") / Glob("pom.xml") / Glob("go.mod") / Glob("requirements.txt") / Glob("Cargo.toml")
  → 匹配任一即确定技术栈 → Read 获取依赖和 scripts
Glob("CLAUDE.md") → Read（如存在）
```

### 1.1a WMS 领域知识自动加载（项目身份检测）

```
IF package.json 中 name 包含 "wms" 或 skills/wms-domain.md 存在：
  Read("skills/wms-domain.md")   → 加载完整代码定位索引到主上下文
  Read("skills/error-patterns.md") → 加载 WMS 错误模式到主上下文
  → 输出: "WMS 领域知识已加载: 6 服务, 448 Ctrl, 581 Svc, 477 Entity, 83 MQ, 52 Job"
ELSE:
  跳过（非 WMS 项目）
```

> 设计意图：WMS 领域知识是本项目的核心资产，必须在 PHASE 1 就加载到主上下文，
> 而不是等 PHASE 2 按需加载。这样 quest-designer 在分析时已有完整的服务→类名映射。

### 1.1b WMS 意图识别（PHASE 1.1a 之后）

```javascript
import { WmsIntentMatcher } from 'src/wms/wms-intent-matcher.js';

// 初始化匹配器
const matcher = new WmsIntentMatcher();
const intentResult = matcher.analyze(userIntent);

// 输出 WMS 上下文
if (intentResult.isWmsRelated) {
  console.log(`🎯 WMS 意图识别：` );
  console.log(`   目标服务: ${intentResult.targetService}`);
  console.log(`   匹配关键词: [${intentResult.matchedKeywords.join(', ')}]`);
  console.log(`   业务域: ${intentResult.businessDomain}`);
  console.log(`   代码定位: Controller=${intentResult.codeLocations.controllers.join(', ')}`);
  console.log(`   置信度: ${intentResult.confidence}%`);
}
```

> 设计意图：基于 1.1a 加载的 WMS 领域知识，自动解析用户需求中的关键词，
> 匹配目标微服务和业务域，输出精确的代码定位供 quest-designer 使用。

### 1.2 能力清单收集（并行 Glob + Grep 提取 frontmatter，禁止 Read 完整文件）

```
Glob("$HOME/.claude/commands/wms/*.md")
Glob("$HOME/.claude/agents/*.md")
Glob("$HOME/.claude/plugins/**/*.md")

→ 对以上目录 Grep 批量提取：
  Grep(pattern="^(name|description|tools|model):", output_mode="content")
  → 仅提取元数据行，不读正文

→ Skills 目录使用 SkillIndexer 索引模式（替代 Glob 全量扫描）：

```javascript
import { SkillIndexer } from 'src/skills/skill-indexer.js';
import path from 'node:path';
import os from 'os';

const skillsDir = path.join(os.homedir(), '.claude', 'skills');
const indexer = new SkillIndexer(skillsDir);
const skillIndex = await indexer.buildIndex();
const skillSummary = await indexer.getIndexSummary();
```

输出 skillSummary（含 Skill 名称、描述、标签，以及节省百分比）。
按需加载：仅在 PHASE 2+ 匹配到关键词时，才调用 `indexer.loadContent(relativePath)` 读取完整内容。
```

### 1.3 配置文件 + 项目代码

```
Glob("$HOME/.claude/mcp-configs/*.json") → Read，统计 mcpServers，含 YOUR_*_HERE 标记 ⚠️
Glob("$HOME/.claude/hooks/*.json") → Read，统计 hook 类型数量

IF REPO_MAP.md 已加载 → 跳过 src/ 扫描
ELSE：
  Glob("src/**/*.{java,ts,tsx,js,jsx,py,go}") → 仅路径列表
```

### 1.3a 写入能力快照（1.1-1.3 执行后）

```bash
Write(".auto/cache/capability-snapshot.json", {
  created_at: [Bash("date +%s")], file_counts: {...},
  tech_stack, capabilities, mcp, hooks, source_files
})
```

### 1.4 输出 + Gate Check

```
能力健康检查报告（🟢绿/🟡黄/🔴红） + 能力清单表格

TodoWrite([
  { content: "任务: [需求摘要]", status: "completed" },
  { content: "技术栈: [tech]", status: "completed" },
  { content: "能力: [N] cmd, [N] agent, [N] plugin, [N] skill (索引模式, 节省 X% Token), [N] MCP, [N] hook", status: "completed" },
  { content: "上下文压缩: [已压缩/未触发] (对话 N 条, 阈值 30)", status: "completed" }
])

### 1.5 Router 推荐（可选）

```bash
import { CanonicalRouter } from 'src/router/canonical-router.js';
import { AgentRegistry } from 'src/router/agent-registry.js';

const registry = new AgentRegistry();
const router = new CanonicalRouter(registry);
await router.initialize();

const routeResult = await router.route(userIntent, {
  files: affectedFiles,
  scope: 'on-demand'
});
```

输出：
```
💡 Router 推荐：
  ✅ 主 Agent：<name>
     匹配原因：<matchReason>
  🔄 回退链：<fallback1>, <fallback2>, ...
```

🔒 GATE: PHASE 1 → 2
  ✓ 报告已输出 + 能力清单已收集 + Router 推荐（可选）
  → 调用 Agent({ subagent_type: "quest-designer" })
  ⛔ 禁止: 编辑代码、跳到 PHASE 3
```

---

## PHASE 2: REASON — quest-designer 深度分析 + Quest Map

> v4 核心：完整代码输出 + 精确锚点插入 + 预判坑点 + 合约驱动

### 2.0 知识搜索（基于历史经验）

```javascript
// 在分析前先搜索相关历史知识
import { KnowledgeSteward } from 'src/knowledge/knowledge-steward.js';

const steward = new KnowledgeSteward();
await steward.ensureStructure();
const relatedKnowledge = await steward.search(userIntent);

if (relatedKnowledge && relatedKnowledge.length > 0) {
  console.log('📚 发现相关历史知识:');
  for (const item of relatedKnowledge) {
    console.log(`  [${item.category}] ${item.matches.length} 条相关记录`);
    // 可选择性展示匹配内容
  }
}
```

将搜索结果作为额外上下文传递给 quest-designer，帮助其基于已有经验分析。

### 2.1 模式卡检查

```bash
Read(".auto/cache/pattern-cards.json")
```

验证 head_hash + 工作区脏检查 + 7天TTL。命中则传缓存给 quest-designer 跳过已缓存文件。

### 2.1 调用 quest-designer

```
Agent({
  subagent_type: "quest-designer",
  prompt: "quest-designer v4。项目完整上下文：

【用户需求】[原始需求描述]
【技术栈】[语言+框架] | 项目规范: [有/无 CLAUDE.md]
【完整能力清单】
Commands: [name + description]
Agents: [name + description + tools]
Plugins: [name + description]
Skills: [name + description]
MCP: [服务名 + 状态(READY/⚠️需配置)]
Hooks: [类型数量 + 摘要]
【现有代码文件】[src/ 路径列表]

[IF 有 Router 推荐]：
【Router 推荐】主 Agent：<name> | 回退链：<fallbacks> | 匹配原因：<reason>

[IF WMS 意图识别命中]:
【WMS 上下文】
  目标微服务: <targetService>
  匹配关键词: <matchedKeywords>
  业务域: <businessDomain>
  代码定位:
    Controller: <controllers>
    Service: <services>
    Entity: <entities>
  置信度: <confidence>%

说明：以上代码定位基于 WMS 领域知识自动识别，请基于实际代码情况做最终确认。

[IF 模式卡命中: 缓存数据，跳过已缓存文件]
[IF 有历史知识]: 将 relatedKnowledge 附加到 prompt 上下文
[IF 未命中: 按标准流程读取 5-12 个核心文件]

v4 要求：
- 第2步利用缓存模式卡（如有）
- 第3步为每个文件产出完整代码（CREATE 含 package+import+类定义，MODIFY 含锚点+代码+import）
- 第4步 Quest Map 📦 完整实现 = 可直接复制执行的代码
- 第5步合约一致性校验 + 路径校验 + 代码完整性校验
- 第6步自验证 >= 10/15
- 第7.5步输出模式卡数据供缓存更新

说明：Router 推荐仅作为参考，最终决策由 quest-designer 自主判断。
输出 Quest Map，等待用户确认。"
})
```

### 2.2 更新模式卡缓存

从 quest-designer 返回中提取 `<!--PATTERN_CARDS_START-->...<!--PATTERN_CARDS_END-->`
→ upsert 合并 → Write `.auto/cache/pattern-cards.json`

> 产出后等待用户确认，可迭代修改。

---

## PHASE 3: EXECUTE — 逐关执行（v4 蓝图驱动）

| 规模 | 模式 | Token 成本 |
|------|------|-----------|
| 1-5 关 | 单 Agent 串行 | 1x |
| 6-15 关 | Subagent 并行 | 2-3x |
| 15+ 关 | Agent Teams | 3-10x |

每关执行流程：
1. 读取 📦 完整代码 → Write/Edit 到指定路径（复制执行，不从描述写代码）
2. MODIFY 操作：先 Read 确认锚点存在且唯一 → Edit 插入 → 补 import
3. 遵守反模式警告（硬性约束）+ 预判坑点
4. 🔴 高风险：先 Read 影响范围 → 备份分支 → 实现 → 验证
5. 编译验证 → 通过则增量提交 → 下一关
6. 失败：回滚 → 修复 → 重试（最多 2 次）

---

## PHASE 4: VERIFY — 全量门禁

编译/构建 → 全量测试 → 覆盖率 >= 80% → 安全扫描
失败：修复(1) → 替代方案(2) → `git checkout -- .` 回滚(3)

---

## PHASE 5: COMMIT — 增量提交

每关通过后 `git add [当前 Quest 文件] && git commit`。
不用 `git add -A`，只 add 当前 Quest 涉及的文件。

---

## PHASE 6: LEARN — 知识沉淀

更新记忆。如改了核心架构 → 建议用户重新运行 `/wms:auto` 并在需求中包含"更新 REPO_MAP.md"。

---

## 核心原则

1. **一个入口** — `/wms:auto` 完成所有事情
2. **智能缓存** — 不变数据一天只扫一次，节省 ~80% Token
3. **统筹设计** — quest-designer 基于完整能力清单自主分析
4. **按规模执行** — 小任务不浪费，大任务自动并行
5. **原子化验收** — 每关有 PM 肉眼可见的验收标准
6. **风格继承** — 编码严格继承项目既有风格
7. **动态追加** — 执行中发现新能力随时追加
8. **可回溯** — 每步 Git Commit，失败可回滚
9. **知识沉淀** — 经验持续积累，越用越强
10. **索引模式** — Skill 按需加载，PHASE 1 Token 消耗减少 30-50%
11. **上下文压缩** — 长对话自动压缩保留关键信息，不丢失决策上下文

---

## 附录A: WMS 关键词 → 微服务 → 代码定位映射

> 供 `WmsIntentMatcher` 使用的完整关键词索引。基于 `skills/wms-domain.md` 构建。

### outbound（出库）— 121 Controller / 170 Service / 113 Entity

| 关键词 | 精确定位 |
|-------|---------|
| 出库订单/出库单 | `OutboundMasterController` → `OutboundMasterServiceImpl` |
| 出库明细 | `OutboundDetailController` → `OutboundDetailServiceImpl` |
| 波次/建波 | `WaveController` → `WaveServiceImpl` / `CreateWaveServiceImpl` |
| 自动波次 | `AutoCreateWaveJob`(每3min) → `WaveAutoAllocationServiceImpl` |
| 分配/库位分配 | `WaveAutoAllocationController` → `WaveAllocationServiceImpl` |
| 提总拣货 | `PickTaskGeneralController` → `PickTaskGeneralServiceImpl` |
| 摘果拣货 | `PickTaskFruitController` → `PickTaskFruitServiceImpl` |
| 牛肉拣货 | `PickTaskBeefGeneralController` → `PickTaskBeefGeneralServiceImpl` |
| RF拣货 | `RfPickController` → `RfPickServiceImpl` / `RfPickCommitServiceImpl` |
| 分拣 | `SortTaskController` → `SortTaskServiceImpl` / `SortRecordServiceImpl` |
| RF分拣 | `RfPdaSortingController` → `RfPdaSortingServiceImpl` |
| 装箱 | `PackBoxRecordController` → `PackBoxMasterServiceImpl` |
| 集货 | `PcConsolidationController` → `ConsolidationMasterServiceImpl` |
| 复核 | `ReviewRecordController` → `ReviewRecordServiceImpl` |
| 发运/装车 | `DeliveryController` → `DeliveryServiceImpl` / `DeliveryCommitServiceImpl` |
| 越库 | `CrossDetailController` → `CrossDetailServiceImpl` |
| 异常位 | `AbnormalPositionMasterController` → `AbnormalPositionMasterServiceImpl` |
| 供应商直发 | `SupplierSaleController` → `SupplierSaleServiceImpl` |
| 差异确认 | `DifferenceConfirmLogController` → `DifferenceConfirmLogServiceImpl` |
| 快速出库 | `FastOutboundController` → `FastOutboundServiceImpl` |

### inbound（入库）— 56 Controller / 111 Service / 69 Entity

| 关键词 | 精确定位 |
|-------|---------|
| 入库订单/入库单 | `InboundMasterController` → `InboundMasterServiceImpl` |
| 创建入库单 | `InboundCreateController` → `InboundCreateServiceImpl` |
| 收货/RF收货 | `InboundReceiveController` → `InboundReceiveServiceImpl` |
| PC收货 | `InboundReceivedForPcController` → `InboundReceiveForPcServiceImpl` |
| 收货任务 | `RcptTaskController` → `RcptTaskServiceImpl` |
| 盲收 | `BlindReceiveController` → `BlindReceiveServiceImpl` |
| 退货收货 | `InboundReturnReceiveController` |
| 一车多单 | `OneCarManyOrderController` → `InboundOneCarManyOrderServiceImpl` |
| 预约 | `ParkAppointController` → `ParkAppointServiceImpl` |
| 上架 | `PutawayController` → `PutawayServiceImpl` |
| AGV上架 | `AgvApiController` → `AgvApiServiceImpl`(责任链: AgvGetTargetLocChainService) |
| 质检 | `QualityInspectionController` → `QualityInspectionRecordServiceImpl` |
| 质检任务 | `QualityInspectionReceiptTaskController` → `QualityInspectionTaskServiceImpl` |
| 磅差/让步 | `InboundConcRejPostController` → `InboundConcRejPostServiceImpl` |
| 装卸费 | `HandlingChargeBillController` → `HandlingChargeBillServiceImpl` |
| EDI入库 | `EdiInboundHandleController` → `EdiInboundHandleServiceImpl` |
| 直发 | `SentDirectlyQiOrderController` → `SentDirectlyQiOrderServiceImpl` |

### basicdata（基础数据）— 173 Controller / 127 Service / 137 Entity

| 关键词 | 精确定位 |
|-------|---------|
| 仓库 | `WarehouseController` → `WarehouseServiceImpl` |
| 库位 | `LocationController` → `LocationServiceImpl` |
| 库区 | `ZoneController` → `ZoneServiceImpl` |
| 商品/商品主数据 | `ItemMasterController` → `ItemMasterServiceImpl` |
| 商品单位 | `ItemUnitController` → `ItemUnitServiceImpl` |
| 客户 | `CustomersController` → `CustomersServiceImpl` |
| 客户集 | `CustomerCollectionController` → `CustomerCollectionServiceImpl` |
| 供应商 | `VendorController` → `VendorServiceImpl` |
| 公司 | `CompanyController` → `CompanyServiceImpl` |
| 批次规则 | `BatchRuleController` → `BatchRuleServiceImpl` |
| 编码/编码规则 | `CodeController` → `CodeServiceImpl` |
| AGV点/AGV区域 | `AgvPointController` → `AgvPointServiceImpl` |
| 容器 | `ContainerSpecificationController` → `ContainerSpecificationServiceImpl` |
| 温层 | `WarmLayerController` → `WarmLayerServiceImpl` |
| 字典 | `DictController` → `DictServiceImpl` |
| 波次配置 | `AutoWaveTaskController` → `AutoWaveTaskServiceImpl` |
| 月台 | `DockController` → `DockServiceImpl` |
| 工作台 | `WorkBenchGroupController` → `WorkBenchGroupServiceImpl` |

### inside（库内作业）— 45 Controller / 68 Service / 62 Entity

| 关键词 | 精确定位 |
|-------|---------|
| 移位 | `MoveMasterController` → `MoveMasterServiceImpl` |
| 呆滞移位 | `SluggishMoveController` → `SluggishMoveServiceImpl` |
| 同批次移位 | `MoveBySameBatchController` → `MoveSameBatchServiceImpl` |
| 高低层移位 | `UnplannedMoveByHighLowLayersController` → `UnplannedMoveByHighLowLayersServiceImpl` |
| 过期移位 | `MoveExpiredStorageController` → `MoveExpiredStorageServiceImpl` |
| 新零售移位 | `NewSaleMoveController` → `NewSaleMoveServiceImpl` |
| 物权转移 | `ItemTransferController` → `ItemTransferServiceImpl` |
| 盘点 | `CountMasterController` → `CountMasterServiceImpl` / `CountExecutorServiceImpl`(DDD责任链) |
| 盘点盈亏 | `CountProfitLossController` → `CountProfitLossServiceImpl` |
| RF盘点 | `RfCountController` → `RfCountStorageServiceImpl` |
| 补货 | `ReplenishMasterController` → `ReplenishMasterServiceImpl` |
| 建议补货 | `SuggestReplenishmentController` → `SuggestReplenishmentServiceImpl` |
| 补货优先级 | `ReplenishPrioritySortController` → `ReplenishPrioritySortServiceImpl` |
| 冻结 | `BlockedItemController` → `BlockedItemServiceImpl` |
| 解冻 | `UnBlockedItemController` → `UnBlockedItemServiceImpl` |
| 点检 | `IdentifiedTaskController` → `IdentifiedTaskServiceImpl` |
| 低频抽检 | `LowFrequencySpotCheckController` → `LowFrequencySpotCheckServiceImpl` |
| 月度计划 | `WMonthlyPlanController` → `WMonthlyPlanServiceImpl` |

### storage（库存）— 29 Controller / 50 Service / 58 Entity

| 关键词 | 精确定位 |
|-------|---------|
| 库存/库存查询 | `StoredItemController` → `StoredItemServiceImpl` |
| 库存新接口 | `StoredItemNewController` → `StoredItemNewServiceImpl` |
| 批次属性 | `BatchAttributesController` → `BatchAttributesServiceImpl` |
| 批次变更审批 | `ApprovalBatchTaskController` → `ApprovalBatchTaskServiceImpl` |
| 库存冻结 | `StoredFreezeLogController` → `StoredFreezeLogServiceImpl` |
| 效期预警 | `ItemOutboundWarningController` → `ItemOutboundWarningServiceImpl` |
| 临期审批 | `StoredAdventApproveTaskController` → `StoredAdventApproveTaskServiceImpl` |
| 库位触碰 | `LocationTouchController` → `LocationTouchServiceImpl` |
| 损耗 | `DamageStorageManageController` → `DamageStorageManageServiceImpl` |
| 库存快照 | — → `MonthSnapshotServiceImpl` / `GetStoredSnapshotJob` |
| 库存日志 | `InterfaceLogController` → `QueryInterfaceLogServiceImpl` |
| GAIA库存同步 | `StorageToGaiaController` → `StorageToGaiaServiceImpl` |
| MES对接 | `StorageToMesController` |
| 导入库存 | `ImportStoredItemController` |

### edi（电子数据交换）— 24 Controller / 55 Service / 38 Entity

| 关键词 | 精确定位 |
|-------|---------|
| GAIA对接 | `GaiaRelatedController` → `GaiaRelatedServiceImpl` |
| 推送GAIA | `PushGaiaController` → `PushGaiaServiceImpl` |
| 出库回传 | — → `OutboundCallbackBatchInfoServiceImpl` / `OutboundBatchPostRecordServiceImpl` |
| 入库回传 | — → `InboundCallbackBatchInfoServiceImpl` |
| TMS对接 | `CdcTmsToWmsController` → `TmsToWmsServiceImpl` |
| SRM对接 | `SrmOutBoundUpdateController` → `SrmOutBoundUpdateServiceImpl` |
| MES对接 | — → `IMesServiceImpl` |
| 千蜜 | `QianmiDataController` |
| 差异确认 | — → `CheckOrderToGaiaServiceImpl` |
| 数据备份 | `BackupDataKafkaController` → `DataBackupRecordServiceImpl` |
| 分拣推送 | `SendSortingTaskOrderController` |
| 轨迹溯源 | `TraceSourceController` → `TraceSourceServiceImpl` |
| 质检对接 | `QualityInspectionController` → `QualityInspectionServiceImpl` |
| 定时任务 | `JobController`（HTTP端点） |

### 跨服务/全局

| 关键词 | 处理策略 |
|-------|---------|
| 多个服务/跨服务/架构/整体 | 分析所有涉及服务的调用链 |
| 服务间调用失败 | 检查 Feign Client + Hystrix 降级 |
| MQ消息丢失/重复 | 检查 Producer/Consumer + 事务消息 |
| 分布式事务 | 检查 Seata AT 配置 + undo_log |
| 数据不一致 | 检查 ShardingSphere 分片 + MQ幂等 |

### WMS 代码定位规范

```
项目根路径: D:\ruanjian\shuhai\shsc-wms-{service}-service\src\main\java\com\shsc\wms\{service}\
```

按业务域定位文件：
- Controller(PC): `biz/controller/{BusinessDomain}Controller.java`
- Controller(API): `biz/controller/api/{BusinessDomain}ApiController.java`
- Service: `biz/service/impl/{BusinessDomain}ServiceImpl.java`
- Entity: `biz/entity/{BusinessDomain}.java`
- Feign: `biz/feign/{TargetService}Client.java` 或 `{TargetService}Service.java`
- MQ: `biz/mq/consumer/` 或 `biz/message/consumer/` 或 `{service}/mq/consumer/`
- Job: `{service}/job/`
