const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Nội dung bình luận không được rỗng'],
    maxlength: [1000, 'Bình luận tối đa 1000 ký tự'],
    trim: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  parentId: {
    // Nếu là reply thì có parentId, không thì null
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  isHidden: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

CommentSchema.index({ storyId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', CommentSchema);
