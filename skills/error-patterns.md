---
name: error-patterns
description: 常见错误模式速查 - 编译错误、运行时错误、测试失败、CI/CD 故障的根因分析和速修方案，让 build-fix Agent 秒级定位问题
version: 1.0.0
author: auto-wms
tags: [error, debugging, patterns, build-fix, troubleshooting]
---

# Error Patterns -- 常见错误模式速查

> build-fix Agent 自动加载此知识库，快速定位错误根因并修复。

## 错误分类体系

### 1. Node.js / JavaScript 编译错误

| 错误关键词 | 根因 | 速修方案 |
|-----------|------|---------|
| `Cannot find module` | 模块未安装或路径错误 | `npm install` 或检查 import 路径 |
| `Unexpected token` | 语法错误（括号/引号不匹配） | 检查最近编辑的文件第 N 行 |
| `Cannot use import statement` | 使用 ESM 语法但未设 `"type": "module"` | package.json 加 `"type": "module"` |
| `ERR_MODULE_NOT_FOUND` | ESM import 路径缺少 `.js` 后缀 | 所有相对 import 加 `.js` 扩展名 |
| `ReferenceError: X is not defined` | 变量未声明或作用域错误 | 检查变量声明和 import |
| `SyntaxError: Unexpected end of input` | 缺少闭合括号/花括号 | 检查最近编辑区域的括号匹配 |
| `ERR_PACKAGE_PATH_NOT_EXPORTED` | 包的 exports 字段不包含此路径 | 检查包版本或换 import 路径 |

### 2. 测试框架错误

| 错误关键词 | 根因 | 速修方案 |
|-----------|------|---------|
| `vitest: TESTS_FAILED` | 测试断言不通过 | 逐个检查失败断言 |
| `TypeError: X is not a function` | mock 未正确设置 | 检查 `vi.mock()` 或 `vi.fn()` 配置 |
| `Cannot read properties of undefined` | 测试数据缺少字段 | 补全测试 fixture 的必需字段 |
| `Timeout - Async test` | 异步操作未 await 或缺少 cleanup | 加 `await` 或 `vi.useFakeTimers()` |
| `ENOENT: no such file` | 测试文件引用的 fixture 不存在 | 检查 `__fixtures__/` 路径 |
| ` vitest --coverage fails` | `@vitest/coverage-v8` 未安装 | `npm i -D @vitest/coverage-v8` |

### 3. Git / CI 错误

| 错误关键词 | 根因 | 速修方案 |
|-----------|------|---------|
| `Merge conflict` | 两个分支修改同一文件 | 手动解决冲突或 `git mergetool` |
| `Permission denied (publickey)` | SSH key 未配置 | `ssh-keygen` + 添加到 GitHub |
| `GH009: Protected branch` | 直接 push 到受保护分支 | 创建 PR 或换目标分支 |
| `Husky pre-commit failed` | 提交钩子检查不通过 | 修复 lint/test 错误后重试 |
| `npm ERR! 403 Forbidden` | npm 包名已被占用或无权限 | 换包名或检查 npm 登录状态 |

### 4. Claude Code 特有错误

| 错误关键词 | 根因 | 速修方案 |
|-----------|------|---------|
| `Context window exceeded` | 对话上下文过长 | 执行 `/clear` 或开新会话 |
| `Tool call failed` | 工具调用参数错误 | 检查工具参数格式 |
| `Agent timeout` | 子 Agent 执行超时 | 简化任务或增大 timeout |
| `MCP server disconnected` | MCP 服务器进程崩溃 | 检查 MCP 配置和 API Key |

### 5. 跨平台问题

| 错误关键词 | 根因 | 速修方案 |
|-----------|------|---------|
| `EACCES: permission denied` | Linux/Mac 文件权限 | `chmod` 或换安装目录 |
| `EPERM: operation not permitted` | Windows 文件被占用 | 关闭编辑器或用 `--force` |
| `spawn X ENOENT` | 系统命令不存在 | 安装对应工具或检查 PATH |
| `long path issues` | Windows 260 字符路径限制 | `git config core.longpaths true` |

## 修复策略模板

当 build-fix Agent 遇到错误时，按以下优先级尝试：

1. **精确匹配**：在上方表格中搜索错误关键词
2. **模式匹配**：提取错误文件名+行号，Read 该位置，分析根因
3. **依赖检查**：`npm ls` 检查依赖树是否完整
4. **版本回退**：`git stash` 暂存改动，验证是否是最近引入的
5. **搜索引擎**：通过 brave-search/tavily MCP 搜索错误信息

