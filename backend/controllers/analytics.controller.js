const Question = require('../models/question.model');
const User = require('../models/user.model');

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

// Controller for "Usage Trends" Screen
exports.getUsageTrends = async (req, res) => {
  try {
    // Check if MongoDB is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB not connected, returning mock data');
      return res.json({
        activeStudents: 3,
        avgAccuracy: 85,
        commonStruggles: [
          { topic: 'Calculus Derivatives', studentCount: 250 },
          { topic: 'Biology', studentCount: 200 },
          { topic: 'Algebra', studentCount: 150 },
          { topic: 'World War I', studentCount: 180 },
          { topic: 'Grammar', studentCount: 120 }
        ]
      });
    }

    // Parse date range from query parameters
    const { dateRange } = req.query; // '7days', '30days', 'all'
    let dateFilter = {};
    
    // Use both createdAt and askedAt for date filtering to catch all questions
    if (dateRange === '7days') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { 
        $or: [
          { createdAt: { $gte: sevenDaysAgo } },
          { askedAt: { $gte: sevenDaysAgo } }
        ]
      };
    } else if (dateRange === '30days') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = { 
        $or: [
          { createdAt: { $gte: thirtyDaysAgo } },
          { askedAt: { $gte: thirtyDaysAgo } }
        ]
      };
    }
    // If 'all' or no dateRange, don't filter by date

    // Parse active students date range
    let activeStudentsDateFilter = new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours
    if (dateRange === '7days') {
      activeStudentsDateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === '30days') {
      activeStudentsDateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateRange === 'all') {
      activeStudentsDateFilter = new Date(0); // All time
    }

    // 1. Get Active Students (based on date range)
    const activeStudentCount = await User.countDocuments({
      role: 'student',
      lastActive: { $gte: activeStudentsDateFilter }
    }).maxTimeMS(5000); // 5 second timeout

    // 2. Get Average Accuracy (with date filter)
    const avgAccuracyMatch = { 
      accuracyRating: { $exists: true, $ne: null },
      ...dateFilter
    };
    const avgAccuracyResult = await Question.aggregate([
      { $match: avgAccuracyMatch },
      { $group: { _id: null, average: { $avg: '$accuracyRating' } } }
    ], { maxTimeMS: 5000 }); // 5 second timeout
    const avgAccuracy = avgAccuracyResult.length > 0 ? avgAccuracyResult[0].average : 0;

    // Parse category filter
    const { category, search } = req.query;
    let categoryFilter = {};
    if (category && category !== 'all') {
      categoryFilter = { subject: category };
    }

    // Parse search filter
    let searchFilter = {};
    if (search && search.trim() !== '') {
      searchFilter = { 
        topic: { $regex: search.trim(), $options: 'i' } // Case-insensitive search
      };
    }

    // 3. Get Common Study Struggles (Top 5 topics by ask count, with filters)
    // If searching, get more results (up to 20) to allow better search results
    const limitCount = search && search.trim() !== '' ? 20 : 5;
    
    const struggleMatch = { 
      topic: { $exists: true, $ne: null },
      ...dateFilter,
      ...categoryFilter,
      ...searchFilter
    };
    const commonStruggles = await Question.aggregate([
      { 
        $match: struggleMatch
      },
      { 
        $group: { 
          _id: '$topic', 
          studentCount: { $sum: 1 } 
        } 
      },
      { 
        $sort: { studentCount: -1 } 
      },
      { 
        $limit: limitCount 
      },
      { 
        $project: { 
          topic: '$_id', 
          studentCount: 1, 
          _id: 0 
        } 
      }
    ], { maxTimeMS: 5000 }); // 5 second timeout

    res.json({
      activeStudents: activeStudentCount,
      avgAccuracy: Math.round(avgAccuracy),
      commonStruggles: commonStruggles
    });
  } catch (error) {
    console.error('Error fetching usage trends:', error);
    // Return mock data if database query fails
    res.json({
      activeStudents: 3,
      avgAccuracy: 85,
      commonStruggles: [
        { topic: 'Calculus Derivatives', studentCount: 250 },
        { topic: 'Biology', studentCount: 200 },
        { topic: 'Algebra', studentCount: 150 },
        { topic: 'World War I', studentCount: 180 },
        { topic: 'Grammar', studentCount: 120 }
      ]
    });
  }
};

