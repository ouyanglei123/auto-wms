---
name: wms-domain
description: WMS 仓储管理系统领域知识 - 按业务域分类的精确代码定位索引
version: 3.0.0
author: auto-wms
tags: [wms, warehouse, logistics, outbound, inbound, basicdata, inside, storage, edi]
---

# WMS 仓储管理系统领域知识

> 本文档是 `/wms:auto` 超级命令的核心定位引擎。按**业务域分类**，通过关键词 → 服务 → 类名的映射链，实现秒级代码定位。

---

## 1. 项目概览

### 1.1 技术栈

| 技术 | 用途 |
|------|------|
| Spring Boot 2.1.x + Spring Cloud | 微服务框架 |
| MyBatis-Plus 3.1.2 | ORM |
| Apache ShardingSphere + Seata AT | 分库分表 + 分布式事务 |
| Apollo | 配置中心 |
| RocketMQ | 异步消息(含事务消息) |
| Redis + Redisson | 分布式锁/缓存 |
| ElasticJob | 分布式定时任务 |
| EasyExcel | Excel导入导出 |

### 1.2 微服务规模

| 服务 | Controller | Service | Entity | Feign | MQ | Job |
|------|------------|---------|--------|-------|-----|-----|
| outbound | 121 | 170 | 113 | 10 | 17 | 14 |
| inbound | 56 | 111 | 69 | 13 | 19 | 5 |
| basicdata | 173 | 127 | 137 | 13 | 7 | 5 |
| inside | 45 | 68 | 62 | 10 | 14 | 14 |
| storage | 29 | 50 | 58 | 10 | 12 | 13 |
| edi | 24 | 55 | 38 | 20 | 14 | 1 |
| **合计** | **448** | **581** | **477** | **76** | **83** | **52** |

### 1.3 代码结构

```
{service}/src/main/java/com/shsc/wms/{service}/biz/
├── controller/           # PC端API
├── controller/api/       # Feign调用API
├── service/impl/         # Service实现
├── entity/               # 实体类
├── feign/                # Feign Client
├── mq/consumer/          # MQ消费者
├── enums/                # 枚举类
└── constant/             # 常量类
```

---

## 2. 快速定位索引

### 2.1 常用场景 → 代码定位

| 业务场景 | Controller | ServiceImpl | Entity/关键方法 |
|---------|-----------|-------------|----------------|
| 出库订单 | OutboundMasterController | OutboundMasterServiceImpl | OutboundMaster |
| 波次创建 | WaveController | CreateWaveServiceImpl | WaveMaster |
| 库位分配 | WaveAutoAllocationController | WaveAllocationServiceImpl | AllocationLoading |
| 提总拣货 | PickTaskGeneralController | PickTaskGeneralServiceImpl | PickTaskGeneral |
| 摘果拣货 | PickTaskFruitController | PickTaskFruitServiceImpl | PickTaskFruit |
| RF拣货 | RfPickController | RfPickServiceImpl | — |
| 分拣任务 | SortTaskController | SortTaskServiceImpl | SortTask |
| 越库确认 | RfCrossController | CrossDetailServiceImpl | CrossDetail |
| 集货 | PcConsolidationController | ConsolidationMasterServiceImpl | ConsolidationMaster |
| 装箱 | PackBoxRecordController | PackBoxMasterServiceImpl | PackBoxMaster |
| 复核 | ReviewRecordController | ReviewRecordServiceImpl | ReviewRecord |
| 发运 | DeliveryController | DeliveryServiceImpl | AllocationLoading |
| 入库订单 | InboundMasterController | InboundMasterServiceImpl | InboundMasterEntity |
| RF收货 | InboundReceiveController | InboundReceiveServiceImpl | RcptTaskEntity |
| 上架 | PutawayController | PutawayServiceImpl | PutawayMasterEntity |
| AGV上架 | AgvApiController | AgvApiServiceImpl | AgvMoveTask |
| 质检 | QualityInspectionController | QualityInspectionRecordServiceImpl | QualityInspectionRecord |
| 移位 | MoveMasterController | MoveBdServiceImpl | MoveMaster |
| 盘点 | CountMasterController | CountMasterServiceImpl | CountMaster |
| 补货 | ReplenishMasterController | ReplenishServiceImpl | ReplenishMaster |
| 冻结 | BlockedItemController | BlockedItemServiceImpl | BlockedItem |
| 库存查询 | StoredItemController | StoredItemServiceImpl | StoredItem |
| 批次属性 | BatchAttributesController | BatchAttributesServiceImpl | BatchAttributes |
| 损耗管理 | DamageStorageManageController | DamageStorageManageServiceImpl | DamageStorageManage |
| 商品 | ItemMasterController | ItemMasterServiceImpl | ItemMaster |
| 库位 | LocationController | LocationServiceImpl | Location |
| GAIA对接 | PushGaiaController | PushGaiaServiceImpl | — |

