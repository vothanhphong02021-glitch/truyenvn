const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, generateToken } = require('../middleware/auth');

// ===== ĐĂNG KÝ =====
// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Kiểm tra tồn tại
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Tên đăng nhập';
      return res.status(400).json({
        success: false,
        message: `${field} đã được sử dụng`
      });
    }

    // Tạo user mới
    const user = await User.create({
      username,
      email,
      password,
      role: role === 'author' ? 'author' : 'reader',
      avatar: username[0].toUpperCase()
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công!',
      token,
      user: {
        id:         user._id,
        username:   user.username,
        email:      user.email,
        role:       user.role,
        membership: user.membership,
        avatar:     user.avatar
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== ĐĂNG NHẬP =====
// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu'
      });
    }

    // Tìm user, lấy cả password
    const user = await User.findOne({
      $or: [{ email }, { username: email }]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Kiểm tra password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user: {
        id:               user._id,
        username:         user.username,
        email:            user.email,
        role:             user.role,
        membership:       user.membership,
        avatar:           user.avatar,
        bio:              user.bio,
        coins:            user.coins,
        bookmarks:        user.bookmarks,
        purchasedStories: user.purchasedStories
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== LẤY THÔNG TIN BẢN THÂN =====
// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('bookmarks', 'title cover author rating')
      .populate('purchasedStories', 'title cover author');

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== CẬP NHẬT HỒ SƠ =====
// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { username, bio, password } = req.body;
    const update = {};

    if (username) update.username = username;
    if (bio !== undefined) update.bio = bio;

    // Đổi mật khẩu
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu phải ít nhất 6 ký tự'
        });
      }
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      update,
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: 'Cập nhật thành công!', user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== BOOKMARK =====
// POST /api/auth/bookmark/:storyId
router.post('/bookmark/:storyId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const storyId = req.params.storyId;
    const index = user.bookmarks.indexOf(storyId);

    let message;
    if (index === -1) {
      user.bookmarks.push(storyId);
      message = 'Đã lưu vào danh sách đọc';
    } else {
      user.bookmarks.splice(index, 1);
      message = 'Đã xóa khỏi danh sách đọc';
    }

    await user.save();
    res.json({ success: true, message, bookmarks: user.bookmarks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== NÂNG CẤP HỘI VIÊN =====
// POST /api/auth/upgrade
router.post('/upgrade', protect, async (req, res) => {
  try {
    const { plan } = req.body; // 'premium' hoặc 'vip'

    if (!['premium', 'vip'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'Gói không hợp lệ' });
    }

    // Tính ngày hết hạn (30 ngày)
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { membership: plan, membershipExpiry: expiry },
      { new: true }
    );

    res.json({
      success: true,
      message: `Nâng cấp ${plan.toUpperCase()} thành công!`,
      user
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
