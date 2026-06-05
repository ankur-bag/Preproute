// types/index.ts

export interface User {
  id: string;
  name: string;
  role: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

export interface SubTopic {
  id: string;
  name: string;
  topic_id: string;
}

export type Difficulty = 'easy' | 'medium' | 'difficult';
export type TestType = 'chapter_wise' | 'pyq' | 'mock_test';
export type TestStatus = 'draft' | 'live' | null;

export interface Test {
  id: string;
  name: string;
  type: TestType;
  subject: string; // subject UUID or string
  topics: string[]; // string[] of UUIDs
  sub_topics?: string[]; // string[] of UUIDs
  correct_marks: number;
  wrong_marks: number; // negative number, e.g., -1
  unattempt_marks: number;
  difficulty: Difficulty;
  total_time: number; // minutes
  total_marks: number;
  total_questions: number;
  status: TestStatus;
  created_at: string;
  questions?: string[]; // array of question IDs
}

export interface Question {
  id?: string;
  _localId?: string; // used for local state management on questions page
  type: 'mcq';
  question: string; // html string from tiptap
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: 'option1' | 'option2' | 'option3' | 'option4';
  explanation?: string;
  difficulty?: Difficulty;
  topic?: string;
  sub_topic?: string;
  media_url?: string;
  test_id: string;
}
