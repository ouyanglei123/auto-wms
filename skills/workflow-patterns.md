---
name: workflow-patterns
description: 开发工作流模式集合 - Plan Mode 工作流、Multi-Agent 编排、根因追踪方法论、10 维度代码审查清单
version: 2.0.0
author: auto-wms
tags: [workflow, plan-mode, orchestration, root-cause, debugging, patterns, agent, parallel, troubleshooting, review, checklist, quality, self-correction, verification]
---

# Workflow Patterns -- 开发工作流模式集合

> 四大核心方法论合一：Plan Mode 工作流选择、Multi-Agent 编排模式、结构化根因追踪、10 维度代码审查清单。
> 让 quest-designer 在 PHASE 2 自动匹配最优工作流。

---

## 一、Plan Mode 工作流（4 种）

### 工作流选择决策

| 信号关键词 | 工作流 | 上下文预算 |
|-----------|--------|-----------|
| 重构/迁移/架构/系统/redesign | Explore | 10-15 文件, 3000-5000 行 |
| 实现/开发/新增/功能/feature | Implement | 5-8 文件, 1500-3000 行 |
| bug/错误/失败/error/fix/修复 | Fix | 3-5 文件, 500-1500 行 |
| 审查/review/检查/安全/质量 | Review | 3-6 文件, 1000-2000 行 |

### 自动检测逻辑

```
用户意图 -> 关键词匹配:
  +--- [重构|迁移|全面|架构|系统|microservice] -> Explore
  +--- [实现|开发|新增|功能|feature|创建|接口] -> Implement
  +--- [bug|错误|失败|error|fix|修复|异常|debug] -> Fix
  +--- [审查|review|检查|安全|质量|PR] -> Review
  +--- 无匹配 -> 默认 Implement
```

### 与 Auto WMS 对应

| 工作流 | PHASE 1 | quest-designer | Canonical Router |
|--------|---------|----------------|------------------|
| Explore | 完整扫描（不用缓存） | 读取 10-15 文件 | 默认 quest-designer |
| Implement | 缓存优先 | 读取 5-8 文件 | 默认 quest-designer |
| Fix | 最小化 | 读取 3-5 文件 | 优先 build-error-resolver |
| Review | 缓存优先 | 读取 3-6 文件 | 优先 code-reviewer |

> 注：本 Skill 的工作流选择逻辑已由 `src/router/canonical-router.js` 的 COMPLEXITY_INDICATORS 实现，此处保留作为设计参考和人类可读文档。

---

## 二、Multi-Agent 编排模式（4 种）

### 选择决策树

```
任务是否可拆分？
+-- 否 -> 单 Agent（quest-designer）
+-- 是 -> 子任务之间是否有依赖？
    +-- 有依赖 -> Sequential Chain（串行链）
    +-- 无依赖 -> 需要总协调者吗？
        +-- 需要 -> Orchestrator-Workers（主从模式）
        +-- 不需要 -> Parallel Fan-Out（并行扇出）

质量要求特别高？-> 追加 Evaluator-Optimizer（评估优化）
```

### 模式详解

| 模式 | 流程 | 适用场景 | Quest 数量建议 |
|------|------|---------|--------------|
| Sequential Chain | A -> B -> C | 后一步依赖前一步输出 | 1-5 关 |
| Parallel Fan-Out | Router -> [A, B, C] | 子任务无依赖 | 6-15 关 |
| Orchestrator-Workers | 总指挥 -> 分配 -> 收集 | 复杂任务需协调 | 15+ 关 |
| Evaluator-Optimizer | 产出 -> 审查 -> 迭代 | 质量要求高（最多 3 轮） | 追加于任何模式 |

### 最佳实践

1. **上下文隔离**：每个子 Agent 只接收它需要的上下文
2. **并行 Agent 不修改同一文件**：如有冲突需串行化
3. **失败不阻塞**：单个 Agent 失败设定超时和重试
4. **结果聚合**：Union（审查类）/ Latest Wins（修复类）/ Vote（决策类）

---

## 三、根因追踪方法论（五步法）

> 修 Bug 不是打地鼠。从症状出发，逐步定位根因，确保修复源头而非表面。

### 五步流程

