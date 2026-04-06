---
name: feign-mq-map
description: WMS 跨服务交互图谱 - 76个Feign Client + 83个MQ Consumer的完整调用链映射
version: 1.0.0
author: auto-wms
tags: [wms, feign, mq, cross-service, interaction, architecture]
---

# WMS 跨服务交互图谱

> 本文档映射6个WMS微服务之间的Feign RPC调用链和MQ消息流转路径，是排查跨服务问题的核心参考。

---

## 1. Feign 调用矩阵

### 1.1 服务间调用关系总览

```
                    ┌─────────────────────────────────────────────────────┐
                    │                   外部系统                           │
                    │  GAIA / TMS / MES / SRM / Qaqc / Platform / OA    │
                    └──────────────────────┬──────────────────────────────┘
                                           │ Feign (URL模式)
                                           ▼
┌─────────┐  Feign  ┌──────────┐  Feign  ┌─────────┐
│ inbound │◄───────►│ basicdata│◄───────►│ storage │
└────┬────┘         └────┬─────┘         └────┬────┘
     │                   │                    │
     │ Feign             │ Feign              │ Feign
     ▼                   ▼                    ▼
┌─────────┐  Feign  ┌──────────┐  Feign  ┌─────────┐
│  inside │◄───────►│ outbound │◄───────►│   edi   │
└─────────┘         └──────────┘         └─────────┘
```

### 1.2 调用方向与方法数量

| 调用方 → 被调方 | Feign Client | 方法数 | 主要用途 |
|----------------|-------------|--------|---------|
| **outbound → basicdata** | IBasicFeignService | ~90 | 商品/库位/仓库/编码/单位查询 |
| **outbound → storage** | StorageFeignService | ~80 | 库存查询/扣减/冻结/批次 |
| **outbound → inbound** | InboundFeignService | ~5 | 上架/越库查询 |
| **outbound → edi** | EdiFeignService | ~5 | GAIA回传 |
| **inbound → basicdata** | IBasicFeignService | ~70 | 商品/库位/温层/单位查询 |
| **inbound → storage** | StorageFeignService | ~10 | 库存入库/批次创建 |
| **inbound → outbound** | OutboundFeignService | ~5 | 越库自动分配 |
| **inside → basicdata** | IBasicFeignService | ~95 | **最重依赖** 主数据查询 |
| **inside → storage** | StorageFeignService | ~85 | **第二重依赖** 库存操作 |
| **inside → outbound** | OutboundFeignService | ~15 | 补货触发分配/不合格出库 |
| **inside → inbound** | InboundFeignService | ~3 | 上架建议 |
| **storage → basicdata** | IBasicFeignService | ~65 | 商品/库位/仓库/编码查询 |
| **storage → outbound** | OutboundFeignService | ~4 | 出库单查询(损耗关联) |
| **storage → inbound** | InboundFeignService | ~4 | 上架体积/质检信息 |
| **storage → inside** | InsideFeignService | ~6 | 移位校验/盘点库位/冻结检查 |
| **storage → edi** | EdiFeignService | ~5 | SRM采购/飞书通知 |
| **edi → basicdata** | BasicDataClient | ~100 | **最重依赖** 全量主数据CRUD |
| **edi → outbound** | OutboundClient | ~65 | 出库单创建/修改/发运 |
| **edi → inbound** | InboundClient | ~30 | 入库单创建/收货/关闭 |
| **edi → storage** | StorageClient | ~17 | 库存查询/GAIA库存同步 |
| **edi → inside** | InsideClient | ~16 | 物权转移/盘点/点检 |
| **basicdata → outbound** | OutboundClient | ~13 | 出库单查询(商品变更关联) |
| **basicdata → storage** | StorageClient | ~16 | 库存查询(商品变更校验) |
| **basicdata → inside** | InsideClient | ~17 | 盘点/补货/冻结检查 |
| **basicdata → inbound** | InboundClient | ~8 | 收货任务/质检查询 |

