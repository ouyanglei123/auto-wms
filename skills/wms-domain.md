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

## 7. 数据量级

| 服务 | Controller | ServiceImpl | Entity | Feign | MQ | Job | Enum |
|------|-----------|-------------|--------|-------|-----|-----|------|
| outbound | 121 | 170 | 113 | 10 | 17 | 14 | 1+7 |
| inbound | 56 | 111 | 69 | 13 | 19 | 5 | 89+3 |
| basicdata | 173 | 127 | 137 | 13 | 7 | 5 | 92+12 |
| inside | 45 | 68 | 62 | 10 | 14 | 14 | 98+8 |
| storage | 29 | 50 | 58 | 10 | 12 | 13 | 58+6 |
| edi | 24 | 55 | 38 | 20 | 14 | 1(HTTP) | 2 |
| **合计** | **448** | **581** | **477** | **76** | **83** | **52** | **368** |