| 步骤 | 名称 | 输出格式 |
|------|------|---------|
| 1 | 症状描述 | 现象 + 触发条件 + 影响范围 + 复现步骤 |
| 2 | 假设生成 | 按可能性排序的原因列表（参考 error-patterns.md 速查） |
| 3 | 二分排除 | 最小验证实验表格（假设 -> 验证方法 -> 结论） |
| 4 | 根因确认 | 一句话根因 + 证据链 + 代码位置 |
| 5 | 修复 + 防复发 | 最小修复 + 测试覆盖 + 防复发检查 |

### 常见根因模式

| 模式 | 症状 | 定位方法 |
|------|------|---------|
| 依赖版本漂移 | 本地正常 CI 失败 | 对比 `npm ls`，检查 lock 文件 |
| 时序竞态 | 偶发性失败 | 检查 await、事件监听、回调顺序 |
| 状态泄漏 | 测试顺序影响结果 | 逐个运行测试，检查共享状态 |
| 隐式依赖 | 删代码后功能异常 | Grep 全项目搜索引用 |
| 编码不一致 | 特殊字符显示异常 | 检查所有数据流转环节的编码 |

### 工具辅助

| 工具 | 命令 |
|------|------|
| git bisect | `git bisect start` / `good` / `bad` |
| git diff | `git diff HEAD~1 -- src/file.js` |
| git log | `git log --oneline -20 -- src/file.js` |
| Node.js 调试 | `node --inspect-brk script.js` |

---

## 四、10 维度代码审查清单

> AI 写完代码后，再让它按清单自检一次，Bug 率降低 60%（社区实测数据）。
> 本清单提供 10 个维度的结构化审查，可与 PHASE 4 VERIFY 无缝集成。

### 核心理念

1. **AI 也能审查自己** -- 给它一个清单，它会逐项检查
2. **清单比直觉可靠** -- 人的直觉会遗漏，清单不会
3. **审查时机很重要** -- 写完代码立即审查，趁热打铁效果最好
4. **增量审查 > 全量审查** -- 每次只审查本次变更，不要审查整个文件

### 审查时机

| 场景 | 触发条件 | 使用方式 |
|------|---------|---------|
| 自动审查 | 每次 Edit/Write 后 | Hook 自动触发部分检查项 |
| 手动审查 | `/auto:code-review` | 完整 10 维度审查 |
| 提交前审查 | PHASE 5 COMMIT 前 | 精简版（维度 1-5） |
| PR 审查 | 创建 PR 时 | 完整 10 维度 + 安全专项 |

### 10 维度审查清单

#### 维度 1：功能正确性

```
审查项：
- [ ] 代码实现了需求描述的所有功能点
- [ ] 边界条件已处理（空值、零值、负数、超长字符串）
- [ ] 并发/竞态条件已考虑（如适用）
- [ ] 异步操作正确使用 await/Promise
- [ ] 返回值类型与接口定义一致

常见遗漏：
- 只处理了"快乐路径"，忘了错误路径
- 分页查询忘了处理 total=0 的情况
- 异步函数忘了 await 导致返回 Promise 而非结果
```

#### 维度 2：错误处理

```
审查项：
- [ ] 所有外部调用有 try-catch 包裹
- [ ] catch 块不是空的（至少有日志记录）
- [ ] 错误信息对用户友好（不暴露内部实现）
- [ ] 异常类型正确匹配（业务异常 vs 系统异常）
- [ ] 错误恢复策略合理（重试/降级/快速失败）

常见遗漏：
- catch (e) {} 空块 -- 最常见的问题
- 只捕获不处理，异常被"吞掉"
- 错误信息暴露数据库结构或内部路径
```

#### 维度 3：安全性

```
审查项：
- [ ] 用户输入已验证和清理
- [ ] SQL 使用参数化查询（不是字符串拼接）
- [ ] 无硬编码密钥/密码/Token
- [ ] 文件路径无目录遍历风险
- [ ] 敏感操作有权限检查
- [ ] 日志中不记录敏感信息

快速检查命令：
grep -rn "console.log\|print\|log.info" --include="*.js" --include="*.ts" | grep -i "password\|secret\|token\|key"
```

#### 维度 4：性能

```
审查项：
- [ ] 循环内无不必要的数据库查询（N+1 问题）
- [ ] 大数据集使用分页而非全量加载
- [ ] 无不必要的深拷贝
- [ ] 正确使用缓存（如适用）
- [ ] 异步操作可并行的已用 Promise.all

常见反模式：
- for 循环内 await（应该先 Promise.all 再 await）
- 列表查询后又在循环中逐个查询详情
- 大数组使用 .map().filter() 两次遍历（应该用 .reduce() 一次完成）
```

