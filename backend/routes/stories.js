const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const Chapter = require('../models/Chapter');
const { protect, authorize } = require('../middleware/auth');

// ===== LẤY DANH SÁCH TRUYỆN =====
// GET /api/stories?genre=Tiên hiệp&sort=views&page=1&limit=20
router.get('/', async (req, res) => {
  try {
    const { genre, sort, search, type, status, page = 1, limit = 20 } = req.query;

    const query = { isApproved: true };

    // Lọc theo thể loại
    if (genre && genre !== 'all') query.genres = genre;

    // Lọc theo loại (free/paid)
    if (type) query.type = type;

    // Lọc theo tình trạng
    if (status) query.status = status;

    // Tìm kiếm full-text
    if (search) {
      query.$text = { $search: search };
    }

    // Sắp xếp
    let sortObj = {};
    switch (sort) {
      case 'views':   sortObj = { views: -1 };              break;
      case 'rating':  sortObj = { 'rating.average': -1 };   break;
      case 'new':     sortObj = { createdAt: -1 };           break;
      case 'updated': sortObj = { lastChapterAt: -1 };       break;
      case 'alpha':   sortObj = { title: 1 };                break;
      default:        sortObj = { views: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Story.countDocuments(query);

    const stories = await Story.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    res.json({
      success: true,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      stories
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== LẤY TRUYỆN NỔI BẬT CHO TRANG CHỦ =====
// GET /api/stories/home
router.get('/home', async (req, res) => {
  try {
    const [featured, hot, newest, topRated] = await Promise.all([
      Story.find({ isFeatured: true, isApproved: true }).limit(6).select('-__v'),
      Story.find({ isHot: true, isApproved: true }).sort({ views: -1 }).limit(8).select('-__v'),
      Story.find({ isApproved: true }).sort({ createdAt: -1 }).limit(8).select('-__v'),
      Story.find({ isApproved: true }).sort({ 'rating.average': -1 }).limit(8).select('-__v')
    ]);

    res.json({ success: true, featured, hot, newest, topRated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== LẤY CHI TIẾT 1 TRUYỆN =====
// GET /api/stories/:id
router.get('/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('authorId', 'username avatar bio');

    if (!story) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy truyện' });
    }

    // Tăng lượt xem
    story.views += 1;
    await story.save();

    res.json({ success: true, story });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== ĐĂNG TRUYỆN MỚI =====
// POST /api/stories
router.post('/', protect, authorize('author', 'admin'), async (req, res) => {
  try {
    const {
      title, author, cover, genres, description,
      status, type, price,
      firstChapterTitle, firstChapterContent
    } = req.body;

    // Tạo truyện
    const story = await Story.create({
      title, author,
      authorId: req.user._id,
      cover: cover || '📖',
      genres, description, status,
      type,
      price: type === 'paid' ? (price || 30000) : 0
    });

    // Tạo chương đầu tiên nếu có
    if (firstChapterTitle && firstChapterContent) {
      const chapter = await Chapter.create({
        storyId:  story._id,
        number:   1,
        title:    firstChapterTitle,
        content:  firstChapterContent,
        type:     'free'
      });

      story.chapterCount = 1;
      story.wordCount = chapter.wordCount;
      story.lastChapterAt = new Date();
      await story.save();
    }

    res.status(201).json({
      success: true,
      message: 'Đăng truyện thành công!',
      story
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== CẬP NHẬT TRUYỆN =====
// PUT /api/stories/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy truyện' });
    }

    // Chỉ tác giả hoặc admin mới được sửa
    if (story.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa truyện này' });
    }

    const allowed = ['title','cover','genres','description','status','type','price'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) story[field] = req.body[field];
    });

    await story.save();
    res.json({ success: true, message: 'Đã cập nhật truyện!', story });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== ĐÁNH GIÁ TRUYỆN =====
// POST /api/stories/:id/rate
router.post('/:id/rate', protect, async (req, res) => {
  try {
    const { score, comment } = req.body;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ success: false, message: 'Điểm đánh giá từ 1-5' });
    }

    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, message: 'Không tìm thấy truyện' });

    await story.updateRating(parseInt(score));

    res.json({
      success: true,
      message: 'Đánh giá thành công!',
      rating: story.rating
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== MUA TRUYỆN =====
// POST /api/stories/:id/purchase
router.post('/:id/purchase', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, message: 'Không tìm thấy truyện' });

    if (story.type !== 'paid') {
      return res.status(400).json({ success: false, message: 'Truyện này miễn phí' });
    }

    const user = req.user;
    const alreadyPurchased = user.purchasedStories.includes(story._id);

    if (alreadyPurchased) {
      return res.status(400).json({ success: false, message: 'Bạn đã mua truyện này rồi' });
    }

    // Thêm vào danh sách đã mua (thực tế cần tích hợp thanh toán)
    const User = require('../models/User');
    await User.findByIdAndUpdate(user._id, {
      $push: { purchasedStories: story._id }
    });

    res.json({ success: true, message: 'Mua truyện thành công! Bạn có thể đọc toàn bộ nội dung.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== LẤY TRUYỆN CỦA TÁC GIẢ =====
// GET /api/stories/author/:authorId
router.get('/author/:authorId', async (req, res) => {
  try {
    const stories = await Story.find({ authorId: req.params.authorId })
      .sort({ createdAt: -1 });
    res.json({ success: true, stories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
