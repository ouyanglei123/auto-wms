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

## 13. 数据量级

| 服务 | Controller | ServiceImpl | Entity | Feign | MQ | Job | Enum |
|------|-----------|-------------|--------|-------|-----|-----|------|
| outbound | 121 | 170 | 113 | 10 | 17 | 14 | 1+7 |
| inbound | 56 | 111 | 69 | 13 | 19 | 5 | 89+3 |
| basicdata | 173 | 127 | 137 | 13 | 7 | 5 | 92+12 |
| inside | 45 | 68 | 62 | 10 | 14 | 14 | 98+8 |
| storage | 29 | 50 | 58 | 10 | 12 | 13 | 58+6 |
| edi | 24 | 55 | 38 | 20 | 14 | 1(HTTP) | 2 |
| **合计** | **448** | **581** | **477** | **76** | **83** | **52** | **368** |