#### 维度 5：代码风格

```
审查项：
- [ ] 命名清晰且有语义（不用 a/b/c/tmp/var）
- [ ] 函数不超过 50 行
- [ ] 文件不超过 400 行
- [ ] 无深层嵌套（超过 3 层提取函数）
- [ ] 无重复代码（DRY 原则）
- [ ] 遵循项目既有的命名和格式风格

快速检查命令：
find src/ -name "*.js" -exec wc -l {} + | sort -rn | head -10
```

#### 维度 6：测试覆盖

```
审查项：
- [ ] 每个公共方法有对应的测试用例
- [ ] 测试覆盖了正常路径和异常路径
- [ ] 测试之间相互独立（不依赖执行顺序）
- [ ] Mock 使用合理（不过度 mock）
- [ ] 测试命名清晰（描述预期行为）
- [ ] 覆盖率 >= 80%

快速检查命令：
npm run coverage 2>/dev/null | grep "All files"
```

#### 维度 7：接口兼容性

```
审查项：
- [ ] 公共 API 接口没有破坏性变更
- [ ] 新增的参数有默认值（向后兼容）
- [ ] 删除的参数/方法有废弃过渡期
- [ ] 数据库 Schema 变更有迁移脚本
- [ ] 配置文件变更向后兼容

常见遗漏：
- 直接删除方法而不是先标记 @deprecated
- 修改了接口返回格式但没有通知调用方
```

#### 维度 8：可维护性

```
审查项：
- [ ] 复杂逻辑有注释说明"为什么"（不是"是什么"）
- [ ] Magic Number 提取为常量
- [ ] 职责单一（一个函数/类只做一件事）
- [ ] 依赖注入而非硬编码依赖
- [ ] 可配置项提取到配置文件

衡量标准：
- 新人能在 5 分钟内理解这段代码吗？
- 修改这个功能需要改几个文件？（理想情况 1-2 个）
```

#### 维度 9：文档

```
审查项：
- [ ] 公共方法有 JSDoc/docstring
- [ ] README 更新（如新增了配置项/命令/API）
- [ ] CHANGELOG 更新（记录变更内容）
- [ ] 类型定义更新（如修改了接口）
- [ ] 注释中的 TODO/FIXME 已处理或记录

审查规则：
- 不要写"无用文档"（如 /** set name */ 这种注释比没有还糟）
- 文档要写"为什么"，代码表达"是什么"
```

#### 维度 10：Git 规范

```
审查项：
- [ ] 变更范围合理（不包含无关文件）
- [ ] 提交信息格式正确（type: description）
- [ ] 无调试代码（console.log/TODO/临时文件）
- [ ] 无敏感文件（.env/credentials）
- [ ] 大文件拆分为多个原子提交

快速检查命令：
git diff --stat HEAD
git diff HEAD -- "*.env*" "*credentials*" "*secret*"
```

### 精简版清单（5 维度，适用于快速审查）

在时间紧迫时，只审查最重要的 5 个维度：

1. **功能正确性** -- 代码做了它该做的事吗？
2. **错误处理** -- 失败时会怎样？
3. **安全性** -- 有没有可被利用的漏洞？
4. **性能** -- 有没有明显的性能问题？
5. **测试覆盖** -- 改动有测试保护吗？

### 自动化建议

以下检查项可以通过 Hook 自动化（当前已实现标注为 [已实现]）：

| 检查项 | 自动化方式 | 状态 |
|-------|-----------|------|
| console.log 检查 | PostToolUse Hook | [已实现] |
| ESLint/Prettier 格式化 | PostToolUse Hook | [已实现] |
| TypeScript 类型检查 | PostToolUse Hook | [已实现] |
| 文件行数警告 | PreToolUse Hook | [已实现] |
| TDD 前置检查 | PreToolUse Hook | [已实现] |
| 密钥泄露检查 | UserPromptSubmit Hook | [已实现] |
| 未提交变更检查 | TaskCompleted Hook | [已实现] |
| 测试覆盖率检查 | 需新增 Hook | [待实现] |
| N+1 查询检测 | 需集成 ast-grep | [待实现] |

> 注：标注为 [已实现] 的 Hook 检查项已配置在 `hooks/hooks.json` 中，此处保留作为审查方法论参考。

---

## 十一、测试稳定化模式：先契约，后优化