### 1.3 外部系统调用

| 调用方 → 外部系统 | Feign Client | 用途 | Fallback |
|------------------|-------------|------|----------|
| **edi → GAIA** | ShscEdiClient | 出入库回传/绑箱 | 无 |
| **edi → GAIA(平台)** | SaasClient | 报损创建 | 有 |
| **edi → TMS** | TmsServiceClient | 调度单同步 | 有 |
| **edi → SRM(QAQC)** | QualityInspectionClient | 质检标准/证件查询 | 有 |
| **edi → SRM(Price)** | ShscBizcoreSrmPriceClient | 采购组查询 | 有 |
| **edi → 数据中心** | ShscDataCenterClient | 商品分类映射 | 有 |
| **edi → 客户数据中心** | CustomerDatacenterClient | 供应商查询 | 有 |
| **edi → PSS** | GaiaBasicPssClient | 校验接口 | 有 |
| **edi → 平台定制** | PlatformCustmzClient | 库存推送 | 有 |
| **edi → 大数据** | BigdataPandoraClient | 数据推送 | 有 |
| **edi → SOP合并** | ShscBizcoreSopMergeClient | 发货单查询 | 无 |
| **edi → EDI数据** | BasicDataEdiClient | 箱信息查询 | 有 |
| **edi → 调度** | DeliverySchedulingFeign | 越库推送 | 无 |
| **storage → OA** | OAWorkFlowFeign | 审批流(损耗/临期) | 无 |
| **storage → 平台** | PlatformFeign | 库存快照推送 | 无 |
| **inside → 效率** | EfficiencyFeignService | 日均出库/高低层/安全库存 | 无 |
| **inside → 大数据** | BigDataFeign | 均价查询 | 无 |
| **inside → 平台** | PlatFormGaiaFeignService | 库存推送 | 无 |

### 1.4 Feign Hystrix Fallback 现状

| 服务 | 有 Fallback 的 Client | 无 Fallback 的 Client |
|------|---------------------|---------------------|
| **edi** | BasicDataClient, OutboundClient, InboundClient, InsideClient, StorageClient, PlatformCustmzClient, TmsServiceClient, 等(共14个) | ShscBizcoreSopMergeClient, WmsTenantServiceClient, DeliverySchedulingFeign, ShscEdiClient |
| **outbound/inbound/basicdata/inside/storage** | — | **全部无 Fallback** |

> **风险点**: 除edi服务外，其他5个WMS服务的所有Feign Client均无Hystrix Fallback。一旦被调服务不可用，将直接抛出`HystrixRuntimeException`。

---

## 2. MQ 消息流转图谱

### 2.1 Topic → Consumer 映射

#### WMS_INOUT_TOPIC（出入库通用Topic，4个Consumer）

| Consumer | 服务 | Group | Tag | 用途 |
|----------|------|-------|-----|------|
| RocketAllocationConsumer | outbound | WMS_ALLOCATION_GROUP | WMS_ALLOCATION_TAG | 报缺重定位(自动分配) |
| RocketPickConsumer | outbound | WMS_PICK_GROUP | WMS_PICK_TAG | 拣货托盘记录 |
| RocketShipConsumer | outbound | WMS_SHIP_GROUP | WMS_SHIP_TAG | 自动发运 |
| InOutMsgConsume | edi | WMS_EDI_INOUT_GROUP | TAGEdi | 进出库回传GAIA |

#### WMS_COUNT_TOPIC（盘点Topic，5个Consumer）

| Consumer | 服务 | Group | Tag | 用途 |
|----------|------|-------|-----|------|
| CountCreateConsumer | inside | WMS_COUNT_CREATE_GROUP | WMS_COUNT_CREATE_TAG | 盘点创建(责任链) |
| CountActiveConsumer | inside | WMS_COUNT_ACTIVE_GROUP | WMS_COUNT_ACTIVE_TAG | 盘点激活 |
| CountFinishConsumer | inside | WMS_COUNT_FINISH_GROUP | WMS_COUNT_FINISH_TAG | 盘点完成 |
| CountCancelConsumer | inside | WMS_COUNT_CANCEL_GROUP | WMS_COUNT_CANCEL_TAG | 盘点取消 |
| CountSplitActiveConsumer | inside | WMS_COUNT_SPLIT_ACTIVE_GROUP | WMS_COUNT_SPLIT_ACTIVE_TAG | 盘点拆分激活 |

