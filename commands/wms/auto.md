---
description: 智能超级命令 — WMS 业务 + auto-wms 项目开发的统一入口
allowed_tools: ["Read", "Glob", "Grep", "Agent", "TodoWrite", "Bash"]
---

# /wms:auto — 智能超级命令

> 一个入口统筹 WMS 业务任务与 auto-wms 项目自身开发。

## 核心原则

1. **一个入口** — 所有任务先进入 `/wms:auto`，避免入口分散。
2. **意图分流** — 自动判断是 WMS 业务任务还是 auto-wms 项目开发任务。
3. **索引优先** — Skill 走 `SkillIndexer` 索引摘要，不全量加载。
4. **按规模执行** — 小任务走最短闭环，大任务按阶段推进。
5. **原子化验收** — 每次只推进一个目标，完成后立即验证。
6. **知识沉淀** — 任务完成后提炼可复用模式。

## HARD CONSTRAINTS

- 顺序锁定：必须按 Phase 推进，当前阶段未通过验证前不得跳到下一阶段。
- quest-designer 强制调用：中高复杂度任务必须先生成任务地图。
- 代码修改前置：未完成上下文检索和边界确认前，不进入文件修改。

## PHASE 0: 意图分流

根据用户输入自动判断任务类别，选择对应执行路线。

### 意图关键词映射

| 类别 | 关键词 | 执行路线 |
|------|--------|----------|
| **WMS 业务** | 出库/入库/分配/拣货/发运/收货/上架/移位/盘点/库存/冻结/补货/波次/复核/EDI/GAIA/质检/编码 | WMS 路线 |
| **auto-wms 项目** | auto-wms/测试/构建/lint/发布/版本/agent/skill/hook/command/路由/instinct/学习/知识/能力/安装/卸载 | 项目路线 |
| **模糊/通用** | 代码/修复/优化/重构/审查/安全 | 先判断上下文再分配 |

### 分流逻辑

```
输入意图
  -> 含 WMS 业务关键词？ -> WMS 路线
  -> 含项目关键词？ -> 项目路线
  -> 模糊？ -> 检查当前上下文（打开的文件、最近操作）推断
  -> 无法推断？ -> 直接询问用户
```

---

## 路线 A: WMS 业务任务

### PHASE 1: 上下文检索

```
Read("skills/wms-domain.md")       # 6 服务代码定位索引
Read("skills/error-patterns.md")   # WMS 错误模式速查
Read("skills/workflow-patterns.md") # 开发模式和工作流（按需）
Read("skills/feign-mq-map.md")     # 跨服务交互图谱（多服务时）
Read("skills/table-relations.md")  # 表关系图谱（涉及 SQL 时）

Glob("$HOME/.claude/commands/wms/*.md")
Glob("$HOME/.claude/agents/*.md")
```

Skill 索引：

```
Read("src/skills/skill-indexer.js")
  -> SkillIndexer.getIndexSummary()
  -> 命中后 loadContent(relativePath)
```

输出检索结论：目标文件、现有依赖、缺失项、风险点、是否跨服务。

### PHASE 2: 任务设计

- 规模判断：小（单文件）/ 中（多文件协作）/ 大（架构决策/跨域）
- 大任务调用 `quest-designer` 生成任务地图
- 锁定执行边界：明确不该改什么

### PHASE 3: 编码实施

- 最小作用域改动
- 与 WMS 项目风格对齐（分层结构、中文注释）
- 即改即校验

### PHASE 4: 原子化验收

- 跑相关测试/检查
- 回归边界检查
- 未通过时止损

### PHASE 5: 交付与沉淀

- 交付摘要
- 沉淀错误模式/开发模式到 `skills/*.md`

---

## 路线 B: auto-wms 项目开发

### PHASE 1: 上下文检索

```
Read("package.json")          # 项目配置
Read("REPO_MAP.md")           # 代码地图

Glob("src/**/*.js")           # 源码结构
Glob("tests/**/*.js")         # 测试结构
Glob("agents/*.md")           # Agent 定义
Glob("rules/*.md")            # 规则定义
Glob("hooks/hooks.json")      # Hook 配置
```

关键模块索引：

| 模块 | 路径 | 职责 |
|------|------|------|
| CLI 入口 | `bin/cli.js` | 命令行解析 |
| 安装器 | `src/installer.js` | 组件安装/卸载 |
| 路由器 | `src/router/canonical-router.js` | 意图路由 |
| Agent 注册 | `src/router/agent-registry.js` | Agent 管理 |
| Skill 索引 | `src/skills/skill-indexer.js` | 技能索引 |
| 知识管家 | `src/knowledge/knowledge-steward.js` | 知识管理 |
| Instinct | `src/learning/instinct-manager.js` | 学习系统 |
| WMS 匹配 | `src/wms/wms-intent-matcher.js` | WMS 意图识别 |
| MCP | `src/mcp/*.js` | MCP 协议 |
| 元数据 | `src/metadata-utils.js` | 共享元数据解析 |

### PHASE 2: 任务设计

- 规模判断
- 大任务调用 `quest-designer`
- 锁定执行边界

### PHASE 3: 编码实施

- 最小作用域改动
- 遵循现有代码风格
- 即改即校验：`npm test` / `npm run lint` / `npm run format:check`

### PHASE 4: 原子化验收

```
Bash("npm test")                    # 全量测试
Bash("npm run lint")                # 代码检查
Bash("npm run format:check")        # 格式检查
```

- 未通过时留在本阶段修复

### PHASE 5: 交付与沉淀

- 交付摘要
- 更新 `MEMORY.md` 架构笔记（如有架构变更）

---

## 通用后置

### 知识沉淀

任务完成后自动执行：
- Bug 定位 -> 提炼错误模式 -> 追加到 `skills/error-patterns.md`
- 代码开发 -> 提炼开发模式 -> 追加到 `skills/workflow-patterns.md`
- 新服务/类 -> 更新 `skills/wms-domain.md`
- 项目变更 -> 更新 `MEMORY.md`

### 后续动作

仅在必要时给出下一步建议。

## WMS 业务关键词附录

出库/入库/分配/拣货/发运/收货/上架/下架/移位/盘点/库存/冻结/解冻/补货/波次/复核/包装/集货/装车/质检/编码/批次/效期/容器/库位/库区/通道/拣货位/存储位/安全库存/固定分配/动态分配/波次释放/拣货确认/发运确认/差异回传/退货/越库/跨仓/调拨/合流/分播/发票/清单/EDI/GAIA/TMS/OMS/ERP/Barcode/RF/Seata/RocketMQ/ShardingSphere