> 适用于系统升级后出现的批量测试失败场景。核心目标不是“把测试改绿”，而是先区分测试是否过时，再判断是否存在真实实现回归。

### 11.1 处理顺序

```
1. 跑定向/全量测试，拿到失败清单
2. 判断失败类型：测试过时 / 实现回归 / 混合问题
3. 先修路径、目录、入口等结构漂移
4. 再修真实契约问题（返回结构、缓存行为、失效逻辑）
5. 先跑定向验证，再跑全量回归
6. 将可复用模式沉淀到 memory / workflow-patterns
```

### 11.2 失败类型判断表

| 类型 | 典型信号 | 处理方式 |
|------|---------|---------|
| 测试过时 | 目录变更、入口改名、常量名变化 | 先对齐测试夹具和断言 |
| 实现回归 | 同一接口新旧分支返回结构不一致 | 修实现，保持旧契约稳定 |
| 缓存缺陷 | 第二次调用未命中缓存、目录型资源总被判定变更 | 统一 key 与失效规则 |
| 输出截断 | 全量测试信息过多，终端无法直接看完 | 输出 JSON 报告后结构化解析 |

### 11.3 契约修复原则

| 场景 | 推荐做法 | 避免做法 |
|------|---------|---------|
| 搜索接口增强 | 保持原 `search()` 返回结构，新增 `searchEntries()` 之类细粒度方法 | 直接修改旧方法返回 shape |
| 索引优化接入 | 在优化分支上适配旧调用方格式 | 让 indexed / non-indexed 分支各返回一套结构 |
| 缓存增量检测 | 使用规范化 `relativePath` 作为唯一 key | 用文件名或局部路径做 key |
| 全量验证 | 先定向验证修复点，再跑全量回归 | 每改一点就盲跑全量且不做归因 |

### 11.4 本次项目中的典型案例

| 模块 | 问题 | 修复模式 |
|------|------|---------|
| `KnowledgeSteward` | indexed 搜索分支返回 entry 列表，破坏 `search()` 既有 grouped contract | 恢复 `search()` 旧契约，新增 entry-level API |
| `SkillIndexer` | `_detectChangedFiles()` 用文件名查缓存，目录型 skill 总是假失效 | 改为规范化 `relativePath` + 补充删除检测 |
| Vitest 回归 | 终端输出过长导致失败信息不完整 | 使用 `--reporter=json --outputFile=.vitest-report.json` 汇总 |

## 来源

- Claude Code 官方文档：Plan Mode 四种工作流
- Andrew Ng "AI Agent Design Patterns"：Reflection、Multi-Agent
- linux.do 社区验证数据
- Vibe Coding 实战策略
- 社区实测：AI 自我审查降低 60% Bug 率

---

## 五、WMS 生产问题排查案例：移位解绑拣货位单位错乱

> 本案例记录了一次完整的生产问题排查流程，包括问题现象、根因分析、代码定位和修复方案。

### 5.1 问题描述

| 项目 | 内容 |
|------|------|
| 问题现象 | 用户操作移位解绑拣货位时，输入"1箱"，但系统记录为"1罐" |
| 影响范围 | 物料 4046379（红豆罐头，850G*12罐/箱），南昌仓库 |
| 业务场景 | 拣货位解绑后重新绑定安全库存 |
| 操作类型 | `moveBdLocForthConfirm`（RF移位确认） |

### 5.2 问题排查流程

#### 第一步：获取操作日志

根据日志参数定位问题入口：
```json
{
  "inputMoveQty": 1,
  "unitId": 8746179352391942,    // 箱(Z34)
  "safeFlag": true,
  "safeUnitId": 8746179313969670, // 罐(CL9)
  "safeMinItemUnitQty": 12,
  "safeMaxItemUnitQty": 24
}
```

#### 第二步：定位代码位置

通过日志找到方法 `moveBdLocForthConfirm`，位于 `MoveBdServiceImpl.java`

#### 第三步：分析代码逻辑

关键代码（第652-684行）：
```java
ItemUnit itemUnit = basicFeignService.getItemUnitById(req.getUnitId()).getData();

// 【问题代码】如果是安全库存，则获取页面传入的安全库存
if (req.getSafeFlag()){
    itemUnit = safeItemUnit;  // 把移位单位替换成了安全库存单位（罐）
}
moveRecord.setMoveQty(req.getInputMoveQty());
// ...
moveRecord.setUnitCode(itemUnit.getUnitCode());
moveRecord.setUnitId(itemUnit.getId());

// 数量转换为基本单位
BigDecimal basicInputMoveQty = BigDecimalUtil.mul(req.getInputMoveQty(), itemUnit.getPieceLoad());
```