#### WMS_MOVETRANS_TOPIC（移位Topic，2个Consumer）

| Consumer | 服务 | Group | Tag | 用途 |
|----------|------|-------|-----|------|
| MoveTransPcFinishConsumer | inside | WMS_MOVETRANS_FINISH_GROUP | WMS_MOVETRANS_FINISH_TAG | 移位完成 |
| MoveTransPcCancelConsumer | inside | WMS_MOVETRANS_CANCEL_GROUP | WMS_MOVETRANS_CANCEL_TAG | 移位取消 |

#### OUT_BOUND_CALLBACK（出库回调GAIA，3个Consumer）

| Consumer | 服务 | Group | Tag | 用途 | 状态 |
|----------|------|-------|-----|------|------|
| DiffConfirmSyncConsume | edi | WMS_DIFFERENCE_CONFIRM_GAIA_CONSUME_GROUP | DIFF_CONFIRM_SYNC | 差异确认回传 | 活跃 |
| PickUpSyncConsume | edi | WMS_PICK_UP_GAIA_CONSUME_GROUP | PICK_UP_SYNC | 拣货回传 | @Deprecated |
| BackUpSyncConsume | edi | WMS_BACK_UP_GAIA_CONSUME_GROUP | BACK_UP_SYNC | 退拣回传 | @Deprecated |

#### WMS_RECEIPT_TASK_DONE_EVENT（收货完成，2个Consumer）

| Consumer | 服务 | Group | 用途 |
|----------|------|-------|------|
| RcptTaskDoneEventConsumer | inbound | WMS_RECEIPT_TASK_DONE_EVENT_GROUP | 收货完成业务处理 |
| RcptTaskDoneEventTraceabilityConsumer | inbound | WMS_RECEIPT_TASK_DONE_EVENT_TRACEABILITY_GROUP | 收货完成生成溯源 |

#### WMS_STORED_ADVENT_APPROVE（临期审批，2个Consumer）

| Consumer | 服务 | Group | 用途 |
|----------|------|-------|------|
| StoredAdventApproveConsumer | storage | WMS_STORED_ADVENT_APPROVE_FROM_TENANT_GROUP | 租户级临期审批 |
| StoredAdventApproveRelateWarehouseConsumer | storage | WMS_ADVENT_APPROVE_GROUP | 仓库级临期审批(ORDERLY) |

### 2.2 独立Topic消费者

