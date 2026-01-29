/*
 * Page - loaded
 * ECO (Energy & Cooling Operations) Dashboard
 *
 * Responsibilities:
 * - 데이터셋 정의 (pageDataMappings)
 * - Param 관리 (pageParams)
 * - GlobalDataPublisher로 데이터 발행
 * - 구독자(컴포넌트)에게 데이터 전파
 *
 * Asset API v1:
 * - assetList: POST /api/v1/ast/l (자산 전체 목록)
 * - relationList: POST /api/v1/rel/l (관계 전체 목록)
 */

const { each } = fx;

const BASE_URL = '10.23.128.125:4004';

// ======================
// DATA MAPPINGS (Asset API v1)
// ======================

this.pageDataMappings = [
    {
        topic: 'assetList',
        datasetInfo: {
            datasetName: 'assetList',
            param: { baseUrl: BASE_URL }
        },
        refreshInterval: null  // 수동 갱신만
    },
    {
        topic: 'relationList',
        datasetInfo: {
            datasetName: 'relationList',
            param: {
                baseUrl: BASE_URL,
                relationType: 'LOCATED_IN'  // 트리 구조용 위치 관계만
            }
        },
        refreshInterval: null  // 트리 구조 빌드용
    }
];

// ======================
// PARAM MANAGEMENT
// ======================

this.pageParams = {};

// 매핑 등록 + 초기 파라미터 설정 + 초기 데이터 발행
fx.go(
    this.pageDataMappings,
    each(GlobalDataPublisher.registerMapping),
    each(({ topic }) => this.pageParams[topic] = {}),
    each(({ topic }) =>
        GlobalDataPublisher.fetchAndPublish(topic, this)
            .catch(err => console.error(`[fetchAndPublish:${topic}]`, err))
    )
);

// ======================
// EVENT HANDLERS
// 모든 이벤트 핸들러는 before_load.js에서 onEventBusHandlers로 등록됨
// ======================

// ======================
// INTERVAL MANAGEMENT (필요 시 활성화)
// ======================

this.startAllIntervals = () => {
    this.pageIntervals = {};

    fx.go(
        this.pageDataMappings,
        each(({ topic, refreshInterval }) => {
            if (refreshInterval) {
                this.pageIntervals[topic] = setInterval(() => {
                    GlobalDataPublisher.fetchAndPublish(
                        topic,
                        this,
                        this.pageParams[topic] || {}
                    ).catch(err => console.error(`[fetchAndPublish:${topic}]`, err));
                }, refreshInterval);
            }
        })
    );
};

this.stopAllIntervals = () => {
    fx.go(
        Object.values(this.pageIntervals || {}),
        each(interval => clearInterval(interval))
    );
};

// 현재는 수동 갱신만 사용하므로 interval 시작하지 않음
// this.startAllIntervals();

console.log('[Page] loaded - ECO Dashboard (Asset API v1) data mappings registered');
