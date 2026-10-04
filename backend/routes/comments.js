const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const { protect } = require('../middleware/auth');

// ===== LẤY BÌNH LUẬN CỦA TRUYỆN =====
// GET /api/comments/:storyId
router.get('/:storyId', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const comments = await Comment.find({
      storyId: req.params.storyId,
      parentId: null,
      isHidden: false
    })
    .populate('userId', 'username avatar membership')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Comment.countDocuments({
      storyId: req.params.storyId,
      parentId: null,
      isHidden: false
    });

    res.json({ success: true, total, comments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== ĐĂNG BÌNH LUẬN =====
// POST /api/comments/:storyId
router.post('/:storyId', protect, async (req, res) => {
  try {
    const { content, parentId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Nội dung bình luận không được rỗng' });
    }

    const comment = await Comment.create({
      storyId:  req.params.storyId,
      userId:   req.user._id,
      content:  content.trim(),
      parentId: parentId || null
    });

    await comment.populate('userId', 'username avatar membership');

    res.status(201).json({
      success: true,
      message: 'Đã đăng bình luận!',
      comment
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== LIKE BÌNH LUẬN =====
// POST /api/comments/:commentId/like
router.post('/:commentId/like', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });

    const userId = req.user._id;
    const index = comment.likes.indexOf(userId);

    let message;
    if (index === -1) {
      comment.likes.push(userId);
      message = 'Đã thích bình luận';
    } else {
      comment.likes.splice(index, 1);
      message = 'Đã bỏ thích';
    }

    await comment.save();
    res.json({ success: true, message, likeCount: comment.likes.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== XÓA BÌNH LUẬN =====
// DELETE /api/comments/:commentId
router.delete('/:commentId', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });

    if (comment.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền xóa bình luận này' });
    }

    await comment.deleteOne();
    res.json({ success: true, message: 'Đã xóa bình luận' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