### 5.3 根因分析

| 步骤 | 用户操作 | 系统行为 | 问题 |
|------|---------|---------|------|
| 1 | 选择"箱"为单位 | 获取 unitId=箱 | ✅ 正确 |
| 2 | 输入数量"1" | inputMoveQty=1 | ✅ 正确 |
| 3 | 设置安全库存标志 | safeFlag=true | ✅ 正确 |
| 4 | - | itemUnit被替换为safeItemUnit（罐） | ❌ 错误 |
| 5 | - | 移位记录的单位变成"罐" | ❌ 错误 |

**根因**：`safeFlag=true` 时，代码错误地将用户选择的移位单位（箱）替换成了安全库存单位（罐），导致移位记录的单位与用户选择的单位不一致。

### 5.4 数据验证

根据数据库记录确认：
```
unit_code: CL9 (罐)
move_qty: 1.000
```

但用户选择的是"箱"（Z34），输入的是"1"。

### 5.5 修复方案

**修改文件**：`MoveBdServiceImpl.java` 第654-657行

**修复前**：
```java
if (req.getSafeFlag()){
    itemUnit = safeItemUnit;
}
```

**修复后**：
```java
// 【修复】移位单位应该使用用户选择的单位，而不是被安全库存单位替换
// if (req.getSafeFlag()){
//     itemUnit = safeItemUnit;
// }
```

**修复说明**：
- 安全库存绑定逻辑使用 `safeItemUnit`（第780-784行），不受影响
- 移位记录使用用户选择的单位，符合用户意图

### 5.6 排查要点总结

| 排查要点 | 说明 |
|---------|------|
| 日志是关键 | 操作日志包含完整的请求参数，是定位问题的第一步 |
| 单位要区分 | 移位单位(safeFlag前)和安全库存单位(safeFlag后)是两个概念 |
| 数据验证 | 数据库记录和用户描述不一致时，以数据库为准 |
| 上下文完整 | 理解业务场景（解绑/绑定拣货位）有助于定位问题 |

### 5.7 相关代码位置速查

| 功能 | 文件 | 方法/行号 |
|------|------|----------|
| 移位确认 | `MoveBdServiceImpl.java` | `moveBdLocForthConfirm()` |
| 安全库存绑定 | `MoveBdServiceImpl.java` | 第780-804行 |
| 移位记录保存 | `MoveBdServiceImpl.java` | 第640-684行 |
| 库存表 | `w_stored_item` | basic_qty, basic_unit_id |
| 移位记录表 | `w_move_record` | move_qty, unit_code |

### 5.8 防复发检查清单

- [x] 移位单位不应受安全库存标志影响
- [x] 安全库存绑定使用独立的单位字段
- [ ] 增加单位一致性校验
- [ ] 单元测试覆盖移位单位场景

---

## 六、WMS 开发模式：Feign接口新增的标准流程

> 本模式记录新增外部系统（TMS/GAIA/MES等）→ WMS 接口时的标准开发流程和常见遗漏。

### 6.1 标准开发流程

```
1. edi Controller → 定义对外 API 入口
2. edi FeignClient → 定义调用 storage/outbound 等服务的接口
3. edi FeignClientHystrix → 必须同步添加 fallback 方法（否则编译报错）
4. storage/outbound FeignStorageController → 定义被调用的端点
5. storage/outbound Service → 实现业务逻辑
6. storage/outbound Mapper + XML → SQL 查询
```

### 6.2 必检清单

| 检查项 | 说明 | 遗漏后果 |
|--------|------|---------|
| FeignClient 接口方法 | 定义新方法 + @PostMapping 路径 | 无法调用 |
| **Hystrix Fallback** | 必须在对应 Hystrix 类中添加同名方法 | **编译报错** |
| 入参校验 | Controller 层做非空/格式校验 | 无效请求穿透到下游 |
| DTO 类命名 | edi 和下游服务的 DTO 可以独立（JSON 序列化桥接） | 无功能影响 |
| tenantCode 传递 | 确认外部系统是否通过 Header 携带，否则需显式 setUserInfo | ShardingSphere 路由失败 |

### 6.3 库存查询相关表关联

