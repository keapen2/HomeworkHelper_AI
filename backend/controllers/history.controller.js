// controllers/history.controller.js
const Question = require('../models/question.model');
const mongoose = require('mongoose');

/**
 * Calculate net vote score from votesMap (upvotes - downvotes)
 * Handles both Map instances and plain objects (from .lean() queries)
 */
const calculateNetVotes = (votesMap) => {
  if (!votesMap) return 0;
  
  // Handle Map instance
  if (votesMap instanceof Map) {
    if (votesMap.size === 0) return 0;
    let net = 0;
    for (const [userId, voteType] of votesMap.entries()) {
      if (voteType === 'up') net += 1;
      else if (voteType === 'down') net -= 1;
    }
    return net;
  }
  
  // Handle plain object (from .lean())
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
  
  // Handle Map instance
  if (votesMap instanceof Map) {
    return votesMap.get(userId) || null;
  }
  
  // Handle plain object (from .lean())
  if (typeof votesMap === 'object') {
    return votesMap[userId] || null;
  }
  
  return null;
};

/**
 * Get user's own questions
 * GET /api/student/questions/my
 */
exports.getMyQuestions = async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.sub;
    const { subject, limit = 50, skip = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID required to fetch personal questions'
      });
    }

    // Build query
    const query = { askedBy: userId };
    if (subject && subject !== 'all') {
      query.subject = subject;
    }

    // Fetch questions
    const questions = await Question.find(query)
      .sort({ askedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('text subject topic answer aiResponse askedAt askCount upvotes votesMap askedBy')
      .lean();

    // Map aiResponse to answer, calculate net votes, and include user vote state
    // Allow users to vote on their own questions too
    const questionsWithAnswer = questions.map(q => {
      const netVotes = q.votesMap ? calculateNetVotes(q.votesMap) : (q.upvotes || 0);
      const userVote = userId ? getUserVote(q.votesMap, userId) : null;
      return {
        ...q,
        answer: q.answer || q.aiResponse,
        netVotes: netVotes,
        userVote: userVote, // 'up', 'down', or null
        upvotes: Math.max(0, netVotes), // For backwards compatibility
      };
    });

    res.status(200).json({
      success: true,
      questions: questionsWithAnswer || [],
      count: questionsWithAnswer.length,
    });

  } catch (error) {
    console.error('Error fetching user questions:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch questions'
    });
  }
};

/**
 * Get community questions (other users' questions)
 * GET /api/student/questions/community
 */
exports.getCommunityQuestions = async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.sub;
    const { subject, limit = 50, skip = 0 } = req.query;

    // Build query - exclude user's own questions, but show all others (including guest questions)
    // Show ALL questions that have answers, regardless of who asked them
    const query = {};
    
    // Only show questions that have answers (from AI)
    const hasAnswerCondition = {
      $or: [
        { answer: { $exists: true, $ne: null, $ne: '' } },
        { aiResponse: { $exists: true, $ne: null, $ne: '' } }
      ]
    };
    
    // Build query conditions
    const queryConditions = [hasAnswerCondition];
    
    // Exclude user's own questions only if userId is provided
    if (userId) {
      queryConditions.push({ askedBy: { $ne: userId } });
    }
    
    if (subject && subject !== 'all') {
      queryConditions.push({ subject: subject });
    }
    
    // Combine all conditions with $and
    if (queryConditions.length > 1) {
      query.$and = queryConditions;
    } else {
      Object.assign(query, queryConditions[0]);
    }

    // Fetch questions, sorted by popularity (upvotes/askCount) or recency
    // Prioritize questions with answers and higher engagement
    // This will show ALL questions with answers that are in the database
    const questions = await Question.find(query)
      .sort({ askedAt: -1, askCount: -1, upvotes: -1 }) // Most recent first, then by popularity
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('text subject topic answer aiResponse askedAt askCount upvotes votesMap askedBy')
      .lean();

    // Anonymize user IDs for privacy, map aiResponse to answer, calculate net votes, and include user vote state
    const anonymizedQuestions = questions.map(q => {
      const netVotes = q.votesMap ? calculateNetVotes(q.votesMap) : (q.upvotes || 0);
      const userVote = userId ? getUserVote(q.votesMap, userId) : null;
      return {
        ...q,
        answer: q.answer || q.aiResponse,
        askedBy: q.askedBy ? 'community' : null, // Anonymize for privacy
        netVotes: netVotes,
        userVote: userVote, // 'up', 'down', or null
        upvotes: Math.max(0, netVotes), // For backwards compatibility
      };
    });

    res.status(200).json({
      success: true,
      questions: anonymizedQuestions || [],
      count: anonymizedQuestions.length,
    });

  } catch (error) {
    console.error('Error fetching community questions:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch community questions'
    });
  }
};

/**
 * Get featured/pre-written questions
 * GET /api/student/questions/featured
 */
exports.getFeaturedQuestions = async (req, res) => {
  try {
    const { subject, limit = 50, skip = 0 } = req.query;

    // Build query - featured questions are those with high upvotes or askCount
    // And must have answers
    const query = {
      $and: [
        {
          $or: [
            { upvotes: { $gte: 5 } },
            { askCount: { $gte: 3 } },
          ]
        },
        {
          $or: [
            { answer: { $exists: true, $ne: null, $ne: '' } },
            { aiResponse: { $exists: true, $ne: null, $ne: '' } }
          ]
        }
      ]
    };

    if (subject && subject !== 'all') {
      query.subject = subject;
    }

    // Fetch featured questions
    const userId = req.user?.uid || req.user?.sub;
    const questions = await Question.find(query)
      .sort({ upvotes: -1, askCount: -1, askedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('text subject topic answer aiResponse askedAt askCount upvotes votesMap askedBy')
      .lean();

    // Map aiResponse to answer, calculate net votes, and include user vote state
    const questionsWithAnswer = questions.map(q => {
      const netVotes = q.votesMap ? calculateNetVotes(q.votesMap) : (q.upvotes || 0);
      const userVote = userId ? getUserVote(q.votesMap, userId) : null;
      return {
        ...q,
        answer: q.answer || q.aiResponse,
        askedBy: q.askedBy ? 'anonymous' : null, // Anonymize for privacy
        netVotes: netVotes,
        userVote: userVote, // 'up', 'down', or null
        upvotes: Math.max(0, netVotes), // For backwards compatibility
      };
    });

    res.status(200).json({
      success: true,
      questions: questionsWithAnswer || [],
      count: questionsWithAnswer.length,
    });

  } catch (error) {
    console.error('Error fetching featured questions:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch featured questions'
    });
  }
};