| Consumer | 服务 | Topic | 用途 |
|----------|------|-------|------|
| RocketDeliveryShipConsumer | outbound | GAIA_TO_WMS_ROOT | 快捷发运回传 |
| RocketAvgCrossDiffConsumer | outbound | WMS_OUTBOUND_GENERAL | 均分/越库/差异(钉钉) |
| CreateSortRecordConsumer | outbound | WMS_SORT_RECORD_TOPIC | 分拣记录生成 |
| RfzfCollectionConsumer | outbound | WMS_CUSTOMER_COLLEC_TOPIC | 客户集合刷新 |
| DeliveryShortcutWaveConsumer | outbound | wms_shortcut_wave_delivery_topic | 快捷发运门店波次 |
| SortCustomerNumberCreateConsumer | outbound | WMS_SORT_CUSTOMER_NUMBER_TOPIC | 门店序列号生成 |
| FruitPackConsumer | outbound | WMS_FRUIT_PACK_TOPIC | 摘果装箱 |
| CfWeightBeefConsumer | outbound | WMS_CF_BEEF_WEIGHT_TOPIC | 潮发称重 |
| QualityInspectionIssueEventConsumer | inbound | WMS_QUALITY_INSPECTION_ISSUE_TOPIC | 质检问题提报 |
| ItemSpecsAuditConsumer | inbound | WMS_ITEM_SPECS_AUDIT_TOPIC | 商品属性审核 |
| EfficiencyDataSyncConsume | inbound | WMS_INBOUND_GENERAL_TOPIC | 效率数据同步 |
| CallBackConsume | inbound | WMS_IDENT_BACK_TOPIC | 鉴定回传 |
| AddHdlPicEventConsumer | inbound | WMS_ADD_HDL_PIC_EVENT | 商品库图片 |
| CanalConsumer | basicdata | shsc_wms_binlog | Canal Binlog→ES索引 |
| ChangeWarmInfoToGaiaConsumer | basicdata | WMS_CHANGE_TEMPERATURE_GAIA_TOPIC | 温层变更下推GAIA |
| ImportFileEventConsumer | basicdata | WMS_IMPORT_FILE_RECORDS_TOPIC | Excel文件导入 |
| PcItemGradeChandeConsumer | storage | WMS_STORAGE_MAANGE_TOPIC | 批量等级变更 |
| StoredSnapshotConsumer | storage | WMS_STORAGE_SNAP_TOPIC | 库存快照 |
| LocationTouchConsumer | storage | WMS_LOCATION_TOUCH | 动碰次数(ORDERLY事务) |
| InventoryLogConsumer | storage | WMS_INVENTORY_LOG | 库存日志推送 |
| RefreshItemVolumeStorageJobConsumer | storage | WMS_JOB_REFRESHITEMVOLUME_TOPIC | 刷新商品体积 |
| InboundPrintedConsumer | edi | WMS_INBOUND_PRINTED_TOPIC | 入库单打印事件 |
| InboundBatchInfoSyncConsume | edi | WMS_INBOUND_BATCH_INFO_TOPIC | 入库批次同步 |
| TransInOutMsgConsume | edi | WMS_TRANS_INFO_TOPIC | QM中间表传输 |
| SortAbnormalConsume | edi | WMS_SORT_ABNORMAL_TOPIC | 分拣异常钉钉 |
| BasicDataItemTransConsumer | edi | basic_data_product_spu_trans | 商品名称翻译 |
| BasicDataUnitTransConsumer | edi | basic_data_measurement_trans | 单位名称翻译 |
| SendSortingTaskOrderConsumer | edi | send_sorting_task_order | GAIA直发订单创建 |
| SendSortingTaskQuantityConsumer | edi | notify_wms_sorting_quantity | GAIA直发数量 |

### 2.3 导出消费者（每服务2个，共10个）

所有WMS服务都有两套导出消费者：

| 模式 | Topic常量 | 用途 |
|------|----------|------|
| 仓库维度导出 | `ExportMessageConst.WMS_EXPORT_{SERVICE}` | 单仓库数据异步导出 |
| 租户维度导出 | `ExportMessageCommonConst.WMS_EXPORT_COMMON_{SERVICE}` | 跨仓库租户级导出 |

涉及服务：outbound / inbound / basicdata / inside / storage

### 2.4 消费模式统计

| 消费模式 | Consumer | 说明 |
|---------|----------|------|
| **ORDERLY(有序)** | CanalConsumer, LocationTouchConsumer, StoredAdventApproveRelateWarehouseConsumer | 保证同一key顺序消费 |
| **事务消息** | LocationTouchConsumer | 两阶段提交 |
| **已禁用(注释)** | PickPushResultStatusConsumer, CreatePalletSortTaskConsumer, SentDirectlyOrderCreatedEventConsumer, ShscSentDirectlyOrderCreatedConsumer | 功能未上线或已替代 |
| **@Deprecated** | PickUpSyncConsume, BackUpSyncConsume | 已由中间表替代 |
| **Kafka(非RocketMQ)** | BackupDataKafkaConsumer | 数据备份，已注释 |