### 2.2 关键词 → 服务 映射

| 关键词 | 服务 |
|-------|------|
| 出库/波次/拣货/分拣/装箱/复核/发运 | outbound |
| 入库/收货/上架/质检/AGV | inbound |
| 移位/盘点/补货/冻结/点检 | inside |
| 商品/库位/库区/仓库/客户/编码 | basicdata |
| 库存/批次/效期/损耗 | storage |
| EDI/GAIA/TMS/溯源 | edi |

---

## 3. 出库业务 (outbound)

### 3.1 出库订单

**状态机**: `NEW → WAVED → ALLOCATED → PICKING → TO_SORTING → SORTING → TO_SHIPPING → SHIPPING`

**订单类型**: PUO1(内部领用) / PUO3(报损出库) / ZOR(销售出库) / MD(门店要货) / TT/ZZTT(调拨) / GYUB(转储) / ZSO/ZKTH(退供)

**核心文件**: `OutboundMasterController` → `OutboundMasterServiceImpl` → `OutboundMaster`

### 3.2 波次管理

**状态机**: `NEW → ALLOCATED → WORKING → FINISHED`

**拣货方式**: WORK_BY_RULE(按规则) / WORK_BY_GENERAL(提总) / WORK_BY_FRUIT(摘果) / WORK_BY_SORTING(边拣边分)

**自动波次**: `AutoCreateWaveJob` 每3分钟触发

**核心文件**: `WaveController` → `CreateWaveServiceImpl` → `WaveMaster`

### 3.3 库位分配

**核心**: WaveAllocationServiceImpl → AllocationLoading → AllocationLoadingDetail

**分配校验**: 临期库存 / 冻结状态 / 小数位

### 3.4 拣货

| 类型 | Controller | Service | Entity |
|------|-----------|---------|--------|
| 提总拣货 | PickTaskGeneralController | PickTaskGeneralServiceImpl | PickTaskGeneral |
| 摘果拣货 | PickTaskFruitController | PickTaskFruitServiceImpl | PickTaskFruit |
| 牛肉拣货 | PickTaskBeefGeneralController | PickTaskBeefGeneralServiceImpl | BeefPickWeighData |
| RF拣货 | RfPickController (63接口) | RfPickServiceImpl | — |

### 3.5 分拣

**状态机**: `NEW → ABNORMAL / CLAIMED → SORTING → FINISH / CANCELED`

**分拣方式**: RF / 纸单 / 语音 / DAS电子标签

**核心文件**: `SortTaskController` → `SortTaskServiceImpl` → `SortTask`

### 3.6 越库

**类型**: SB(收货越库) / SC(上架越库)

**RF越库6步**: 选择客户 → 选择任务 → 扫描托盘 → 核对信息 → 修改数量 → 选择目标托盘

**核心文件**: `RfCrossController` → `CrossDetailServiceImpl.crossConfirm()` (带@GlobalTransactional)

### 3.7 集货

**状态机**: `STOCKING → STOCK_UP_COMPLETED → OUT_STOCK → SHIPPED`

**核心文件**: `PcConsolidationController` → `ConsolidationMasterServiceImpl`

### 3.8 装箱

**状态**: NORMAL / ADD_SUB(有增减) / REMOVE(已清空)

**满箱条件**: remainingQty ≤ 0 → 自动标记REMOVE

**箱码格式**: `F+年月日+4位流水`

**核心文件**: `PackBoxRecordController` → `PackBoxMasterServiceImpl`

### 3.9 复核

**状态**: NEW → PARTIAL_REVIEW → REVIEWED / NO_REVIEW_REQUIRED

**RF复核5步**: 客户集合 → 交货日期 → 门店列表 → 商品确认 → 修改复核数量

**核心文件**: `ReviewRecordController` → `ReviewRecordServiceImpl`

### 3.10 发运/装车