## 6. WMS 专属错误模式

### 6.1 Feign 调用失败

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| `FeignException: status 500` | 被调用服务内部异常 | 查被调服务的 Feign Controller(api/) + Hystrix 降级 |
| `FeignException: status 404` | Feign 接口路径不匹配 | 对比 FeignClient @RequestMapping 和目标 Controller |
| `HystrixRuntimeException: timed out` | 被调服务响应超时 | 检查目标 Service 是否有大查询/死锁，调整 hystrix.timeout |
| `Load balancer does not have available server` | 目标服务未注册到 Eureka | 检查目标服务启动状态 + Eureka 注册 |
| `Feign retry exhausted` | 网络抖动或服务不可用 | 检查 Ribbon 重试配置 + 目标服务健康 |

### 6.2 分布式锁问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| 业务并发导致数据不一致 | 锁粒度不够或未加锁 | 搜索 `GlobalLockHelper` / `Redisson RLock` 确认锁范围 |
| `Redisson lock timeout` | 业务执行超900s | 检查锁内逻辑是否有慢查询/远程调用 |
| 死锁 | 锁未释放(异常未unlock) | 检查 try-finally 是否包裹 `lock.unlock()` |

### 6.3 MQ 消息问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| 消息未消费 | Consumer Group 配置错误 | 检查 `@RocketMQMessageListener` 的 topic/tag/consumerGroup |
| 重复消费 | 消费失败重试 | 检查消费逻辑是否幂等(查 StoredItem / MoveDetail 唯一约束) |
| 事务消息不一致 | 本地事务成功但MQ未提交 | 检查 `AbstractRocketMQLocalTransactionListener` 的 executeLocalTransaction |
| 消息堆积 | 消费速度跟不上 | 检查 Consumer 是否有慢操作，考虑批量消费 |

### 6.4 分库分表问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| `ShardingException` | 分片键缺失或路由错误 | 检查 SQL 是否包含分片键(tenantCode) |
| 跨库查询失败 | 不支持跨分片JOIN | 改为单分片查询或使用 ShardingSphere 广播表 |
| 分页查询慢 | 深度分页跨分片合并 | 优化为游标分页或限制分页深度 |

### 6.5 Apollo 配置问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| `@Value` 注入 null | namespace 未配置或 key 错误 | 检查 Apollo namespace(application/shsc-wms-sharding-jdbc/shsc-wms-common) |
| 配置变更不生效 | 未触发 @RefreshScope | 检查 Bean 是否有 `@RefreshScope` 注解 |

### 6.6 业务逻辑常见问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| 出库分配失败 | 库存不足或冻结 | 检查 `WaveAllocationServiceImpl` + `StoredItemServiceImpl` |
| 波次创建失败 | 出库单状态不对(非NEW) | 检查 `CreateWaveServiceImpl` 状态前置校验 |
| 拣货数量不匹配 | 分配后库存变动 | 检查 `PickTaskGeneralServiceImpl` + 锁机制 |
| 上架推荐库位失败 | 库位载入规则不匹配 | 检查 `AgvGetTargetLocChainService` 责任链 |
| 盘点盈亏异常 | 盘点期间有出入库操作 | 检查 `CountLocationLockServiceImpl` 锁范围 |
| 收货数量校验失败 | 超出PO数量 | 检查 `RcptTaskServiceImpl` 数量校验逻辑 |
| 编码生成失败 | 编码规则配置缺失或序列号耗尽 | 检查 `CodeServiceImpl` + BasicDataClient |
| 收货报 `no such unit` | 商品单位(inboundUnitId)在basicdata中不存在 | 检查 `QualityInspectionRcptServiceImpl:520`，查 rcpt_task_detail.inbound_unit_id → basicdata.item_unit |
| 移位解绑拣货位时数量/单位不匹配 | safeFlag=true时itemUnit被替换为safeItemUnit | `MoveBdServiceImpl.moveBdLocForthConfirm()` 第654-657行，不应该在移位时替换单位 |
| RF收货超时/锁失败 | 收货单号分布式锁900s未释放 | 检查 `InboundReceiveController.confirmReceived()` 锁内逻辑是否有慢查询 |
| AGV上架库位冲突 | 库位被其他任务预占 | 检查 `AbstractAgvGetTargetLocHandler.locationAgvTaskFilter()` |
| 越库商品未及时分配 | 越库触发自动分配失败 | 检查 `outBoundClient.afterPutawayAutoAllocation()` |

