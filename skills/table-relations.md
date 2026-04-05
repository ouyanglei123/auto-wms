---
name: table-relations
description: WMS 核心数据库表关系图谱 - 6服务477张表的外键关联、查询路径和跨服务共享模式
version: 1.0.0
author: auto-wms
tags: [wms, database, table, relation, entity, sql]
---

# WMS 核心数据库表关系图谱

> 本文档映射WMS系统核心数据库表之间的关系，覆盖6个微服务的477张表，是SQL排查和数据溯源的速查手册。

---

## 1. 基础数据层（basicdata 主数据表）

```
w_warehouse (仓库主表)
  ├── w_zone (库区)           FK: warehouseId
  ├── w_work_area (工作区)    FK: warehouseId
  ├── w_warm_layer (温层)     FK: warehouseId
  ├── w_bill_type (单据类型)   FK: warehouseId
  ├── w_carriers (承运商)     FK: warehouseId
  ├── w_customer_collection (客户集合) FK: warehouseId
  ├── w_location_load (库位用途) FK: warehouseId
  ├── w_batch_rule (批次规则)  FK: warehouseId
  └── w_roadway (巷道)        FK: warehouseId, zoneId, workAreaId

w_location (库位主表)
  FK: warehouseId, zoneId, areaId(→w_work_area), tunnelId(→w_tunnel/roadway),
      locationClassifyId(→w_location_classify), loadId(→w_location_load)

w_item_master (商品主表)
  FK: warehouseId
  └── w_item_unit (商品单位)   FK: itemId → w_item_master

w_customers (客户)
  FK: warehouseId
  └── w_customer_collection_config → w_customer_collection_relation

w_company (公司/货主)
w_vendor (供应商)
```

---

## 2. 入库流程链（inbound + storage）

```
w_inbound_master (入库订单主表)
  FK: billId→w_bill_type, customerId→w_customers, companyId→w_company
  │
  ├── w_inbound_detail (入库明细)
  │     FK: inboundId→w_inbound_master, itemId→w_item_master,
  │         unitId→w_item_unit, actualUnitId→w_item_unit
  │
  ├── w_rcpt_task (收货任务)
  │     FK: inboundId→w_inbound_master, warehouseId→w_warehouse,
  │         tempId→w_warm_layer, companyId→w_company
  │     │
  │     ├── w_rcpt_task_detail (收货任务明细)
  │     │     FK: rcptTaskId→w_rcpt_task, itemId→w_item_master
  │     │
  │     └── w_rcpt_task_relation (收货任务关联)
  │           FK: rcptTaskId, rcptTaskDetailId
  │
  ├── w_putaway_master (上架主表)
  │     FK: warehouseId→w_warehouse
  │     │
  │     └── w_putaway_detail (上架明细)
  │           FK: putawayId→w_putaway_master, receiptId→w_rcpt_task,
  │               fromLocation→w_location, toLocation→w_location,
  │               itemId→w_item_master, unitId→w_item_unit
  │
  ├── w_quality_inspection_task (质检任务)
  │     └── w_quality_inspection_task_detail (质检明细)
  │
  ├── w_quality_inspection_record (质检记录)
  │
  ├── w_inbound_allocation_loading (入库装车单)
  │     └── w_inbound_allocation_loading_detail
  │
  └── w_agv_move_task (AGV任务)
        FK: warehouseId→w_warehouse
```

---

## 3. 出库流程链（outbound）

