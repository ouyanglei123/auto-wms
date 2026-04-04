---
name: wms-domain
description: WMS 仓储管理系统领域知识 - 6 大微服务的精确代码定位索引、业务流程、状态机和开发规范
version: 2.0.0
author: auto-wms
tags: [wms, warehouse, logistics, edi, outbound, inbound, basicdata, inside, storage, microservice]
---

# WMS 仓储管理系统领域知识

> 本文档是 `/wms:auto` 超级命令的核心定位引擎。通过关键词 → 服务 → 包路径 → 类名的映射链，实现秒级代码定位。

---

## 1. 微服务拓扑与代码定位

| 服务 | 项目路径 | 基础包 |
|------|---------|--------|
| **outbound** | `D:\ruanjian\shuhai\shsc-wms-outbound-service` | `com.shsc.wms.outbound` |
| **inbound** | `D:\ruanjian\shuhai\shsc-wms-inbound-service` | `com.shsc.wms.inbound` |
| **basicdata** | `D:\ruanjian\shuhai\shsc-wms-basicdata-service` | `com.shsc.wms.basicdata` |
| **inside** | `D:\ruanjian\shuhai\shsc-wms-inside-service` | `com.shsc.wms.inside` |
| **storage** | `D:\ruanjian\shuhai\shsc-wms-storage-service` | `com.shsc.wms.storage` |
| **edi** | `D:\ruanjian\shuhai\shsc-wms-edi-service` | `com.shsc.wms.edi` |

