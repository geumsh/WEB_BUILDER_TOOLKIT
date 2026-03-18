/*
 * DataPlatform Component - register
 * 데이터 플랫폼 DB 인스턴스 그리드 표시
 *
 * Subscribes to: TBD_dataPlatformData
 *
 * Expected Data Structure:
 * {
 *   TBD_instances: [
 *     { name: "CDB1 운영11", type: "oracle" },
 *     { name: "CDB2 운영12", type: "mariadb" },
 *     ...
 *   ]
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { each, go } = fx;

// ======================
// CONFIG
// ======================

const config = {
    instancesKey: 'TBD_instances',
    instanceFields: { name: 'name', type: 'type' },
    columnsPerRow: 6,
};

// ======================
// STATE
// ======================

this._instancesData = null;

// ======================
// BINDINGS
// ======================

this.renderData = renderData.bind(this, config);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    // TBD_dataPlatformData: ['renderData']
};

go(
    Object.entries(this.subscriptions),
    each(([topic, fnList]) =>
        each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);

// ======================
// MOCK DATA (개발 확인용 - 실제 연동 시 주석 처리)
// ======================

/* @mock-start */
this.renderData({
    response: {
        data: {
            TBD_instances: [
                { name: 'CDB1 운영11', type: 'oracle' },
                { name: 'CDB1 운영12', type: 'oracle' },
                { name: 'CDB1 운영13', type: 'oracle' },
                { name: 'CDB1 운영14', type: 'oracle' },
                { name: 'CDB1 운영15', type: 'mariadb' },
                { name: 'CDB1 운영16', type: 'oracle' },
                { name: 'CDB2 운영01', type: 'oracle' },
                { name: 'CDB2 운영02', type: 'postgresql' },
                { name: 'CDB2 운영03', type: 'postgresql' },
                { name: 'CDB2 운영04', type: 'oracle' },
                { name: 'CDB2 운영05', type: 'oracle' },
                { name: 'CDB2 운영06', type: 'clickhouse' },
                { name: 'CDB3 운영01', type: 'mariadb' },
                { name: 'CDB3 운영02', type: 'mariadb' },
                { name: 'CDB3 운영03', type: 'mariadb' },
                { name: 'CDB3 운영04', type: 'clickhouse' },
                { name: 'CDB3 운영05', type: 'clickhouse' },
                { name: 'CDB3 운영06', type: 'oracle' },
                { name: 'CDB4 운영01', type: 'clickhouse' },
                { name: 'CDB4 운영02', type: 'clickhouse' },
                { name: 'CDB4 운영03', type: 'clickhouse' },
                { name: 'CDB4 운영04', type: 'mariadb' },
                { name: 'CDB4 운영05', type: 'postgresql' },
                { name: 'CDB4 운영06', type: 'postgresql' },
                { name: 'CDB5 운영01', type: 'postgresql' },
                { name: 'CDB5 운영02', type: 'oracle' },
                { name: 'CDB5 운영03', type: 'mariadb' },
                { name: 'CDB5 운영04', type: 'oracle' },
                { name: 'CDB5 운영05', type: 'oracle' },
                { name: 'CDB5 운영06', type: 'mariadb' },
                { name: 'CDB6 운영01', type: 'clickhouse' },
                { name: 'CDB6 운영02', type: 'mariadb' },
                { name: 'CDB6 운영03', type: 'postgresql' },
                { name: 'CDB6 운영04', type: 'oracle' },
            ]
        }
    }
});
/* @mock-end */

// ======================
// RENDER FUNCTIONS
// ======================

function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    const instances = data[config.instancesKey];
    if (instances && Array.isArray(instances)) {
        this._instancesData = instances;
        renderGrid.call(this, config, instances);
    }
}

function renderGrid(config, instances) {
    const { instanceFields, columnsPerRow } = config;
    const gridEl = this.appendElement.querySelector('.data-platform-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    const rows = [];
    for (let i = 0; i < instances.length; i += columnsPerRow) {
        rows.push(instances.slice(i, i + columnsPerRow));
    }

    go(
        rows,
        each(rowData => {
            const rowEl = document.createElement('div');
            rowEl.className = 'data-platform-row';

            go(
                rowData,
                each(instance => {
                    const name = instance[instanceFields.name] || '';
                    const cellEl = createCell(name);
                    rowEl.appendChild(cellEl);
                })
            );

            gridEl.appendChild(rowEl);
        })
    );
}

function createCell(name) {
    const cell = document.createElement('div');
    cell.className = 'data-platform-cell';
    cell.innerHTML = `
        <div class="cell-title">
            <div class="cell-bullet"><img src="./assets/bullet.svg" alt=""></div>
            <div class="cell-text">${name}</div>
        </div>
        <div class="cell-symbol">
            <div class="symbol-body">
                <div class="symbol-stack">
                    <div class="symbol-item-bottom"><img src="./assets/item-dark.svg" alt=""></div>
                    <div class="symbol-item-middle"><img src="./assets/item-highlight.svg" alt=""></div>
                    <div class="symbol-item-top"><img src="./assets/item-dark.svg" alt=""></div>
                </div>
            </div>
            <div class="symbol-label"><img src="./assets/label.svg" alt=""></div>
        </div>
    `;
    return cell;
}
