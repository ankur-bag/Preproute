// lib/mockDatabase.ts
import { Subject, Topic, SubTopic, Test, Question } from '@/types';

// Global singleton to store mock data in memory across API requests in dev/run time
interface InMemoryDB {
  subjects: Subject[];
  topics: Topic[];
  subTopics: SubTopic[];
  tests: Test[];
  questions: Question[];
  sessions: any[];
}

let inMemoryDb: InMemoryDB = (global as any).inMemoryDb;

if (!inMemoryDb) {
  inMemoryDb = (global as any).inMemoryDb = {
    subjects: [
      { id: 'subj-physics', name: 'Physics' },
      { id: 'subj-chemistry', name: 'Chemistry' },
      { id: 'subj-maths', name: 'Mathematics' },
      { id: 'subj-biology', name: 'Biology' },
    ],
    topics: [
      // Physics
      { id: 'topic-mechanics', name: 'Mechanics', subject_id: 'subj-physics' },
      { id: 'topic-electro', name: 'Electromagnetism', subject_id: 'subj-physics' },
      { id: 'topic-optics', name: 'Optics', subject_id: 'subj-physics' },
      // Chemistry
      { id: 'topic-organic', name: 'Organic Chemistry', subject_id: 'subj-chemistry' },
      { id: 'topic-inorganic', name: 'Inorganic Chemistry', subject_id: 'subj-chemistry' },
      { id: 'topic-physical', name: 'Physical Chemistry', subject_id: 'subj-chemistry' },
      // Mathematics
      { id: 'topic-algebra', name: 'Algebra', subject_id: 'subj-maths' },
      { id: 'topic-calculus', name: 'Calculus', subject_id: 'subj-maths' },
      { id: 'topic-coordinate', name: 'Coordinate Geometry', subject_id: 'subj-maths' },
      // Biology
      { id: 'topic-botany', name: 'Botany', subject_id: 'subj-biology' },
      { id: 'topic-zoology', name: 'Zoology', subject_id: 'subj-biology' },
    ],
    subTopics: [
      // Mechanics
      { id: 'subtopic-kinematics', name: 'Kinematics', topic_id: 'topic-mechanics' },
      { id: 'subtopic-nlm', name: 'Laws of Motion', topic_id: 'topic-mechanics' },
      { id: 'subtopic-wep', name: 'Work, Energy, and Power', topic_id: 'topic-mechanics' },
      // Electromagnetism
      { id: 'subtopic-electrostatics', name: 'Electrostatics', topic_id: 'topic-electro' },
      { id: 'subtopic-current', name: 'Current Electricity', topic_id: 'topic-electro' },
      // Organic Chemistry
      { id: 'subtopic-hydrocarbons', name: 'Hydrocarbons', topic_id: 'topic-organic' },
      { id: 'subtopic-alcohols', name: 'Alcohols, Phenols, and Ethers', topic_id: 'topic-organic' },
      // Algebra
      { id: 'subtopic-quadratic', name: 'Quadratic Equations', topic_id: 'topic-algebra' },
      { id: 'subtopic-matrices', name: 'Matrices and Determinants', topic_id: 'topic-algebra' },
      // Calculus
      { id: 'subtopic-limits', name: 'Limits and Continuity', topic_id: 'topic-calculus' },
      { id: 'subtopic-diff', name: 'Differentiation', topic_id: 'topic-calculus' },
      { id: 'subtopic-integration', name: 'Integration', topic_id: 'topic-calculus' },
    ],
    tests: [],
    questions: [],
    sessions: [],
  };
}

export { inMemoryDb };
