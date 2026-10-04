const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Phục vụ frontend
app.use(express.static('C:\\Truyenvn\\frontend'));

// Routes API
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/stories',  require('./routes/stories'));
app.use('/api/chapters', require('./routes/chapters'));
app.use('/api/comments', require('./routes/comments'));

// Tất cả route khác → trả về index.html
app.get('*', (req, res) => {
  res.sendFile('C:\\Truyenvn\\frontend\\index.html');
});

// Xử lý lỗi
app.use((err, req, res, next) => {
  res.status(500).json({ success: false, message: err.message });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Đã kết nối MongoDB Atlas'))
  .catch(err => console.error('❌ Lỗi:', err.message));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});