**统一代码结构**：`{项目路径}\src\main\java\com\shsc\wms\{service}\biz\{层级}\`

| 层级 | 路径 |
|------|------|
| Controller(PC) | `biz/controller/` |
| Controller(API/Feign) | `biz/controller/api/` |
| Controller(RF/手持) | `biz/controller/` (Rf前缀) |
| Service | `biz/service/impl/` |
| Entity | `biz/entity/` |
| Feign Client | `biz/feign/` |
| MQ Consumer | `biz/mq/consumer/` 或 `biz/message/consumer/` 或 `{service}/mq/consumer/` |
| Job | `{service}/job/` |
| Enum | `{service}/enums/` |
| Constant | `{service}/constant/` |

---

## 2. 关键词 → 服务 → 代码 快速定位表

### 2.1 outbound（出库）

**触发关键词**: 出库/波次/分配/拣货/分拣/装箱/集货/复核/发运/越库/提总/摘果/牛肉拣货/CPFR/霸王/直发/装车

| 业务域 | Controller | ServiceImpl | Entity |
|--------|-----------|-------------|--------|
| **订单管理** | OutboundMasterController, OutboundDetailController, OutboundDetailExpandController | OutboundMasterServiceImpl, OutboundDetailServiceImpl, OutboundDetailExpandServiceImpl | OutboundMaster, OutboundDetail, OutboundDetailExpand |
| **波次管理** | WaveController, WaveMasterController, WaveDetailController, WaveAbnormalPositionController, ShortcutWaveCreateController | WaveServiceImpl, WaveMasterServiceImpl, WaveDetailServiceImpl, CreateWaveServiceImpl, WaveAbnormalPositionServiceImpl | WaveMaster, WaveDetail |
| **库位分配** | WaveAutoAllocationController | WaveAllocationServiceImpl, WaveAutoAllocationServiceImpl, WaveAutoAllocationAsyncServiceImpl, WaveDesignationBatchPositionServiceImpl, WaveProduceDatePositionServiceImpl | AllocationLoading, AllocationLoadingDetail |
| **提总拣货** | PickTaskGeneralController, PickTaskDetailGeneralController, PcPickController, RfPickController | PickTaskGeneralServiceImpl, PickTaskDetailGeneralServiceImpl, PcPickServiceImpl, RfPickServiceImpl, RfPickCommitServiceImpl | PickTaskGeneral, PickTaskDetailGeneral, PickRecord |
| **摘果拣货** | PickTaskFruitController, PickTaskDetailFruitController | PickTaskFruitServiceImpl, PickTaskDetailFruitServiceImpl, ValidateFruitPickServiceImpl | PickTaskFruit, PickTaskDetailFruit |
| **牛肉拣货** | PickTaskBeefGeneralController, PickTaskBeefSoringController, PickLockBeefController, PickBatchLockBeefController | PickTaskBeefGeneralServiceImpl, PickTaskBeefSoringServiceImpl, PickLockBeefServiceImpl | BeefPickWeighData, BeefPickSortingLock, PickLockBeef |
| **分拣** | SortTaskController, SortTaskDetailController, SortTaskViewController, RfPdaSortingController, RfZfSortingController | SortTaskServiceImpl, SortTaskDetailServiceImpl, SortRecordServiceImpl, RfPdaSortingServiceImpl, ZfSortServiceImpl | SortTask, SortTaskDetail, SortRecord |
| **装箱** | PackBoxRecordController, PackBoxItemBatchController, RfPackBoxMasterController, RfPackBoxItemController | PackBoxMasterServiceImpl, PackBoxItemServiceImpl, PackBoxItemBatchServiceImpl, RfPackBoxBizServiceImpl | PackBoxMaster, PackBoxItem, PackBoxItemBatch |
| **集货** | PcConsolidationController, PcConsolidationDetailController, RFConsolidationController, RfFruitConsolidationController | ConsolidationMasterServiceImpl, ConsolidationDetailServiceImpl, RfFruitConsolidationServiceImpl | ConsolidationMaster, ConsolidationDetail |
| **复核** | ReviewRecordController, RfOutboundReviewController, RfReviewRecordController | ReviewRecordServiceImpl, RfOutboundReviewServiceImpl, ValidateReviewServiceImpl | ReviewRecord |
| **发运/装车** | DeliveryController, LoadingMasterController, AllocationLoadingController, AllocationLoadingTmsController | DeliveryServiceImpl, DeliveryCommitServiceImpl, LoadingMasterServiceImpl | AllocationLoading, LoadingMaster |
| **越库** | CrossDetailController, CrossDetailRecordController, RfCrossController | CrossDetailServiceImpl, CrossDetailRecordServiceImpl, RfCrossServiceImpl | CrossDetail, CrossDetailRecord |
| **异常位** | AbnormalPositionMasterController, AbnormalPositionDetailController | AbnormalPositionMasterServiceImpl, AbnormalPositionDetailServiceImpl, AbnormalAverageServiceImpl | AbnormalPositionMaster, AbnormalPositionDetail |
| **供应商直发** | SupplierSaleController, SupplierSaleItemController, SupplierSaleDeductionRecordController, SupplierSortCustomerController | SupplierSaleServiceImpl, SupplierSaleItemServiceImpl, SupplierSaleDeductionRecordServiceImpl | SupplierSale, SupplierSaleItem |
| **差异确认** | DifferenceConfirmLogController | DifferenceConfirmLogServiceImpl | DifferenceConfirmLog |
| **快速出库** | FastOutboundController | FastOutboundServiceImpl | — |

**Feign(10)**: BasicDataService, BizCoreSortingPlatformService, BizCoreStandardService, ContainerService, CustomerDatacenterService, EdiService, InboundService, InsideFeignService, StorageService, UpmsService

**MQ(17)**: EdiOutboundConsumer, RocketAllocationConsumer, RocketPickConsumer, RocketShipConsumer, RocketDeliveryShipConsumer, RocketAvgCrossDiffConsumer, CreateSortRecordConsumer, CreatePalletSortTaskConsumer, DeliveryShortcutWaveConsumer, FruitPackConsumer, CfWeightBeefConsumer, PickPushResultStatusConsumer, RfzfCollectionConsumer, SortCustomerNumberCreateConsumer, WtInterfaceLogConsumer, OutboundExportEventConsumer, OutboundExportCommonEventConsumer

**Job(14)**: AutoCreateWaveJob(每3min), SendSortTasksJob, TaskDepartureWaveJob, AsyncTaskExecuteJob, AsyncTaskDeleteJob, CrossDetailReturnJob, PushStatisticsJob, CountPickRecordInfoJob, ZfOrderPackShipJob, TaskLockUserCleanJob, CleanCallGaiaDataTableJob, OutNumTmsExeNumRelationDeleteJob

**Enum(1)+Constant(7)**: BeefPickWeighProcessStatusEnum | BillNoPrefixConstant, OutboundConstant, RedisConstant, RLockPrefixConstant, RocketMqConstant, SqlConstant, SwitchConst

---

### 2.2 inbound（入库）

**触发关键词**: 入库/收货/上架/质检/盲收/退货收货/一车多单/预约/磅差/AGV上架/提总收货

| 业务域 | Controller | ServiceImpl | Entity |
|--------|-----------|-------------|--------|
| **入库订单** | InboundMasterController, InboundDetailController, InboundCreateController | InboundMasterServiceImpl, InboundDetailServiceImpl, InboundCreateServiceImpl | InboundMasterEntity, InboundDetailEntity |
| **收货(RF)** | InboundReceiveController, InboundReceivedForPcController, RcptTaskController, RcptTaskDetailController | InboundReceiveServiceImpl, InboundReceiveForPcServiceImpl, RcptTaskServiceImpl, RcptTaskDetailServiceImpl | RcptTaskEntity, RcptTaskDetailEntity, ReceivedRecordEntity |
| **盲收** | BlindReceiveController | BlindReceiveServiceImpl | — |
| **退货收货** | InboundReturnReceiveController | — | — |
| **一车多单** | OneCarManyOrderController | InboundOneCarManyOrderServiceImpl | InboundOneCarManyOrderEntity |
| **预约** | ParkAppointController | ParkAppointServiceImpl | ParkAppointEntity |
| **上架** | PutawayController, PutawayMasterController, PutawayDetailController, PutawayItemRecordController | PutawayServiceImpl, PutawayMasterServiceImpl, PutawayDetailServiceImpl, PutawayItemRecordServiceImpl | PutawayMasterEntity, PutawayDetailEntity, PutawayItemRecordEntity |
| **AGV上架** | AgvApiController, RfInboundAgvController | AgvApiServiceImpl, AgvMoveTaskServiceImpl, RfInboundAgvServiceImpl, AgvGetTargetLocChainService(责任链) | AgvMoveTask |
| **质检** | QualityInspectionController, QualityInspectionPageController, QualityInspectionIssueController, QualityInspectionReceiptTaskController | QualityInspectionRecordServiceImpl, QualityInspectionTaskServiceImpl, QualityInspectionIssueServiceImpl, RcptQualityInspectionServiceImpl | QualityInspectionRecord, QualityInspectionTaskEntity, QualityInspectionIssueEntity |
| **磅差/让步** | InboundConcRejPostController | InboundConcRejPostServiceImpl | InboundConcRejPost |
| **装卸费** | HandlingChargeBillController, UnloadChargesBillDetailController, RfUnloadChargesController | HandlingChargeBillServiceImpl, UnloadChargesBillDetailServiceImpl, RfUnloadChargesServiceImpl | HandlingChargeBill, UnloadChargesBillDetail |
| **EDI入库** | EdiInboundHandleController | EdiInboundHandleServiceImpl | — |
| **直发质检** | SentDirectlyItemQualityInspectionController, SentDirectlyQiOrderController | SentDirectlyQiOrderServiceImpl, SentDirectlyItemQualityInspectionService | SentDirectlyOrderEntity |

**Feign(13)**: BasicDataClient, BusinessPlatformGaiaClient, EdiClient, EmployeeClient, InsideClient, MasterDataClient, OutBoundClient, ParkClient, ProductTestingClient, ShscBusinessComplaintClient, SrmClient, StoreItemClient, WesBizcoreClient

**MQ(9+Listener10)**: RcptTaskDoneEventConsumer, QualityInspectionIssueEventConsumer, ItemSpecsAuditConsumer, SentDirectlyOrderCreatedEventConsumer, ShscSentDirectlyOrderCreatedConsumer, AddHdlPicEventConsumer, InboundExportEventConsumer, InboundExportCommonEventConsumer + CallBackConsume, EfficiencyDataSyncConsume

**Job(5)**: TaskLockUserCleanJob, ZfInspectionTaskJob

**Enum(89)+Constant(3)**: InboundStatusEnum, PutawayStatusEnum, QualityInspectionEnum, AgvMoveTaskStatusEnum, RocketTopicEnum, RocketMqTagEnum... | CommonConstant, InboundOrderLabelConstant, MqConstant

**Processor(17)**: 责任链模式 — AbstractEnhancedChainHandler, EnhancedChainExecutor, PlacementAdviceProcessor, ReceiptAdviceProcessor, PutawayAdviceProcessor, AgvGetTargetLocChainService...

---

### 2.3 basicdata（基础数据）

**触发关键词**: 库位/库区/商品/客户/供应商/仓库/批次规则/字典/库位载入/温层/容器/编码规则/AGV/月台/工作区

| 业务域 | Controller | ServiceImpl | Entity |
|--------|-----------|-------------|--------|
| **仓库** | WarehouseController, WarehouseConfigController, WarehouseInfoExtendController, WarehouseRestTimeController | WarehouseServiceImpl, WarehouseConfigServiceImpl, WarehouseInfoExtendServiceImpl | Warehouse, WarehouseConfig, WarehouseInfoExtend |
| **库位** | LocationController, LocationClassifyController, LocationLoadController | LocationServiceImpl, LocationClassifyServiceImpl, LocationLoadServiceImpl | Location, LocationClassify, LocationLoad |
| **库区** | ZoneController, ZoneTempConfigController | ZoneServiceImpl, ZoneTempConfigServiceImpl | Zone, ZoneTempConfig |
| **商品** | ItemController, ItemMasterController, ItemUnitController, ItemClassifyController, ItemFilterController | ItemMasterServiceImpl, ItemUnitServiceImpl, ItemClassifyServiceImpl | ItemMaster, ItemUnit, ItemClassify |
| **客户** | CustomersController, CustomerCollectionController, CustomerCollectionRelationController, CustomerPickMethodConfigController, CustomerSortMethodConfigController | CustomersServiceImpl, CustomerCollectionServiceImpl | Customers, CustomerCollection |
| **供应商** | VendorController | VendorServiceImpl | Vendor |
| **公司** | CompanyController, CompanyCloseSettingController | CompanyServiceImpl, CompanyCloseSettingServiceImpl | Company, CompanyCloseSetting |
| **批次规则** | BatchRuleController, BatchNodeConfigController, CollectionBatchRuleConfigController | BatchRuleServiceImpl, BatchNodeConfigServiceImpl | BatchRule, BatchNodeConfig |
| **编码** | CodeController, BarcodeRuleConfigController | CodeServiceImpl, BarcodeRuleConfigServiceImpl | — |
| **AGV** | AgvPointController, AgvCarryAreaController, AgvPutawayAreaMasterController, AgvProductCategoryController | AgvPointServiceImpl, AgvCarryAreaServiceImpl | AgvPoint, AgvCarryArea |
| **容器** | ContainerCodeController, ContainerSpecificationController, ContainerRulesController, ContainerSendConfigController | ContainerSpecificationServiceImpl, ContainerRulesServiceImpl | ContainerCodeEntity, ContainerSpecification |
| **温层** | WarmLayerController, ProductionLineWarmLayerController, DeliveryZoneTempConfigController | WarmLayerServiceImpl, ProductionLineWarmLayerServiceImpl | WarmLayer |
| **月台/通道** | DockController, TunnelController, RoadwayController | DockServiceImpl, TunnelServiceImpl, RoadwayServiceImpl | Dock, Tunnel |
| **工作台** | WorkBenchGroupController, WorkBenchGroupWorkerController, WorkBenchPushConfigController | WorkBenchGroupServiceImpl, WorkBenchPushConfigServiceImpl | WorkBenchGroup, WorkBenchPushConfig |
| **字典** | DictController, DictItemController | DictServiceImpl, DictItemServiceImpl | Dict, DictItem |
| **波次配置** | AutoWaveTaskController(controller/wave/) | AutoWaveTaskServiceImpl | AutoWaveTask |
| **Excel导入导出** | ExcelController, ImportFileRecordsController, ExportFileRecordController | ImportFileRecordsServiceImpl, ExportFileRecordServiceImpl | — |

**Feign(13)**: BasicAttachmentClient, BasicdataLogServiceFeignClient, BizcoreProductDatacenterFeign, BizcoreStandardFeign, DataControlClient, EdiClient, IamClient, InboundClient, InsideClient, OutboundClient, StorageClient, WesBizcoreClient, WmsTenantServiceClient

**MQ(7)**: CanalConsumer, ChangeWarmInfoToGaiaConsumer, ImportFileEventConsumer, BasicdataExportEventConsumer, BasicdataExportCommonEventConsumer

**Job(5)**: ItemBoxUnitWarningJob, ItemUnitConvertNetWeightJob, MultiShelfLifeProductDeleterJob, NotBoundCustomerCollectionJob, WmsItemEtlJob

**Enum(92)+Constant(12)**: LocationTypeEnum, ItemBatchRuleEnum, WarehouseLevelEnum, SortModeEnum, AutoWaveStatusEnum... | CommonConstant, Constant, LockKeyConstant, MqMessageConstant, RedisPrefixConstant, SqlConstant...

---

### 2.4 inside（库内作业）

**触发关键词**: 移位/盘点/补货/冻结/解冻/点检/物权转移/呆滞移位/高低层/同批次/拣货位整理/过期移位/月度计划/低频抽检

| 业务域 | Controller | ServiceImpl | Entity |
|--------|-----------|-------------|--------|
| **移位(主)** | MoveMasterController, MoveDetailController, InsideMoveController | MoveMasterServiceImpl, MoveDetailServiceImpl, InsideMoveServiceImpl, MoveAsyncServiceImpl | MoveMaster, MoveDetail |
| **呆滞移位** | SluggishMoveController, RfSluggishPlanMoveController | SluggishMoveServiceImpl, RfSluggishPlanMoveServiceImpl | — |
| **同批次移位** | MoveBySameBatchController | MoveSameBatchServiceImpl | — |
| **高低层移位** | UnplannedMoveByHighLowLayersController | UnplannedMoveByHighLowLayersServiceImpl, HighLowLayersMoveTaskCreateServiceImpl | — |
| **拣货位整理** | MovePickLocBatchController | MovePickLocBatchServiceImpl | — |
| **过期移位** | MoveExpiredStorageController | MoveExpiredStorageServiceImpl | — |
| **新零售移位** | NewSaleMoveController | NewSaleMoveServiceImpl | — |
| **物权转移** | ItemTransferController, ItemTransferMasterController, ItemTransferDetailController | ItemTransferServiceImpl, ItemTransferMasterServiceImpl, ItemTransferDetailServiceImpl | ItemTransferMaster, ItemTransferDetail |
| **盘点(主)** | CountMasterController, CountDetailController, CountLocationController, RfCountController | CountMasterServiceImpl, CountDetailServiceImpl, CountLocationServiceImpl, CountExecutorServiceImpl | CountMaster, CountDetail, CountLocation |
| **盘点盈亏** | CountProfitLossController | CountProfitLossServiceImpl, CountProfitLossCommitServiceImpl, ProfitLossServiceImpl | CountProfitLoss |
| **盘点配置** | CountSplitConfigController | CountSplitConfigServiceImpl, CountSplitConfigMasterServiceImpl, CountSplitConfigDetailServiceImpl | CountSplitConfigMaster, CountSplitConfigDetail |
| **补货(主)** | ReplenishMasterController, ReplenishDetailController | ReplenishMasterServiceImpl, ReplenishDetailServiceImpl, ReplenishServiceImpl | ReplenishMaster, ReplenishDetail |
| **建议补货** | SuggestReplenishmentController | SuggestReplenishmentServiceImpl | — |
| **补货优先级** | ReplenishPrioritySortController | ReplenishPrioritySortServiceImpl | ReplenishPrioritySort |
| **冻结** | BlockedItemController, BlockedItemInfoController | BlockedItemServiceImpl, BlockedItemInfoServiceImpl | BlockedItem, BlockedItemInfo |
| **解冻** | UnBlockedItemController | UnBlockedItemServiceImpl | UnBlockedItem |
| **点检** | IdentifiedTaskController, TouchInspectionTaskDetailsController | IdentifiedTaskServiceImpl, TouchInspectionTaskDetailsServiceImpl | IdentifiedTask, TouchInspectionTaskDetails |
| **抽检** | PickSpotCheckReportMasterController, PickSpotCheckReportDetailController, PickSpotCheckRecordController, LowFrequencySpotCheckController | PickSpotCheckReportMasterServiceImpl, PickSpotCheckReportDetailServiceImpl | PickSpotCheckReportMaster, PickSpotCheckReportDetail |
| **月度计划** | WMonthlyPlanController, WMonthlyPlanDetailController | WMonthlyPlanServiceImpl, WMonthlyPlanDetailServiceImpl | WMonthlyPlanEntity, WMonthlyPlanDetailEntity |
| **GAIA盘点** | GaiaCheckInvController | GaiaCheckInvServiceImpl | GaiaCheckInv |

**Feign(10)**: IBasicFeignService, StorageFeignService, OutboundFeignService, InboundFeignService, EdiFeignService, EfficiencyFeignService, PlatFormGaiaFeignService, WpcFeignService, BigDataFeign, WesBizcoreClient

**MQ(9)+Listener(5)**: CountCreateConsumer, CountActiveConsumer, CountFinishConsumer, CountCancelConsumer, CountSplitActiveConsumer, MoveTransPcFinishConsumer, MoveTransPcCancelConsumer, InsideExportEventConsumer, InsideExportCommonEventConsumer + ExportEventProducerListener, IdentBackListener, MoveDetailInOutListener, InOutListener, ItemTraceabilityGroupListener

**Job(14)**: WmsInsideTaskCreateJob, ReplenishPrioritySortJob, MonthlyPlanJob, AutoCreateGaiaCountJob, AutoCancelTouchInspectionJob, AutoCreateProfitLossApprovalTaskJob, LowSpotCheckTaskCreateJob, PickSpotCheckSumReportJob, InventoryProfitLossAdjustmentJob, TaskLockUserCleanJob, CreateWpcDullDataJOb, LockUserDelayedData

**Enum(98)+Constant(8)**: MoveTypeEnum, MoveMasterStatusEnum, CountStatusEnum, CountTypeEnum, ReplenishStatusEnum, ReplenishTypeEnum, BlockedStatusEnum, HighLowTypeEnum... | InsideConstant, MqConstant, SqlConstant, CommonConstant, CheckConstant, InsideBusinessConstant, ErrorCodeConstant, InsideErrorCodeConstant

---

### 2.5 storage（库存）

**触发关键词**: 库存/批次属性/库存快照/库存冻结/效期预警/库存日志/库存盘点/库位触碰/临期审批/损耗/品级变更

| 业务域 | Controller | ServiceImpl | Entity |
|--------|-----------|-------------|--------|
| **库存管理** | StoredItemController, StoredItemNewController, FeignStorageController | StoredItemServiceImpl, StoredItemNewServiceImpl, StoredItemManageServiceImpl, StoredItemApiServiceImpl, StoredItemAsyncServiceImpl, StoredItemMqServiceImpl | StoredItem |
| **批次属性** | BatchAttributesController, AddBatchInfoController | BatchAttributesServiceImpl, AddBatchInfoServiceImpl, AddBatchInfoLockServiceImpl | BatchAttributes, AddBatchInfoEntity, AddBatchInfoDetailEntity |
| **批次审批** | ApprovalBatchTaskController | ApprovalBatchTaskServiceImpl, ApprovalBatchTaskDetailServiceImpl, ApprovalTaskServiceImpl | ApprovalBatchTask, ApprovalBatchTaskDetail |
| **库存冻结** | StoredFreezeLogController | StoredFreezeLogServiceImpl | StoredFreezeLog |
| **效期预警** | ItemOutboundWarningController, StoredAdventApproveTaskController, StoredAdventApproveDetailController | ItemOutboundWarningServiceImpl, StoredAdventApproveTaskServiceImpl, StoredAdventApproveDetailServiceImpl, StoredItemPrewarningServiceImpl | ItemOutboundWarning, StoredAdventApproveTask, StoredAdventApproveDetail |
| **库存快照** | — | MonthSnapshotServiceImpl, PutawaySnapshotServiceImpl, StoredItemServiceImpl | MonthSnapshot, PutawaySnapshot, StoredSnapshotEntity |
| **库位触碰** | LocationTouchController, PickLocationReportController, PickLocationUnbindController | LocationTouchServiceImpl, PickLocationReportServiceImpl, PickLocationUnbindServiceImpl | LocationTouch, PickLocationUnbind |
| **损耗管理** | DamageStorageManageController, DamageStorageRecordController, DamageStorageLogController | DamageStorageManageServiceImpl, DamageStorageManageDetailServiceImpl, DamageStorageRecordServiceImpl, DamageStorageLogServiceImpl, DamageStorageJobServiceImpl | DamageStorageManage, DamageStorageManageDetail, DamageStorageRecord, DamageStorageLog |
| **品级变更** | — | — | — |
| **库存日志** | InterfaceLogController, InterfaceLogBigDataController | QueryInterfaceLogServiceImpl | WmsAllInterfaceLogEntity, WmsInventoryLogEntity |
| **外部对接** | StorageToGaiaController, StorageToMesController, StorageToOpenPlatformController, SrmPurchaseController | StorageToGaiaServiceImpl, StoredCallbackOpenPlatformServiceImpl, SrmPurchaseServiceImpl | — |
| **导入** | ImportStoredItemController | NoStoreItemServiceImpl | — |

**Feign(10)**: IBasicFeignService, OutboundFeignService, InboundFeignService, InsideFeignService, EdiFeignService, EfficiencyFeignService, DataControlClient, OAWorkFlowFeign, PlatformFeign, WesBizcoreClient

**MQ(12)**: InventoryLogConsumer, InventoryLogCommonConsumer, InventoryNoTransLogConsumer, LocationTouchConsumer, LocationTouchCommonConsumer, PcItemGradeChandeConsumer, StoredSnapshotConsumer, StoredAdventApproveConsumer, StoredAdventApproveRelateWarehouseConsumer, StorageExportEventConsumer, StorageExportCommonEventConsumer, RefreshItemVolumeStorageJobConsumer

**Job(13)**: GetStoredSnapshotJob, GetNowStoredSnapshotJob, StoredSnapshotRepeatCleanJob, InventoryCollectJob, InventoryCollectToTraceabilityJob, AsyncRefreshStoredItemPreWarningJob, OutboundWarningSyncJob, DamageStorageStatusRefreshJob, RefreshItemVolumeStorageJob, RefreshProduceDateJob, StoredCallbackOpenPlatformJob, CountTouchDataCleanJob, GetPutawayRecordJob

**Enum(58)+Constant(6)**: StoredItemStatusEnum, StoredItemFreezeEnum, BatchModificationPhaseEnum, ModifyBatchTypeEnum, DamageStorageOperatEnum, FreezeSignEnum... | BillNoPrefixConstant, CommonConstant, MqConstant, SqlConstant, StorageConstant, AccessConstant

---

### 2.6 edi（电子数据交换）

**触发关键词**: SAP/GAIA/MES/TMS/SRM/EDI/回传/推送/对接/千蜜/奈雪/潮发/数据同步/差异确认/轨迹溯源

| 业务域 | Controller | ServiceImpl | 关键说明 |
|--------|-----------|-------------|---------|
| **GAIA对接** | GaiaRelatedController, SendGaiaController, PushGaiaController, NxWmsGaiaGaiaController, ZfGaiaToWmsController | GaiaRelatedServiceImpl, PushGaiaServiceImpl, SendInventoryToGaiaServiceImpl, NxWmsSendGaiaServiceImpl, ZfGaiaToWmsServiceImpl | 双向：推WMS→GAIA + GAIA→WMS |
| **出库回传** | — | OutboundCallbackBatchInfoServiceImpl, OutboundBatchPostRecordServiceImpl, OutboundDataVerifyServiceImpl, PickUpBackUpToGaiaServiceImpl | SO发运→SAP/GAIA |
| **入库回传** | — | InboundCallbackBatchInfoServiceImpl, InboundConcRejCallbackServiceImpl | PO收货→SAP |
| **TMS对接** | CdcTmsToWmsController, TmsItemController | TmsToWmsServiceImpl, TmsItemSeviceImpl | 运输调度双向 |
| **SRM对接** | SrmOutBoundUpdateController | SrmOutBoundUpdateServiceImpl | 供应商管理 |
| **MES对接** | — | IMesServiceImpl | 生产执行 |
| **千蜜/潮发** | QianmiDataController, PlatformChaoFaClient(Feign), PlatformCustmzClient(Feign) | — | 第三方平台 |
| **差异确认** | — | CheckOrderToGaiaServiceImpl | GAIA库存差异 |
| **数据备份** | BackupDataKafkaController, ExecBackupDataPlanController | DataBackupRecordServiceImpl, ExecBackupDataPlanServiceImpl, DataDeleteServiceImpl | Kafka备份+定时清理 |
| **分拣推送** | SendSortingTaskOrderController | — | 分拣任务推送外部 |
| **轨迹溯源** | TraceSourceController | TraceSourceServiceImpl | 商品溯源 |
| **质检对接** | QualityInspectionController | QualityInspectionServiceImpl | 外部质检系统 |
| **工作台推送** | WorkBenchPushConfigController | WorkBenchPushConfigServiceImpl, WorkbenchVancyServiceImpl | 消息推送配置 |
| **定时任务入口** | JobController | — | HTTP端点供ElasticJob调用 |

**Feign(20)**: BasicDataClient, BasicDataEdiClient, InboundClient, OutboundClient, InsideClient, StorageClient, TmsServiceClient, BigdataPandoraClient, CustomerDatacenterClient, GaiaBasicPssClient, PlatformChaoFaClient, PlatformCustmzClient, QualityInspectionClient, SaasClient, ShscBizcoreSopMergeClient, ShscBizcoreSrmPriceClient, ShscDataCenterClient, ShscEdiClient, DeliverySchedulingFeign, WmsTenantServiceClient

**MQ(14)**: InOutMsgConsume, CommonInOutMsgConsume, TransInOutMsgConsume, InboundBatchInfoSyncConsume, DiffConfirmSyncConsume, PickUpSyncConsume, BackUpSyncConsume, BasicDataItemTransConsumer, BasicDataUnitTransConsumer, SortAbnormalConsume, InboundPrintedConsumer, SendSortingTaskOrderConsumer, SendSortingTaskQuantityConsumer, BackupDataKafkaConsumer

**Enum(2)**: EdiErrorCodeConstant, EdiErrorCode

---

## 3. 服务间调用关系

```
                    ┌──────────┐
         ┌─────────┤   edi    ├──────────┐
         │         └──────────┘          │
         │    (20 Feign Clients)         │
         ▼                               ▼
   ┌───────────┐  ┌───────────┐  ┌───────────┐
   │ outbound  │  │ inbound   │  │   edi     │
   │ →10 Feign │  │ →13 Feign │  │ →20 Feign │
   └─────┬─────┘  └─────┬─────┘  └───────────┘
         │              │
         ▼              ▼
   ┌───────────┐  ┌───────────┐
   │  inside   │  │ storage   │
   │ →10 Feign │  │ →10 Feign │
   └─────┬─────┘  └───────────┘
         │
         ▼
   ┌───────────┐
   │ basicdata │  ← 最核心基础设施(13 Feign输出)
   │ (被全部依赖)│
   └───────────┘
