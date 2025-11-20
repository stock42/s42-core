import { Server, RouteControllers, Controller, SQL } from '../../src'

// Initialize Database Connection
// Inicializar Conexión a Base de Datos
// We use PostgreSQL for this example. Ensure you have a running Postgres instance.
// Usamos PostgreSQL para este ejemplo. Asegúrate de tener una instancia de Postgres corriendo.
const db = new SQL({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/products_db'
});

// Define Product Interface
// Definir Interfaz de Producto
interface Product {
    id?: number;
    name: string;
    price: number;
    description?: string;
    stock: number;
}

// Initialize Database Schema
// Inicializar Esquema de Base de Datos
async function initDB() {
    console.info('Initializing database...');
    await db.createTable('products', {
        id: 'SERIAL PRIMARY KEY',
        name: 'TEXT NOT NULL',
        price: 'DECIMAL(10, 2) NOT NULL',
        description: 'TEXT',
        stock: 'INTEGER DEFAULT 0'
    });
    console.info('Database initialized.');
}

// Create Controllers
// Crear Controladores

// GET /products - List all products with pagination
// GET /products - Listar todos los productos con paginación
const getProducts = new Controller('GET', '/products', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await db.selectPaginate<Product>({
            tableName: 'products',
            page,
            limit,
            sort: { id: 1 }
        });

        return res.json({
            success: true,
            data: result.data,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total
            }
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// GET /products/:id - Get a single product
// GET /products/:id - Obtener un solo producto
const getProductById = new Controller('GET', '/products/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const products = await db.select<Product>({
            tableName: 'products',
            whereClause: { id },
        });

        if (!products || products.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        return res.json({ success: true, data: products[0] });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// POST /products - Create a new product
// POST /products - Crear un nuevo producto
const createProduct = new Controller('POST', '/products', async (req, res) => {
    try {
        const body = await req.json();
        const { name, price, description, stock } = body;

        if (!name || !price) {
            return res.status(400).json({ success: false, message: 'Name and price are required' });
        }

        const result = await db.insert('products', {
            name,
            price,
            description,
            stock: stock || 0
        });

        return res.status(201).json({
            success: true,
            message: 'Product created',
            id: result?.lastInsertRowId
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /products/:id - Update a product
// PUT /products/:id - Actualizar un producto
const updateProduct = new Controller('PUT', '/products/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const body = await req.json();

        const affectedRows = await db.updateById('products', id, body);

        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Product not found or no changes made' });
        }

        return res.json({ success: true, message: 'Product updated' });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /products/:id - Delete a product
// DELETE /products/:id - Eliminar un producto
const deleteProduct = new Controller('DELETE', '/products/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const affectedRows = await db.deleteById('products', id);

        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        return res.json({ success: true, message: 'Product deleted' });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Setup Server and Routes
// Configurar Servidor y Rutas
(async () => {
    // Initialize DB table
    await initDB();

    const server = new Server();

    // Group controllers
    const routes = new RouteControllers([
        getProducts,
        getProductById,
        createProduct,
        updateProduct,
        deleteProduct
    ]);

    // Start Server
    await server.start({
        port: 3000,
        RouteControllers: routes,
        development: true,
				idleTimeout: 255,
        // Add global hooks if needed
        hooks: [
            {
                method: '*',
                path: '*',
                when: 'before',
                handle: (req, res, next) => {
                    console.info(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
                    next(req, res);
                }
            }
        ]
    });

    console.info('🚀 Products API running on http://localhost:3000');
})();