**出库状态**: `TO_SHIPPING → SHIPPING`

**TMS调度对接**: TMS推送调度单 → WMS创建AllocationLoading → 装车完成回传TMS

**核心文件**: `DeliveryController` → `DeliveryCommitServiceImpl`

---

## 4. 入库业务 (inbound)

### 4.1 入库订单

**状态机**: `NEW → RECEIVING → RECEIVED → CLOSE / CANCELED`

**核心文件**: `InboundMasterController` → `InboundMasterServiceImpl`

### 4.2 收货

**TaskStatusEnum**: `AWAIT → RECEIVING → RECEIVED / CANCELED`

**RF收货流程**: scanPoNumber → scanPalletNumber → scanItemCode → inputReceivedNumber → confirmReceived

**收货校验**: 托盘占用 / 温层一致性 / 封存校验

**核心文件**: `InboundReceiveController` → `InboundReceiveServiceImpl`

### 4.3 质检

**状态**: `NO_NEED → PENDING → PARTIALLY → DONE`

**类型**: 来料质检 / 直发质检

**核心文件**: `QualityInspectionController` → `QualityInspectionRecordServiceImpl`

### 4.4 上架

**状态**: `NEW → PUT_SHELVES → PUT_FINISH`

**RF上架流程**: scanPalletNumber → suggestLocation → confirmLocation → confirmPallet

**AGV上架责任链**: AgvGetTargetLocChainService (6个Handler，按order执行)

**核心文件**: `PutawayController` → `PutawayServiceImpl`

### 4.5 预约

**核心文件**: `ParkAppointController` → `ParkAppointServiceImpl`

---

## 5. 库内业务 (inside)

### 5.1 移位

**状态机**: `CREATE → IN_PROGRESS → COMPLETED / CANCEL`

**移位类型**: 常规 / 呆滞 / 同批次 / 高低层 / 新零售

**核心文件**: `MoveMasterController` → `MoveBdServiceImpl` (2095行)

### 5.2 盘点

**状态机**: `TEMP → NEW → COUNTING → COUNT_FINISH / CANCELED`

**类型**: 静盘(盲/明) / 动盘(盲/明) - 静盘加库位锁

**DDD责任链**: 19个Handler (CountLocationLockHandler10加锁 → CountRpcHandler17锁定库存)

**核心文件**: `CountMasterController` → `CountMasterServiceImpl`

### 5.3 补货

**状态机**: `NEW → REPLENISHMENT → REPLENISH_FINISH / REPLENISH_CANCEL`

**类型**: 例常补货 / 紧急补货

**触发条件**: LESS(低于安全库存) / ZERO(拣货位为空) / LESS_EQUAL

**核心文件**: `ReplenishMasterController` → `ReplenishServiceImpl`

### 5.4 冻结/解冻

**冻结标志**: freezeSign + freezeReason 独立概念

**核心文件**: `BlockedItemController` → `BlockedItemServiceImpl`

---

## 6. 库存业务 (storage)

### 6.1 库存管理

**核心操作API**:
| 方法 | 功能 |
|------|------|
| inSaveStoredItem() | 入库保存 |
| outSaveStoredItem() | 出库扣减 |
| doStorageFreeze() | 冻结 |
| dealStorageUnfreeze() | 解冻 |
| changeBatchAttributes() | 批次变更 |

**核心文件**: `StoredItemController` → `StoredItemServiceImpl` → `StoredItem`

### 6.2 批次属性

**效期预警**: 临期 / 过期 / 呆滞(30天无出库) / 滞销 / 残品

**核心文件**: `BatchAttributesController` → `BatchAttributesServiceImpl` → `BatchAttributes`

### 6.3 损耗管理

**状态**: untreated → partiallyTreated → processed

**处理方式**: damage(报损) / sale(售卖) / meal(降级员工餐) / vendor(退供应商)

**核心文件**: `DamageStorageManageController` → `DamageStorageManageServiceImpl`

---

## 7. 基础数据 (basicdata)

### 7.1 商品/库位/仓库

**核心文件**:
- `ItemMasterController` → `ItemMasterServiceImpl` → `ItemMaster`
- `LocationController` → `LocationServiceImpl` → `Location`
- `WarehouseController` → `WarehouseServiceImpl` → `Warehouse`

### 7.2 客户/供应商/编码