```
w_stored_item（库存明细）
  ├── w_location（库位表）→ location_type（库位类型）
  │     良品存货位 = 'GOOD_LOCATION'
  ├── w_batch_attributes（批次属性）→ vendor_code（供应商编码）
  │     关联键: w_stored_item.batch_id = w_batch_attributes.id
  └── 关键字段:
        status = 'AVAILABLE'（可用）
        freeze_sign = FALSE（解冻）
        basic_qty = 基本单位数量（汇总用 SUM）
```

### 6.4 典型实现参考

| 功能 | edi 入口 | Feign 端点 | storage 实现 |
|------|---------|-----------|-------------|
| TMS库存查询 | `TmsItemController.queryTmsInventory` | `StorageClient.queryTmsInventoryBySupplier` | `FeignStorageController` → `FeignStorageServiceImpl` |

---

## 七、WMS 开发模式：状态机变更的标准流程

> 本模式记录修改业务状态机时的标准流程，适用于出库单/波次/收货/上架/盘点等所有业务。

### 7.1 状态机变更四步法

```
1. 确认当前状态 → 枚举类定义（XxxStatusEnum / XxxStateEnum）
2. 确认目标状态 → 校验前置条件（哪些状态可以转换）
3. 确认触发条件 → 是用户操作？MQ消息？定时任务？
4. 确认副作用 → 状态变更后需要联动什么？
```

### 7.2 核心状态机参考

| 业务 | 枚举类 | 关键状态 | 变更入口 |
|------|--------|---------|---------|
| 出库订单 | OutboundStatusEnum | NEW→WAVED→ALLOCATED→PICKING→SHIPPING | OutboundMasterServiceImpl |
| 波次 | WaveStatusEnum | NEW→ALLOCATED→WORKING→FINISHED | WaveServiceImpl / CreateWaveServiceImpl |
| 收货任务 | TaskStatusEnum | AWAIT→RECEIVING→RECEIVED | InboundReceiveServiceImpl |
| 上架 | PutawayStatusEnum | NEW→PUT_SHELVES→PUT_FINISH | PutawayServiceImpl |
| 移位 | MoveStatusEnum | CREATE→IN_PROGRESS→COMPLETED | MoveBdServiceImpl |
| 盘点 | CountStatusEnum | TEMP→NEW→COUNTING→COUNT_FINISH | CountMasterServiceImpl |
| 补货 | ReplenishStatusEnum | NEW→REPLENISHMENT→REPLENISH_FINISH | ReplenishServiceImpl |
| 质检 | QualityInspectionStatusEnum | NO_NEED→PENDING→PARTIALLY→DONE | QualityInspectionRecordServiceImpl |
| 分拣 | SortTaskStatusEnum | NEW→CLAIMED→SORTING→FINISH | SortTaskServiceImpl |
| 集货 | ConsolidationStatusEnum | STOCKING→STOCK_UP_COMPLETED→OUT_STOCK→SHIPPED | ConsolidationMasterServiceImpl |

### 7.3 状态变更防错清单

| 检查项 | 说明 | 遗漏后果 |
|--------|------|---------|
| 前置状态校验 | 只有特定状态才能转换到目标状态 | 状态跳跃导致业务混乱 |
| 并发控制 | Redisson锁 + DB乐观锁(revision) | 并发修改覆盖 |
| 状态回滚 | 异常时是否需要回退状态 | 中间态卡死 |
| 联动操作 | 状态变更后触发的下游操作 | 流程中断 |
| MQ消息 | 状态变更是否需要发MQ通知其他服务 | 跨服务状态不一致 |

---

## 八、WMS 开发模式：分布式事务边界判断

> 本模式记录判断是否需要@GlobalTransactional的决策树和常见陷阱。

### 8.1 决策树

```
操作是否涉及多个数据库写入？
├── 否 → 无需分布式事务，用本地 @Transactional
└── 是 → 写入是否在同一服务内？
    ├── 是 → 本地 @Transactional 足够
    └── 否 → 是否通过 Feign 调用？
        ├── 是 → 需要检查：被调方法是否涉及写操作？
        │   ├── 只读 → 无需分布式事务
        │   └── 有写 → 需要 @GlobalTransactional
        └── 否(MQ) → 使用事务消息（两阶段提交）
```

### 8.2 已知@GlobalTransactional场景