```
w_outbound_master (出库订单主表)
  FK: companyId→w_company, customerId→w_customers, vendorId→w_vendor,
      billId→w_bill_type, loadId→w_loading_master, identifiedId→w_identified_task
  │
  ├── w_outbound_detail (出库明细)
  │     └── w_outbound_detail_expand (出库明细扩展)
  │
  ├── w_wave_master (波次主表)
  │     FK: collectionId→w_customer_collection
  │     │
  │     ├── w_wave_detail (波次明细)
  │     │     FK: waveId→w_wave_master, outboundMasterId→w_outbound_master
  │     │
  │     └── w_auto_wave_task (自动波次配置)
  │
  ├── w_pick_task_general (提总拣货任务)
  ├── w_pick_task_fruit (摘果拣货任务)
  ├── w_beef_pick_weigh_data (牛肉称重数据)
  │
  ├── w_pick_record (拣货记录)
  │     FK: outboundId, waveId, taskId, locationId→w_location, itemId→w_item_master
  │
  ├── w_sort_task (分拣任务)
  │     FK: outboundId, waveId
  │
  ├── w_pack_box_master (装箱主表)
  │     └── w_pack_box_record (装箱记录)
  │
  ├── w_consolidation_master (集货主表)
  │
  ├── w_review (复核记录)
  │     FK: itemId→w_item_master, unitId→w_item_unit
  │
  ├── w_allocation_loading (装车单)
  │     FK: warehouseId→w_warehouse, carrierId→w_carriers
  │     │
  │     ├── w_allocation_loading_detail (装车明细)
  │     │     FK: allocationLoadingId→w_allocation_loading,
  │     │         itemCodeId→w_item_master, baseUnitId→w_item_unit
  │     │
  │     └── w_allocation_loading_tms (TMS调度关联)
  │
  ├── w_cross_detail (越库明细)
  │     └── w_cross_detail_record (越库记录)
  │
  ├── w_abnormal_position_master (异常位主表)
  │     └── w_abnormal_position_detail
  │
  └── w_loading_master (装车主表)
        FK: carriersId→w_carriers
```

---

## 4. 库存核心（storage）

```
w_stored_item (库存主表) ★核心★
  FK: warehouseId→w_warehouse, locationId→w_location, companyId→w_company,
      itemId→w_item_master, basicUnitId→w_item_unit, batchId→w_batch_attributes,
      identifiedId→w_identified_task
  │
  ├── w_batch_attributes (批次属性)
  │     FK: warehouseId, itemId→w_item_master, vendorId→w_vendor,
  │         damageStorageId→w_damage_storage_manage, customerId→w_customers
  │     │
  │     ├── w_batch_attributes_record (批次变更记录)
  │     │     FK: warehouseId, itemId, vendorId
  │     │
  │     └── w_move_batch_attributes (移位批次关联)
  │           FK: moveRecordId→w_move_record, batchId→w_batch_attributes
  │
  ├── w_stored_freeze_log (冻结日志)
  │     FK: locationId, itemId, companyId
  │
  ├── w_stored_snapshot (库存快照)
  │     FK: locationId, itemId, batchId
  │
  ├── w_damage_storage_manage (损耗管理)
  │     FK: warehouseId, itemId
  │     ├── w_damage_storage_manage_detail FK: damageStorageManageId, storedId
  │     ├── w_damage_storage_job FK: storedId
  │     │     └── w_damage_storage_record FK: damageStorageJobId
  │     └── w_damage_storage_status (损耗状态刷新Job)
  │
  ├── w_item_outbound_warning (效期预警)
  │     FK: itemId
  │
  ├── w_add_batch_info (批次新增信息)
  │     FK: warehouseId, itemId
  │     ├── w_add_batch_info_detail FK: batchInfoId, itemId
  │     └── w_add_batch_info_lock FK: batchInfoId
  │
  └── w_month_snapshot (月度快照)
        FK: warehouseId

w_location_touch (动碰记录)
  FK: locationId→w_location
```

---

## 5. 库内作业（inside）

