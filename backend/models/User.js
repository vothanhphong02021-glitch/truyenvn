const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Vui lòng nhập tên đăng nhập'],
    unique: true,
    trim: true,
    minlength: [3, 'Tên đăng nhập tối thiểu 3 ký tự'],
    maxlength: [30, 'Tên đăng nhập tối đa 30 ký tự']
  },
  email: {
    type: String,
    required: [true, 'Vui lòng nhập email'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ']
  },
  password: {
    type: String,
    required: [true, 'Vui lòng nhập mật khẩu'],
    minlength: [6, 'Mật khẩu tối thiểu 6 ký tự'],
    select: false // Không trả về password khi query
  },
  role: {
    type: String,
    enum: ['reader', 'author', 'admin'],
    default: 'reader'
  },
  membership: {
    type: String,
    enum: ['free', 'premium', 'vip'],
    default: 'free'
  },
  membershipExpiry: {
    type: Date,
    default: null
  },
  avatar: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: [500, 'Giới thiệu tối đa 500 ký tự'],
    default: ''
  },
  coins: {
    type: Number,
    default: 0
  },
  bookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story'
  }],
  purchasedStories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story'
  }],
  readingHistory: [{
    story:   { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
    chapter: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
    readAt:  { type: Date, default: Date.now }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Tự động thêm createdAt, updatedAt
});

// ===== HASH MẬT KHẨU TRƯỚC KHI LƯU =====
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ===== SO SÁNH MẬT KHẨU =====
UserSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ===== KIỂM TRA HỘI VIÊN CÒN HẠN KHÔNG =====
UserSchema.methods.isPremium = function() {
  if (this.membership === 'free') return false;
  if (!this.membershipExpiry) return true;
  return new Date() < this.membershipExpiry;
};

module.exports = mongoose.model('User', UserSchema);
