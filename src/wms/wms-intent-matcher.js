/**
 * WMS Intent Matcher (WMS 意图匹配器)
 *
 * 功能：
 * - 解析用户需求文本
 * - 匹配 WMS 关键词（6个服务各20-40个关键词）
 * - 确定目标微服务和业务域
 * - 输出结构化的代码定位
 */

/**
 * 置信度阈值配置
 */
const CONFIDENCE_THRESHOLD = 60;

/**
 * 同义词词典（扩展关键词匹配能力）
 */
const SYNONYMS = {
  出库订单: ['出库单', '出库', 'SO', 'sales_order'],
  入库订单: ['入库单', '入库', 'PO', 'purchase_order'],
  波次: ['建波', '创建波次', 'wave'],
  分配: ['库位分配', '分配库位', 'allocation'],
  拣货: ['挑拣', 'pick'],
  收货: ['接收', 'receive'],
  上架: ['上架', 'putaway', '放置'],
  质检: ['质量检查', '检查', 'quality'],
  移位: ['移动', '转移', 'move'],
  盘点: ['count', 'inventory'],
  冻结: ['锁定', 'block', 'freeze'],
  库存: ['stock', 'inventory', '仓储']
};

/**
 * 服务关键词配置（从 commands/wms/wms.md 提取）
 */
