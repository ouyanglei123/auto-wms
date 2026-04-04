---
description: WMS 微服务开发向导 - 智能路由到对应微服务，提供领域感知的代码生成和业务逻辑建议
---

# /wms:wms — WMS 微服务开发向导

> 基于 WMS 仓储管理系统领域知识，精准定位目标微服务，提供领域感知的开发辅助。

---

## 执行流程

### 1. 识别目标微服务

根据用户需求中的关键词，自动匹配微服务：

#### outbound（出库）— 121 Controller / 170 Service / 113 Entity

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

#### inbound（入库）— 56 Controller / 111 Service / 69 Entity

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

#### basicdata（基础数据）— 173 Controller / 127 Service / 137 Entity

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

#### inside（库内作业）— 45 Controller / 68 Service / 62 Entity

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

#### storage（库存）— 29 Controller / 50 Service / 58 Entity

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

#### edi（电子数据交换）— 24 Controller / 55 Service / 38 Entity

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

#### 跨服务/全局

| 关键词 | 处理策略 |
|-------|---------|
| 多个服务/跨服务/架构/整体 | 分析所有涉及服务的调用链 |
| 服务间调用失败 | 检查 Feign Client + Hystrix 降级 |
| MQ消息丢失/重复 | 检查 Producer/Consumer + 事务消息 |
| 分布式事务 | 检查 Seata AT 配置 + undo_log |
| 数据不一致 | 检查 ShardingSphere 分片 + MQ幂等 |

### 2. 加载领域知识

从 `skills/wms-domain.md` 加载 WMS 领域知识，获取：
- 目标微服务的精确包结构
- 相关 Controller / Service / Entity / Mapper 类名
- 服务间调用关系（Feign）
- MQ 消费者和定时任务
- 枚举和常量

### 3. 定位代码位置

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

### 4. 生成解决方案

基于定位到的代码，提供：
1. **Bug修复**: 定位根因 → 给出精确修改方案
2. **新功能开发**: 遵循现有架构模式 → Controller + Service + Entity + Mapper
3. **架构分析**: 服务间调用链 → 数据流 → 状态流转

### 5. 输出规范

- 修改现有文件: 使用 Edit 工具，精确到行号
- 新建文件: 遵循项目已有命名规范和包结构
- 编码风格: MyBatis-Plus 注解、Apollo 配置、分布式锁、Redisson
- 测试: 遵循项目测试框架(Vitest/JUnit)