| 服务 | 方法 | 事务范围 |
|------|------|---------|
| outbound | `CrossDetailServiceImpl.crossConfirm()` | 越库确认：出库+库存扣减+入库 |
| outbound | `PickTaskBeefGeneralServiceImpl` | 牛肉拣货：拣货+称重+库存 |
| outbound | `WaveAllocationServiceImpl.cancelAllocation()` | 取消分配：释放库存+恢复分配 |
| inside | `CountMasterServiceImpl.createCount()` | 盘点创建：盘点单+库位锁+库存冻结 |
| inside | `MoveBdServiceImpl.moveConfirm()` | 移位确认：移位记录+库存出入 |
| inbound | `InboundReceiveServiceImpl.confirmReceived()` | 收货确认：收货+库存入库 |
| inbound | `QualityInspectionRecordServiceImpl.confirm()` | 质检确认：质检+批次+库存 |

### 8.3 事务陷阱

| 陷阱 | 说明 | 预防 |
|------|------|------|
| @GlobalTransactional嵌套 | 内层事务回滚导致外层也回滚 | 避免嵌套，拆为独立事务 |
| Seata超时 | 业务逻辑耗时超timeoutMills | 合理设置超时，避免锁内慢操作 |
| XID丢失 | Feign调用链中XID未传递 | 检查RootContext.bind(xid) |
| AT模式限制 | 无主键DELETE/跨库JOIN不支持 | 检查SQL是否合规 |
| undo_log堆积 | 回滚日志未清理 | 定期清理7天前的log_status=0记录 |

---

## 九、WMS 开发模式：MQ消费者开发标准

> 本模式记录新增MQ消费者的标准流程和常见遗漏。

### 9.1 标准开发流程

```
1. 定义Topic常量 → MessageConst / ExportMessageConst
2. 定义Tag常量 → 用于同一Topic下的消息过滤
3. 定义Consumer Group → 命名规范: WMS_{SERVICE}_{BUSINESS}_{GROUP}
4. 创建Consumer类 → implements RocketMQListener<MessageType>
5. 添加@RocketMQMessageListener注解
6. 实现onMessage()方法
7. 添加幂等校验 → 查 w_callback 表或业务唯一键
```

### 9.2 注解模板

```java
@Component
@RocketMQMessageListener(
    topic = "TOPIC_NAME",
    consumerGroup = "CONSUMER_GROUP",
    selectorExpression = "TAG_NAME",  // 不指定则消费所有Tag
    consumeMode = ConsumeMode.CONCURRENTLY  // 或 ORDERLY
)
public class XxxConsumer implements RocketMQListener<XxxMessage> {
    @Override
    public void onMessage(XxxMessage message) {
        // 1. 幂等校验
        // 2. 参数校验
        // 3. 业务处理
        // 4. 记录回调
    }
}
```

### 9.3 必检清单

| 检查项 | 说明 | 遗漏后果 |
|--------|------|---------|
| Topic/Tag一致性 | Producer的Topic+Tag必须与Consumer匹配 | 消息不被消费 |
| Consumer Group唯一性 | 同一Group内不能有不同Topic的Consumer | 消费混乱 |
| 幂等处理 | MQ可能重复投递 | 数据重复 |
| 有序消费需求 | 库存操作等需ORDERLY | 并发消费导致数据不一致 |
| 事务消息 | 两阶段提交时检查LocalTransactionListener | 本地事务与MQ不一致 |
| 消费线程数 | consumeThreadMax配置 | 线程耗尽导致消费阻塞 |
| 死信队列 | 消费失败16次进入DLQ | 消息丢失 |

---

## 十、Agent 工程化模式：MCP 分层与目录化

> 本模式用于约束 auto-wms 内部能力的分层方式。目标不是重写现有系统，而是用 MCP 视角统一 Prompt、Router、Resource、Tool、Learning 的职责边界，降低混乱和重复建设。

### 10.1 最小分层骨架

```
用户意图
  -> Prompt Catalog
  -> Router / Registry
  -> Resource Catalog 装配上下文
  -> Tool Catalog 执行动作
  -> Audit / Memory / Learning 沉淀
```

### 10.2 五层职责表