const SERVICE_KEYWORDS = {
  outbound: {
    keywords: [
      '出库',
      '出库订单',
      '出库单',
      '出库明细',
      '波次',
      '建波',
      '自动波次',
      '分配',
      '库位分配',
      '提总拣货',
      '摘果拣货',
      '牛肉拣货',
      'RF拣货',
      '分拣',
      'RF分拣',
      '装箱',
      '集货',
      '复核',
      '发运',
      '装车',
      '越库',
      '异常位',
      '供应商直发',
      '差异确认',
      '快速出库'
    ],
    priority: 80,
    businessDomains: {
      出库订单: {
        controllers: ['OutboundMasterController'],
        services: ['OutboundMasterServiceImpl'],
        entities: ['OutboundMaster']
      },
      波次: {
        controllers: ['WaveController'],
        services: ['WaveServiceImpl', 'CreateWaveServiceImpl'],
        entities: ['WaveMaster', 'WaveDetail']
      },
      分配: {
        controllers: ['WaveAutoAllocationController'],
        services: ['WaveAllocationServiceImpl', 'WaveAutoAllocationServiceImpl'],
        entities: ['AllocationLoading']
      },
      提总拣货: {
        controllers: ['PickTaskGeneralController'],
        services: ['PickTaskGeneralServiceImpl'],
        entities: ['PickTaskGeneral']
      },
      摘果拣货: {
        controllers: ['PickTaskFruitController'],
        services: ['PickTaskFruitServiceImpl'],
        entities: ['PickTaskFruit']
      },
      RF拣货: {
        controllers: ['RfPickController'],
        services: ['RfPickServiceImpl', 'RfPickCommitServiceImpl'],
        entities: ['RfPick']
      },
      分拣: {
        controllers: ['SortTaskController'],
        services: ['SortTaskServiceImpl', 'SortRecordServiceImpl'],
        entities: ['SortTask']
      },
      装箱: {
        controllers: ['PackBoxRecordController'],
        services: ['PackBoxMasterServiceImpl'],
        entities: ['PackBoxRecord']
      },
      集货: {
        controllers: ['PcConsolidationController'],
        services: ['ConsolidationMasterServiceImpl'],
        entities: ['ConsolidationMaster']
      },
      复核: {
        controllers: ['ReviewRecordController'],
        services: ['ReviewRecordServiceImpl'],
        entities: ['ReviewRecord']
      },
      发运: {
        controllers: ['DeliveryController'],
        services: ['DeliveryServiceImpl', 'DeliveryCommitServiceImpl'],
        entities: ['Delivery']
      }
    }
  },
  inbound: {
    keywords: [
      '入库',
      '入库订单',
      '入库单',
      '创建入库单',
      '收货',
      'RF收货',
      'PC收货',
      '收货任务',
      '盲收',
      '退货收货',
      '一车多单',
      '预约',
      '上架',
      'AGV上架',
      '质检',
      '质检任务',
      '磅差',
      '让步',
      '装卸费',
      'EDI入库',
      '直发'
    ],
    priority: 80,
    businessDomains: {
      入库订单: {
        controllers: ['InboundMasterController'],
        services: ['InboundMasterServiceImpl'],
        entities: ['InboundMaster']
      },
      创建入库单: {
        controllers: ['InboundCreateController'],
        services: ['InboundCreateServiceImpl'],
        entities: ['InboundCreate']
      },
      收货: {
        controllers: ['InboundReceiveController'],
        services: ['InboundReceiveServiceImpl'],
        entities: ['InboundReceive']
      },
      PC收货: {
        controllers: ['InboundReceivedForPcController'],
        services: ['InboundReceiveForPcServiceImpl'],
        entities: ['InboundReceivedForPc']
      },
      盲收: {
        controllers: ['BlindReceiveController'],
        services: ['BlindReceiveServiceImpl'],
        entities: ['BlindReceive']
      },
      预约: {
        controllers: ['ParkAppointController'],
        services: ['ParkAppointServiceImpl'],
        entities: ['ParkAppoint']
      },
      上架: {
        controllers: ['PutawayController'],
        services: ['PutawayServiceImpl'],
        entities: ['Putaway']
      },
      AGV上架: {
        controllers: ['AgvApiController'],
        services: ['AgvApiServiceImpl'],
        entities: ['AgvTask']
      },
      质检: {
        controllers: ['QualityInspectionController'],
        services: ['QualityInspectionRecordServiceImpl'],
        entities: ['QualityInspection']
      }
    }
  },
  basicdata: {
    keywords: [
      '仓库',
      '库位',
      '库区',
      '商品',
      '商品主数据',
      '商品单位',
      '客户',
      '客户集',
      '供应商',
      '公司',
      '批次规则',
      '编码',
      '编码规则',
      'AGV点',
      'AGV区域',
      '容器',
      '温层',
      '字典',
      '波次配置',
      '月台',
      '工作台'
    ],
    priority: 75,
    businessDomains: {
      仓库: {
        controllers: ['WarehouseController'],
        services: ['WarehouseServiceImpl'],
        entities: ['Warehouse']
      },
      库位: {
        controllers: ['LocationController'],
        services: ['LocationServiceImpl'],
        entities: ['Location']
      },
      库区: { controllers: ['ZoneController'], services: ['ZoneServiceImpl'], entities: ['Zone'] },
      商品: {
        controllers: ['ItemMasterController'],
        services: ['ItemMasterServiceImpl'],
        entities: ['ItemMaster']
      },
      客户: {
        controllers: ['CustomersController'],
        services: ['CustomersServiceImpl'],
        entities: ['Customers']
      },
      供应商: {
        controllers: ['VendorController'],
        services: ['VendorServiceImpl'],
        entities: ['Vendor']
      },
      字典: { controllers: ['DictController'], services: ['DictServiceImpl'], entities: ['Dict'] },
      月台: { controllers: ['DockController'], services: ['DockServiceImpl'], entities: ['Dock'] }
    }
  },
  inside: {
    keywords: [
      '移位',
      '呆滞移位',
      '同批次移位',
      '高低层移位',
      '过期移位',
      '新零售移位',
      '物权转移',
      '盘点',
      '盘点盈亏',
      'RF盘点',
      '补货',
      '建议补货',
      '补货优先级',
      '冻结',
      '解冻',
      '点检',
      '低频抽检',
      '月度计划'
    ],
    priority: 75,
    businessDomains: {
      移位: {
        controllers: ['MoveMasterController'],
        services: ['MoveMasterServiceImpl'],
        entities: ['MoveMaster']
      },
      呆滞移位: {
        controllers: ['SluggishMoveController'],
        services: ['SluggishMoveServiceImpl'],
        entities: ['SluggishMove']
      },
      盘点: {
        controllers: ['CountMasterController'],
        services: ['CountMasterServiceImpl', 'CountExecutorServiceImpl'],
        entities: ['CountMaster']
      },
      补货: {
        controllers: ['ReplenishMasterController'],
        services: ['ReplenishMasterServiceImpl'],
        entities: ['ReplenishMaster']
      },
      冻结: {
        controllers: ['BlockedItemController'],
        services: ['BlockedItemServiceImpl'],
        entities: ['BlockedItem']
      },
      解冻: {
        controllers: ['UnBlockedItemController'],
        services: ['UnBlockedItemServiceImpl'],
        entities: ['UnBlockedItem']
      }
    }
  },
  storage: {
    keywords: [
      '库存',
      '库存查询',
      '库存新接口',
      '批次属性',
      '批次变更审批',
      '库存冻结',
      '效期预警',
      '临期审批',
      '库位触碰',
      '损耗',
      '库存快照',
      '库存日志',
      'GAIA库存同步',
      'MES对接',
      '导入库存'
    ],
    priority: 80,
    businessDomains: {
      库存: {
        controllers: ['StoredItemController'],
        services: ['StoredItemServiceImpl'],
        entities: ['StoredItem']
      },
      库存新接口: {
        controllers: ['StoredItemNewController'],
        services: ['StoredItemNewServiceImpl'],
        entities: ['StoredItemNew']
      },
      批次属性: {
        controllers: ['BatchAttributesController'],
        services: ['BatchAttributesServiceImpl'],
        entities: ['BatchAttributes']
      },
      库存冻结: {
        controllers: ['StoredFreezeLogController'],
        services: ['StoredFreezeLogServiceImpl'],
        entities: ['StoredFreezeLog']
      },
      效期预警: {
        controllers: ['ItemOutboundWarningController'],
        services: ['ItemOutboundWarningServiceImpl'],
        entities: ['ItemOutboundWarning']
      }
    }
  },
  edi: {
    keywords: [
      'GAIA对接',
      '推送GAIA',
      '出库回传',
      '入库回传',
      'TMS对接',
      'SRM对接',
      'MES对接',
      '千蜜',
      '差异确认',
      '数据备份',
      '分拣推送',
      '轨迹溯源',
      '质检对接',
      '定时任务'
    ],
    priority: 85,
    businessDomains: {
      GAIA对接: {
        controllers: ['GaiaRelatedController'],
        services: ['GaiaRelatedServiceImpl'],
        entities: ['GaiaRelated']
      },
      推送GAIA: {
        controllers: ['PushGaiaController'],
        services: ['PushGaiaServiceImpl'],
        entities: ['PushGaia']
      },
      TMS对接: {
        controllers: ['CdcTmsToWmsController'],
        services: ['TmsToWmsServiceImpl'],
        entities: ['TmsToWms']
      },
      轨迹溯源: {
        controllers: ['TraceSourceController'],
        services: ['TraceSourceServiceImpl'],
        entities: ['TraceSource']
      }
    }
  }
};