```
w_move_master (移位主表)
  FK: warehouseId, originalCompanyId→w_company, targetCompanyId→w_company,
      workAreaId→w_work_area, tempId→w_warm_layer, itemId→w_item_master, zoneId→w_zone
  │
  ├── w_move_detail (移位明细)
  │     FK: moveId→w_move_master, originalLocationId→w_location,
  │         targetLocationId→w_location, itemId→w_item_master, baseUnitId→w_item_unit
  │
  ├── w_move_record (移位记录)
  │     FK: moveId→w_move_master, moveDetailId→w_move_detail,
  │         batchId→w_batch_attributes, unitId→w_item_unit
  │
  └── w_move_storage_relation (移位库存关联)
        FK: moveId→w_move_master, storedId→w_stored_item

w_count_master (盘点主表)
  FK: warehouseId, zoneId, workAreaId
  │
  ├── w_count_detail (盘点明细)
  │     FK: countId→w_count_master, locationId→w_location,
  │         itemId→w_item_master, baseUnitId→w_item_unit
  │
  ├── w_count_location (盘点库位)
  │     FK: countId, locationId→w_location
  │
  ├── w_count_location_lock (盘点库位锁)
  │     FK: countId, locationId→w_location
  │
  ├── w_count_storage_relation (盘点库存关联)
  │     FK: countId, storedId→w_stored_item, locationId→w_location
  │
  └── w_count_profit_loss (盘点盈亏)
        FK: countId, countDetailId→w_count_detail

w_replenish_master (补货主表)
  FK: warehouseId, zoneId, workAreaId, itemId→w_item_master, baseUnitId→w_item_unit
  │
  ├── w_replenish_detail (补货明细)
  │     FK: replenishId→w_replenish_master, fromLocation→w_location,
  │         toLocation→w_location, storedId→w_stored_item
  │
  ├── w_replenish_record (补货记录)
  │     FK: replenishId→w_replenish_master, replenishDetailId→w_replenish_detail
  │
  └── w_outbound_replenish_relation (补货-出库关联)
        FK: outboundId→w_outbound_master, replenishId→w_replenish_master

w_blocked_item (冻结记录)
  FK: warehouseId, locationId→w_location, itemId→w_item_master, batchId→w_batch_attributes

w_safety_stored (安全库存)
  FK: itemId→w_item_master, skuLocationId→w_location, basicUnitId→w_item_unit

w_identified_task (点检任务)
  FK: warehouseId
  └── w_identified_record (点检记录)
        FK: taskId→w_identified_task

w_transfer_master (物权转移主表)
  └── w_item_transfer_detail (物权转移明细)
        FK: transferMasterId→w_transfer_master
```

---

## 6. EDI集成层（edi）

```
w_inf_exp_post (接口收发记录)
  ├── w_inf_exp_post_history (收发历史)
  └── FK: warehouseId

w_outbound_batch_post_record (出库批次回传记录)
w_inbound_callback_batch_info (入库回传批次信息)
w_inbound_conc_rej_post (入库让步/拒收)

w_supplier_sale (供应商直发)
  └── w_supplier_sale_item FK: supplierSaleId

w_collect_wms_tms_relation (WMS-TMS关联)
w_box_delivery_record (箱发运记录)
w_trans_inf_exp_post (转移收发)

w_gaia_check_inv (GAIA库存盘点)
w_apollo_config (Apollo配置记录)

w_item_traceability_detail (溯源明细)
w_item_traceability_sum (溯源汇总)
```

---

## 7. 跨服务共享表模式

### 7.1 共享实体模式

多个服务对同一物理表拥有独立的Entity类（只读引用），通过Feign调用或共享数据库实现数据访问：

| 物理表 | 拥有Entity的服务 | 说明 |
|--------|----------------|------|
| w_stored_item | storage(主), outbound, inside, edi | storage拥有写权限，其他只读 |
| w_batch_attributes | storage(主), inbound, inside, outbound, edi | 同上 |
| w_location | basicdata(主), inside, storage, edi | basicdata管理CRUD |
| w_item_master | basicdata(主), 所有其他服务 | basicdata管理CRUD |
| w_item_unit | basicdata(主), 所有其他服务 | basicdata管理CRUD |
| w_warehouse | basicdata(主), 所有其他服务 | basicdata管理CRUD |
| w_move_record | inside(主), storage | inside创建，storage也引用 |
| w_outbound_master | outbound(主), edi, inside | outbound管理，edi/inside引用 |
| w_inbound_master | inbound(主), edi, basicdata | inbound管理，edi/basicdata引用 |

### 7.2 Master-Detail 模式汇总

