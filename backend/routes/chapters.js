const express = require('express');
const router = express.Router();
const Chapter = require('../models/Chapter');
const Story = require('../models/Story');
const { protect } = require('../middleware/auth');

// ===== LẤY DANH SÁCH CHƯƠNG CỦA TRUYỆN =====
// GET /api/chapters/:storyId
router.get('/:storyId', async (req, res) => {
  try {
    const chapters = await Chapter.find({
      storyId: req.params.storyId,
      isPublished: true
    })
    .sort({ number: 1 })
    .select('number title type wordCount views createdAt');

    res.json({ success: true, chapters });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== ĐỌC NỘI DUNG CHƯƠNG =====
// GET /api/chapters/:storyId/:chapterNumber
router.get('/:storyId/:chapterNumber', async (req, res) => {
  try {
    const chapter = await Chapter.findOne({
      storyId: req.params.storyId,
      number: parseInt(req.params.chapterNumber),
      isPublished: true
    });

    if (!chapter) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chương' });
    }

    // Kiểm tra quyền đọc chương trả phí
    if (chapter.type === 'paid') {
      const story = await Story.findById(req.params.storyId);

      if (story && story.type === 'paid') {
        // Cần đăng nhập
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Vui lòng đăng nhập để đọc chương này',
            requireLogin: true
          });
        }

        // Kiểm tra đã mua hoặc có hội viên
        const hasPurchased = req.user.purchasedStories?.includes(story._id.toString());
        const isPremium = req.user.isPremium();

        if (!hasPurchased && !isPremium) {
          return res.status(403).json({
            success: false,
            message: 'Bạn cần mua truyện hoặc nâng cấp VIP để đọc chương này',
            requirePurchase: true
          });
        }
      }
    }

    // Tăng lượt đọc chương
    chapter.views += 1;
    await chapter.save();

    // Lấy chương trước và sau
    const [prevChapter, nextChapter] = await Promise.all([
      Chapter.findOne({ storyId: req.params.storyId, number: chapter.number - 1 })
             .select('number title'),
      Chapter.findOne({ storyId: req.params.storyId, number: chapter.number + 1 })
             .select('number title')
    ]);

    res.json({
      success: true,
      chapter,
      prevChapter,
      nextChapter
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== ĐĂNG CHƯƠNG MỚI =====
// POST /api/chapters/:storyId
router.post('/:storyId', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId);

    if (!story) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy truyện' });
    }

    // Chỉ tác giả hoặc admin
    if (story.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền đăng chương' });
    }

    const { title, content, type } = req.body;

    // Lấy số chương tiếp theo
    const lastChapter = await Chapter.findOne({ storyId: story._id })
      .sort({ number: -1 });
    const nextNumber = lastChapter ? lastChapter.number + 1 : 1;

    const chapter = await Chapter.create({
      storyId: story._id,
      number: nextNumber,
      title,
      content,
      type: type || 'free'
    });

    // Cập nhật thống kê truyện
    story.chapterCount += 1;
    story.wordCount += chapter.wordCount;
    story.lastChapterAt = new Date();
    await story.save();

    res.status(201).json({
      success: true,
      message: `Đã đăng Chương ${nextNumber}: ${title}`,
      chapter
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== SỬA CHƯƠNG =====
// PUT /api/chapters/:storyId/:chapterNumber
router.put('/:storyId/:chapterNumber', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId);
    if (!story) return res.status(404).json({ success: false, message: 'Không tìm thấy truyện' });

    if (story.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền' });
    }

    const chapter = await Chapter.findOneAndUpdate(
      { storyId: req.params.storyId, number: req.params.chapterNumber },
      { title: req.body.title, content: req.body.content, type: req.body.type },
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: 'Đã cập nhật chương!', chapter });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