### 6.7 批次效期问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| 临期库存被分配出库 | 临期管控未生效/配置错误 | 检查 `WaveAllocationServiceImpl` 的临期过滤逻辑 |
| 批次分配不均 | 波次生产日期定位策略配置不当 | 检查 `WaveProduceDatePositionServiceImpl` 的 allocateFlowDirection 规则 |
| 效期预警数据不准确 | 定时刷新Job未执行 | 检查 `AsyncRefreshStoredItemPreWarningJob` 执行状态 |
| 过期品转良品失败 | 品级转换规则校验 | `ItemGradeChangeServiceImpl` 校验 isExpired + gradeCode 耦合规则 |

### 6.8 EDI对接问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| 出库回传GAIA失败 | SOAP超时/GAIA接口不可用 | 检查 `wms_all_interface_log` 表的 return_message |
| MQ消息未消费 | Consumer Group配置错误 | 检查 `@RocketMQMessageListener` 的 topic/tag/consumerGroup |
| 重复消费 | 消费失败未确认 | 检查 `w_callback` 表是否有重复记录 |
| 入库回传失败 | 收货任务状态非COMPLETE | 检查 `InboundCallbackBatchInfoServiceImpl` 收货状态校验 |
| 奈雪单位转换失败 | pieceLoad为null | 检查 `basicdata.item_unit` 表的 piece_load 字段 |

### 6.9 盘点业务问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| 盘点库位锁获取失败 | 静盘库位已被其他操作占用 | 检查 `CountLocationLockServiceImpl` + `w_count_location_lock` 表 |
| 盘点录入被阻塞 | Redis分布式锁900s未释放 | 检查 `CountAddRedisLockHandler1` 锁逻辑 |
| 盘点库存与实际不符 | 盘点期间有出入库操作 | 检查 `CountFinishRpcStorageHandler5` 库存处理 |
| 盘点冻结未回滚 | 取消盘点时库存未解冻 | 检查 `CountCancelRpc` 的回滚逻辑 |
| 责任链断链 | Handler返回false导致后续不执行 | 检查 `AbstractCountCreateHandler.doCreateCount()` 断链位置 |

### 6.10 补货业务问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| 补货数量计算错误 | 空库位算成非空或反之 | 检查 `ReplenishServiceImpl.checkStoregBatch()` 条件判断 |
| 多批次不补货 | 批次一致性校验失败 | 检查生产日期+保质期+过期日期是否一致 |
| 补货完成波次未触发 | `afterReplenishmentAutoAllocation()` 调用失败 | 检查 Feign 调用日志 |
| 紧急补货取消失败 | 回调 outbound 失败 | 检查 `cancelEmergencyReplenish()` 异常处理 |

### 6.11 分布式事务问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| 全局锁超时 | 业务执行超timeoutMills | 检查 `undo_log` 表 log_status=1 的记录 |
| 分支事务部分回滚 | Seata Server不可用 | 检查 TC 服务状态和日志 |
| undo_log堆积 | 回滚日志未清理 | `DELETE FROM undo_log WHERE log_status=0 AND log_created < DATE_SUB(NOW(), INTERVAL 7 DAY)` |
| AT模式不支持的操作 | 执行了无主键DELETE/跨库JOIN | 检查 `CustomRMHandler` 自定义处理 |
| 嵌套事务不生效 | 传播行为配置错误 | 检查 Spring `@Transactional(propagation=)` 配置 |

### 6.12 库存冻结/解冻问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| 重复冻结 | 已冻结的库存再次冻结 | 检查 `doStorageFreeze()` 重复校验逻辑 |
| 封存商品无法解冻 | freezeReason含"封存"字样 | 检查 `StoredItemServiceImpl.doStorageFreeze()` 第xxx行 |
| 冻结库存被分配 | freezeSign检查未生效 | 检查 `WaveAllocationServiceImpl` 的冻结过滤 |
| 盘点冻结未回滚 | 取消盘点时status未恢复AVAILABLE | 检查 `CountCancelRpc` 库存处理 |