**核心文件**:
- `CustomersController` → `CustomersServiceImpl`
- `VendorController` → `VendorServiceImpl`
- `CodeController` → `CodeServiceImpl` (编码生成: Redis锁+BasicDataClient.getCode())

### 7.3 温层/容器

**核心文件**:
- `WarmLayerController` → `WarmLayerServiceImpl`
- `ContainerSpecificationController` → `ContainerSpecificationServiceImpl`

---

## 8. 外部对接 (edi)

### 8.1 GAIA对接

**核心服务**:
| 服务 | 方法 | 用途 |
|------|------|------|
| PushGaiaService | pushBindingBox() | 推送绑箱 |
| PushGaiaService | sendSortingTaskQuantityMsg() | 直发播种推送 |
| GaiaRelatedService | queryInventoryToGaia() | 库存查询 |

**入库回传**: `InboundCallbackBatchInfoServiceImpl`
**出库回传**: `OutboundCallbackBatchInfoServiceImpl`

### 8.2 TMS/溯源

**TMS对接**: `TmsToWmsServiceImpl` - TMS推送调度单 → WMS创建装车单 → 回传TMS

**溯源**: `t_item_traceability_detail` (明细) / `t_item_traceability_sum` (汇总)

---

## 9. 技术架构

### 9.1 Apollo配置

**Namespace**: `application` / `shsc-wms-sharding-jdbc` / `shsc-wms-common`

**注入方式**: `@ApolloConfig` / `@Value` / `ApolloConfigEnum`

### 9.2 ShardingSphere

**分片键**: `tenantCode`

**自动填充**: `MyMetaObjectHandler.insertFill()`

**限制**: 不支持跨分片JOIN / 深度分页性能差

### 9.3 RocketMQ

**核心Topic**: WMS_INOUT_TOPIC(拣货/发运) / WMS_OUTBOUND_GENERAL(均分/越库/差异)

**事务消息**: `AbstractRocketMQLocalTransactionListener` 两阶段提交

### 9.4 Seata分布式事务

**@GlobalTransactional使用**:
| 服务 | 场景 |
|------|------|
| outbound | 越库确认/牛肉拣货/取消分配 |
| inside | 盘点创建/移位确认 |
| inbound | 收货确认/质检确认 |

**超时**: 快速操作60s / 标准业务3-5min / 复杂批处理10-30min

**AT模式限制**: 无主键DELETE不支持 / 跨库JOIN不支持

### 9.5 定时任务

**outbound**: AutoCreateWaveJob(每3min) / SendSortTasksJob / TaskLockUserCleanJob(每5min)

**storage**: DamageStorageStatusRefreshJob(每10min) / GetStoredSnapshotJob

### 9.6 分布式锁

**锁超时**: 900秒 (COUNT_LOCK_TIME)

**死锁预防**: `TaskLockUserCleanJob` 清理25分钟前的任务占用人

---

## 10. RF手持终端

### 10.1 RF业务分布

| 服务 | Controller数 | 主要业务 |
|------|-------------|---------|
| outbound | 22 | 拣货/分拣/越库/复核/打包 |
| inbound | 3 | 收货/上架/卸货费/AGV |
| inside | 2 | 盘点/移位 |

**预估总接口**: 200+

### 10.2 设计模式

**多屏状态机**: 每屏独立接口，Context通过Request Body传递

**分布式锁**: 订单级别锁，超时900s

**占用释放**: `occupy()`/`clearOccupyTask()` 防止并发

---

## 11. 数据导入导出

### 11.1 导入

**流程**: Excel下载 → 上传 → MQ异步 → EasyExcel解析 → 校验 → 批量写入 → 错误文件

**核心**: `Excel.BaseListener<T>` / `EasyExcel` / `ImportFileEventConsumer` (MQ消费者)

**批量处理**: BATCH_COUNT=100

### 11.2 导出

**分页导出**: 4000条/页，单仓最多100万

**多Sheet**: 按仓库分Sheet

---

## 12. 开发规范

| 规范 | 说明 |
|------|------|
| ID生成 | `@TableId(type = IdType.INPUT)` + BasicDataClient.getCode() |
| 软删除 | isDeleted 字段 |
| 多租户 | tenantCode 字段 |
| 错误码 | 基础500/收货1xx/上架2xx/订单3xx/质检4xx |
| 分布式锁 | Redisson RLock，超时900s |
| 编码前缀 | 入库单HL01，收货任务SB，上架单SC，AGV任务BY |