// Controller for "System Dashboard" Screen
exports.getSystemDashboard = async (req, res) => {
  try {
    // Check if MongoDB is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB not connected, returning mock data');
      const mockChartData = [
        { name: 'Math', count: 560 },
        { name: 'Science', count: 515 },
        { name: 'English', count: 250 },
        { name: 'History', count: 340 }
      ];
      return res.json({
        categoryDistribution: mockChartData,
        topQuestions: [
          { _id: '1', text: 'What are Calculus Derivatives?', askCount: 250, upvotes: 75 },
          { _id: '2', text: 'What is the powerhouse of the cell?', askCount: 200, upvotes: 60 },
          { _id: '3', text: 'Explain the main causes of WWI', askCount: 180, upvotes: 55 },
          { _id: '4', text: 'How do I solve quadratic equations?', askCount: 150, upvotes: 45 },
          { _id: '5', text: 'What is a verb?', askCount: 120, upvotes: 35 }
        ]
      });
    }

    // Parse date range from query parameters
    const { dateRange } = req.query;
    let dateFilter = {};
    
    // Use both createdAt and askedAt for date filtering to catch all questions
    if (dateRange === '7days') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { 
        $or: [
          { createdAt: { $gte: sevenDaysAgo } },
          { askedAt: { $gte: sevenDaysAgo } }
        ]
      };
    } else if (dateRange === '30days') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = { 
        $or: [
          { createdAt: { $gte: thirtyDaysAgo } },
          { askedAt: { $gte: thirtyDaysAgo } }
        ]
      };
    }

    // Parse category filter
    const { category, search } = req.query;
    let categoryFilter = {};
    if (category && category !== 'all') {
      categoryFilter = { subject: category };
    }

    // Parse search filter for questions
    let questionSearchFilter = {};
    if (search && search.trim() !== '') {
      questionSearchFilter = { 
        text: { $regex: search.trim(), $options: 'i' } // Case-insensitive search
      };
    }

    // 1. Get Category Distribution (with date filter)
    // Include all questions with answers (from AI or user)
    const hasAnswerCondition = {
      $or: [
        { answer: { $exists: true, $ne: null, $ne: '' } },
        { aiResponse: { $exists: true, $ne: null, $ne: '' } }
      ]
    };
    
    // Build match condition - combine date filter with answer condition
    const categoryMatchConditions = [hasAnswerCondition];
    if (dateRange) {
      categoryMatchConditions.push(dateFilter);
    }
    
    const categoryMatch = categoryMatchConditions.length > 1 
      ? { $and: categoryMatchConditions }
      : hasAnswerCondition;
    
    const categoryDistribution = await Question.aggregate([
      {
        $match: categoryMatch
      },
      { 
        $group: { 
          _id: '$subject', 
          count: { $sum: 1 } 
        } 
      },
      { 
        $project: { 
          name: '$_id', 
          count: 1, 
          _id: 0 
        } 
      }
    ], { maxTimeMS: 5000 }); // 5 second timeout

    // 2. Get Top Questions (Top 5 by askCount/upvotes, with filters)
    // If searching, get more results (up to 20) to allow better search results
    const questionLimit = search && search.trim() !== '' ? 20 : 5;
    
    // Build filters for top questions - include all questions with answers
    // Reuse hasAnswerCondition declared above for category distribution
    // Build array of filter conditions
    const questionFilterConditions = [hasAnswerCondition];
    
    if (dateRange) {
      questionFilterConditions.push(dateFilter);
    }
    
    if (Object.keys(categoryFilter).length > 0) {
      questionFilterConditions.push(categoryFilter);
    }
    
    if (Object.keys(questionSearchFilter).length > 0) {
      questionFilterConditions.push(questionSearchFilter);
    }
    
    // Combine all conditions with $and
    const questionFilters = questionFilterConditions.length > 1
      ? { $and: questionFilterConditions }
      : hasAnswerCondition;
    const topQuestionsRaw = await Question.find(questionFilters)
      .sort({ askCount: -1, upvotes: -1, askedAt: -1 })
      .limit(questionLimit)
      .select('text askCount upvotes votesMap subject topic askedAt askedBy')
      .lean()
      .maxTimeMS(5000); // 5 second timeout

    // Calculate actual net votes from votesMap (preserving seed data upvotes if no votesMap)
    // Seed questions have upvotes but may not have votesMap - preserve those
    const topQuestions = topQuestionsRaw.map(q => {
      // If it's a seed question (has upvotes but no votesMap or empty votesMap), keep the upvotes
      const hasVotesMap = q.votesMap && (
        (q.votesMap instanceof Map && q.votesMap.size > 0) ||
        (typeof q.votesMap === 'object' && Object.keys(q.votesMap).length > 0)
      );
      
      if (hasVotesMap) {
        // User-generated question - use calculated net votes (can be negative)
        const netVotes = calculateNetVotes(q.votesMap);
        return {
          ...q,
          upvotes: netVotes, // Replace upvotes with actual net votes
        };
      } else {
        // Seed question - preserve original upvotes
        return q;
      }
    }).sort((a, b) => {
      // Sort by net votes (now in upvotes field) descending
      if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
      if (b.askCount !== a.askCount) return b.askCount - a.askCount;
      return new Date(b.askedAt) - new Date(a.askedAt);
    });

    res.json({
      categoryDistribution: categoryDistribution,
      topQuestions: topQuestions
    });
  } catch (error) {
    console.error('Error fetching system dashboard:', error);
    // Return mock data if database query fails
    const mockChartData = [
      { name: 'Math', count: 560 },
      { name: 'Science', count: 515 },
      { name: 'English', count: 250 },
      { name: 'History', count: 340 }
    ];
    res.json({
      categoryDistribution: mockChartData,
      topQuestions: [
        { _id: '1', text: 'What are Calculus Derivatives?', askCount: 250, upvotes: 75 },
        { _id: '2', text: 'What is the powerhouse of the cell?', askCount: 200, upvotes: 60 },
        { _id: '3', text: 'Explain the main causes of WWI', askCount: 180, upvotes: 55 },
        { _id: '4', text: 'How do I solve quadratic equations?', askCount: 150, upvotes: 45 },
        { _id: '5', text: 'What is a verb?', askCount: 120, upvotes: 35 }
      ]
    });
  }
};

