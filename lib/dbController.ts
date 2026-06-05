// lib/dbController.ts
import connectMongo from './mongodb';
import * as MongooseModels from '@/models/MockData';
import SessionModel from '@/models/Session';
import { inMemoryDb } from './mockDatabase';
import { Subject as ISubject, Topic as ITopic, SubTopic as ISubTopic, Test as ITest, Question as IQuestion } from '@/types';

// Simple unique ID generator
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Seed MongoDB if connected and empty
let seeded = false;
async function ensureSeeding() {
  if (seeded) return true;
  const db = await connectMongo();
  if (!db) return false;

  try {
    const subjectCount = await MongooseModels.Subject.countDocuments();
    if (subjectCount === 0) {
      console.log('Seeding subjects into MongoDB...');
      await MongooseModels.Subject.insertMany(inMemoryDb.subjects);
      await MongooseModels.Topic.insertMany(inMemoryDb.topics);
      await MongooseModels.SubTopic.insertMany(inMemoryDb.subTopics);
      console.log('MongoDB seeding complete.');
    }
    seeded = true;
    return true;
  } catch (err) {
    console.error('Error seeding MongoDB:', err);
    return false;
  }
}

// 1. Subjects
export async function dbGetSubjects(): Promise<ISubject[]> {
  const isConnected = await ensureSeeding();
  if (isConnected) {
    try {
      const docs = await MongooseModels.Subject.find().lean();
      return docs.map((doc: any) => ({ id: doc.id, name: doc.name }));
    } catch (err) {
      console.error('Mongoose find subjects error:', err);
    }
  }
  return inMemoryDb.subjects;
}

// 2. Topics
export async function dbGetTopics(subjectId?: string): Promise<ITopic[]> {
  const isConnected = await ensureSeeding();
  if (isConnected) {
    try {
      const query = subjectId ? { subject_id: subjectId } : {};
      const docs = await MongooseModels.Topic.find(query).lean();
      return docs.map((doc: any) => ({ id: doc.id, name: doc.name, subject_id: doc.subject_id }));
    } catch (err) {
      console.error('Mongoose find topics error:', err);
    }
  }
  
  if (subjectId) {
    return inMemoryDb.topics.filter(t => t.subject_id === subjectId);
  }
  return inMemoryDb.topics;
}

// 3. SubTopics
export async function dbGetSubTopics(topicIds: string[]): Promise<ISubTopic[]> {
  const isConnected = await ensureSeeding();
  if (isConnected) {
    try {
      const docs = await MongooseModels.SubTopic.find({ topic_id: { $in: topicIds } }).lean();
      return docs.map((doc: any) => ({ id: doc.id, name: doc.name, topic_id: doc.topic_id }));
    } catch (err) {
      console.error('Mongoose find subtopics error:', err);
    }
  }
  return inMemoryDb.subTopics.filter(st => topicIds.includes(st.topic_id));
}

// 4. Tests CRUD
export async function dbGetTests(): Promise<ITest[]> {
  const isConnected = await ensureSeeding();
  if (isConnected) {
    try {
      const docs = await MongooseModels.Test.find().sort({ created_at: -1 }).lean();
      return docs.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type as any,
        subject: doc.subject,
        topics: doc.topics,
        sub_topics: doc.sub_topics,
        correct_marks: doc.correct_marks,
        wrong_marks: doc.wrong_marks,
        unattempt_marks: doc.unattempt_marks,
        difficulty: doc.difficulty as any,
        total_time: doc.total_time,
        total_marks: doc.total_marks,
        total_questions: doc.total_questions,
        status: doc.status as any,
        created_at: doc.created_at.toISOString(),
        questions: doc.questions,
      }));
    } catch (err) {
      console.error('Mongoose find tests error:', err);
    }
  }
  return inMemoryDb.tests;
}

export async function dbGetTestById(id: string): Promise<ITest | null> {
  const isConnected = await ensureSeeding();
  if (isConnected) {
    try {
      const doc = await MongooseModels.Test.findOne({ id }).lean();
      if (doc) {
        return {
          id: doc.id,
          name: doc.name,
          type: doc.type as any,
          subject: doc.subject,
          topics: doc.topics,
          sub_topics: doc.sub_topics,
          correct_marks: doc.correct_marks,
          wrong_marks: doc.wrong_marks,
          unattempt_marks: doc.unattempt_marks,
          difficulty: doc.difficulty as any,
          total_time: doc.total_time,
          total_marks: doc.total_marks,
          total_questions: doc.total_questions,
          status: doc.status as any,
          created_at: doc.created_at.toISOString(),
          questions: doc.questions,
        };
      }
    } catch (err) {
      console.error('Mongoose find test error:', err);
    }
  }
  const t = inMemoryDb.tests.find(item => item.id === id);
  return t || null;
}

export async function dbCreateTest(testData: Omit<ITest, 'id' | 'created_at'>): Promise<ITest> {
  const id = generateId();
  const created_at = new Date().toISOString();
  const newTest: ITest = {
    ...testData,
    id,
    created_at,
    questions: testData.questions || [],
  };

  const isConnected = await ensureSeeding();
  if (isConnected) {
    try {
      await MongooseModels.Test.create({
        ...newTest,
        created_at: new Date(created_at),
      });
      return newTest;
    } catch (err) {
      console.error('Mongoose create test error:', err);
    }
  }

  inMemoryDb.tests.unshift(newTest);
  return newTest;
}

