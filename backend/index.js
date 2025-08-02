
const express = require('express');
const cors = require('cors');
const ttkRoutes = require('./routes/ttk');

const app = express();
const port = 3001;

app.use(cors());
app.use((req, res, next) => {
  console.log(`请求方法: ${req.method}，请求路径: ${req.path}`);
  next();
});

app.use(express.json());


app.use('/api/ttk', ttkRoutes);

app.listen(port, () => {
  console.log(`✅ 后端服务已启动: http://localhost:${port}`);
});
