const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Tạo thư mục uploads nếu chưa có
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Cấu hình multer lưu ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'cover_' + Date.now() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Tối đa 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    if (ok) cb(null, true);
    else cb(new Error('Chỉ chấp nhận ảnh JPG, PNG, WEBP'));
  }
});

// POST /api/upload/cover
router.post('/cover', upload.single('cover'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Chưa chọn ảnh' });
  }
  const url = '/uploads/' + req.file.filename;
  res.json({ success: true, url, message: 'Upload ảnh thành công!' });
});

module.exports = router;