/**
 * WMS Intent Matcher Class
 */
export class WmsIntentMatcher {
  constructor(options = {}) {
    this.serviceKeywords = SERVICE_KEYWORDS;
    this.confidenceThreshold = options.confidenceThreshold ?? CONFIDENCE_THRESHOLD;
    this.fuzzyMatchThreshold = options.fuzzyMatchThreshold ?? 0.8;
  }

  /**
   * 分析用户意图
   * @param {string} userIntent - 用户需求文本
   * @returns {Object} WMS 意图分析结果
   */
  analyze(userIntent, preprocessed = {}) {
    if (!userIntent || typeof userIntent !== 'string') {
      return { isWmsRelated: false, confidence: 0 };
    }

    const safePreprocessed = preprocessed && typeof preprocessed === 'object' ? preprocessed : {};
    const lowerIntent = safePreprocessed.lowerIntent ?? userIntent.toLowerCase();
    const tokens =
      Array.isArray(safePreprocessed.tokens) && safePreprocessed.tokens.length > 0
        ? safePreprocessed.tokens
        : this._tokenize(lowerIntent);

    const expandedTokens = safePreprocessed.expandedTokens ?? this._expandSynonyms(tokens);

    const exactMatches = this._matchServiceKeywords(expandedTokens, { allowFuzzy: false });
    if (exactMatches.length > 0) {
      const best = exactMatches[0];
      const domainMatch = this._matchBusinessDomain(expandedTokens, best.service);
      const codeLocations = this._extractCodeLocations(best.service, domainMatch.domain);
      const confidence = this._computeConfidence(best, domainMatch);

      return {
        isWmsRelated: true,
        targetService: best.service,
        matchedKeywords: best.matchedKeywords,
        businessDomain: domainMatch.domain,
        codeLocations,
        confidence
      };
    }

    const serviceMatches = this._matchServiceKeywords(expandedTokens, { allowFuzzy: true });
    if (serviceMatches.length === 0) {
      return { isWmsRelated: false, confidence: 0 };
    }

    const best = serviceMatches[0];
    const domainMatch = this._matchBusinessDomain(expandedTokens, best.service);
    const codeLocations = this._extractCodeLocations(best.service, domainMatch.domain);
    const confidence = this._computeConfidence(best, domainMatch);

    if (confidence < this.confidenceThreshold) {
      return {
        isWmsRelated: false,
        confidence,
        reason: `置信度 ${confidence}% < 阈值 ${this.confidenceThreshold}%`
      };
    }

    return {
      isWmsRelated: true,
      targetService: best.service,
      matchedKeywords: best.matchedKeywords,
      businessDomain: domainMatch.domain,
      codeLocations,
      confidence
    };
  }

  /**
   * 同义词扩展
   * @param {string[]} tokens - 分词结果
   * @returns {string[]} 扩展后的分词
   */
  _expandSynonyms(tokens) {
    const expanded = new Set(tokens);

    for (const token of tokens) {
      for (const [base, synonyms] of Object.entries(SYNONYMS)) {
        if (synonyms.includes(token) || token.includes(base)) {
          synonyms.forEach((s) => expanded.add(s));
          expanded.add(base);
        }
      }
    }

    return Array.from(expanded);
  }

