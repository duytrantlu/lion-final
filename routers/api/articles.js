const router = require('express').Router();
const mongoose = require('mongoose');

const Article = mongoose.model('Article');
const Comment = mongoose.model('Comment');
const User = mongoose.model('User');
const auth = require('../auth');

// lấy article params
router.param('article', async (req, res, next, slug) => {
  try {
    const article = await Article.findOne({ slug }).populate('author');
    if (!article) {
      return res.sendStatus(404);
    }
    req.article = article;
    return next();
  } catch (err) {
    next();
  }
});
// method lấy params comment
router.param('comment', async (req, res, next, id) => {
  try {
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.sendStatus(404);
    }

    req.comment = comment;
    return next();
  } catch (err) {
    next();
  }
});

// get article
router.get('/', auth.optional, async (req, res, next) => {
  const query = {};
  let limit = 20;
  let offset = 0;

  if (typeof req.query.limit !== 'undefined') {
    limit = req.query.limit;
  }

  if (typeof req.query.offset !== 'undefined') {
    offset = req.query.offset;
  }

  if (typeof req.query.tag !== 'undefined') {
    query.tagList = { $in: [req.query.tag] };
  }
  try {
    const results = Promise.all([
      req.query.author ? User.findOne({ username: req.query.author }) : null,
      req.query.favorited
        ? User.findOne({ username: req.query.favorited })
        : null,
    ]);
    const author = results[0];
    const favoriter = results[1];
    if (author) {
      query.author = author._id;
    }

    if (favoriter) {
      query._id = { $in: favoriter.favorites };
    } else if (req.query.favorited) {
      query._id = { $in: [] };
    }
    const data = await Promise.all([
      Article.find(query)
        .limit(Number(limit))
        .skip(Number(offset))
        .sort({ createdAt: 'desc' })
        .populate('author')
        .exec(),
      Article.count(query).exec(),
      req.payload ? User.findById(req.payload.id) : null,
    ]);
    const articles = data[0];
    const articlesCount = data[1];
    const user = data[2];
    return res.json({
      articles: articles.map(article => article.toJSONFor(user)),
      articlesCount,
    });
  } catch (err) {
    next();
  }
});

// get feed
router.get('/feed', auth.required, async (req, res, next) => {
  let limit = 20;
  let offset = 0;

  if (typeof req.query.limit !== 'undefined') {
    limit = req.query.limit;
  }

  if (typeof req.query.offset !== 'undefined') {
    offset = req.query.offset;
  }
  try {
    const user = await User.findById(req.payload.id);
    if (!user) {
      return res.sendStatus(401);
    }
    const results = await Promise.all([
      Article.find({ author: { $in: user.following } })
        .limit(Number(limit))
        .skip(Number(offset))
        .populate('author')
        .exec(),
      Article.count({ author: { $in: user.following } }),
    ]);
    const articles = results[0];
    const articlesCount = results[1];
    return res.json({
      articles: articles.map(article => article.toJSONFor(user)),
      articlesCount,
    });
  } catch (err) {
    next();
  }
});

// create an article
router.post('/', auth.required, async (req, res, next) => {
  try {
    const user = await User.findById(req.payload.id);
    if (!user) {
      return res.sendStatus(401);
    }
    const article = new Article(req.body.article);

    article.author = user;
    await article.save();
    return res.json({ article: article.toJSONFor(user) });
  } catch (err) {
    next();
  }
});

// return a article
router.get('/:article', auth.optional, async (req, res, next) => {
  try {
    const results = await Promise.all([
      req.payload ? User.findById(req.payload.id) : null,
      req.article.populate('author').execPopulate(),
    ]);
    const user = results[0];
    const article = results[1];
    // console.log(results)
    return res.json({ article: req.article.toJSONFor(user) });
  } catch (err) {
    next();
    console.log(err);
  }
});

// update article
router.put('/:article', auth.required, async (req, res, next) => {
  try {
    const user = await User.findById(req.payload.id);
    if (req.article.author._id.toString() === req.payload.id.toString()) {
      if (typeof req.body.article.title !== 'undefined') {
        req.article.title = req.body.article.title;
      }

      if (typeof req.body.article.description !== 'undefined') {
        req.article.description = req.body.article.description;
      }

      if (typeof req.body.article.body !== 'undefined') {
        req.article.body = req.body.article.body;
      }

      if (typeof req.body.article.tagList !== 'undefined') {
        req.article.tagList = req.body.article.tagList;
      }
      const article = await req.article.save();
      return res.json({ article: article.toJSONFor(user) });
    }
    return res.sendStatus(403);
  } catch (err) {
    next();
  }
});

// delete article
router.delete('/:article', auth.required, async (req, res, next) => {
  try {
    const user = await User.findById(req.payload.id);
    if (!user) {
      return res.sendStatus(401);
    }
    if (req.article.author._id.toString() === req.payload.id.toString()) {
      await req.article.remove();
      return res.sendStatus(204);
    }
    return res.sendStatus(403);
  } catch (error) {
    return res.json({ err: error });
  }
});

// Favorite an article
router.post('/:article/favorite', auth.required, async (req, res, next) => {
  const articleId = req.article._id;
  try {
    const user = await User.findById(req.payload.id);
    if (!user) {
      return res.sendStatus(401);
    }
    await user.favorite(articleId);
    const article = await req.article.updateFavoriteCount();
    return res.json({ article: article.toJSONFor(user) });
  } catch (error) {
    return res.json({ err: error });
  }
});

// Unfavorite an article
router.delete('/:article/favorite', auth.required, async (req, res, next) => {
  const articleId = req.article._id;
  try {
    const user = await User.findById(req.payload.id);
    if (!user) {
      return res.sendStatus(401);
    }
    await user.unfavorite(articleId);
    const article = await req.article.updateFavoriteCount();
    return res.json({ article: article.toJSONFor(user) });
  } catch (err) {}
});

// return an article's comments
router.get('/:article/comments', auth.optional, async (req, res, next) => {
  try {
    const user = await Promise.resolve(req.payload ? User.findById(req.payload.id) : null);
    const article = await req.article
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
        },
        options: {
          sort: {
            createdAt: 'desc',
          },
        },
      })
      .execPopulate();
    return res.json({
      comments: req.article.comments.map(comment =>
        // console.log('comment', comment);
        comment.toJSONFor(user)),
    });
  } catch (error) {
    return res.json({ err: error });
  }
});

// create a new comment
router.post('/:article/comments', auth.required, async (req, res, next) => {
  try {
    const user = await User.findById(req.payload.id);
    if (!user) {
      return res.sendStatus(401);
    }
    const comment = new Comment(req.body.comment);
    comment.article = req.article;
    comment.author = user;

    await comment.save();
    req.article.comments.push(comment);
    const article = req.article.save();
    return res.json({ comment: comment.toJSONFor(user) });
  } catch (error) {
    return res.json({ err: error });
  }
});
// delete a comment
router.delete(
  '/:article/comments/:comment',
  auth.required,
  async (req, res, next) => {
    if (req.comment.author.toString() === req.payload.id.toString()) {
      req.article.comments.remove(req.comment._id);
      await req.article.save();
      await Comment.find({ _id: req.comment._id })
        .remove()
        .exec();
      return res.sendStatus(204);
    }
    return res.sendStatus(403);
  },
);

module.exports = router;
