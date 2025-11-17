// controllers/vote.controller.js
const Question = require('../models/question.model');
const mongoose = require('mongoose');

/**
 * Calculate net vote score from votesMap (upvotes - downvotes)
 * Handles both Map instances and plain objects (from .lean() queries)
 */
const calculateNetVotes = (votesMap) => {
  if (!votesMap) return 0;
  
  // Handle Map instance (from Mongoose documents)
  if (votesMap instanceof Map) {
    if (votesMap.size === 0) return 0;
    let net = 0;
    for (const [userId, voteType] of votesMap.entries()) {
      if (voteType === 'up') net += 1;
      else if (voteType === 'down') net -= 1;
    }
    return net;
  }
  
  // Handle plain object (from .lean() or if somehow it's an object)
  if (typeof votesMap === 'object') {
    const entries = Object.entries(votesMap);
    if (entries.length === 0) return 0;
    let net = 0;
    for (const [userId, voteType] of entries) {
      if (voteType === 'up') net += 1;
      else if (voteType === 'down') net -= 1;
    }
    return net;
  }
  
  return 0;
};

/**
 * Get user's current vote for a question
 * Handles both Map instances and plain objects (from .lean() queries)
 */
const getUserVote = (votesMap, userId) => {
  if (!votesMap || !userId) return null;
  
  // Handle Map instance (from Mongoose documents)
  if (votesMap instanceof Map) {
    return votesMap.get(userId) || null;
  }
  
  // Handle plain object (from .lean() or if somehow it's an object)
  if (typeof votesMap === 'object') {
    return votesMap[userId] || null;
  }
  
  return null;
};

/**
 * Upvote a question
 * POST /api/student/questions/:questionId/upvote
 */
exports.upvoteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user?.uid || req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'You must be logged in to vote'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        error: 'Invalid question ID',
        message: 'The provided question ID is not valid'
      });
    }

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Database not connected. Questions cannot be voted on.'
      });
    }

    const question = await Question.findById(questionId);

    if (!question) {
      return res.status(404).json({
        error: 'Question not found',
        message: 'The question you are trying to vote on does not exist'
      });
    }

    // Initialize votesMap if it doesn't exist
    if (!question.votesMap) {
      question.votesMap = new Map();
    } else if (!(question.votesMap instanceof Map)) {
      // If votesMap exists but is not a Map (e.g., plain object), convert it to a Map
      question.votesMap = new Map(Object.entries(question.votesMap));
    }

    const currentVote = getUserVote(question.votesMap, userId);

    // Handle vote logic (Reddit-style)
    if (currentVote === 'up') {
      // Already upvoted - remove the vote (undo)
      question.votesMap.delete(userId);
    } else if (currentVote === 'down') {
      // Was downvoted - change to upvote (replaces downvote)
      question.votesMap.set(userId, 'up');
    } else {
      // No vote yet - add upvote
      question.votesMap.set(userId, 'up');
    }

    // Calculate new net votes and update upvotes field for backwards compatibility
    const netVotes = calculateNetVotes(question.votesMap);
    question.upvotes = Math.max(0, netVotes); // Keep upvotes >= 0 for compatibility

    await question.save();

    res.status(200).json({
      success: true,
      message: currentVote === 'up' ? 'Upvote removed' : 'Question upvoted',
      netVotes: netVotes,
      userVote: currentVote === 'up' ? null : 'up', // Return new vote state
      upvotes: question.upvotes // Backwards compatibility
    });
  } catch (error) {
    console.error('Error upvoting question:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to upvote question. Please try again later.'
    });
  }
};

/**
 * Downvote a question
 * POST /api/student/questions/:questionId/downvote
 */
exports.downvoteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user?.uid || req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'You must be logged in to vote'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        error: 'Invalid question ID',
        message: 'The provided question ID is not valid'
      });
    }

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Database not connected. Questions cannot be voted on.'
      });
    }

    const question = await Question.findById(questionId);

    if (!question) {
      return res.status(404).json({
        error: 'Question not found',
        message: 'The question you are trying to vote on does not exist'
      });
    }

    // Initialize votesMap if it doesn't exist
    if (!question.votesMap) {
      question.votesMap = new Map();
    } else if (!(question.votesMap instanceof Map)) {
      // If votesMap exists but is not a Map (e.g., plain object), convert it to a Map
      question.votesMap = new Map(Object.entries(question.votesMap));
    }

    const currentVote = getUserVote(question.votesMap, userId);

    // Handle vote logic (Reddit-style)
    if (currentVote === 'down') {
      // Already downvoted - remove the vote (undo)
      question.votesMap.delete(userId);
    } else if (currentVote === 'up') {
      // Was upvoted - change to downvote (replaces upvote)
      question.votesMap.set(userId, 'down');
    } else {
      // No vote yet - add downvote
      question.votesMap.set(userId, 'down');
    }

    // Calculate new net votes and update upvotes field for backwards compatibility
    const netVotes = calculateNetVotes(question.votesMap);
    question.upvotes = Math.max(0, netVotes); // Keep upvotes >= 0 for compatibility

    await question.save();

    res.status(200).json({
      success: true,
      message: currentVote === 'down' ? 'Downvote removed' : 'Question downvoted',
      netVotes: netVotes,
      userVote: currentVote === 'down' ? null : 'down', // Return new vote state
      upvotes: question.upvotes // Backwards compatibility
    });
  } catch (error) {
    console.error('Error downvoting question:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to downvote question. Please try again later.'
    });
  }
};