| 层 | 核心职责 | 在 auto-wms 中的对应物 | 设计要求 |
|----|---------|----------------------|---------|
| Prompt Catalog | 承接用户意图，定义任务入口 | `wms:auto`、review/bug/learning 入口 | 薄 Prompt，只定义任务目标、边界和调用协议 |
| Router / Registry | 发现、排序、选择能力 | intent matcher、canonical router、agent registry、skill indexer | 只做选择与编排，不承载底层动作 |
| Resource Catalog | 提供只读上下文 | `skills/wms-domain.md`、`skills/error-patterns.md`、`skills/workflow-patterns.md`、`skills/feign-mq-map.md`、`skills/table-relations.md`、`memory/MEMORY.md` | 稳定、只读、可装配、适合进入上下文 |
| Tool Catalog | 执行动作并返回动态结果 | 检索、扫描、diff 审查、质量检查、学习提取脚本 | 输入输出清晰，可失败，可追踪，副作用必须显式 |
| Audit / Learning | 记录结果并形成复用资产 | continuous-learning、instinct candidates、memory、knowledge steward | 任务结束后自动沉淀，避免一次性经验丢失 |

### 10.3 分层判断规则

| 问题 | 判断 | 归属 |
|------|------|------|
| 这个能力主要是在“提供信息”吗？ | 是，且只读稳定 | Resource |
| 这个能力必须执行后才有结果吗？ | 是，依赖参数/运行时 | Tool |
| 这个能力是在组织一类任务吗？ | 是，面向用户意图 | Prompt |
| 问题其实是“该选谁来做”吗？ | 是，涉及发现/排序/编排 | Router / Registry |
| 这个能力是在记录经验供下次复用吗？ | 是，任务完成后沉淀 | Audit / Learning |

### 10.4 设计口诀

- 入口统一，路由独立，知识只读，动作收敛，学习闭环。
- 薄 Prompt，厚 Schema，清晰 Resource。
- 先分层，再扩展；先边界，再自动化。

### 10.5 常见误区与修正

| 误区 | 表现 | 修正方式 |
|------|------|---------|
| 把查询都做成 Tool | 静态知识也走执行链路 | 只读稳定内容优先归为 Resource |
| 把复杂流程塞成巨型 Tool | 检索、执行、编排、副作用全混在一起 | 拆成 Prompt + Router + Resource + Tool |
| Prompt 越写越厚 | 把选择逻辑和实现细节写进入口 | Prompt 只保留任务协议，底层细节下沉到 Router/Tool schema |
| Router 侵入实现 | 路由层直接操作底层资源或写业务逻辑 | Router 只负责发现、排序、选择 |
| 没有 Learning 闭环 | 每次任务都从头开始 | 在任务完成后沉淀 memory / instinct / pattern |

### 10.6 风险分级（供 Agent 自动调用参考）

| 等级 | 类型 | 示例 |
|------|------|------|
| L0 | 静态只读 | 读取知识库、读取 memory、读取架构索引 |
| L1 | 动态只读 | 搜代码、查状态、跑只读分析 |
| L2 | 本地可写 | 更新 memory、生成补丁、修改本地文件 |
| L3 | 外部可见写入 | 发消息、创建 PR、推送代码、调用共享系统写接口 |
| L4 | 高风险不可逆 | 删除数据、覆盖共享状态、强制破坏性操作 |

### 10.7 可观测性主链路

```
Prompt -> Router -> Resource 装配 -> Tool 调用 -> Result -> Audit/Trace -> Learning
```

最少应记录：
1. 为什么选择这个 Prompt / Tool
2. 当时装配了哪些 Resource
3. Tool 的输入输出和失败点
4. 是否产生副作用
5. 哪些结论被沉淀到 memory / instinct

### 10.8 当前项目的最小落地策略

1. 保留 `wms:auto` 作为统一高层入口，不急于拆散。
2. 先建立 Prompt/Resource/Tool 的目录意识，不急于全面协议化。
3. 新增能力时，先判断分层，再决定是否新建 Tool。
4. 对知识文件优先做 Resource 化管理，对脚本优先做 Tool 化管理。
5. 任何学习类任务完成后，优先沉淀到 `workflow-patterns.md` 或 `MEMORY.md`。

### 10.9 何时应该新建 Tool

- 动作本身有独立价值
- 输入输出可以稳定定义
- 会被重复调用
- 与现有 Tool 边界清晰
- 值得单独授权、追踪、审计

### 10.10 何时不该新建 Tool

- 只是某个 Resource 的另一种视图
- 只是已有 Tool 的参数组合
- 只是 Prompt 的轻微变体
- 只是 Router 的选择逻辑变化
- 尚未形成稳定输入输出边界
