// models/MockData.ts
import mongoose, { Schema, Document } from 'mongoose';

// Subject Schema
export interface ISubject extends Document {
  id: string;
  name: string;
}
const SubjectSchema = new Schema<ISubject>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
});

export const Subject = mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);

// Topic Schema
export interface ITopic extends Document {
  id: string;
  name: string;
  subject_id: string;
}
const TopicSchema = new Schema<ITopic>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  subject_id: { type: String, required: true },
});

export const Topic = mongoose.models.Topic || mongoose.model<ITopic>('Topic', TopicSchema);

// SubTopic Schema
export interface ISubTopic extends Document {
  id: string;
  name: string;
  topic_id: string;
}
const SubTopicSchema = new Schema<ISubTopic>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  topic_id: { type: String, required: true },
});

export const SubTopic = mongoose.models.SubTopic || mongoose.model<ISubTopic>('SubTopic', SubTopicSchema);

// Test Schema
export interface ITest extends Document {
  id: string;
  name: string;
  type: string;
  subject: string;
  topics: string[];
  sub_topics?: string[];
  correct_marks: number;
  wrong_marks: number;
  unattempt_marks: number;
  difficulty: string;
  total_time: number;
  total_marks: number;
  total_questions: number;
  status: string | null;
  created_at: Date;
  questions?: string[];
}
const TestSchema = new Schema<ITest>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  subject: { type: String, required: true },
  topics: [{ type: String }],
  sub_topics: [{ type: String }],
  correct_marks: { type: Number, required: true },
  wrong_marks: { type: Number, required: true },
  unattempt_marks: { type: Number, required: true },
  difficulty: { type: String, required: true },
  total_time: { type: Number, required: true },
  total_marks: { type: Number, required: true },
  total_questions: { type: Number, required: true },
  status: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  questions: [{ type: String }],
});

export const Test = mongoose.models.Test || mongoose.model<ITest>('Test', TestSchema);

// Question Schema
export interface IQuestion extends Document {
  id: string;
  type: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: string;
  explanation?: string;
  difficulty?: string;
  topic?: string;
  sub_topic?: string;
  media_url?: string;
  test_id: string;
}
const QuestionSchema = new Schema<IQuestion>({
  id: { type: String, required: true, unique: true },
  type: { type: String, default: 'mcq' },
  question: { type: String, required: true },
  option1: { type: String, required: true },
  option2: { type: String, required: true },
  option3: { type: String, required: true },
  option4: { type: String, required: true },
  correct_option: { type: String, required: true },
  explanation: { type: String },
  difficulty: { type: String },
  topic: { type: String },
  sub_topic: { type: String },
  media_url: { type: String },
  test_id: { type: String, required: true },
});

export const Question = mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);
