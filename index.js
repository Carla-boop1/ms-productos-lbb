const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const swaggerUi = require('swagger-ui-express');

// Inicialización de Firebase Admin
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json());

// Especificación OpenAPI 3.0 para Swagger UI
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Microservicio de Productos y Categorías API',
    version: '1.0.0',
    description: 'Endpoints CRUD para gestión del catálogo de productos, stock y categorías de La BatiTienda.'
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Producto: {
        type: 'object',
        required: ['id', 'codigo', 'nombre', 'categoria', 'precio', 'stock'],
        properties: {
          id: { type: 'integer', example: 1 },
          codigo: { type: 'string', example: 'FG001' },
          nombre: { type: 'string', example: 'Figura Batman' },
          descripcion: { type: 'string', example: 'Figura coleccionable articulada' },
          categoria: { type: 'string', example: 'Figuras' },
          marca: { type: 'string', example: 'DC Direct' },
          modelo: { type: 'string', example: ' Arkham Edition' },
          precio: { type: 'integer', example: 24990 },
          stock: { type: 'integer', example: 10 },
          imagen: { type: 'string', example: 'https://via.placeholder.com/300' }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        tags: ['Estado'],
        summary: 'Verificar estado del microservicio',
        responses: { 200: { description: 'Servicio operativo' } }
      }
    },
    '/api/productos': {
      get: {
        tags: ['Productos'],
        summary: 'Obtener catálogo de productos con filtros opcionales',
        parameters: [
          { name: 'busqueda', in: 'query', schema: { type: 'string' }, description: 'Filtrar por nombre' },
          { name: 'categoria', in: 'query', schema: { type: 'string' }, description: 'Filtrar por categoría' },
          { name: 'minPrecio', in: 'query', schema: { type: 'number' }, description: 'Precio mínimo' },
          { name: 'maxPrecio', in: 'query', schema: { type: 'number' }, description: 'Precio máximo' },
          { name: 'orden', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] }, description: 'Orden por precio' }
        ],
        responses: { 200: { description: 'Lista de productos' } }
      },
      post: {
        tags: ['Productos'],
        summary: 'Crear un nuevo producto (Requiere rol admin u owner)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Producto' } } }
        },
        responses: {
          201: { description: 'Producto creado exitosamente' },
          400: { description: 'Datos obligatorios faltantes' },
          401: { description: 'Token no proporcionado' },
          403: { description: 'Sin permisos de administrador' }
        }
      }
    },
    '/api/productos/categorias': {
      get: {
        tags: ['Productos'],
        summary: 'Listar nombres de categorías presentes en los productos',
        responses: { 200: { description: 'Arreglo de categorías únicas' } }
      }
    },
    '/api/productos/codigo/{codigo}': {
      get: {
        tags: ['Productos'],
        summary: 'Obtener producto por su código único',
        parameters: [{ name: 'codigo', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Producto encontrado' },
          404: { description: 'Producto no encontrado' }
        }
      }
    },
    '/api/productos/{id}': {
      get: {
        tags: ['Productos'],
        summary: 'Obtener producto por su ID numérico',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Producto encontrado' },
          404: { description: 'Producto no encontrado' }
        }
      },
      put: {
        tags: ['Productos'],
        summary: 'Actualizar datos de un producto (Requiere rol admin u owner)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Producto' } } }
        },
        responses: {
          200: { description: 'Producto actualizado' },
          400: { description: 'Datos inválidos' },
          401: { description: 'Token no proporcionado' },
          403: { description: 'Sin permisos de administrador' }
        }
      },
      delete: {
        tags: ['Productos'],
        summary: 'Eliminar un producto por ID (Requiere rol admin u owner)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Producto eliminado correctamente' },
          401: { description: 'Token no proporcionado' },
          403: { description: 'Sin permisos de administrador' }
        }
      }
    },
    '/api/productos/{id}/stock': {
      patch: {
        tags: ['Productos'],
        summary: 'Actualizar únicamente el stock de un producto (Requiere rol admin u owner)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['stock'],
                properties: { stock: { type: 'integer', example: 15 } }
              }
            }
          }
        },
        responses: {
          200: { description: 'Stock actualizado' },
          400: { description: 'Stock inválido' },
          401: { description: 'Token no proporcionado' },
          403: { description: 'Sin permisos de administrador' }
        }
      }
    },
    '/api/categorias': {
      get: {
        tags: ['Categorías'],
        summary: 'Obtener configuración completa de categorías de la tienda',
        responses: { 200: { description: 'Mapa de categorías y sus códigos asociados' } }
      },
      put: {
        tags: ['Categorías'],
        summary: 'Actualizar configuración global de categorías (Requiere rol admin u owner)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } }
        },
        responses: {
          200: { description: 'Categorías actualizadas correctamente' },
          401: { description: 'Token no proporcionado' },
          403: { description: 'Sin permisos de administrador' }
        }
      }
    }
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (_req, res) => {
  res.json({ ok: true, servicio: 'ms-productos' });
});

// Middleware de autenticación JWT y carga de rol desde Firestore
const verificarToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token válido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userSnap = await db.collection('usuarios').doc(decodedToken.uid).get();
    const rol = userSnap.exists ? (userSnap.data().rol || 'cliente') : 'cliente';

    req.usuario = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      rol
    };
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
};

// Middleware de autorización por rol (Admin u Owner)
const verificarAdmin = (req, res, next) => {
  if (!['admin', 'owner'].includes(req.usuario?.rol)) {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
  }
  next();
};

