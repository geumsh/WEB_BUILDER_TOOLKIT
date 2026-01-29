/**
 * Sample Dashboard - Mock API Server
 *
 * Endpoints:
 * - GET /api/user       : User info (MASTER)
 * - GET /api/menu       : Navigation menu (MASTER)
 * - GET /api/stats      : Statistics cards (PAGE)
 * - GET /api/sales      : Sales table (PAGE)
 * - GET /api/trend      : Trend chart (PAGE)
 *
 * Port: 4003
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 4005;

app.use(cors());
app.use(express.json());

// ======================
// MASTER ENDPOINTS
// ======================

/**
 * GET /api/user
 * Header component - User information
 */
app.get('/api/user', (req, res) => {
    res.json({
        success: true,
        data: {
            id: 'user-001',
            name: 'John Doe',
            email: 'john.doe@example.com',
            role: 'Administrator',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John'
        }
    });
});

/**
 * GET /api/menu
 * Sidebar component - Navigation menu
 */
app.get('/api/menu', (req, res) => {
    res.json({
        success: true,
        items: [
            { id: 'dashboard', label: 'Dashboard', icon: 'home', active: true },
            { id: 'analytics', label: 'Analytics', icon: 'chart', active: false },
            { id: 'reports', label: 'Reports', icon: 'document', active: false },
            { id: 'settings', label: 'Settings', icon: 'gear', active: false }
        ]
    });
});

// ======================
// PAGE ENDPOINTS
// ======================

/**
 * GET /api/stats
 * StatsCards component - Statistics data
 */
app.get('/api/stats', (req, res) => {
    const baseRevenue = 125000;
    const baseOrders = 1420;
    const baseCustomers = 890;
    const baseConversion = 3.2;

    res.json({
        success: true,
        data: {
            revenue: {
                value: baseRevenue + Math.floor(Math.random() * 5000),
                change: +(Math.random() * 10 - 2).toFixed(1),
                unit: '$'
            },
            orders: {
                value: baseOrders + Math.floor(Math.random() * 50),
                change: +(Math.random() * 8 - 1).toFixed(1),
                unit: ''
            },
            customers: {
                value: baseCustomers + Math.floor(Math.random() * 30),
                change: +(Math.random() * 6).toFixed(1),
                unit: ''
            },
            conversion: {
                value: +(baseConversion + Math.random() * 0.5).toFixed(1),
                change: +(Math.random() * 2 - 0.5).toFixed(1),
                unit: '%'
            }
        },
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /api/sales
 * DataTable component - Sales data
 * Query: category (all, electronics, clothing, food)
 */
app.get('/api/sales', (req, res) => {
    const { category = 'all' } = req.query;

    const allSales = [
        { id: 1, product: 'Laptop Pro 15', category: 'electronics', quantity: 5, price: 1299, total: 6495, date: '2024-01-15' },
        { id: 2, product: 'Wireless Mouse', category: 'electronics', quantity: 25, price: 49, total: 1225, date: '2024-01-15' },
        { id: 3, product: 'Winter Jacket', category: 'clothing', quantity: 12, price: 189, total: 2268, date: '2024-01-14' },
        { id: 4, product: 'Running Shoes', category: 'clothing', quantity: 8, price: 129, total: 1032, date: '2024-01-14' },
        { id: 5, product: 'Organic Coffee', category: 'food', quantity: 50, price: 24, total: 1200, date: '2024-01-13' },
        { id: 6, product: 'Green Tea Set', category: 'food', quantity: 30, price: 35, total: 1050, date: '2024-01-13' },
        { id: 7, product: 'USB-C Hub', category: 'electronics', quantity: 15, price: 79, total: 1185, date: '2024-01-12' },
        { id: 8, product: 'Denim Jeans', category: 'clothing', quantity: 20, price: 89, total: 1780, date: '2024-01-12' },
        { id: 9, product: 'Protein Bars', category: 'food', quantity: 100, price: 3, total: 300, date: '2024-01-11' },
        { id: 10, product: 'Mechanical Keyboard', category: 'electronics', quantity: 7, price: 159, total: 1113, date: '2024-01-11' }
    ];

    const filteredSales = category === 'all'
        ? allSales
        : allSales.filter(sale => sale.category === category);

    res.json({
        success: true,
        data: filteredSales,
        meta: {
            total: filteredSales.length,
            category: category
        }
    });
});

/**
 * GET /api/trend
 * TrendChart component - Trend data
 * Query: period (24h, 7d, 30d)
 */
app.get('/api/trend', (req, res) => {
    const { period = '7d' } = req.query;

    let labels = [];
    let dataPoints = 0;

    switch (period) {
        case '24h':
            labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'];
            dataPoints = 7;
            break;
        case '7d':
            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            dataPoints = 7;
            break;
        case '30d':
            labels = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
            dataPoints = 30;
            break;
        default:
            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            dataPoints = 7;
    }

    const generateTrendData = (base, variance) =>
        Array.from({ length: dataPoints }, () =>
            Math.floor(base + (Math.random() - 0.5) * variance)
        );

    res.json({
        success: true,
        data: {
            labels: labels,
            Revenue: generateTrendData(5000, 2000),
            Orders: generateTrendData(150, 50)
        },
        meta: {
            period: period
        }
    });
});

// ======================
// SERVER START
// ======================

app.listen(PORT, () => {
    console.log(`
===============================================
  Sample Dashboard - Mock API Server
===============================================
  Server running at: http://localhost:${PORT}
-----------------------------------------------
  MASTER Endpoints:
    GET /api/user    - User information
    GET /api/menu    - Navigation menu
-----------------------------------------------
  PAGE Endpoints:
    GET /api/stats   - Statistics cards
    GET /api/sales   - Sales table (?category=all)
    GET /api/trend   - Trend chart (?period=7d)
===============================================
    `);
});