### 6.13 损耗管理问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| 损耗状态不更新 | DamageStorageStatusRefreshJob未执行 | 检查 `w_damage_storage_job` 表记录 |
| 报损数量超出库存 | 拣货残品数量与报损不一致 | 检查 `PickTaskDetailUnPlanServiceImpl.addDamageStorageByPuo3()` |
| OA审批流未触发 | WorkFlow配置缺失 | 检查 `OAWorkFlowFeign.startProcess()` 日志 |
| 损耗与效期关联丢失 | batchAttributes.damageStorageId未更新 | 检查 `DealDamageReq` 处理逻辑 |

### 6.14 定时任务问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| AutoCreateWaveJob未执行 | Redis锁未释放/Job配置错误 | 检查 `t_elastic_job_property` 表cron配置 |
| 分片不均 | AverageAllocationJobShardingUtil计算错误 | 检查仓库数量与分片数 |
| Job执行超时 | 锁超时900s | 检查 `GlobalLockHelper` 锁状态 |
| Job依赖链断裂 | 上游Job失败导致下游未触发 | 检查 `w_auto_wave_task` 状态 |

### 6.15 温层校验问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| 移位被拒绝-温层不一致 | 库位温层≠商品温层 | 检查 `MoveBdServiceImpl.moveBdLocForthConfirm()` 第521行 |
| 上架推荐库位为空 | 温层过滤过于严格 | 检查 `PutawayServiceImpl.suggestLocation()` 温层校验 |
| 新零售温层校验绕过 | NEW_RETAIL类型独立产线 | 检查 `LocationTypeEnum.NEW_RETAIL` 判断逻辑 |
| 温层删除失败 | 库区/商品已引用 | 检查 `WarmLayerServiceImpl.deleteWarmLayerById()` 引用校验 |

### 6.16 编码规则问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| FAILED_TO_ACQUIRE_LOCK | 3秒内未获取Redis锁 | 检查 `CodeServiceImpl` 锁参数(50s超时) |
| 编码返回null | BasicDataClient Feign调用失败 | 检查basicdata服务状态和网络 |
| 序列号溢出 | 达到digit位数上限 | 增大digit参数(如4→5位) |
| 编码规则缺失 | getCode()未找到对应prefix | 检查 `SerialNumberType` 枚举定义 |

### 6.17 库区库位问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| 库位推荐为空 | 空库位查询条件过于严格 | 检查 `LocationMapper.xml` getEmptyLoc SQL |
| 库位类型错误 | locationType字段与业务不匹配 | 检查 `LocationTypeEnums` 枚举值 |
| 库位承载不足 | 重量/体积超限 | 检查 `LocationLoad` 的weight/volume字段 |
| 库位挂载失败 | 库位已与其他商品绑定 | 检查 `LocationLoad` 的 isStandardStorehouse 限制 |

### 6.18 AGV任务问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| AGV任务创建失败 | 未维护上架推荐区域配置 | 检查 `PlacementAdviceServiceImpl` handle50() |
| AGV任务下发失败 | Wes系统接口调用失败 | 检查 `WesBizcoreClient.createAgvTask()` Feign日志 |
| AGV任务无法取消 | 状态不可取消 | 检查 `AgvStatusEnum.getCancelStatus()` |
| AGV库位冲突 | 目标库位被预占 | 检查 `AbstractAgvGetTargetLocHandler.locationAgvTaskFilter()` |

### 6.19 WMS 错误码速查

| 错误码范围 | 所属模块 | 定位文件 |
|-----------|---------|---------|
| 500-599 | 通用/基础 | `BasicdataErrorCode.java` |
| 100-199 | 收货模块 | `InboundErrorCode.java` |
| 200-299 | 上架模块 | 各服务的 `ErrorCodeDefine.java` |
| 300-399 | 出库/订单 | `OutboundConstant.java` |
| 400-499 | 质检模块 | `QualityInspection*Enum.java` |

### 6.20 出库订单与波次业务问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| 波次创建失败 | 出库单状态非NEW | 检查 `CreateWaveServiceImpl` 状态前置校验 |
| 分配失败-库存不足 | 库存被冻结或数量不足 | 检查 `WaveAllocationServiceImpl` 的冻结过滤 |
| 波次自动创建未触发 | AutoCreateWaveJob未执行或锁超时 | 检查 `t_elastic_job_property` 表cron + Redis锁 |
| 订单无法取消 | 订单已建波次或已分配 | 检查 `OutboundMasterServiceImpl.outboundCancel()` 状态校验 |
| 拣货数量不匹配 | 分配后库存变动 | 检查 `PickTaskGeneralServiceImpl` + 锁机制 |
| 分拣任务下发失败 | 客户绑定分拣位配置缺失 | 检查 `BasicDataService.selectSortBindedConfigInfo()` |