export async function dbUpdateTest(id: string, testData: Partial<ITest>): Promise<ITest | null> {
  const isConnected = await ensureSeeding();
  if (isConnected) {
    try {
      const doc = await MongooseModels.Test.findOneAndUpdate(
        { id },
        { $set: testData },
        { new: true }
      ).lean();
      if (doc) {
        return {
          id: doc.id,
          name: doc.name,
          type: doc.type as any,
          subject: doc.subject,
          topics: doc.topics,
          sub_topics: doc.sub_topics,
          correct_marks: doc.correct_marks,
          wrong_marks: doc.wrong_marks,
          unattempt_marks: doc.unattempt_marks,
          difficulty: doc.difficulty as any,
          total_time: doc.total_time,
          total_marks: doc.total_marks,
          total_questions: doc.total_questions,
          status: doc.status as any,
          created_at: doc.created_at.toISOString(),
          questions: doc.questions,
        };
      }
    } catch (err) {
      console.error('Mongoose update test error:', err);
    }
  }

  const index = inMemoryDb.tests.findIndex(item => item.id === id);
  if (index !== -1) {
    const updatedTest = { ...inMemoryDb.tests[index], ...testData };
    inMemoryDb.tests[index] = updatedTest;
    return updatedTest;
  }
  return null;
}

export async function dbDeleteTest(id: string): Promise<boolean> {
  const isConnected = await ensureSeeding();
  if (isConnected) {
    try {
      const res = await MongooseModels.Test.deleteOne({ id });
      // Delete associated questions as well
      await MongooseModels.Question.deleteMany({ test_id: id });
      return res.deletedCount > 0;
    } catch (err) {
      console.error('Mongoose delete test error:', err);
    }
  }

  const index = inMemoryDb.tests.findIndex(item => item.id === id);
  if (index !== -1) {
    inMemoryDb.tests.splice(index, 1);
    // Delete questions too
    inMemoryDb.questions = inMemoryDb.questions.filter(q => q.test_id !== id);
    return true;
  }
  return false;
}

// 5. Questions CRUD
export async function dbCreateQuestionsBulk(questionsData: Omit<IQuestion, 'id'>[]): Promise<string[]> {
  const isConnected = await ensureSeeding();
  const createdIds: string[] = [];

  if (isConnected) {
    try {
      // Clear existing questions for this test to match "overwrite" bulk creation
      if (questionsData.length > 0) {
        const testId = questionsData[0].test_id;
        await MongooseModels.Question.deleteMany({ test_id: testId });
      }

      const docs = questionsData.map(q => {
        const qId = generateId();
        createdIds.push(qId);
        return {
          ...q,
          id: qId,
        };
      });

      await MongooseModels.Question.insertMany(docs);
      return createdIds;
    } catch (err) {
      console.error('Mongoose bulk create questions error:', err);
      // Fallback
    }
  }

  // Fallback / In-Memory
  if (questionsData.length > 0) {
    const testId = questionsData[0].test_id;
    inMemoryDb.questions = inMemoryDb.questions.filter(q => q.test_id !== testId);
  }

  questionsData.forEach(q => {
    const qId = generateId();
    createdIds.push(qId);
    inMemoryDb.questions.push({
      ...q,
      id: qId,
    });
  });

  return createdIds;
}

export async function dbGetQuestionsByIds(questionIds: string[]): Promise<IQuestion[]> {
  const isConnected = await ensureSeeding();
  if (isConnected) {
    try {
      const docs = await MongooseModels.Question.find({ id: { $in: questionIds } }).lean();
      // Maintain the order of questionIds
      const map = new Map(docs.map((doc: any) => [doc.id, {
        id: doc.id,
        type: doc.type as any,
        question: doc.question,
        option1: doc.option1,
        option2: doc.option2,
        option3: doc.option3,
        option4: doc.option4,
        correct_option: doc.correct_option as any,
        explanation: doc.explanation,
        difficulty: doc.difficulty as any,
        topic: doc.topic,
        sub_topic: doc.sub_topic,
        media_url: doc.media_url,
        test_id: doc.test_id,
      }]));
      return questionIds.map(id => map.get(id)).filter(Boolean) as IQuestion[];
    } catch (err) {
      console.error('Mongoose get questions by ids error:', err);
    }
  }

  return inMemoryDb.questions.filter(q => q.id && questionIds.includes(q.id));
}

// 6. Session Cache CRUD
export async function dbSaveSession(userId: string, externalToken: string, user: any): Promise<any> {
  const isConnected = await ensureSeeding();
  const sessionData = {
    userId,
    externalToken,
    user,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  if (isConnected) {
    try {
      const doc = await SessionModel.findOneAndUpdate(
        { userId },
        sessionData,
        { upsert: true, new: true }
      ).lean();
      return doc;
    } catch (err) {
      console.error('Mongoose save session error:', err);
    }
  }

  // In Memory
  const index = inMemoryDb.sessions.findIndex(s => s.userId === userId);
  if (index !== -1) {
    inMemoryDb.sessions[index] = sessionData;
  } else {
    inMemoryDb.sessions.push(sessionData);
  }
  return sessionData;
}

export async function dbGetSession(userId: string): Promise<any | null> {
  const isConnected = await ensureSeeding();
  if (isConnected) {
    try {
      const doc = await SessionModel.findOne({ userId }).lean();
      return doc;
    } catch (err) {
      console.error('Mongoose get session error:', err);
    }
  }

  const s = inMemoryDb.sessions.find(item => item.userId === userId);
  return s || null;
}

export async function dbDeleteSession(userId: string): Promise<boolean> {
  const isConnected = await ensureSeeding();
  if (isConnected) {
    try {
      const res = await SessionModel.deleteOne({ userId });
      return res.deletedCount > 0;
    } catch (err) {
      console.error('Mongoose delete session error:', err);
    }
  }

  const index = inMemoryDb.sessions.findIndex(s => s.userId === userId);
  if (index !== -1) {
    inMemoryDb.sessions.splice(index, 1);
    return true;
  }
  return false;
}