```

---

## 4. 核心业务状态机

### 4.1 出库订单状态
```
NEW → WAVED → ALLOCATED → PICKING → TO_SORTING → SORTING → TO_SHIPPING → SHIPPING
  │                                                                  │
  ├── ABNORMAL ─────────────────────────────────────────────────────────┤
  ├── PARTIALLY_SHIPPED                                               │
  ├── DIFCANCELED                                                    │
  └── CANCELED                                                       │
```

### 4.2 入库订单状态
```
NEW → RECEIVING → RECEIVED → CLOSE
  │
  └── CANCELED
```

### 4.3 盘点状态（DDD责任链）
```
CREATE → ACTIVE → RF录入 → FINISH → 盈亏处理 → 完成
  │
  └── CANCEL
```

### 4.4 移位状态
```
CREATE → IN_PROGRESS → COMPLETED
  │
  └── CANCEL
```

### 4.5 补货状态
```
CREATE → ALLOCATED → IN_PROGRESS → COMPLETED
  │
  └── CANCEL
```

---

## 5. 技术栈

| 技术 | 用途 |
|------|------|
| Spring Boot 2.1.x + Spring Cloud | 微服务框架 |
| MyBatis-Plus 3.1.2 | ORM |
| Apache ShardingSphere + Seata AT | 分库分表 + 分布式事务 |
| Apollo | 配置中心(namespace: application/shsc-wms-sharding-jdbc/shsc-wms-common) |
| RocketMQ | 异步消息(含事务消息) |
| Redis + Redisson | 分布式锁/缓存 |
| ElasticJob | 分布式定时任务 |
| EasyExcel | Excel导入导出 |
| OpenFeign + Hystrix | 服务间RPC调用 |

---

## 6. 开发规范速查

### API风格
- PC端: `/resourceName` 路径
- RF端: `/app/*` 路径(Rf前缀Controller)
- API端: `/api/*` 供Feign调用(ApiController)

### 编码约定
- 实体继承 `BaseEntity`(有revision乐观锁) / `VersionalEntity` / `BaseEntityNoRevision`
- ID生成: `@TableId(type = IdType.INPUT)` + BasicDataClient.getCode()
- 软删除: `isDeleted` 字段
- 多租户: `tenantCode` 字段
- 分布式锁: Redisson RLock, 超时900s
- 错误码: 按范围分区(基础500/收货1xx/上架2xx/订单3xx/质检4xx)
- 编码前缀: 入库单HL01, 收货任务SB, 上架单SC, AGV任务BY

### MQ约定
- Topic: `WMS_*_TOPIC`
- Tag: `WMS_*_TAG`
- Group: `WMS_*_GROUP`

---

## 7. 出库全链路（outbound）服务调用详解

### 7.1 完整链路：订单 → 波次 → 分配 → 拣货 → 分拣 → 装箱 → 集货 → 复核 → 发运

```
【阶段1: 订单进入】
EDI/SAP → OutboundMaster(NEW) → OutboundDetail
         ↑
         └─ Feign: EdiService.getIsExistNoPushWmsOrder()

【阶段2: 波次创建】定时触发 (AutoCreateWaveJob 每3分钟)
AutoCreateWaveJob → WaveAutoAllocationServiceImpl.autoAllocationByWaves()
         ↓
WaveMaster(NEW) → WaveDetail
         ↑
Feign调用链:
├─ BasicDataService.getAutoWaveCollection()  获取自动波次任务
├─ EdiService.getIsExistNoPushWmsOrder()    查询未推送订单
└─ OutboundMasterService.getOrderIdByCollectionId() 查询待波次订单

【阶段3: 库位分配】
WaveAllocationServiceImpl → AllocationLoading → AllocationLoadingDetail
         ↓
Feign调用链:
├─ StorageService.selectPickTaskInventory()       查询库存
├─ StorageService.manualGeneralAllocationInventory() 提总拆分库存
├─ BasicDataService.getItemMasterByItemId()      获取商品信息
└─ BasicDataService.selectTemporaryLocation()    查询分拣暂存库位

【阶段4: 拣货】
┌─────────────────┬──────────────────┬────────────────┐
│  提总(PickType=1) │  摘果(PickType=2) │  RF拣货        │
├─────────────────┼──────────────────┼────────────────┤
│PickTaskGeneral  │ PickTaskFruit     │ RfPickController│
└─────────────────┴──────────────────┴────────────────┘
         ↓
Feign调用链:
├─ StorageService.outSaveStoredItemByLock() 出库库存扣减
├─ InsideFeignService.urgentCreateReplenish() 紧急补货
└─ BasicDataService.checkItemScan() 判断商品是否需要扫描

【阶段5: 分拣】
SortTaskController → SortTask → SortTaskDetail
         ↓
Feign调用链:
├─ BasicDataService.selectSortBindedConfigInfo() 查询客户绑定分拣位
└─ EdiService.pushDataToMultimedia() 推送语音/DPS

【阶段6: 装箱】
PackBoxMasterController → PackBoxItem
         ↑
Feign: ContainerService (shsc-bizcore-wps-service)

【阶段7: 集货】
ConsolidationMaster → ConsolidationDetail
         ↑
Feign: BasicDataService.getConsolidationConfigByCollectionCodeAndZoneCode()

【阶段8: 复核】
ReviewRecordController → ReviewRecord
         ↑
Feign: BasicDataService.getItemMasterByItemId()

【阶段9: 发运】
DeliveryController → AllocationLoading (装车单)
         ↓
Feign调用链:
├─ StorageService.outboundShipStorageDeal() 出库发运库存处理
├─ EdiService.insertInfExpPost() 出库回传SAP/GAIA
├─ DispatchFeign (TMS调度) / BusinessTmsFeign
└─ BasicDataService.getCustomerById() 获取客户信息
```

### 7.2 关键Feign调用汇总

| Feign Client | 被调用服务 | 关键方法 | 调用场景 |
|-------------|----------|---------|---------|
| BasicDataService | basicdata | `getAutoWaveCollection()` | 波次创建 |
| BasicDataService | basicdata | `getItemMasterByItemId()` | 商品信息 |
| BasicDataService | basicdata | `selectSortBindedConfigInfo()` | 分拣配置 |
| StorageService | storage | `selectPickTaskInventory()` | 分配-查库存 |
| StorageService | storage | `outSaveStoredItemByLock()` | 拣货-扣库存 |
| StorageService | storage | `outboundShipStorageDeal()` | 发运-出库 |
| InsideFeignService | inside | `urgentCreateReplenish()` | 紧急补货 |
| InsideFeignService | inside | `generalPickCheckLot()` | 混批校验 |
| EdiService | edi | `insertInfExpPost()` | 发运回传 |
| DispatchFeign | TMS | `dispatchShip()` | 调度发运 |

### 7.3 MQ消息流转

| Topic | Tag | Consumer | 触发场景 |
|-------|-----|----------|---------|
| WMS_INOUT_TOPIC | WMS_PICK_TAG | RocketPickConsumer | 拣货完成 |
| WMS_INOUT_TOPIC | WMS_ALLOCATION_TAG | RocketAllocationConsumer | 分配完成 |
| WMS_INOUT_TOPIC | WMS_SHIP_TAG | RocketShipConsumer | 发运完成 |
| WMS_SORT_RECORD_TOPIC | - | CreateSortRecordConsumer | 分拣记录创建 |

### 7.4 性能瓶颈与故障点

| 风险点 | 位置 | 影响 |
|--------|------|------|
| 分布式锁超时 | AutoCreateWaveJob 锁900s | 波次创建阻塞 |
| 库存冻结不释放 | WaveAllocationServiceImpl | 库存虚减 |
| MQ消息丢失 | RocketPickConsumer | 状态不推进 |
| Feign超时 | BasicDataService | 分配/分拣延迟 |

---

## 8. 移位业务（inside）深度分析

### 8.1 移位核心代码位置

| 文件 | 路径 | 说明 |
|------|------|------|
| MoveBdServiceImpl | `inside/biz/service/impl/MoveBdServiceImpl.java` | 2095行，移位绑定/解绑核心 |
| MoveRecord | `inside/biz/entity/MoveRecord.java` | 移位记录表 w_move_record |
| MoveDetail | `inside/biz/entity/MoveDetail.java` | 移位明细表 w_move_detail |

### 8.2 moveBdLocForthConfirm() 移位确认流程

```
1. 前置校验 (第458-476行)
   ├── 源/目标库位编码非空
   └── 目标库位AGV预占校验

2. 安全库存处理 (第478-488行)
   ├── safeFlag=false: 判断是否需要录入安全库存
   └── safeFlag=true: 获取 safeItemUnit (仅用于绑定)

3. 温层校验 (第521-540行)
   └── 目标库位温层 = 商品温层

4. 创建 MoveRecord (第640-685行)
   ├── 设置移位数量、单位、库位
   └── 【关键】第654-658行: safeFlag不影响移位单位(已修复)

5. 执行库存移动 (第720-721行)
   └── unplannedMoveService.moveLocBdStorage()

6. 拣货位绑定/解绑 (第727-943行)
   └── 4种库位类型组合场景
```

### 8.3 拣货位绑定 4 种场景

| 场景 | 源库位 | 目标库位 | 操作 |
|------|--------|----------|------|
| 1 | 拣货位 | 存货位 | 解绑原库位 |
| 2 | 拣货位 | 拣货位 | 解绑原库位 → 绑定目标库位 |
| 3 | 存货位 | 拣货位 | 绑定目标库位 |
| 4 | 新零售 | 新零售同产线 | 保持原绑定不变 |

### 8.4 单位概念与 pieceLoad

| 单位类型 | 字段 | 说明 |
|---------|------|------|
| 基本单位 | `isBasicUnit=true` | 库存计量最小单位 |
| 包装单位 | `pieceLoad > 1` | 1包装 = pieceLoad个基本单位 |
| 安全库存单位 | `safeUnitId` | 绑定拣货位警戒单位 |

**单位转换公式**:
```java
// 用户输入 → 基本单位
basicInputMoveQty = inputMoveQty × pieceLoad

// 示例: 3件(pieceLoad=6) → 18基本单位
```

### 8.5 与 storage 服务交互

```java
// 移位核心流程 moveLocBdStorage()
1. 获取锁定的库存 → storageFeignService.getStoredItemByIds()
2. 执行出库(减少) → storageFeignService.outSaveStoredItemByLock()
3. 执行入库(增加) → storageFeignService.inSaveStoredItemByLock()
4. 解除移位锁   → unLockMoveLocBdStorage()
5. 保存移位记录 → storageFeignService.addMoveRecord()
6. 同步批次属性 → moveBatchAttributesService.formatMoveBatchAttributes()
```

### 8.6 核心设计模式

| 模式 | 应用位置 | 说明 |
|------|---------|------|
| 分布式事务 | `@GlobalTransactional` | Seata AT模式，出库入库原子性 |
| 库位类型组合 | equals判断 | 4种库位类型决定不同行为 |
| 安全库存优先级 | result > safeFlag > basicUnit | 拣货位绑定单位选择顺序 |
| 分布式锁 | Redisson RLock | 库存级别锁，超时900s |

---

## 10. 入库全流程（inbound）服务调用详解

### 10.1 完整链路：订单 → 收货 → 质检 → 上架 → AGV

```
【阶段1: 订单进入】
EDI/SAP → InboundMaster(NEW) → InboundDetail
         ↑
         └─ Feign: EdiClient.getIsExistNoPushWmsOrder()

【阶段2: 创建收货任务】PC端触发
InboundReceiveController.createOrdinaryTask()
         ↓
RcptTaskService.saveRcptTask() → RcptTaskEntity(AWAIT)
InboundMaster状态: NEW → RECEIVING

【阶段3: RF收货】手持设备触发
InboundReceiveController.confirmReceived()
         ↓
StoreItemClient.inSaveStoredItemByLock() → storage服务 入库库存增加
         ↓
RcptTaskEntity状态: AWAIT → RECEIVING → RECEIVED
InboundMaster状态: RECEIVING → RECEIVED

【阶段4: 质检】可选阶段
QualityInspectionController.qualityInspectionConfirmed()
    ├── 合格品 → 进入上架流程
    └── 让步接收(降级) → 特殊处理

【阶段5: AGV上架】
AgvApiController.putAndCrossAutoWaveAlloc()
         ↓
AgvGetTargetLocChainService.putAndCrossProcess() 责任链获取目标库位
         ↓
PutawayServiceImpl.agvConfirmPallet() AGV任务完成确认
         ↓
StoreItemClient.inSaveStoredItemByLock() → storage服务 库存上架

【阶段6: 完成】
InboundMaster状态: RECEIVED → CLOSE
```

### 10.2 RF收货核心逻辑

```java
// InboundReceiveController.confirmReceived()
public DataResponseEntity<?> confirmReceived(RfConfirmReceivedReq dto) {
    // 1. 米村客户NB订单加锁
    mcCloseReceiveService.addRedisOccupy(dto.getOrderNumber());

    // 2. 获取分布式锁 (LOCK_TIME=900s)
    RLock receiveLock = redisLockUtil.getRedisLock(receiveKey, lockType, TimeUnit.SECONDS, outTime, null);

    // 3. 效期校验 (isExpiredDate=true时)
    validateHelperService.checkCurrentPalletStoredExpiredDate(...);

    // 4. 生产日期校验 (isProduction=true时)
    validateHelperService.checkCurrentPalletStoredProductDate(...);

    // 5. 确认收货 → storage服务增加库存
    StoreItemClient.inSaveStoredItemByLock(dtoList);
}
```

### 10.3 AGV上架责任链模式

```
AgvGetTargetLocChainService.putAndCrossProcess()
         ↓
AbstractAgvGetTargetLocHandler[] (按order排序)
    ├── Handler1 (order=0)
    ├── Handler2 (order=1)
    ├── Handler3 (order=2)
    └── ...

// 越库流程: crossAutoWaveAllocProcess 只执行 order <= 3 的处理器
```

### 10.4 入库 vs 出库 本质区别

| 维度 | 入库 (Inbound) | 出库 (Outbound) |
|------|---------------|-----------------|
| 驱动方向 | 被动接收 (PO→收货) | 主动执行 (SO→波次→拣货) |
| 库存变化 | +库存 (增加) | -库存 (扣减) |
| 时效要求 | 收货时效宽松 | 拣货时效紧迫 |
| 核心锁 | 收货单号锁 (Redisson 900s) | 波次单号锁 (Redisson 900s) |
| 质检介入 | 强制质检 (可选) | 无质检环节 |
| EDI对接 | PO收货回传SAP | SO发运回传 |

---

## 11. 批次属性与效期管理体系

### 11.1 批次核心表结构

| 表名 | 服务 | 说明 |
|------|------|------|
| `w_batch_attributes` | storage | 批次属性主表 |
| `w_stored_item` | storage | 库存表，通过 batchId 关联批次 |
| `w_move_batch_attributes` | inside | 移位记录_商品批次信息 |

### 11.2 效期预警类型

| 预警类型 | code | 说明 |
|---------|------|------|
| 临期 | ADVENT | 商品等级为良品或待鉴定 且 isAdvent=true |
| 过期 | EXPIRED | isExpired=true |
| 呆滞 | SLUGGISH | 前30天无出库记录且有库存 |
| 滞销 | UNSALABLE | 累计可出库天数 > 距临期天数 |
| 残品 | DAMAGED | 商品等级为残品 且 isExpired=false |

### 11.3 保质期预警等级计算

```
int distance = 当前日期 - 生产日期;
int oneThird = shelfLifeDays / 3;
int oneHalf = shelfLifeDays / 2;
int twoThird = shelfLifeDays * 2 / 3;

distance >= (shelfLifeDays - 1) → 过期
distance >= twoThird → 临期(2/3)
distance >= oneHalf → 临期(1/2)
distance >= oneThird → 临期(1/3)
否则 → 正常
```

### 11.4 批次分配策略（波次生产日期定位）

| 规则 | 条件 | 行为 |
|------|------|------|
| allocateFlowDirectionOne | 可定位数量 >= 需求数 | 所有可用非停售库存全部分配 |
| allocateFlowDirectionTwo | 需求数 >= 可定位数量 >= 可用非停售数量 | 可用非停售全部分配，剩余作为越库数量 |
| allocateFlowDirectionThree | 可定位数量 >= 可用非停售数量 > 需求数 | 拣货位优先 → 补货 → 存货位 |

### 11.5 效期与品级耦合规则

```
商品已过期，商品等级只能为残品 (ST_500090384)
过期的库存不能转成良品 (ST_500090032)
```

---

## 12. EDI电子数据交换服务详解

### 12.1 对接架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     EDI 服务 (电子数据交换中心)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ SAP接口 │  │GAIA接口 │  │TMS接口  │  │SRM接口  │            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
│       │             │             │             │                  │
│       └─────────────┴──────┬─────┴─────────────┘                  │
│                            │                                      │
│                   ┌────────┴────────┐                            │
│                   │   MQ消息中心    │                            │
│                   │ WMS_INOUT_TOPIC│                            │
│                   └────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
    outbound(出库)    inbound(入库)    storage(库存)
```

### 12.2 GAIA双向对接

| 方向 | 服务 | 方式 |
|------|------|------|
| WMS → GAIA | `PushGaiaServiceImpl` | HTTP调用 + MQ消息 |
| GAIA → WMS | `ZfGaiaToWmsServiceImpl` | REST API接收 |

### 12.3 出库回传完整流程 (insertInfExpPost)

```
MQ消息触发 (InOutMsgConsume)
         ↓
幂等校验 (RedisLock + w_callback表)
         ↓
保存 w_callback 表
         ↓
定时任务 InOutToGaiaJob 触发
         ↓
batchInOutToGaia() 批量回传
    ├── SOAP报文组装
    ├── SoapUtil.pushMessage() 调用GAIA
    └── 更新回传状态 (SUCCESS_CALL_BACK / FAIL_CALL_BACK)
```

### 12.4 MQ消费者一览

| Consumer | Topic | 用途 |
|----------|-------|------|
| InOutMsgConsume | WMS_INOUT_TOPIC | 出入库回传消费 |
| CommonInOutMsgConsume | COMMON_WMS_INOUT_TOPIC | 通用出入库回传 |
| DiffConfirmSyncConsume | - | 差异确认同步 |
| PickUpSyncConsume | - | 拣货同步 |

### 12.5 两阶段幂等保障

```java
// 第一阶段: Redis分布式锁
String lockKey = String.format(RedisConstant.INOUT_MSG_TAGEDI_CONSUME_KEY, guid, zflag, ...);
rLock = redisLockUtil.getRedisLock(lockKey, LockType.ReentrantLock.name(), ...);

// 第二阶段: 业务数据查重
List<CallBackEntity> list = callBackMapper.selectList(
    qw.lambda()
        .eq(CallBackEntity::getWarehouseCode, warehouseCode)
        .in(CallBackEntity::getRelatedId, ids));
// 过滤已存在数据
inOutMessage.getInfExpPostReqs().removeAll(collect);
```

### 12.6 EDI常见问题排查

| 问题 | 排查方法 |
|------|---------|
| 消息未消费 | 检查 @RocketMQMessageListener 的 topic/tag/consumerGroup |
| 重复消费 | 检查 w_callback 表是否有重复记录 |
| GAIA返回失败 | 查看 wms_all_interface_log 表的 return_message |
| SOAP超时 | 检查 wms.edi.http.timeout 配置 |

---

## 13. 盘点业务（inside）DDD责任链模式

### 13.1 五条责任链

| 责任链 | Handler数量 | 核心功能 |
|--------|------------|---------|
| `CreateCountChainService` | 19 | 盘点单创建（CREATE→NEW） |
| `ActiveCountChainService` | 4 | 盘点激活（NEW→COUNTING） |
| `CountAddChainService` | 13 | RF盘点录入/增补 |
| `FinishCountChainService` | 10 | 盘点完成（COUNTING→COUNT_FINISH） |
| `CancelCountChainService` | 6 | 盘点取消（任意状态→CANCELED） |

### 13.2 盘点状态机

```
TEMP → NEW → COUNTING → COUNT_FINISH → 完成
  │                    ↓
  └─────── CANCELED ◅─┘
```

### 13.3 创建流程（19步核心Handler）

```
1. CountMqParamHandler1         获取盘点单参数
2. CountMasterStorageHandler2    查询storage服务库存
3-9. 校验与数据准备            库存变化/空盘点/批次校验
10. CountLocationLockHandler10 ★ 添加盘点库位锁（静盘加锁，动盘不加）
11-13. 构建盘点单              主单+明细入库
14-16. 库存关联处理
17. CountRpcHandler17 ★        RPC冻结库存（明盘）
18-19. 异常处理               空库位/EXCEL化
```

### 13.4 两层锁架构

```
第一层：盘点单锁 (Redis)
  key = countNumber, 超时900s

第二层：库位锁 (CountLocationLock表)
  静盘(盲盘/明盘)才加锁，动盘不加锁
```

### 13.5 与Storage服务交互

| 场景 | Feign方法 | 功能 |
|------|-----------|------|
| 创建-查询 | `getStoredItemByIds()` | 获取库存详情 |
| 创建-冻结 | `countCreateStorageDeal()` | 明盘冻结库存 |
| 完成-处理 | `getStoredItemByIds()` | 库存校验 |
| 取消-回滚 | `outSaveStoredItemByLock()` | 出库解锁 |

---

## 14. 补货业务体系

### 14.1 补货状态机

```
NEW(待领取) → REPLENISHMENT(补货中) → REPLENISH_FINISH(完成)
      ↓
REPLENISH_CANCEL(取消)
```

### 14.2 补货全流程

```
【阶段1: 建议补货生成】
SuggestReplenishmentController.createReplenishmentForSuggest()
         ↓
1. 获取安全库存信息 → BasicDataService.getSafetyStoredNew()
2. 获取商品最小安全库存 → EfficiencyFeignService.queryItemSafetyQtyNew()
3. 过滤有效补货数据
4. 批次一致性校验（生产日期+保质期+过期日期必须一致）
5. 创建补货任务

【阶段2: 优先级排序】
ReplenishPrioritySortJob（定时任务）
         ↓
OutboundFeignService.getReplenishSortResult()
→ 写入 w_replenish_priority_sort 表

【阶段3: RF补货执行】
ReplenishMasterController.dealRFReplenish()
         ↓
StorageFeignService.outSaveStoredItemByLock() 出库扣减
StorageFeignService.inSaveStoredItemByLock() 入库增加
→ 补货完成触发波次自动分配
```

### 14.3 补货数量计算

| 场景 | 条件 | 补货数量 |
|------|------|----------|
| 空库位 | 拣货位无库存 | planQty = maxQty |
| 非空库位 | 库存 < minQty 且批次一致 | planQty = maxQty - 当前库存 |
| 多批次 | 存在多批次 | 不补货 |

### 14.4 关键Feign

| Feign | 服务 | 用途 |
|-------|------|------|
| `afterReplenishmentAutoAllocation()` | outbound | 补货完成触发波次 |
| `cancelEmergencyReplenish()` | outbound | 取消紧急补货回调 |
| `getFeifnReplenishStorage()` | storage | 查询存货位库存 |
| `outSaveStoredItemByLock()` | storage | 出库扣减 |
| `inSaveStoredItemByLock()` | storage | 入库增加 |

---

## 15. 分布式事务（Seata AT模式）

### 15.1 @GlobalTransactional分布

| 服务 | 核心场景 | 使用数量 |
|------|---------|---------|
| inside | 移位、盘点、补货、冻结、盈亏 | ~90处 |
| outbound | 波次分配、拣货、复核、分拣 | ~70处 |
| storage | 库存操作、批次属性 | ~25处 |

### 15.2 典型事务边界

**移位业务**：
```java
@GlobalTransactional
public ScreenInfoRsp moveBdLocForthConfirm(MoveBdLocThirdReq req)
    │
    ├── 出库扣减 → StorageFeignService.outSaveStoredItemByLock()
    ├── 入库增加 → StorageFeignService.inSaveStoredItemByLock()
    ├── 解除移位锁
    └── 保存移位记录 → StorageFeignService.addMoveRecord()
```

**波次分配**：
```java
@GlobalTransactional(timeoutMills = 600000)  // 10分钟
public void waveAutoAllocation(...)
    │
    ├── 查询可用库存 → StorageService
    ├── 预占库存 → StorageService.manualGeneralAllocationInventory()
    ├── 保存分配结果 → AllocationLoading
    └── 更新出库单状态
```

### 15.3 超时配置建议

| 业务场景 | 超时时间 | 说明 |
|---------|---------|------|
| 简单库存操作 | 60s | 出库/入库单一操作 |
| 中等复杂度 | 180s | 波次分配、单品移位 |
| 复杂业务流程 | 300s | 复核、发货确认 |
| 批量操作 | 600s | 批量波次创建 |

### 15.4 undo_log机制

```
Phase 1: 执行阶段
  前镜像(BEFORE) → 执行SQL → 后镜像(AFTER) → 写入undo_log

Phase 2: 回滚阶段
  读取undo_log → 解析rollback_info → 执行反向SQL → 恢复前镜像
```

### 15.5 常见问题与排查

| 问题 | 排查方法 |
|------|---------|
| 全局锁超时 | `SELECT * FROM undo_log WHERE log_status = 1` |
| 分支回滚失败 | 检查对应库的undo_log |
| AT模式不支持 | 无主键DELETE/跨库JOIN不支持 |

---

## 16. 库存冻结/解冻机制

### 16.1 冻结场景总览

| 场景 | 触发位置 | 冻结类型 | 核心字段 |
|------|---------|---------|---------|
| 盘点冻结(明盘) | CountRpcHandler17 | 状态锁定 | status=UNAVAILABLE, reason=INVENTORY_LOCK |
| 封存商品冻结 | BlockedItemServiceImpl | freezeSign冻结 | freezeSign=true, freezeReason |
| 补货锁定 | ReplenishServiceImpl | 不可用锁定 | reason=REPLENISH_LOCK |
| 移位锁定 | MoveBdServiceImpl | 不可用锁定 | reason=MOVE_LOCK |
| 报缺锁定 | OutboundFeignService | 不可用锁定 | reason=VACANCY_LOCK |

### 16.2 核心字段关系

```
freezeSign (冻结标志) vs status (库存状态) - 独立概念
├── freezeSign: 1=冻结, 0=解冻 (封存商品)
└── status: AVAILABLE/UNAVAILABLE (业务锁定)
    └── reasonUnavailability: INVENTORY_LOCK/REPLENISH_LOCK/MOVE_LOCK/...
```

### 16.3 冻结对业务的影响

| 业务 | freezeSign冻结 | status=UNAVAILABLE |
|------|---------------|---------------------|
| 分配 | 不允许分配 | 不允许分配 |
| 拣货 | 冻结库存不允许 | 锁定库存不允许 |
| 移位 | 可操作(内部流转) | 不可操作 |

### 16.4 错误码速查

| 错误码 | 说明 |
|--------|------|
| ST_500040004 | 库存已经是冻结状态 |
| ST_500040005 | 库存已经是解冻状态 |
| ST_503000025 | 封存商品不能单独解冻 |
| ST_500010003 | 库存为冻结状态不允许操作 |
| ST_500090027 | 库存不可用不允许操作 |

---

## 17. 损耗管理体系

### 17.1 损耗全流程

```
报损(出库触发) → 损耗记录 → 定时刷新状态 → 审批 → 执行
                   ↓
              w_damage_storage_manage
              w_damage_storage_record
```

### 17.2 触发场景

| 触发方式 | 位置 | 说明 |
|---------|------|------|
| PUO3报损 | PickTaskDetailUnPlanServiceImpl | 残品拣货时触发 |
| 配置触发 | Apollo配置 | wms.outbound.damage.storage.bill.code |

### 17.3 损耗状态机

```
untreated(未处理) → partiallyTreated(部分处理) → processed(已处理)
```

### 17.4 OA审批集成

```java
OAWorkFlowFeign.startProcess()  // 发起审批
OAWorkFlowFeign.processingTasks()  // 审批通过
OAWorkFlowFeign.rejecTask()  // 审批驳回
```

### 17.5 效期关联

- 损耗商品通常是过期/临期商品
- 效期预警 → 临期/过期/呆滞/滞销/残品

---

## 18. 定时任务（ElasticJob）体系

### 18.1 Job总览

| 服务 | Job数量 | 核心Job |
|------|--------|---------|
| outbound | 14 | AutoCreateWaveJob(每3min) |
| inside | 14 | WmsInsideTaskCreateJob |
| storage | 13 | InventoryCollectJob(每天12:35) |
| edi | 30+ | InOutToSapJob, WorkBenchJob |
| inbound | 5 | ZfInspectionTaskJob |
| basicdata | 5 | ItemBoxUnitWarningJob |

### 18.2 核心Job

**AutoCreateWaveJob (出库波次)**:
```
每3分钟 → 获取仓库列表 → 获取Redis锁 → 创建波次 → 自动分配
```

**InventoryCollectJob (库存汇总)**:
```
每天12:35 → 删除历史 → 汇总库存 → 更新收货数量 → 回传核对
```

**WmsInsideTaskCreateJob (库内任务)**:
```
参数化触发 → 同批次移位/呆滞移位/高低层/例常补货/过期移位
```

### 18.3 分片策略

```java
// 均分策略: AverageAllocationJobShardingUtil
// 按仓库均分到各分片执行
```

### 18.4 依赖关系

```
AutoCreateWaveJob → 波次创建 → TaskDepartureWaveJob → SendSortTasksJob
                                                    ↓
ReplenishPrioritySortJob ← WmsInsideTaskCreateJob → OutboundFeignService
```

---

## 19. 温层管理体系

### 19.1 温层数据结构

```
w_warm_layer: tempCode, tempName, deliveryTemperature(常温/冷藏/冷冻)
```

### 19.2 温层关联链

```
商品(ItemMaster.tempId) → 温层(WarmLayer.id)
库位(Location.zoneId) → 库区(Zone.tempId) → 温层(WarmLayer.id)
```

### 19.3 温层校验场景

| 场景 | 校验位置 | 校验逻辑 |
|------|---------|---------|
| 移位 | MoveBdServiceImpl:521 | 库位温层=商品温层 |
| 上架 | PutawayServiceImpl:976 | 库位温层=商品温层 |
| 新零售 | 独立产线 | 绕过常规校验 |

### 19.4 错误码

| 错误码 | 说明 |
|--------|------|
| INSIDE_40_005_0110 | 库位温层和商品温层不一致 |

---

## 20. 货主客户管理体系

### 20.1 数据结构

```
Company（货主）- 全量共享，无tenantCode
    └── 商品表通过 companyCode 关联

Customers（客户/送达方）
    ├── companyId → Company.companyCode
    └── collectionId → CustomerCollection

CustomerCollection（客户集合）
    └── CustomerCollectionRelation（多租户隔离绑定）
```

### 20.2 货主关键配置

| 配置项 | 字段 | 影响 |
|--------|------|------|
| 临期限制出库 | `beRestrictExpiryDelivery` | 出库分配时过滤临期库存 |
| 是否米村货主 | `beMcCompany` | 收货加锁逻辑 |
| 允许超发 | `isSupperShip` | 出库数量校验 |
| 内外销 | `businessObject` | 质检/回传策略 |

### 20.3 客户集合关键配置

| 配置项 | 影响 |
|--------|------|
| `isAutoCreateWaves` | 波次自动创建 |
| `cpickType/bpickType` | 拣货方式(摘果/扒蛋/提总) |
| `beRestrictExpiryDelivery` | 临期限制出库(优先级高于货主) |
| `freezingBindingBox` | 冻品绑箱 |
| `lcCwIsLcl` | 冷藏常温拼箱 |

---

## 21. 编码规则体系

### 21.1 编码生成流程

```
业务服务 → BasicDataClient.getDateCode() → Redis Lock → 序列号自增
```

### 21.2 四种编码类型

| 类型 | 说明 | 示例 |
|------|------|------|
| TENANT_PURE_NUMBER | 租户自增数字 | - |
| PURE_NUMBER | 仓库自增数字 | - |
| PREFIX | 带前缀自增(不重置) | - |
| PREFIX_WITH_DATE | 带前缀+日期(每日重置) | SBWGB20260404xxxx |

### 21.3 业务单号前缀

| 前缀 | 业务类型 | 生成规则 |
|------|---------|---------|
| HL01 | 入库单 | 前缀+仓库+年月日+4位流水 |
| SB | 收货任务 | SB+仓库+年月日+4位流水 |
| SC | 上架单 | SC+仓库+年月日+4位流水 |
| BY | AGV任务 | BY+5位流水(无日期) |
| FB | 波次单 | FB+年月日+4位流水 |
| FA | 出库单 | FA+年月日+4位流水 |

### 21.4 常见错误

| 错误码 | 说明 |
|--------|------|
| FAILED_TO_ACQUIRE_LOCK | 3秒内未获取Redis锁 |
| 序列号溢出 | 达到digit位数上限(如9999) |

---

## 22. 库区库位管理体系

### 22.1 层级关系

```
Warehouse → Zone(库区) → Location(库位)
                     ├── WorkArea(工作区)
                     ├── LocationClassify(库位分类)
                     └── LocationLoad(库位承载)
```

### 22.2 库位类型(12种)

| 类型 | 用途 |
|------|------|
| PICKING_LOCATION | 拣货位 |
| GOOD_LOCATION | 良品存库位 |
| REJECT_LOCATION | 残品存库位 |
| PUT_TEMPORARY | 上架暂存 |
| CROSS_TEMPORARY | 越库暂存 |
| SORTING_LOCATION | 发货分拣位 |
| NEW_RETAIL | 新零售拣货位 |
| PACKING_TABLE | 打包台 |

### 22.3 库位推荐算法

**空库位查询条件**：
- 温层匹配(tempId)
- 无库存(wsi.id is null)
- 重量/体积承载满足
- 按pickingSequence升序

**效期优先(FEFO)**：
- 按过期日期升序推荐
- 或按生产日期(根据allocateBatchPriority配置)

---

## 23. AGV任务管理体系

### 23.1 任务状态流转

```
NEW → SUCCESS → ERROR → ALLOCATED → PICK_UP_COMPLETE → ARRIVED_TRANSFER_POSITION → FINISH
新建    已下发    下发失败   已分配       取货完成         已到中转位               完成
                                    │
                                    +→ CANCEL / GENERATE_ERROR
```

### 23.2 任务创建责任链

```
PlacementAdviceService.doAgvCarryTaskCreate()
    ├── Processor10: 越库任务(beCross=true)
    └── Processor20: 上架任务(beCross=false)
            ├── handle10: 人工上架暂存区
            ├── handle20: 退货收货
            ├── handle40: 越库计算
            └── handle50: 异常(GENERATE_ERROR)
```

### 23.3 Wes系统Feign

| 接口 | 用途 |
|------|------|
| createAgvTask() | 创建搬运任务 |
| listTask() | 查询任务 |
| handleTask() | 处理任务(状态变更) |
| markPointOccupy() | 标记点位占用 |

---

## 24. 数据量级

| 服务 | Controller | ServiceImpl | Entity | Feign | MQ | Job | Enum |
|------|-----------|-------------|--------|-------|-----|-----|------|
| outbound | 121 | 170 | 113 | 10 | 17 | 14 | 1+7 |
| inbound | 56 | 111 | 69 | 13 | 19 | 5 | 89+3 |
| basicdata | 173 | 127 | 137 | 13 | 7 | 5 | 92+12 |
| inside | 45 | 68 | 62 | 10 | 14 | 14 | 98+8 |
| storage | 29 | 50 | 58 | 10 | 12 | 13 | 58+6 |
| edi | 24 | 55 | 38 | 20 | 14 | 1(HTTP) | 2 |
| **合计** | **448** | **581** | **477** | **76** | **83** | **52** | **368** |

---

## 25. 出库订单与波次业务体系

### 25.1 核心代码定位

| 业务域 | Controller | ServiceImpl | Entity |
|--------|-----------|-------------|--------|
| **订单管理** | OutboundMasterController, OutboundDetailController | OutboundMasterServiceImpl, OutboundServiceImpl | OutboundMaster, OutboundDetail |
| **波次管理** | WaveController, WaveMasterController, WaveAutoAllocationController | WaveServiceImpl, CreateWaveServiceImpl, WaveAllocationServiceImpl | WaveMaster, WaveDetail |
| **EDI订单** | EdiOutboundController | EdiOutboundService | — |

**关键枚举**: `OutboundStatusEnum`, `OutboundSourceEnum`, `OutboundTypeEnum`, `WaveEnum`, `WaveTypeEnum`, `WavePickType`, `CreateWayEnum`

### 25.2 出库订单状态机

```
NEW → WAVED → ALLOCATED → PICKING → TO_SORTING → SORTING → TO_SHIPPING → SHIPPING
  │                                                                  │
  ├── ABNORMAL ─────────────────────────────────────────────────────────┤
  ├── PARTIALLY_SHIPPED                                               │
  ├── DIFCANCELED                                                    │
  └── CANCELED                                                       │
```

**订单类型**:
| 类型码 | 说明 |
|-------|------|
| PUO1 | 内部领用 |
| PUO3 | 报损出库 |
| PUO4 | 品控取样 |
| PUO5 | 销售取样 |
| ZOR | 库存类销售出库单 |
| MD | 海底捞门店要货 |
| TT/ZZTT | 片区调拨出库 |
| GYUB | 转储出库订单 |
| ZSO/ZKTH/ZSTH/TH | 退供单 |

### 25.3 波次状态机

```
NEW → ALLOCATED → WORKING → FINISHED
  │         │          │
  ├── ABNORMAL ────────┤
  ├── DIFCANCELED ────┤
  └── CANCELED ───────┤
```

**波次拣货方式**:
| 类型 | 说明 |
|------|------|
| WORK_BY_RULE | 按系统规则分配 |
| WORK_BY_GENERAL | 提总拣货 |
| WORK_BY_FRUIT | 摘果拣货 |
| WORK_BY_WEIGH_GENERAL | 提总称重 |
| WORK_BY_SORTING | 边拣边分 |

### 25.4 波次分配逻辑 (WaveAllocationServiceImpl)

**核心方法**:
| 方法 | 说明 |
|------|------|
| `manualAllocateAdvice()` | 手工分配建议 |
| `manualAllocationConfirm()` | 手工分配确认 |
| `autoAllocationByWave()` | 自动分配(按波次) |
| `autoAllocationByWaves()` | 批量自动分配 |

**分配校验**:
- 临期库存校验 (`ItemExpiryDeliveryService`)
- 库存冻结状态校验
- 小数位校验

### 25.5 自动波次 (AutoCreateWaveJob)

**执行频率**: 每3分钟 (cron: `0/10 * * * * ?`，代码中已注释)

**流程**:
1. 获取仓库列表，遍历每个仓库
2. 获取Redis分布式锁
3. 调用 `basicDataService.getAutoWaveCollection()` 获取自动波次任务配置
4. 校验常规订单/补货订单是否配置自动创建波次
5. 调用EDI接口确认未推送订单是否存在
6. 查询满足条件的NEW状态订单
7. 调用 `waveService.manualCreateWave()` 创建波次
8. 若配置自动分配，调用 `waveAutoAllocationService.autoAllocationByWaves()`

---

## 26. 入库收货与上架业务体系

### 26.1 核心代码定位

**收货模块 (inbound-service)**:
| 类名 | 文件路径 |
|------|---------|
| `InboundReceiveController` | `biz/controller/InboundReceiveController.java` |
| `InboundReceiveServiceImpl` | `biz/service/impl/InboundReceiveServiceImpl.java` |
| `RcptTaskServiceImpl` | `biz/service/impl/RcptTaskServiceImpl.java` |
| `BlindReceiveServiceImpl` | `biz/service/impl/BlindReceiveServiceImpl.java` |
| `InboundOneCarManyOrderServiceImpl` | `biz/service/impl/InboundOneCarManyOrderServiceImpl.java` |

**上架模块 (inbound-service)**:
| 类名 | 文件路径 |
|------|---------|
| `PutawayController` | `biz/controller/PutawayController.java` |
| `PutawayServiceImpl` | `biz/service/impl/PutawayServiceImpl.java` |
| `AgvApiServiceImpl` | `biz/service/impl/agv/AgvApiServiceImpl.java` |
| `AgvGetTargetLocChainService` | `biz/service/impl/agv/putaway/AgvGetTargetLocChainService.java` |

### 26.2 RF收货流程

```
1. scanPoNumber()        - 输入/扫描PO单号
   ↓
2. scanPalletNumber()   - 输入/扫描托盘号
   ↓
3. scanItemCode()        - 输入/扫描商品编码
   ↓
4. inputReceivedNumber() - 输入收货数量
   ↓
5. confirmReceived()     - RF收货确认(核心)
```

**confirmReceived 核心流程**:
1. 校验余料超发占用
2. 校验越库托盘
3. 校验托盘商品等级
4. 校验箱柜合同号和生产商
5. 溯源码校验
6. 封存校验 (`blockedCheck`)
7. 判断是否余料超发
8. 保存上架单 (`persistentPutaway`)
9. 更新入库单头状态 (`coreUpdateStatus`)
10. 保存库存记录 (`persistentStoredItem`)
11. 质检降级接收处理
12. AGV搬运任务创建

### 26.3 收货状态机

**TaskStatusEnum** (收货任务):
| 枚举值 | 含义 |
|--------|------|
| AWAIT | 待收货 |
| RECEIVING | 部分收货 |
| RECEIVED | 收货完成 |
| CANCELED | 取消 |

**InboundStatusEnum** (入库单):
| 枚举值 | 含义 |
|--------|------|
| NEW | 新建 |
| RECEIVING | 部分收货 |
| RECEIVED | 收货完成 |
| CLOSE | 关闭 |
| CANCELED | 取消 |

### 26.4 上架流程

```
1. scanPalletNumber()   - 扫描托盘号
   ↓
2. suggestLocation()    - 推荐库位(拣货位+目标库位)
   ↓
3. confirmLocation()    - 确认目标库位
   ↓
4. confirmPallet()     - 确认托盘上架
```

### 26.5 AGV上架责任链

```
AgvGetTargetLocChainService.putAndCrossProcess()
         ↓
AbstractAgvGetTargetLocHandler[] (按order排序)
    ├── Handler1: AgvGetPutStorageImpl1     - 获取上架库
    ├── Handler2: AgvItemVolumeCalculatorImpl2 - 体积计算
    ├── Handler3: AgvGetTargetLocCrossImpl3  - 获取越库目标库位
    ├── Handler4: AgvGetTargetLocCrossPutAreaImpl4 - 获取越库放置区
    ├── Handler5: AgvGetMiddleLocImpl5       - 获取中间库位
    └── Handler6: AgvGetEmptyLocImpl6        - 获取空库位
```

### 26.6 收货关键校验

| 校验项 | 方法 | 错误码 |
|--------|------|--------|
| 托盘占用 | `palletOccupied()` | `RF_PALLET_HAS_OTHER_LOC_TYPE` |
| 温层一致性 | `checkLayerIsSame()` | `RF_LAYER_IS_SAME` |
| 商品等级 | `checkItemGrade()` | `RF_CHECK_GRADE_FAIL` |
| 保质期天数 | `validateShelfLifeDay()` | `THE_SHELF_LIFE_DAYS_IS_INCONSISTENT...` |
| 封存校验 | `blockedCheck()` | `RF_RECEIVE_SEALED_UP` |

---

## 27. 质检与损耗管理体系

### 27.1 质检业务 (inbound-service)

**核心代码定位**:
| 类名 | 说明 |
|------|------|
| `QualityInspectionController` | PC端质检 |
| `QualityInspectionTaskServiceImpl` | 质检任务服务 |
| `QualityInspectionRecordServiceImpl` | 质检记录服务 |
| `RcptQualityInspectionServiceImpl` | 收货质检服务 |
| `QualityInspectionCertificate` | 质检证件记录 |
| `QualityInspectionImage` | 质检图片记录 |

**质检类型**:
| 类型 | 说明 |
|------|------|
| 来料质检 (RcptQualityInspection) | 收货时的质检流程 |
| 发货质检/直发质检 | 直发订单的质检 |

**质检状态** (QualityInspectionStatusEnum):
| 枚举值 | 含义 |
|--------|------|
| NO_NEED | 无需质检 |
| PENDING | 待质检 |
| PARTIALLY | 部分质检 |
| DONE | 质检完成 |

**质检流程**:
```
收货任务创建 → 质检任务创建 → 质检执行 → 质检结果记录 → 收货确认
                              ↓
                    合格/不合格/降级接收
```

### 27.2 损耗管理 (storage-service)

**核心代码定位**:
| 类名 | 说明 |
|------|------|
| `DamageStorageManageController` | 损耗管理 |
| `DamageStorageManageServiceImpl` | 损耗主服务 |
| `DamageStorageManageDetailServiceImpl` | 损耗明细服务 |
| `DamageStorageRecordServiceImpl` | 损耗记录服务 |
| `DamageStorageJobServiceImpl` | 损耗定时服务 |
| `OAWorkFlowFeign` | OA审批Feign |

**损耗分类** (DamageStorageHandleMethodEnum):
| 类型 | 说明 |
|------|------|
| damage | 报损 |
| sale | 售卖 |
| meal | 降级做员工餐 |
| vendor | 退供应商 |
| other | 其它 |

**损耗状态机**:
```
未处理(untreated) → 部分处理(partiallyTreated) → 已处理(processed)
       ↑                                          ↓
       └────────────── 定时刷新 ←─────────────────┘
```

**损耗流程**:
```
报损触发(出库拣货残品) → 损耗记录创建 → 定时任务刷新状态 → OA审批 → 执行处理
                                ↓
                         报损/售卖/员工餐/退供应商
```

### 27.3 OA审批流程

```java
// OAWorkFlowFeign
startProcess()           // 发起工作流流程
processingTasks()        // 流程审批通过
rejecTask()             // 流程审批驳回
terminateAndRecordByProc() // 流程作废
queryRunTask()          // 查询当前正在运行的任务
```

---

## 28. 定时任务与分布式锁体系

### 28.1 定时任务清单

**outbound-service Job**:
| 类名 | 功能 | 执行周期 |
|------|------|---------|
| AutoCreateWaveJob | 自动创建波次 | 每3min (实际被注释) |
| SendSortTasksJob | 分拣数据下发 | 每3min |
| TaskLockUserCleanJob | 清空任务占用人(防死锁) | 每5min |
| AsyncTaskDeleteJob | 异步任务删除 | — |
| AsyncTaskExecuteJob | 异步任务执行 | — |
| CountPickRecordInfoJob | 统计拣货记录 | — |
| PushStatisticsJob | 推送统计 | — |
| TaskDepartureWaveJob | 任务出发波次 | — |

**storage-service Job**:
| 类名 | 功能 | 执行周期 |
|------|------|---------|
| SendExpiredStoredJob | 过期预警报表发送 | cron配置 |
| InventoryCollectJob | WMS与SAP双系统库存差异核对 | 每天12:35 |
| RefreshProduceDateJob | 刷新保质期天数 | cron配置 |
| DamageStorageStatusRefreshJob | 不合格品状态刷新 | 每10min |
| GetPutawayRecordJob | 获取上架记录 | cron配置 |
| GetStoredSnapshotJob | 获取库存快照 | cron配置 |
| RefreshItemVolumeStorageJob | 刷新商品标准体积 | 每天7:30 |
| OutboundWarningSyncJob | 同步预警信息 | 每天0:30 |

### 28.2 分布式锁配置

**锁超时配置**:
| 配置项 | 值 | 位置 |
|--------|-----|------|
| COUNT_LOCK_TIME | 900秒 | RedisConstant.java |
| REDIS_LOCK_OUT_TIME | 50秒 | CommonConstant.java |
| REDIS_LOCK_LONGEST_WAIT_TIME | 3秒 | CommonConstant.java |
| GlobalLockHelper.WAIT_TIME | 10秒 | GlobalLockHelper.java |
| GlobalLockHelper.OUT_TIME | -1L(永不过期) | GlobalLockHelper.java |

### 28.3 锁粒度 (RedisKeyEnum)

```java
w_outbound_master      // 出库单
w_outbound_detail_expand // 出库单明细
w_vacancy_task        // 报缺
w_sort_task           // 分拣任务
w_async_task          // 异步任务
w_stored_item         // 库存
w_supplier_sale       // 直发分拣
```

### 28.4 锁前缀 (RLockPrefixConstant)

```java
WAVEMASTER_           // 波次Id锁
ALLOCATELOCK_         // 商品分配锁
CREATEPICKTASKDOC_    // 创建拣货任务波次id锁
CROSSCONFIRM_         // 越库商品id锁
LOADMASTER_           // 装车单Id锁
GENERAL_TASK_LOCK_    // 提总任务ID锁
FRUIT_TASK_LOCK_      // 摘果任务ID锁
BEEF_TASK_LOCK_       // 牛肉类锁前缀
UNPLAN_TASK_LOCK_     // 无计划锁前缀
```

### 28.5 死锁预防 (TaskLockUserCleanJob)

**清理内容**:
1. 提总任务占用人清理
2. 摘果任务占用人清理
3. 不合格品出库任务占用人清理
4. 牛肉类任务占用人清理
5. 拦截取货任务占用人清理
6. 波次分配执行中状态重置
7. RF分拣任务占用人重置

**配置时间**: 默认25分钟前的占用信息会被清理

---

## 29. 盘点业务深度 - DDD责任链模式

### 29.1 盘点DDD责任链 (19个Handler)

**基类**: `AbstractCountCreateHandler` - 模板方法模式

**创建盘点单Handler链** (`CreateCountChainService`):

| Order | Handler类 | 功能 |
|-------|-----------|------|
| 1 | `CountMqParamHandler1` | 获取MQ参数，解析维度(商品/库位盘) |
| 2 | `CountMasterStorageHandler2` | 调用库存服务获取实际盘点库存 |
| 3 | `CountStoreItemListChainService3` | 再次查询商品库存构建storageMap |
| 4 | `CountIsDarkOrLightHandler4` | 判断静盘/盲盘/明盘 |
| 5 | `CountStoreIsChangeVerifyHandler5` | 静盘时验证库存是否变化 |
| 6 | `CountStoreEmptyCountVerifyHandler6` | 空盘点单校验 |
| 7 | `CountBuildCountMasterOneHandler7` | 第一次构造盘点单(设置单号/来源/类型/状态TEMP) |
| 8 | `CountEmptyLocHandler8` | 插入空库位明细 |
| 9 | `CountFillPropertyHandler9` | 填充业务属性(Map/Set) |
| 10 | `CountLocationLockHandler10` | 批量增加盘点库位锁(静盘加锁，动盘不加) |
| 11 | `CountBuildCountMasterTwoHandler11` | 第二次构造盘点单(填充ZoneId/WorkAreaId等) |
| 12 | `CountVacancyItemHandler12` | 构建报缺数据(isVacancy=true) |
| 13 | `CountDetailSaveDBHandler13` | 盘点明细批量入库 |
| 14 | `CountBuildStoredItemReqHandler14` | 构建更新库存数据StoredItemReq列表 |
| 15 | `CountStorageRelationDBHandler15` | 增加明细与库存关系入库(静盘) |
| 16 | `CountMasterSaveDBHandler16` | 盘点主任务入库 |
| 17 | `CountRpcHandler17` | RPC调用(库存标记INVENTORY_LOCK+关闭报缺单) |
| 18 | `CountNoStoredItemCheckHandler18` | 库存被抢处理，删除无库存明细 |
| 19 | `CountExcelErrorHandler19` | 异常数据Excel化+WebSocket通知 |

**RF盘点完成Handler链** (`RfCountFinishHandlerChain`):

| Order | Handler类 | 功能 |
|-------|-----------|------|
| 1 | `RfCountFinishEmptyLocHandler1` | 空库位标记完成 |
| 2 | `RfCountFinishCheckParamHandler2` | 参数校验(商品勾选/数量录入) |
| 3 | `RfCountFinishCheckLotHandler3` | 混批校验 |
| 4 | `RfCountFinishCommitHandler4` | 提交盘点 |

**盘点完成Handler链** (`FinishCountChainService`):

| Order | Handler类 | 功能 |
|-------|-----------|------|
| 1 | `CountFinishRepeatDataCleanHandler1` | 删除重复数据 |
| 2 | `CountFinishCountStatusVerifyHandler2` | 状态校验(必须为COUNTING) |
| 3 | `CountFinishCheckLotHandler10` | 判断混批 |
| 4 | `CountFinishReplayVerityHandler3` | 是否需要复盘 |
| 5 | `CountFinishDataProcessHandler4` | 复盘数据准备 |
| 6 | `CountFinishRpcStorageHandler5` | RPC库存处理 |
| 7 | `CountFinishCountLocationLockHandler6` | 释放库位锁 |
| 8 | `CountFinishCreateReplayCountHandler7` | 复盘核心处理 |
| 9 | `CountFinishDelCountHandler8` | 清理锁/主单/关系表 |
| 10 | `CountFinishRpcHandler9` | 回传Gaia |

### 29.2 盘点类型 (CountTypeEnum)

| 类型 | Code | 说明 |
|------|------|------|
| 报缺差异盘 | `VACANCY_DIFF` | 报缺生成的差异盘点 |
| 动盘(明盘) | `DYNAMIC_LIGHT` | 看得到系统库存 |
| 动盘(盲盘) | `DYNAMIC_DARK` | 看不到系统库存 |
| 静盘(明盘) | `STATIONARY_LIGHT` | 看得到系统库存 |
| 静盘(盲盘) | `STATIONARY_DARK` | 看不到系统库存 |

**静盘 vs 动盘区别**:
- 静盘: 加库位锁、创建库存关系、调用RPC锁定库存
- 动盘: 不加锁、不创建关系、不RPC

### 29.3 盘点状态机

```
TEMP(新建) → NEW(待领取) → COUNTING(盘点中) → COUNT_FINISH(完成)
                                    ↓
                               CANCELED(取消)
```

### 29.4 盘点盈亏

**盘盈原因** (CountProfitEnum):
- 801001: 门店订单漏发货
- 801002: 多收货未入库清点差异
- 801003: 门店退货未入库
- 801004: 同品类物料发串货

**盘亏原因** (CountLossEnum):
- 801005: 门店订单多发货
- 801006: 收货入库实物未清点差异
- 801007: 门店退货已入账实物未退仓
- 801008: 仓库操作破损/货损/污染
- 801009: 同品类物料发串货

---

## 30. 补货业务深度

### 30.1 补货状态机

```
NEW(待领取) → REPLENISHMENT(补货中) → REPLENISH_FINISH(完成)
   │                │
   │                │
   v                v
REPLENISH_CANCEL(取消)
```

### 30.2 补货类型

| 类型 | 代码 | 说明 |
|------|------|------|
| 例常补货 | `ROUTINE_REPLENISH` | 日常补货，定时任务触发 |
| 紧急补货 | `EMERGENCY_REPLENISH` | 波次分配时库存不足触发 |

**创建触发条件** (ReplenishCreateTypeEnum):
| 类型 | 说明 |
|------|------|
| `LESS` | 拣货位库存 < 安全库存 |
| `ZERO` | 拣货位完全空 |
| `LESS_EQUAL` | <安全库存且批次一致 |

### 30.3 例常补货流程

```
建议补货 → 确认补货 → 执行补货 → 完成
```

1. 建议补货: 按温层/库区获取需补货物料，按拣次倒序
2. 补货校验: 过滤新零售拣货位，多拣货位绑定时只有空拣货位生成任务
3. 创建任务: 锁定存货位库存(UNAVAILABLE)，创建ReplenishDetail
4. RF执行: 领取→库位校验→上架确认→释放预锁

### 30.4 紧急补货(波次联动)

**触发**: 波次分配时拣货位库存不足

**流程**:
1. 判断是否存在未完成例常补货单
2. 存在则追加，不存在则新建紧急补货单
3. 计算各拣货位需求(空拣货位优先)
4. 补货完成调用 `afterReplenishmentAutoAllocation()`

### 30.5 补货核心Service

| 方法 | 类 | 说明 |
|------|-----|------|
| `doCreateReplenish()` | ReplenishServiceImpl | 执行日常补货创建 |
| `checkStoregBatch()` | ReplenishServiceImpl | 补货校验与过滤 |
| `urgentCreateReplenish()` | ReplenishMasterServiceImpl | 紧急补货创建(跨区) |
| `afterReplenishmentAutoAllocation()` | ReplenishMasterServiceImpl | 补货完成触发出库分配 |

---

## 31. 库存管理深度

### 31.1 库存核心操作API

**StoredItemServiceImpl**:

| 方法 | 功能 |
|------|------|
| `inSaveStoredItem()` | 入库-库存保存 |
| `outSaveStoredItem()` | 出库-库存扣减 |
| `doStorageFreeze()` | 库存冻结 |
| `dealStorageUnfreeze()` | 库存解冻 |
| `changeBatchAttributes()` | 批次属性变更 |

### 31.2 冻结/解冻机制

**冻结流程** (`doStorageFreeze`):
1. 校验库存是否存在
2. 校验当前冻结状态(已冻结不能再冻)
3. isAllChange=true时冻结全部数量
4. 出库原库存 + 入库新库存(freezeSign=true)

**解冻流程**:
- 调用 `doStorageFreeze(sign=false)` 实现
- 解冻时清除freezeReason

### 31.3 批次属性核心字段

| 字段 | 说明 |
|------|------|
| `shelfLifeDays` | 保质期天数 |
| `produceDate` | 生产日期 |
| `expiryDate` | 过期日期 |
| `isAdvent/isDiscontinued/isExpired` | 临期/停售/过期标志 |
| `traceCode` | 溯源批次码 |
| `freezeNumber` | 冻结任务号 |

### 31.4 库存与其他业务交互

| 业务 | Feign调用 | 用途 |
|------|----------|------|
| 入库 | `inSaveStoredItem()` | 增加库存 |
| 出库 | `outSaveStoredItem()` | 扣减库存 |
| 移位 | `getMoveLocStorage()` | 移位锁定查询 |
| 盘点 | `getCountUnavailableStorage()` | 盘点获取不可用库存 |
| 损耗 | `queryStorageByBatchIds()` | 不合格品关联查询 |

---

## 32. Seata分布式事务深度

### 32.1 @GlobalTransactional 使用场景

**outbound (120+处)**:
| 场景 | 方法 |
|------|------|
| 越库确认 | `CrossDetailServiceImpl.crossConfirm()` |
| 牛肉拣货 | `PickTaskBeefSoringServiceImpl.processOneWeighRecord()` |
| 拣货提交 | `SortingWhilePickingServiceImpl.doPickTaskFruit()` |
| 取消分配 | `CancelAllocationByWaveServiceImpl.invokeTaskAndInventory()` |

**inside (80+处)**:
| 场景 | 方法 |
|------|------|
| 盘点创建 | `CountMasterServiceImpl.countCreate()` |
| 盘点启动 | `CountMasterServiceImpl.countStart()` (30分钟超时) |
| 移位确认 | `MoveDetailServiceImpl.moveConfirm()` |
| 库位移位 | `MoveBdServiceImpl.moveBdLocForthConfirm()` |

**inbound (50+处)**:
| 场景 | 方法 |
|------|------|
| 收货确认 | `InboundReceiveServiceImpl.confirmReceived()` |
| 质检确认 | `QualityInspectionRcptConfirmServiceImpl.confirmQualityInspection()` |

### 32.2 超时时间配置

| 业务场景 | timeoutMills | 说明 |
|---------|-------------|------|
| 快速确认操作 | 60s | 简单状态更新 |
| 标准业务操作 | 3-5min | 常规业务 |
| 复杂批处理 | 10-30min | 盘点、批量移位 |
| 导入导出 | 30min+ | 大数据量 |

### 32.3 AT模式限制

| 限制类型 | 说明 | 处理方案 |
|---------|------|---------|
| 无主键DELETE | 无法定位待删除记录 | 使用CustomRMHandler |
| 跨库JOIN | 无法识别跨分片关联 | 改为单分片或广播表 |

### 32.4 undo_log表

```sql
-- 关键字段
xid           -- 全局事务ID
branch_id     -- 分支事务ID
rollback_info -- 序列化后的undo log(前镜像/后镜像)
log_status    -- 0:正常, 1:防御状态(回滚中)
```

**清理SQL**:
```sql
DELETE FROM undo_log
WHERE log_status = 0
  AND log_created < DATE_SUB(NOW(), INTERVAL 7 DAY);
```

### 32.5 GlobalLockHelper 与 @GlobalTransactional 配合

```java
// Redisson多锁 + Seata事务配合
List<RLock> rLocks = ...;
redissonMultiLock = redissonClient.getMultiLock(rLocks.toArray());
isLockSuccessful = redissonMultiLock.tryLock(-1, outTime, TimeUnit.SECONDS);

// 锁内执行带@GlobalTransactional的操作
((Service) AopContext.currentProxy()).methodWithGlobalTx();
```

---

## 33. 越库与分拣业务

### 33.1 越库业务 (CrossDock)

**核心实体**: `CrossDetail` (w_cross_detail)

**越库类型**:
| 类型 | 说明 |
|------|------|
| SB | 收货越库 |
| SC | 上架越库 |

**越库状态机**:
```
NEW(未完成) → FINISHED(完成)
```

**RF越库6步流程**:
```
第一屏: 选择客户交货日期
    ↓
第二屏: 选择越库任务(商品+波次)
    ↓
第三屏: 扫描托盘确认
    ↓
第四屏: 核对信息页(拣货数量核对)
    ↓
第五屏: 修改数量(报缺处理)
    ↓
第六屏: 选择目标托盘完成越库
```

**核心Service**: `CrossDetailServiceImpl.crossConfirm()` - 带@GlobalTransactional

### 33.2 分拣业务 (Sorting)

**核心实体**:
| Entity | 说明 |
|--------|------|
| `SortTask` | 分拣任务表 |
| `SortTaskDetail` | 分拣任务明细 |

**分拣状态机**:
```
NEW → ABNORMAL
  │       ↓
  ├──▶ CLAIMED → SORTING → FINISH
  │
  └──▶ CANCELED
```

**分拣方式**:
| 方式 | 说明 |
|------|------|
| RF | RF手持终端 |
| 纸单 | 纸单 |
| 语音 | 语音播报 |
| DAS | 电子标签 |

**分拣下发流程**:
```
SortTaskService.sortTaskDistribution()
    ↓
DpsAndVoicePushService.sortTaskPush()
    ↓
EdiService.pushDataToMultimedia() → DPS/语音系统
    ↓
SortTaskService.updateSortTaskSendStatus()
```

**核心Service**: `SortTaskServiceImpl`, `RfPdaSortingServiceImpl`

---

## 34. 复核与发运业务

### 34.1 复核业务 (Review)

**核心实体**: `ReviewRecord` (w_review_record)

**复核状态机** (ReviewStatusEnum):
| 枚举值 | 含义 |
|--------|------|
| NEW | 未复核 |
| PARTIAL_REVIEW | 部分复核 |
| REVIEWED | 已复核 |
| NO_REVIEW_REQUIRED | 无需复核 |

**RF复核5步流程**:
```
Screen1: 客户集合列表
    ↓
Screen2: 交货日期列表
    ↓
Screen3: 门店列表
    ↓
Screen4: 商品列表 + 确认无误
    ↓
Screen5: 修改复核数量 + 录入箱数
```

**复核与装箱关联**:
- 满箱: `boxState=true` → 标记满箱
- 不满箱: 继续复核流程

### 34.2 发运/装车业务 (Delivery & Loading)

**出库状态机** (OutboundStatusEnum):
```
NEW → WAVED → ALLOCATED → PICKING → TO_SORTING → SORTING → TO_SHIPPING → SHIPPING
```

**装车单状态** (AllocationLoading):
```
NEW → LOADING → HAS_LOADING → SHIPPED
                    ↓
                 CANCEL
```

**TMS调度对接**:
1. TMS推送调度单 → WMS创建AllocationLoading
2. WMS装车完成 → 回传TMS
3. TMS取消 → TmsCancelDisPatchOrderNumberReq

**发运确认流程**:
```
DeliveryServiceImpl.deliveryShip()
    ↓
校验订单状态(TO_SHIPPING/DIFCANCELED/CANCELED)
    ↓
planOutboundDelivery() / noPlanOutboundDelivery()
    ↓
库存扣减 + 状态变更 + 回传上游
```

**核心Service**: `DeliveryCommitServiceImpl` - 发运确认核心

---

## 35. Apollo配置与ShardingSphere分片

### 35.1 Apollo配置中心

**Namespace配置**:
```properties
apollo.bootstrap.namespaces=application,shsc-wms-sharding-jdbc,shsc-wms-common
```

**三个核心Namespace**:
| Namespace | 用途 |
|-----------|------|
| application | 应用级配置 |
| shsc-wms-sharding-jdbc | ShardingSphere分片配置 |
| shsc-wms-common | 公共配置 |

**配置注入方式**:
```java
// 方式1: @ApolloConfig注解
@ApolloConfig
private Config config;

// 方式2: @Value注入
@Value("${wms.outbound.template:false}")
private boolean template;

// 方式3: ApolloConfigEnum统一管理
ApolloConfigEnum.BILL_TYPE.getCode()
```

### 35.2 ShardingSphere分库分表

**核心分片键**: `tenantCode` (租户编码)

**自动填充**: `MyMetaObjectHandler.insertFill()`

**跨分片限制**:
| 问题 | 原因 | 解决方案 |
|------|------|---------|
| ShardingException | 分片键缺失 | SQL必须包含tenantCode |
| 跨库查询失败 | 不支持跨分片JOIN | 使用广播表或应用层二次查询 |
| 分页查询慢 | 深度分页跨分片合并 | 限制分页深度或游标分页 |

---

## 36. RocketMQ消息队列

### 36.1 Topic清单

| Topic | 用途 |
|-------|------|
| WMS_INOUT_TOPIC | 出库核心(拣货/发运/重定位) |
| WMS_OUTBOUND_GENERAL | 出库通用(均分/越库/差异) |
| WMS_SORT_RECORD_TOPIC | 分拣记录生成 |
| WMS_TRACEABILITY_ITEM_FROM_WMS_TOPIC | 溯源消息 |
| WMS_EDI_OUTBOUND_TOPIC | EDI下推出库单 |
| WMS_FRUIT_PACK_TOPIC | 摘果绑箱 |

### 36.2 Tag清单

| Tag | 用途 |
|-----|------|
| WMS_PICK_TAG | 拣货 |
| WMS_SHIP_TAG | 发运 |
| WMS_ALLOCATION_TAG | 自动分配/重定位 |
| AVG_CROSS_DIFF_TAG | 均分-越库-差异 |
| WMS_SORT_RECORD_TAG | 分拣记录 |
| WMS_TRACE_SOURCE_TAG | 溯源 |

### 36.3 事务消息机制

**事务监听器基类**: `AbstractRocketMQLocalTransactionListener`

**核心事务Producer**:
| Producer Group | 用途 |
|---------------|------|
| WMS_SHIP_TRANSACTION_GROUP | 异步发运 |
| WMS_PICK_RECORD_TRANSACTION_GROUP | 异步拣货记录 |
| WMS_SHIP_POST_TRANSACTION_GROUP | 异步出库回传 |
| WMS_AGAIN_ALLOCATION_TRANSACTION_GROUP | 异步重定位 |
| WMS_OUTBOUND_GENERAL_PRO_GROUP | 出库通用事务 |

**事务消息流程**:
1. 发送半消息(Half Message)
2. 执行本地事务
3. 本地事务成功 → 提交消息
4. 本地事务失败 → 回查或回滚

### 36.4 消费模式

```java
// 方式1: 继承WmsAbstractConsumer (推荐)
@RocketMQMessageListener(topic = "...", consumerGroup = "...")
public class RocketShipConsumer extends WmsAbstractConsumer<InOutMessage>

// 方式2: 实现RocketMQListener
@Service
@RocketMQMessageListener(topic = "...", consumerGroup = "...", consumeThreadMax = 16)
public class FruitPackConsumer implements RocketMQListener<T>
```

### 36.5 消费幂等性

```java
// 通过GlobalLockHelper加锁保证幂等
Boolean execSuccess = GlobalLockHelper.lock(
    () -> this.execPackRecord(message),
    GlobalLockHelper.getLockKey("WMS_FRUIT_PACK_TOPIC:" + traceId),
    () -> { },
    MessageI18n.getMessage(OutboundErrorCode.OPERATION_LOCK.getCode()),
    -1L);
```

---

## 37. 集货与装箱业务

### 37.1 集货业务 (Consolidation)

**核心实体**:
| Entity | 说明 |
|--------|------|
| `ConsolidationMaster` | 集货主表 (w_consolidation_master) |
| `ConsolidationDetail` | 集货明细表 (w_consolidation_detail) |

**集货状态机**:
| 状态 | 含义 |
|------|------|
| STOCKING | 备货中 |
| STOCK_UP_COMPLETED | 备货完成 |
| OUT_STOCK | 已出库 |
| SHIPPED | 已发运 |
| CANCELED | 取消 |

**RF集货摘果流程**:
```
托盘校验 → 集货位校验 → 库区配置校验 → 构建集货任务
```

### 37.2 装箱业务 (PackBox)

**核心实体**:
| Entity | 说明 |
|--------|------|
| `PackBoxMaster` | 装箱主表 (w_pack_box_master) |
| `PackBoxItem` | 装箱明细表 (w_pack_box_item) |

**装箱状态** (PackBoxStatusEnum):
| 状态 | 含义 |
|------|------|
| NORMAL | 正常 |
| ADD_SUB | 有增减 |
| REMOVE | 已清空 |

**满箱逻辑**: remainingQty ≤ 0 → 自动标记REMOVE

**箱规校验**: `ValidatePackServiceImpl.checkPackOccupied()`
- 箱码格式: F+年月日+4位流水
- 不能绑定其他门店/交货日期

---

## 38. RF手持终端业务

### 38.1 RF业务分布

| 服务 | RF Controller数量 | 主要业务 |
|------|------------------|---------|
| outbound | 22个 | 拣货/分拣/越库/复核/打包 |
| inbound | 3个 | 收货/上架/卸货费/AGV |
| inside | 2个 | 盘点/移位 |
| basicdata | 2个 | 绑定拣货位/角标盘点 |

**预估RF总接口数: 约200+**

### 38.2 RF核心流程

**RF收货** (InboundReceiveController):
```
扫描PO单号 → 扫描托盘号 → 扫描商品编码 → 输入数量 → 确认收货
```

**RF上架** (PutawayController):
```
扫描托盘 → 推荐库位 → 确认目标库位 → 上架确认
```

**RF拣货** (RfPickController - 63接口):
| 拣货模式 | 第一屏 | 第二屏 | 第三屏 | 第四屏 |
|---------|-------|-------|-------|-------|
| 提总拣货 | 客户集合 | 任务列表 | 库位显示 | 商品扫描 |
| 摘果拣货 | 客户集合 | 门店列表 | 分配托盘 | 商品扫描 |
| 边拣边分 | 客户集合 | 任务列表 | 扫描库位 | 核对信息 |

### 38.3 RF通用设计模式

**多屏状态机**: 每屏对应独立接口，屏幕间通过Request Body传递上下文

**分布式锁**: 订单级别锁(receiptNumber/orderNumber)

**占用-释放**: `occupy()`/`clearOccupyTask()` 防止并发冲突

**双重响应**: `DataResponseHelper.fail(jumpInfo)` 返回前端跳转信息

---

## 39. 数据导入导出 (Excel)

### 39.1 导入架构

**核心组件**:
| 组件 | 说明 |
|------|------|
| `Excel.BaseListener<T>` | 抽象基类，定义模板方法 |
| `EasyExcel` | Alibaba EasyExcel 解析 |
| `ImportFileRecords` | 导入记录表 |

**导入流程**:
```
Excel模板下载 → 数据上传 → MQ异步触发 → EasyExcel解析 → 数据校验 → 批量插入 → 错误文件生成
```

**关键注解**:
```java
@ExcelProperty(value = "列名")      // Excel列映射
@ExcelIgnore                         // 导入时忽略
converter = BooleanYesConverter.class  // 类型转换
```

### 39.2 导出架构

**分页导出**: 4000条/页，单仓最多100万条

**多Sheet**: 按仓库分Sheet，支持压缩包导出

### 39.3 设计模式

| 模式 | 应用 |
|------|------|
| 监听器模式 | 39个监听器(Listener) |
| 模板方法 | BaseListener定义导入骨架 |
| 批量处理 | BATCH_COUNT=100 |
| MQ异步 | ImportFileEventConsumer |
| Redis锁 | 防止并发导入冲突 |
| Seata事务 | 分布式一致性保证 |

---

## 40. 商品溯源与GAIA对接

### 40.1 溯源数据模型

**溯源明细表**: `t_item_traceability_detail`
- oriTraceNo (原始溯源码)
- operationType (INBOUND/OUTBOUND/INVENTORY_PROFIT等)
- batchCode/manufacturer/productionDate

**溯源汇总表**: `t_item_traceability_sum`
- 按oriTraceNo+manufacturer聚合
- initQty/nowQty/inboundQty/outboundQty

### 40.2 GAIA对接 (edi-service)

**核心接口**:
| 服务 | 方法 | 用途 |
|------|------|------|
| PushGaiaService | pushBindingBox() | 推送绑箱信息 |
| PushGaiaService | sendSortingTaskQuantityMsg() | 直发播种推送 |
| GaiaRelatedService | queryInventoryToGaia() | GAIA库存查询 |
| InboundCallbackBatchInfoService | 入库批次回传 | PO收货→GAIA |
| OutboundCallbackBatchInfoService | 出库批次回传 | SO发运→GAIA |

### 40.3 回传流程

**入库回传**:
```
收货完成 → MQ消息 → Job发送 → HTTP POST → GAIA
```

**出库回传**:
```
发运完成 → OutboundShipmentBatchInfo → Job发送 → HTTP POST → GAIA
```

### 40.4 溯源省内发运

**流程**: 出库单发运 → TracingOutboundInfo → Job → 溯源系统
- Apollo配置: appId/secretKey/URL
- MQ Topic: WMS_TRACEABILITY_ITEM_FROM_WMS_TOPIC


