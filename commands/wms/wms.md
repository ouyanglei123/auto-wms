---
description: WMS 微服务开发向导 - 智能路由到对应微服务，提供领域感知的代码生成和业务逻辑建议
---

# /auto:wms — WMS 微服务开发向导

> 基于 WMS 仓储管理系统领域知识，精准定位目标微服务，提供领域感知的开发辅助。

---

## 执行流程

### 1. 识别目标微服务

根据用户需求中的关键词，自动匹配微服务：

| 关键词示例 | 目标服务 |
|-----------|---------|
| 出库、波次、拣货、分拣、发运、复核、装箱、越库 | **outbound** |
| 入库、收货、上架、质检、盲收、退货收货 | **inbound** |
| 库位、库区、商品、客户、供应商、仓库、批次规则 | **basicdata** |
| 移位、盘点、补货、冻结、解冻、点检、物权转移 | **inside** |
| 库存、库存查询、批次属性、库存快照 | **storage** |
| SAP、GAIA、MES、TMS、SRM、EDI、回传、推送、对接 | **edi** |
| 多个服务/跨服务/架构/整体 | **全局分析** |

### 2. 加载领域知识

从 `skills/wms-domain.md` 加载 WMS 领域知识，获取：
- 目标微服务的完整包结构
- 相关 Controller / Service / Entity / Mapper
- 服务间调用关系（Feign）
- MQ 消费者和定时任务
- 枚举和常量

### 3. 定位代码位置

```
项目根路径: D:\ruanjian\shuhai\shsc-wms-{service}-service\src\main\java\com\shsc\wms\{service}\
```

按业务域定位文件：
- Controller: `biz/controller/`
- Service: `biz/service/impl/`
- Entity: `biz/entity/`
- Feign: `biz/feign/`
- Mapper: `biz/mapper/`
- MQ: `biz/mq/consumer/` 或 `biz/message/consumer/`

### 4. 生成解决方案

基于定位到的代码，提供：
1. **Bug修复**: 定位根因 → 给出精确修改方案
2. **新功能开发**: 遵循现有架构模式 → Controller + Service + Entity + Mapper
3. **架构分析**: 服务间调用链 → 数据流 → 状态流转

### 5. 输出规范

- 修改现有文件: 使用 Edit 工具，精确到行号
- 新建文件: 遵循项目已有命名规范和包结构
- 编码风格: ESM 导入、MyBatis-Plus 注解、Apollo 配置、分布式锁
- 测试: 遵循项目测试框架(Vitest/JUnit)