| Master表 | Detail表 | 服务 |
|----------|---------|------|
| w_outbound_master | w_outbound_detail → w_outbound_detail_expand | outbound |
| w_wave_master | w_wave_detail | outbound |
| w_allocation_loading | w_allocation_loading_detail | outbound |
| w_inbound_master | w_inbound_detail | inbound |
| w_rcpt_task | w_rcpt_task_detail | inbound |
| w_putaway_master | w_putaway_detail | inbound/storage |
| w_move_master | w_move_detail → w_move_record | inside |
| w_count_master | w_count_detail | inside |
| w_replenish_master | w_replenish_detail → w_replenish_record | inside |
| w_damage_storage_manage | w_damage_storage_manage_detail | storage |
| w_supplier_sale | w_supplier_sale_item | edi |
| w_transfer_master | w_item_transfer_detail | edi/inside |

---

## 8. 关键查询路径速查

### 8.1 库存查询

```sql
-- 查某商品的可用库存
SELECT si.*, ba.vendor_code, l.location_code, l.location_type
FROM w_stored_item si
JOIN w_batch_attributes ba ON si.batch_id = ba.id
JOIN w_location l ON si.location_id = l.id
WHERE si.item_id = #{itemId}
  AND si.warehouse_id = #{warehouseId}
  AND si.status = 'AVAILABLE'
  AND si.freeze_sign = FALSE
  AND si.is_deleted = FALSE
```

### 8.2 出库全链路追溯

```sql
-- 出库单 → 波次 → 分配 → 拣货 → 发运
SELECT om.order_number, wm.wave_code, al.loading_number
FROM w_outbound_master om
LEFT JOIN w_wave_detail wd ON wd.outbound_master_id = om.id
LEFT JOIN w_wave_master wm ON wm.id = wd.wave_id
LEFT JOIN w_allocation_loading_detail ald ON ald.outbound_id = om.id
LEFT JOIN w_allocation_loading al ON al.id = ald.allocation_loading_id
WHERE om.order_number = #{orderNumber}
```

### 8.3 移位全链路追溯

```sql
-- 移位单 → 明细 → 记录 → 库存变动
SELECT mm.move_code, md.original_location_id, md.target_location_id,
       mr.move_qty, mr.unit_code, si.basic_qty
FROM w_move_master mm
JOIN w_move_detail md ON md.move_id = mm.id
JOIN w_move_record mr ON mr.move_id = mm.id AND mr.move_detail_id = md.id
LEFT JOIN w_stored_item si ON si.location_id = md.target_location_id
WHERE mm.move_code = #{moveCode}
```

### 8.4 盘点全链路追溯

```sql
-- 盘点单 → 库位 → 明细 → 盈亏
SELECT cm.count_code, cl.location_id, cd.item_id, cpl.profit_loss_qty
FROM w_count_master cm
JOIN w_count_location cl ON cl.count_id = cm.id
LEFT JOIN w_count_detail cd ON cd.count_id = cm.id AND cd.location_id = cl.location_id
LEFT JOIN w_count_profit_loss cpl ON cpl.count_id = cm.id AND cpl.count_detail_id = cd.id
WHERE cm.count_code = #{countCode}
```

### 8.5 补货关联出库

```sql
-- 补货单 → 关联出库单
SELECT rm.replenish_code, om.order_number
FROM w_replenish_master rm
JOIN w_outbound_replenish_relation orr ON orr.replenish_id = rm.id
JOIN w_outbound_master om ON om.id = orr.outbound_id
WHERE rm.replenish_code = #{replenishCode}
```

---

## 9. 位置层级关系

```
w_warehouse (仓库)
  └── w_zone (库区: 常温/冷藏/冷冻)
       └── w_work_area (工作区)
            └── w_roadway (巷道)
                 └── w_location (库位)
                      属性:
                      ├── location_classify (分类: 储位/拣货位/暂存位)
                      ├── location_load (用途: 良品/次品/待检)
                      ├── location_type (类型: GOOD_LOCATION等)
                      └── empty_flag (空库位标记)
```
