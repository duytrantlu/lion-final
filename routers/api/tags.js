const router = require('express').Router();
const mongoose = require('mongoose');

const Article = mongoose.model('Article');

// return a list of tags
router.get('/', async (req, res, next) => {
  try {
    const tags = await Article.find().distinct('tagList');
    return res.json({ tags });
  } catch (err) {
    next();
  }
});

module.exports = router;