---

## 3. 跨服务调用链（关键业务场景）

### 3.1 出库全流程

```
GAIA/EDI推送订单
  → edi(InboundClient/OutboundClient) → outbound(创建出库单)
  → outbound(AutoCreateWaveJob每3min) → outbound(创建波次)
  → outbound(IBasicFeignService) → basicdata(商品/库位查询)
  → outbound(StorageFeignService) → storage(库存查询/分配)
  → outbound(RocketPickConsumer@MQ) → outbound(拣货)
  → outbound(RocketShipConsumer@MQ) → outbound(发运)
  → edi(InOutMsgConsume@MQ) → GAIA(回传)
```

### 3.2 入库全流程

```
GAIA推送入库单
  → edi(InboundClient) → inbound(创建入库单)
  → inbound(RF收货)
  → inbound(IBasicFeignService) → basicdata(商品/温层校验)
  → inbound(StorageFeignService) → storage(入库保存/批次创建)
  → inbound(RcptTaskDoneEventConsumer@MQ) → inbound(收货完成)
  → inbound(RcptTaskDoneEventTraceabilityConsumer@MQ) → 溯源
  → edi(InboundBatchInfoSyncConsume@MQ) → GAIA(回传)
```

### 3.3 补货触发分配

```
inside(补货完成)
  → inside(OutboundFeignService.afterReplenishmentAutoAllocation)
  → outbound(自动分配)
  → outbound(StorageFeignService) → storage(库存操作)
```

### 3.4 盘点（MQ责任链）

```
PC/RF创建盘点
  → inside(CountCreateConsumer@MQ: WMS_COUNT_CREATE_TAG)
  → 19个Handler责任链执行:
     CountAddRedisLockHandler1(加锁) → CountLocationLockHandler10(库位锁) → CountRpcHandler17(RPC锁定库存)
  → inside(CountFinishConsumer@MQ: WMS_COUNT_FINISH_TAG)
  → inside(StorageFeignService) → storage(库存调整)
```

### 3.5 移位确认

```
RF/PC移位确认
  → inside(MoveTransPcFinishConsumer@MQ: WMS_MOVETRANS_FINISH_TAG)
  → inside(IBasicFeignService) → basicdata(库位/商品信息)
  → inside(StorageFeignService.inSaveStoredItemByLock) → storage(目标库位入库)
  → inside(StorageFeignService.outSaveStoredItemByLock) → storage(源库位出库)
  → inside(OutboundFeignService.afterReplenishmentAutoAllocation) → outbound(补货后分配)
```

---

## 4. 依赖密度分析

### 4.1 服务被依赖排行（被调用方法数）

| 被调服务 | 总被调方法数 | 主要调用方 |
|---------|------------|-----------|
| **basicdata** | ~400+ | 所有5个WMS服务 |
| **storage** | ~200+ | outbound/inside/edi/basicdata |
| **outbound** | ~100+ | edi/inside/basicdata |
| **inbound** | ~50+ | edi/basicdata/inside |
| **inside** | ~25+ | basicdata/storage/edi |

### 4.2 循环依赖

| 循环 | 说明 |
|------|------|
| **inside ↔ basicdata** | inside→basicdata(95方法), basicdata→inside(17方法) |
| **storage ↔ edi** | storage→edi(5方法), edi→storage(17方法) |
| **inside ↔ storage** | inside→storage(85方法), storage→inside(6方法) |

### 4.3 单点风险

| 风险点 | 说明 |
|--------|------|
| **basicdata 不可用** | 所有服务的商品/库位/编码查询全部失败，系统瘫痪 |
| **storage 不可用** | 所有库存操作(出入库/移位/盘点/冻结)全部失败 |
| **edi BasicDataClient(~100方法)** | 单个Client方法数过多，任一方法异常影响整个Client |
| **inside IBasicFeignService(~95方法)** | 同上，方法数过多的巨型Client |
