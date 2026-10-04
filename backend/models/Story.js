const mongoose = require('mongoose');

const StorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Vui lòng nhập tên truyện'],
    trim: true,
    maxlength: [200, 'Tên truyện tối đa 200 ký tự']
  },
  author: {
    type: String,
    required: [true, 'Vui lòng nhập bút danh'],
    trim: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cover: {
    type: String,
    default: '📖' // Emoji hoặc URL ảnh
  },
  genres: [{
    type: String,
    enum: [
      'Tiên hiệp','Huyền huyễn','Ngôn tình','Đô thị',
      'Cổ đại','Kiếm hiệp','Hành động','Dị giới',
      'Nữ cường','Y thuật','Sủng văn','Hài hước',
      'Dị năng','Võ hiệp','Lịch sử','Trinh thám',
      'Kinh dị','Khoa học viễn tưởng'
    ]
  }],
  description: {
    type: String,
    required: [true, 'Vui lòng nhập mô tả truyện'],
    maxlength: [2000, 'Mô tả tối đa 2000 ký tự']
  },
  status: {
    type: String,
    enum: ['Đang ra', 'Hoàn thành', 'Tạm dừng'],
    default: 'Đang ra'
  },
  type: {
    type: String,
    enum: ['free', 'paid'],
    default: 'free'
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },

  // Thống kê
  views:       { type: Number, default: 0 },
  chapterCount:{ type: Number, default: 0 },
  wordCount:   { type: Number, default: 0 },

  // Đánh giá
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count:   { type: Number, default: 0 },
    total:   { type: Number, default: 0 }
  },

  // Flags
  isFeatured: { type: Boolean, default: false },
  isHot:      { type: Boolean, default: false },
  isApproved: { type: Boolean, default: true }, // Admin duyệt

  tags: [String],

  lastChapterAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// ===== INDEX để tìm kiếm nhanh =====
StorySchema.index({ title: 'text', author: 'text', description: 'text' });
StorySchema.index({ genres: 1 });
StorySchema.index({ views: -1 });
StorySchema.index({ 'rating.average': -1 });
StorySchema.index({ createdAt: -1 });

// ===== TÍNH RATING TRUNG BÌNH =====
StorySchema.methods.updateRating = async function(newScore) {
  this.rating.total += newScore;
  this.rating.count += 1;
  this.rating.average = +(this.rating.total / this.rating.count).toFixed(1);
  await this.save();
};

module.exports = mongoose.model('Story', StorySchema);
