const mongoose = require('mongoose');

const ChapterSchema = new mongoose.Schema({
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: true
  },
  number: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: [true, 'Vui lòng nhập tên chương'],
    trim: true,
    maxlength: [200, 'Tên chương tối đa 200 ký tự']
  },
  content: {
    type: String,
    required: [true, 'Vui lòng nhập nội dung chương']
  },
  type: {
    type: String,
    enum: ['free', 'paid'],
    default: 'free'
  },
  wordCount: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Tự tính wordCount trước khi lưu
ChapterSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.wordCount = this.content
      .replace(/<[^>]*>/g, '') // Xóa HTML tags
      .split(/\s+/)
      .filter(w => w.length > 0).length;
  }
  next();
});

// Index để query nhanh
ChapterSchema.index({ storyId: 1, number: 1 });

module.exports = mongoose.model('Chapter', ChapterSchema);
