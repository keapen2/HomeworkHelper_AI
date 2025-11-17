// scripts/seed.js
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Question = require('../models/question.model');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/homeworkhelper';

// MongoDB connection options (same as server.js)
const mongooseOptions = {
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  connectTimeoutMS: 30000, // 30 seconds
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority'
};

const seedData = async () => {
  try {
    // Check if MONGO_URI is set and valid (not a placeholder)
    const mongoUri = process.env.MONGO_URI;
    const isPlaceholder = mongoUri && (
      mongoUri.includes('your_mongodb_atlas_connection_string') ||
      mongoUri.includes('your_openai_api_key') ||
      mongoUri.includes('username:password') ||
      mongoUri === 'mongodb://localhost:27017/homeworkhelper'
    );
    
    if (!mongoUri || isPlaceholder) {
      console.error('\n❌ ERROR: MONGO_URI not set or is a placeholder in .env file!');
      console.error('\n📝 To fix this:');
      console.error('1. Go to MongoDB Atlas: https://www.mongodb.com/cloud/atlas/register');
      console.error('2. Create a free cluster');
      console.error('3. Get your connection string');
      console.error('4. Update backend/.env file with your actual connection string:');
      console.error('   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/homeworkhelper?retryWrites=true&w=majority');
      console.error('\n💡 For MVP demo, you can skip seeding - the app works with mock data!');
      console.error('   Just comment out or remove MONGO_URI from .env if you don\'t need to seed.\n');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    console.log('📍 URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    console.log('✅ Connected to MongoDB');

    // Check existing question count (including user-generated questions)
    const existingQuestionCount = await Question.countDocuments({});
    console.log(`📊 Found ${existingQuestionCount} existing questions in database`);

    // Clear only seed data (questions without askedBy - these are seed questions)
    // User-generated questions have askedBy set (Firebase UID)
    const deletedSeedQuestions = await Question.deleteMany({ 
      $or: [
        { askedBy: { $exists: false } },
        { askedBy: null },
        { studentId: { $exists: true } } // Seed questions have studentId
      ]
    });
    console.log(`🗑️  Removed ${deletedSeedQuestions.deletedCount} seed questions (user questions preserved)`);

    // Clear mock users (only seed users, not real users)
    // Real users have Firebase UIDs in their email or role
    const deletedUsers = await User.deleteMany({ 
      email: { $regex: /student\d+@example\.com$/ } // Only delete seed users
    });
    console.log(`🗑️  Removed ${deletedUsers.deletedCount} seed users (real users preserved)`);

    // Create mock student users
    const students = await User.create([
      {
        email: 'student1@example.com',
        role: 'student',
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000) // Active 2 hours ago
      },
      {
        email: 'student2@example.com',
        role: 'student',
        lastActive: new Date(Date.now() - 5 * 60 * 60 * 1000) // Active 5 hours ago
      },
      {
        email: 'student3@example.com',
        role: 'student',
        lastActive: new Date(Date.now() - 12 * 60 * 60 * 1000) // Active 12 hours ago
      },
      {
        email: 'student4@example.com',
        role: 'student',
        lastActive: new Date(Date.now() - 18 * 60 * 60 * 1000) // Active 18 hours ago
      },
      {
        email: 'student5@example.com',
        role: 'student',
        lastActive: new Date(Date.now() - 20 * 60 * 60 * 1000) // Active 20 hours ago
      },
      {
        email: 'student6@example.com',
        role: 'student',
        lastActive: new Date(Date.now() - 3 * 60 * 60 * 1000) // Active 3 hours ago (within 24h)
      },
      {
        email: 'student7@example.com',
        role: 'student',
        lastActive: new Date(Date.now() - 1 * 60 * 60 * 1000) // Active 1 hour ago (within 24h)
      },
      {
        email: 'student8@example.com',
        role: 'student',
        lastActive: new Date(Date.now() - 23 * 60 * 60 * 1000) // Active 23 hours ago (within 24h)
      }
    ]);
    console.log(`Created ${students.length} student users`);

    // Create mock questions with various subjects, topics, askCounts, accuracyRatings
    // Only create if they don't already exist (to avoid duplicates)
    // These are seed questions that will be preserved or re-added if missing
    const seedQuestionsData = [
      {
        text: 'How do I solve quadratic equations?',
        subject: 'Math',
        topic: 'Algebra',
        askCount: 150,
        upvotes: 45,
        accuracyRating: 85,
        aiResponse: 'To solve quadratic equations, use the quadratic formula: x = (-b ± √(b²-4ac)) / 2a'
      },
      {
        text: 'What is the powerhouse of the cell?',
        subject: 'Science',
        topic: 'Biology',
        askCount: 200,
        upvotes: 60,
        accuracyRating: 92,
        aiResponse: 'The powerhouse of the cell is the mitochondrion, which produces ATP energy.'
      },
      {
        text: 'Explain the main causes of WWI',
        subject: 'History',
        topic: 'World War I',
        askCount: 180,
        upvotes: 55,
        accuracyRating: 88,
        aiResponse: 'The main causes of WWI were militarism, alliances, imperialism, and nationalism (MAIN).'
      },
      {
        text: 'What is a verb?',
        subject: 'English',
        topic: 'Grammar',
        askCount: 120,
        upvotes: 35,
        accuracyRating: 95,
        aiResponse: 'A verb is a word that describes an action, occurrence, or state of being.'
      },
      {
        text: 'What are Calculus Derivatives?',
        subject: 'Math',
        topic: 'Calculus Derivatives',
        askCount: 250,
        upvotes: 75,
        accuracyRating: 78,
        aiResponse: 'A derivative represents the rate of change of a function with respect to its variable.'
      },
      {
        text: 'Define Organic Chemistry',
        subject: 'Science',
        topic: 'Organic Chemistry',
        askCount: 170,
        upvotes: 50,
        accuracyRating: 82,
        aiResponse: 'Organic chemistry is the study of carbon-containing compounds and their reactions.'
      },
      {
        text: 'How do I find the area of a circle?',
        subject: 'Math',
        topic: 'Geometry',
        askCount: 140,
        upvotes: 40,
        accuracyRating: 90,
        aiResponse: 'The area of a circle is calculated using the formula: A = πr², where r is the radius.'
      },
      {
        text: 'What is photosynthesis?',
        subject: 'Science',
        topic: 'Biology',
        askCount: 190,
        upvotes: 58,
        accuracyRating: 87,
        aiResponse: 'Photosynthesis is the process by which plants convert light energy into chemical energy.'
      },
      {
        text: 'Explain the structure of an essay',
        subject: 'English',
        topic: 'Writing',
        askCount: 130,
        upvotes: 38,
        accuracyRating: 91,
        aiResponse: 'An essay typically has an introduction, body paragraphs, and a conclusion.'
      },
      {
        text: 'What caused the American Civil War?',
        subject: 'History',
        topic: 'American History',
        askCount: 160,
        upvotes: 48,
        accuracyRating: 86,
        aiResponse: 'The American Civil War was primarily caused by disputes over slavery and states rights.'
      },
      {
        text: 'How do I integrate by parts?',
        subject: 'Math',
        topic: 'Calculus Derivatives',
        askCount: 220,
        upvotes: 68,
        accuracyRating: 75,
        aiResponse: 'Integration by parts uses the formula: ∫u dv = uv - ∫v du'
      },
      {
        text: 'What is the periodic table?',
        subject: 'Science',
        topic: 'Chemistry',
        askCount: 145,
        upvotes: 42,
        accuracyRating: 93,
        aiResponse: 'The periodic table organizes chemical elements by atomic number and properties.'
      }
    ];

    // Only create seed questions that don't already exist (by text and subject)
    const createdQuestions = [];
    for (let i = 0; i < seedQuestionsData.length; i++) {
      const seedQuestion = seedQuestionsData[i];
      const exists = await Question.findOne({
        text: seedQuestion.text,
        subject: seedQuestion.subject,
        // Check if it's a seed question (has studentId but no askedBy)
        $or: [
          { studentId: { $exists: true } },
          { askedBy: { $exists: false } }
        ]
      });
      
      if (!exists) {
        // Add studentId to link to seed users and set both answer fields
        const questionData = {
          ...seedQuestion,
          studentId: students[i % students.length]._id,
          answer: seedQuestion.aiResponse, // Also set answer field for consistency
          askedBy: null, // Mark as seed question (no Firebase UID)
        };
        const newQuestion = await Question.create(questionData);
        createdQuestions.push(newQuestion);
      }
    }

    // Get total count of all questions (seed + user-generated)
    const totalQuestions = await Question.countDocuments({});
    const userQuestions = await Question.countDocuments({ 
      askedBy: { $exists: true, $ne: null } 
    });
    const seedQuestionCount = totalQuestions - userQuestions;

    console.log(`✅ Created ${createdQuestions.length} new seed questions`);
    console.log(`📊 Total questions in database: ${totalQuestions} (${userQuestions} user-generated + ${seedQuestionCount} seed)`);

    console.log('\n✅ Database seeded successfully!');
    console.log(`- ${students.length} student users created`);
    console.log(`- ${createdQuestions.length} seed questions added`);
    console.log(`- ${totalQuestions} total questions in database (including ${userQuestions} user-generated questions)`);
    console.log('\n💡 User-generated questions from AI responses are preserved!');
    console.log('You can now run your API server and test the endpoints.');
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding database:', error.message);
    
    if (error.name === 'MongooseServerSelectionError' || error.message.includes('ECONNREFUSED')) {
      console.error('\n📝 Connection Error - Possible causes:');
      console.error('1. MONGO_URI not set in .env file');
      console.error('2. MongoDB Atlas cluster is not running');
      console.error('3. IP address not whitelisted in MongoDB Atlas');
      console.error('4. Wrong username/password in connection string');
      console.error('\n💡 To fix:');
      console.error('1. Check your .env file has MONGO_URI set');
      console.error('2. Go to MongoDB Atlas → Network Access → Add your IP');
      console.error('3. Verify your connection string is correct');
      console.error('\n💡 For MVP demo, you can skip seeding - the app works with mock data!\n');
    } else {
      console.error('\nFull error:', error);
    }
    
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
    process.exit(1);
  }
};

seedData();

