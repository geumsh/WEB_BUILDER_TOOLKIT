/**
 * Simple3DStatus Mock Server
 *
 * 3D 장비 상태 API를 제공하는 Mock 서버
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 4006

app.use(cors());
app.use(express.json());

// ======================
// 장비 상태 목록
// ======================

const STATUS_TYPES = {
    NORMAL: 'normal',
    WARNING: 'warning',
    ERROR: 'error',
    OFFLINE: 'offline'
};

const STATUS_COLORS = {
    normal: '#4CAF50',   // Green
    warning: '#FF9800',  // Orange
    error: '#F44336',    // Red
    offline: '#9E9E9E'   // Gray
};

// Mock 장비 데이터
const equipments = [
    { id: 'eq-001', name: 'Server Rack A', meshName: 'Rack_A', status: STATUS_TYPES.NORMAL },
    { id: 'eq-002', name: 'Server Rack B', meshName: 'Rack_B', status: STATUS_TYPES.WARNING },
    { id: 'eq-003', name: 'Cooling Unit 1', meshName: 'Cooling_01', status: STATUS_TYPES.NORMAL },
    { id: 'eq-004', name: 'Cooling Unit 2', meshName: 'Cooling_02', status: STATUS_TYPES.ERROR },
    { id: 'eq-005', name: 'Power Unit', meshName: 'Power_Main', status: STATUS_TYPES.NORMAL },
    { id: 'eq-006', name: 'UPS System', meshName: 'UPS_01', status: STATUS_TYPES.OFFLINE }
];

// ======================
// API Endpoints
// ======================

/**
 * GET /api/user
 * 사용자 정보 (Master/Header)
 */
app.get('/api/user', (req, res) => {
    res.json({
        data: {
            id: 'user-001',
            name: 'Admin User',
            role: 'Administrator',
            avatar: null
        }
    });
});

/**
 * GET /api/menu
 * 네비게이션 메뉴 (Master/Sidebar)
 */
app.get('/api/menu', (req, res) => {
    res.json({
        data: [
            { id: 'menu-1', label: '3D Status', icon: 'view_in_ar', active: true },
            { id: 'menu-2', label: 'Equipment List', icon: 'list', active: false },
            { id: 'menu-3', label: 'Alerts', icon: 'warning', active: false },
            { id: 'menu-4', label: 'Settings', icon: 'settings', active: false }
        ]
    });
});

/**
 * GET /api/equipment/status
 * 전체 장비 상태 (Page/Equipment3D)
 */
app.get('/api/equipment/status', (req, res) => {
    // 상태를 랜덤하게 변경하여 시뮬레이션
    const data = equipments.map(eq => {
        const shouldChange = Math.random() < 0.2; // 20% 확률로 상태 변경
        let newStatus = eq.status;

        if (shouldChange) {
            const statuses = Object.values(STATUS_TYPES);
            newStatus = statuses[Math.floor(Math.random() * statuses.length)];
            eq.status = newStatus;
        }

        return {
            id: eq.id,
            name: eq.name,
            meshName: eq.meshName,
            status: eq.status,
            color: STATUS_COLORS[eq.status]
        };
    });

    res.json({
        data,
        meta: {
            total: data.length,
            timestamp: new Date().toISOString()
        }
    });
});

/**
 * GET /api/equipment/:id
 * 특정 장비 상세 정보
 */
app.get('/api/equipment/:id', (req, res) => {
    const equipment = equipments.find(eq => eq.id === req.params.id);

    if (!equipment) {
        return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json({
        data: {
            ...equipment,
            color: STATUS_COLORS[equipment.status],
            details: {
                temperature: Math.floor(Math.random() * 30) + 20,
                load: Math.floor(Math.random() * 100),
                uptime: `${Math.floor(Math.random() * 30)}d ${Math.floor(Math.random() * 24)}h`
            }
        }
    });
});

// ======================
// Server Start
// ======================

app.listen(PORT, () => {
    console.log(`Simple3DStatus Mock Server running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('  GET /api/user');
    console.log('  GET /api/menu');
    console.log('  GET /api/equipment/status');
    console.log('  GET /api/equipment/:id');
});
