const express = require('express');
const productoRoutes = require('./routes/productoRoutes');
const app = express();

app.use(express.json());
app.use('/api/productos', productoRoutes);

module.exports = app;