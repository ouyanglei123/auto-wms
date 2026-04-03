---
name: wms-domain
description: WMS 仓储管理系统领域知识 - 6 大微服务(edi/outbound/inbound/basicdata/inside/storage)的架构、业务流程、数据模型和开发规范
version: 1.0.0
author: auto-wms
tags: [wms, warehouse, logistics, edi, outbound, inbound, basicdata, inside, storage, microservice, supply-chain]
---

# WMS 仓储管理系统领域知识

## 微服务拓扑

| 服务 | 路径 | 职责 |
|------|------|------|
| **edi** | `D:\ruanjian\shuhai\shsc-wms-edi-service` | 电子数据交换中间件，对接SAP/GAIA/SRM/MES/TMS等外部系统 |
| **outbound** | `D:\ruanjian\shuhai\shsc-wms-outbound-service` | 出库管理：订单→波次→分配→拣货→分拣→装箱→集货→复核→发运 |
| **inbound** | `D:\ruanjian\shuhai\shsc-wms-inbound-service` | 入库管理：订单→收货→质检→上架 |
| **basicdata** | `D:\ruanjian\shuhai\shsc-wms-basicdata-service` | 基础数据：仓库/库位/商品/客户/供应商/批次规则 |
| **inside** | `D:\ruanjian\shuhai\shsc-wms-inside-service` | 库内作业：移位/补货/盘点/物权转移/冻结解冻/点检 |
| **storage** | `D:\ruanjian\shuhai\shsc-wms-storage-service` | 库存核心引擎：库存CRUD/批次/事务/快照 |

## 服务间调用关系

```
edi → 全部5个WMS服务（中间件模式）
outbound → basicdata, storage, inside, edi, inbound
inbound → basicdata, outbound, edi, inside
inside → basicdata, storage, outbound, inbound, edi, efficiency, wpc, bigdata, wes
storage → basicdata + 外部系统(GAIA/MES/SRM等)
basicdata → 16个Feign客户端（最核心的基础设施）
```

## 核心业务流程

### 出库流程
```
SO创建 → 波次管理(手动/自动AutoCreateWaveJob每3分钟)
→ 库位分配(策略模式: Normal/DesignationBatch/SpecialBatch/SupplementBatch/Replenish/StorageGrab)
→ 拣货(提总/摘果/牛肉)
→ 分拣(语音/DPS/RF, 边拣边分/直发/CPFR)
→ 装箱 → 集货 → 复核 → 发运
```

出库状态流转: `NEW → WAVED → ALLOCATED → PICKING → TO_SORTING → SORTING → TO_SHIPPING → SHIPPING`
分支: `ABNORMAL / PARTIALLY_SHIPPED / DIFCANCELED / CANCELED`

### 入库流程
```
PO创建(EDI/自建) → 收货(RF:扫描PO→托盘→商品→日期→数量→确认, SB前缀)
→ 质检(可选, 一键通过/问题提报)
→ 上架(SC前缀, 推荐库位)
→ 库存更新
```

入库状态: `NEW → RECEIVING → RECEIVED → CLOSE / CANCELED`

### 库内作业
- **移位**: 多种类型(ZTT物权转移/PMTP同批次/PMDZ呆滞/PMGD高低层/PMLS拣货位整理/PME过期)
- **补货**: 自动/手动/建议补货, 优先级排序, 与出库波次联动
- **盘点**: DDD责任链模式(Create→Active→RF录入→Finish→盈亏处理), 支持PC/RF
- **物权转移**: 货主间库存转移, 支持回滚
- **冻结/解冻**: 商品级别库存冻结

### EDI数据流
```
外部系统(SAP/GAIA/SRM/MES/TMS/千蜜/奈雪/潮发)
  ↕ SOAP/XML 或 HTTP/REST 或 MQ
edi-service (42 Controllers, 37 Jobs, 16 MQ消费者)
  ↕ Feign
内部WMS服务
```

## 技术栈

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
| JasperReports | PDF报表打印 |
| OpenFeign + Hystrix | 服务间RPC调用 |

## 开发规范

### API风格
- PC端Controller: `/resourceName` 路径, RESTful
- RF端Controller: `/app/*` 路径, 面向手持终端
- API Controller: `/api/*` 供其他微服务Feign调用
- 分页统一使用 MyBatis-Plus IPage

### 编码约定
- 实体继承 `BaseEntity` / `VersionalEntity`（乐观锁revision字段）
- ID生成: `@TableId(type = IdType.INPUT)` + BasicDataClient.getCode()
- 软删除: `isDeleted` 字段
- 多租户: `tenantCode` 字段, TenantLineHandler SQL拦截
- 分布式锁: Redisson RLock, 超时900s, GlobalLockHelper封装
- 错误码: 按ID范围分区(基础500/收货1xx/上架2xx/订单3xx/质检4xx), 支持i18n
- 编码前缀: 入库单HL01, 收货任务SB, 上架单SC, AGV任务BY

### MQ约定
- Topic格式: `WMS_*_TOPIC`
- Tag格式: `WMS_*_TAG`
- Group格式: `WMS_*_GROUP`
- 事务消息: 继承 `AbstractRocketMQLocalTransactionListener`

## 关键数据量级

| 服务 | Java文件数 | Controllers | Services | Feign | MQ消费者 | Jobs |
|------|-----------|-------------|----------|-------|---------|------|
| outbound | 2845 | ~110 | ~130 | 10 | 17 | 14 |
| inbound | 1570 | ~57 | 78 | 13 | 9 | 2 |
| basicdata | 2016 | 177 | 53 | 16 | 5 | 5 |
| inside | - | 38 | ~70 | 9 | 9 | 14 |
| storage | - | 29 | 47 | 10 | 13 | 14 |
| edi | - | 42 | - | 15+ | 16 | 37 |
