// routes/student.routes.js
// Student routes for AI question feature and user functionality

const express = require('express');
const router = express.Router();
const { generateAIResponse } = require('../controllers/ai.controller');
const { getMyQuestions, getCommunityQuestions, getFeaturedQuestions } = require('../controllers/history.controller');
const { upvoteQuestion, downvoteQuestion } = require('../controllers/vote.controller');
const { verifyUser } = require('../middleware/auth.middleware');

// Apply verifyUser middleware to all routes (allows both authenticated and guest access)
router.use(verifyUser);

// AI Question endpoint - Oluwakunmi's feature
router.post('/question', generateAIResponse);

// History endpoints
router.get('/questions/my', getMyQuestions);
router.get('/questions/community', getCommunityQuestions);
router.get('/questions/featured', getFeaturedQuestions);

// Vote endpoints
router.post('/questions/:questionId/upvote', upvoteQuestion);
router.post('/questions/:questionId/downvote', downvoteQuestion);

// CONTEXT: Kanda's user login
router.post('/auth/login', (req, res) => {
  res.status(200).json({ message: 'STUB: Student login' });
});

module.exports = router;