  /**
   * 分词处理
   */
  _tokenize(text) {
    return text.split(/[\s,，。.、；;()（）]+/).filter((t) => t.length > 0);
  }

  /**
   * 服务级别关键词匹配（精确 + 模糊）
   */
  _matchServiceKeywords(tokens, options = {}) {
    const { allowFuzzy = true } = options;
    const exactMatches = [];

    for (const [service, config] of Object.entries(this.serviceKeywords)) {
      const matched = [];

      for (const kw of config.keywords) {
        if (tokens.some((t) => t.includes(kw) || kw.includes(t))) {
          matched.push(kw);
        }
      }

      if (matched.length > 0) {
        exactMatches.push({
          service,
          matchedKeywords: matched,
          fuzzyKeywords: [],
          score: matched.length * 10 + config.priority
        });
      }
    }

    if (exactMatches.length > 0 || !allowFuzzy) {
      return exactMatches.sort((a, b) => b.score - a.score);
    }

    const matches = [];

    for (const [service, config] of Object.entries(this.serviceKeywords)) {
      const fuzzyMatched = [];

      for (const kw of config.keywords) {
        let bestMatch = null;

        for (const token of tokens) {
          const score = this._fuzzyMatch(token, kw);
          if (score >= this.fuzzyMatchThreshold) {
            bestMatch = { token, score };
            break;
          }
        }

        if (bestMatch) {
          fuzzyMatched.push({ keyword: kw, matched: bestMatch.token, score: bestMatch.score });
        }
      }

      if (fuzzyMatched.length > 0) {
        matches.push({
          service,
          matchedKeywords: [],
          fuzzyKeywords: fuzzyMatched.map((f) => f.keyword),
          score: config.priority + fuzzyMatched.length * 5
        });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * 模糊匹配（编辑距离算法）
   * @param {string} s1 - 字符串1
   * @param {string} s2 - 字符串2
   * @returns {number} 相似度分数 0-1
   */
  _fuzzyMatch(s1, s2) {
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1;

    const len1 = s1.length;
    const len2 = s2.length;
    const maxLen = Math.max(len1, len2);

    if (maxLen === 0) return 1;

    // 早期退出：长度差异太大
    if (Math.abs(len1 - len2) > maxLen * 0.3) return 0;

    // 包含关系
    if (s1.includes(s2) || s2.includes(s1)) {
      return 0.8 + (Math.min(len1, len2) / maxLen) * 0.2;
    }

    // 编辑距离
    const distance = this._levenshteinDistance(s1, s2);
    return 1 - distance / maxLen;
  }

  /**
   * Levenshtein 编辑距离
   */
  _levenshteinDistance(s1, s2) {
    const dp = Array(s1.length + 1)
      .fill(null)
      .map(() => Array(s2.length + 1).fill(0));

    for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
    for (let j = 0; j <= s2.length; j++) dp[0][j] = j;

    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[s1.length][s2.length];
  }

  /**
   * 业务域匹配
   */
  _matchBusinessDomain(tokens, service) {
    const config = this.serviceKeywords[service];
    const domains = config.businessDomains || {};

    let bestDomain = '通用';
    let bestMatched = [];

    for (const [domainName] of Object.entries(domains)) {
      const domainTokens = domainName.split(/[\s,，。.、；;]+/);
      const matched = domainTokens.filter((dt) =>
        tokens.some((t) => t.includes(dt) || dt.includes(t))
      );

      if (matched.length > bestMatched.length) {
        bestMatched = matched;
        bestDomain = domainName;
      }
    }

    return {
      domain: bestDomain,
      matchedKeywords: bestMatched
    };
  }

  /**
   * 提取代码定位
   */
  _extractCodeLocations(service, domain) {
    const config = this.serviceKeywords[service];
    const domains = config.businessDomains || {};

    if (domains[domain]) {
      return domains[domain];
    }

    // 返回服务级别的通用定位
    return {
      controllers: [],
      services: [],
      entities: []
    };
  }

  /**
   * 计算置信度
   */
  _computeConfidence(serviceMatch, domainMatch) {
    // 关键词匹配数占比 60%
    const keywordScore = Math.min(serviceMatch.matchedKeywords.length / 3, 1) * 60;

    // 服务明确性占比 20%
    const serviceScore = serviceMatch.score > 50 ? 20 : 10;

    // 业务域明确性占比 20%
    const domainScore =
      domainMatch.matchedKeywords.length >= 2
        ? 20
        : domainMatch.matchedKeywords.length >= 1
          ? 10
          : 0;

    return Math.round(keywordScore + serviceScore + domainScore);
  }
}

export default WmsIntentMatcher;