### 6.21 入库收货与上架业务问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| RF收货超时/锁失败 | 收货单号分布式锁900s未释放 | 检查 `InboundReceiveController.confirmReceived()` 锁内逻辑 |
| 收货报 `no such unit` | 商品单位在basicdata中不存在 | 检查 `rcpt_task_detail.inbound_unit_id → basicdata.item_unit` |
| 盲收失败 | 托盘商品温层不一致 | 检查 `BlindReceiveServiceImpl.checkStoredItemForItem()` |
| 一车多单添加失败 | 任务在其他关联订单中存在 | 检查 `InboundOneCarManyOrderServiceImpl` 校验逻辑 |
| 上架推荐库位为空 | 温层过滤或体积计算失败 | 检查 `PutawayServiceImpl.suggestLocation()` 温层校验 |
| AGV上架任务失败 | 未维护上架推荐区域配置 | 检查 `PlacementAdviceServiceImpl` handle50() |
| 越库商品未及时分配 | 越库触发自动分配失败 | 检查 `outBoundClient.afterPutawayAutoAllocation()` |

### 6.22 质检与损耗业务问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| 质检状态不更新 | 质检任务状态机异常 | 检查 `QualityInspectionStatusEnum` 状态流转 |
| 质检放行失败 | 证件审核未通过 | 检查 `QualityInspectionCertificate` 记录 |
| 收货报质检异常 | 质检任务创建失败 | 检查 `RcptQualityInspectionServiceImpl` |
| 损耗状态不更新 | `DamageStorageStatusRefreshJob` 未执行 | 检查 `w_damage_storage_job` 表记录 |
| 报损数量超出库存 | 拣货残品数量与报损不一致 | 检查 `PickTaskDetailUnPlanServiceImpl.addDamageStorageByPuo3()` |
| OA审批流未触发 | WorkFlow配置缺失 | 检查 `OAWorkFlowFeign.startProcess()` 日志 |
| 损耗与效期关联丢失 | `batchAttributes.damageStorageId` 未更新 | 检查 `DealDamageReq` 处理逻辑 |
| 品级变更失败 | 品级转换规则校验 | `ItemGradeChangeServiceImpl` 校验 isExpired + gradeCode 耦合规则 |

### 6.23 定时任务与分布式锁问题

| 错误表现 | 根因 | 定位方法 |
|---------|------|---------|
| AutoCreateWaveJob未执行 | Redis锁未释放/Job配置错误 | 检查 `t_elastic_job_property` 表cron配置 |
| 分片不均 | AverageAllocationJobShardingUtil计算错误 | 检查仓库数量与分片数 |
| Job执行超时 | 锁超时900s | 检查 `GlobalLockHelper` 锁状态 |
| Job依赖链断裂 | 上游Job失败导致下游未触发 | 检查 `w_auto_wave_task` 状态 |
| 获取锁失败 | 3秒内未获取Redis锁 | 检查 `CodeServiceImpl` 锁参数(50s超时) |
| 任务堆积 | Job执行时间超过cron间隔 | 检查任务内是否有慢查询/远程调用 |
| 死锁(用户被锁定) | 拣货任务卡住，用户无法操作 | `TaskLockUserCleanJob` 会自动清理25分钟前的占用 |
| 库存数据不一致 | 多个Job同时操作同一库存 | 检查 `w_stored_item` 锁是否正确获取 |


## 修复策略模板

当 build-fix Agent 遇到错误时，按以下优先级尝试：

1. **精确匹配**：在上方表格中搜索错误关键词
2. **模式匹配**：提取错误文件名+行号，Read 该位置，分析根因
3. **依赖检查**：`npm ls` 检查依赖树是否完整
4. **版本回退**：`git stash` 暂存改动，验证是否是最近引入的
5. **搜索引擎**：通过 brave-search/tavily MCP 搜索错误信息

## 与 auto-wms 集成

- `/wms:auto` 自动加载此知识库和 `wms-domain.md`
- quest-designer 在设计 Quest 时可参考反模式警告
- hooks 中的 TypeScript 检查和 Prettier 自动修复可参考此知识库