// Obtener todos los productos con filtros opcionales
app.get('/api/productos', async (req, res) => {
  try {
    const { busqueda, categoria, minPrecio, maxPrecio, orden } = req.query;
    const snapshot = await db.collection('productos').get();
    let productos = [];

    snapshot.forEach(doc => {
      productos.push(doc.data());
    });

    productos.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));

    if (busqueda && busqueda.trim() !== '') {
      const texto = busqueda.trim().toLowerCase();
      productos = productos.filter(p => (p.nombre || '').toLowerCase().includes(texto));
    }
    if (categoria && categoria.trim() !== '' && categoria.toLowerCase() !== 'todos') {
      productos = productos.filter(p => p.categoria === categoria.trim());
    }
    if (minPrecio !== undefined && minPrecio !== '') {
      productos = productos.filter(p => Number(p.precio) >= Number(minPrecio));
    }
    if (maxPrecio !== undefined && maxPrecio !== '') {
      productos = productos.filter(p => Number(p.precio) <= Number(maxPrecio));
    }
    if (orden === 'asc') {
      productos.sort((a, b) => Number(a.precio) - Number(b.precio));
    } else if (orden === 'desc') {
      productos.sort((a, b) => Number(b.precio) - Number(a.precio));
    }

    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el catálogo de productos.' });
  }
});

// Listar nombres de categorías únicas presentes en los productos
app.get('/api/productos/categorias', async (_req, res) => {
  try {
    const snapshot = await db.collection('productos').get();
    const categorias = new Set();
    snapshot.forEach(doc => {
      const cat = doc.data().categoria;
      if (cat) categorias.add(cat);
    });
    res.json([...categorias].sort());
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener categorías.' });
  }
});

// Obtener un producto por su código
app.get('/api/productos/codigo/:codigo', async (req, res) => {
  try {
    const snapshot = await db.collection('productos')
      .where('codigo', '==', req.params.codigo)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }
    res.json(snapshot.docs[0].data());
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar el producto por código.' });
  }
});

// Obtener un producto por su ID numérico
app.get('/api/productos/:id', async (req, res) => {
  try {
    const docSnap = await db.collection('productos').doc(String(req.params.id)).get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }
    res.json(docSnap.data());
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el producto.' });
  }
});

// Crear un nuevo producto
app.post('/api/productos', verificarToken, verificarAdmin, async (req, res) => {
  const datos = req.body || {};
  const pId = parseInt(datos.id);
  const pCod = datos.codigo?.trim();
  const pNom = datos.nombre?.trim();

  if (isNaN(pId) || !pCod || !pNom) {
    return res.status(400).json({ error: 'Faltan datos obligatorios (id, codigo, nombre).' });
  }

  const objFinal = {
    ...datos,
    id: pId,
    codigo: pCod,
    nombre: pNom,
    precio: parseInt(datos.precio) || 0,
    stock: parseInt(datos.stock) || 0
  };

  try {
    await db.collection('productos').doc(pId.toString()).set(objFinal);
    res.status(201).json(objFinal);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el producto.' });
  }
});

// Actualizar un producto existente
app.put('/api/productos/:idOriginal', verificarToken, verificarAdmin, async (req, res) => {
  const { idOriginal } = req.params;
  const datos = req.body || {};
  const pId = parseInt(datos.id ?? idOriginal);
  const pCod = datos.codigo?.trim();
  const pNom = datos.nombre?.trim();

  if (isNaN(pId) || !pCod || !pNom) {
    return res.status(400).json({ error: 'Faltan datos obligatorios (id, codigo, nombre).' });
  }

  const objFinal = {
    ...datos,
    id: pId,
    codigo: pCod,
    nombre: pNom,
    precio: parseInt(datos.precio) || 0,
    stock: parseInt(datos.stock) || 0
  };

  try {
    const nuevoDocRef = db.collection('productos').doc(pId.toString());

    if (idOriginal.toString() !== pId.toString()) {
      const batch = db.batch();
      batch.delete(db.collection('productos').doc(idOriginal.toString()));
      batch.set(nuevoDocRef, objFinal);
      await batch.commit();
    } else {
      await nuevoDocRef.update(objFinal);
    }

    res.json(objFinal);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el producto.' });
  }
});

// Actualizar solo el stock de un producto
app.patch('/api/productos/:id/stock', verificarToken, verificarAdmin, async (req, res) => {
  const { id } = req.params;
  const nuevoStock = parseInt(req.body?.stock ?? req.query?.stock);

  if (isNaN(nuevoStock) || nuevoStock < 0) {
    return res.status(400).json({ error: 'El stock debe ser un número mayor o igual a 0.' });
  }

  try {
    const docRef = db.collection('productos').doc(id.toString());
    await docRef.update({ stock: nuevoStock });
    res.json({ id: parseInt(id), stock: nuevoStock });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el stock.' });
  }
});

// Eliminar un producto
app.delete('/api/productos/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    await db.collection('productos').doc(req.params.id.toString()).delete();
    res.json({ mensaje: 'Producto eliminado correctamente.', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el producto.' });
  }
});

// Obtener configuración de categorías
app.get('/api/categorias', async (_req, res) => {
  try {
    const docCat = await db.collection('configuracion').doc('categorias').get();
    res.json(docCat.exists ? docCat.data() : {});
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la configuración de categorías.' });
  }
});

// Guardar configuración global de categorías
app.put('/api/categorias', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const categorias = req.body || {};
    await db.collection('configuracion').doc('categorias').set(categorias);
    res.json({ mensaje: 'Categorías actualizadas correctamente.', categorias });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar las categorías.' });
  }
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Microservicio de Productos corriendo en el puerto ${PORT}`);
});
