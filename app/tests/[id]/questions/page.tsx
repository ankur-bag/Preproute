// app/tests/[id]/questions/page.tsx
'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Pencil, 
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  ClipboardList,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { EditTestModal } from '@/components/test/EditTestModal';
import { TiptapEditor } from '@/components/questions/TiptapEditor';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import clientApi from '@/lib/clientApi';
import { Test, Question, Subject, Topic, SubTopic, Difficulty } from '@/types';

// Simple unique ID generator
const generateLocalId = () => Math.random().toString(36).substring(2, 15);

// Helper to strip HTML tags for validation
const isHtmlContentEmpty = (html: string) => {
  const tmp = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (!tmp) return !html || html.trim() === '' || html === '<p></p>';
  tmp.innerHTML = html;
  const txt = tmp.textContent || tmp.innerText || '';
  return txt.trim() === '';
};

interface LocalQuestion {
  id?: string;
  _localId: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: 'option1' | 'option2' | 'option3' | 'option4';
  explanation: string;
  difficulty: Difficulty | '';
  topic: string;
  sub_topic: string;
  media_url: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function QuestionsPage({ params }: PageProps) {
  const { id: testId } = use(params);
  const router = useRouter();
  
  // Test Details
  const [test, setTest] = useState<Test | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);
  
  // Local state for question list
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal control states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const fetchTestData = async () => {
    try {
      const [testRes, subjectsRes] = await Promise.all([
        clientApi.get(`/tests/${testId}`),
        clientApi.get('/subjects'),
      ]);

      if (testRes.data.success && testRes.data.data) {
        const testObj = testRes.data.data;
        setTest(testObj);

        // Fetch subjects
        if (subjectsRes.data.success) {
          setSubjects(subjectsRes.data.data);
        }

        // Fetch Topics configured for this subject
        const topicsRes = await clientApi.get(`/topics/subject/${testObj.subject}`);
        if (topicsRes.data.success) {
          // Filter to only topics selected in the test if needed,
          // but the PRD says the question's topic dropdown should let the user choose
          // among the test's selected topics. Let's filter to only test topics!
          const testTopics = topicsRes.data.data.filter((t: Topic) => testObj.topics?.includes(t.id));
          setTopics(testTopics);
        }

        // Fetch Subtopics for these test topics
        if (testObj.topics && testObj.topics.length > 0) {
          const subTopicsRes = await clientApi.post('/sub-topics/multi-topics', {
            topic_ids: testObj.topics,
          });
          if (subTopicsRes.data.success) {
            // Filter to only subtopics selected in test if they exist
            let filteredSub = subTopicsRes.data.data;
            if (testObj.sub_topics && testObj.sub_topics.length > 0) {
              filteredSub = subTopicsRes.data.data.filter((st: SubTopic) => testObj.sub_topics?.includes(st.id));
            }
            setSubTopics(filteredSub);
          }
        }

        // Load Questions if they already exist
        if (testObj.questions && testObj.questions.length > 0) {
          const qRes = await clientApi.post('/questions/fetchBulk', {
            question_ids: testObj.questions,
          });
          if (qRes.data.success && qRes.data.data) {
            const list: LocalQuestion[] = qRes.data.data.map((q: Question) => ({
              id: q.id,
              _localId: generateLocalId(),
              question: q.question,
              option1: q.option1,
              option2: q.option2,
              option3: q.option3,
              option4: q.option4,
              correct_option: q.correct_option,
              explanation: q.explanation || '',
              difficulty: q.difficulty || '',
              topic: q.topic || '',
              sub_topic: q.sub_topic || '',
              media_url: q.media_url || '',
            }));
            setQuestions(list);
          }
        } else {
          // Push initial blank question
          setQuestions([createBlankQuestion()]);
        }
      } else {
        toast.error('Test not found.');
        router.push('/dashboard');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load test details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestData();
  }, [testId]);

  const createBlankQuestion = (): LocalQuestion => ({
    _localId: generateLocalId(),
    question: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correct_option: 'option1',
    explanation: '',
    difficulty: '',
    topic: '',
    sub_topic: '',
    media_url: '',
  });

  const handleAddQuestion = () => {
    const newQ = createBlankQuestion();
    setQuestions([...questions, newQ]);
    setActiveIndex(questions.length);
    setIsDirty(true);
  };

  const handleRemoveQuestion = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (questions.length <= 1) {
      toast.error('A test must contain at least 1 question.');
      return;
    }
    const updated = questions.filter((_, idx) => idx !== indexToRemove);
    setQuestions(updated);
    setIsDirty(true);
    
    // Adjust active index
    if (activeIndex >= updated.length) {
      setActiveIndex(updated.length - 1);
    }
  };

  // Update current question field values
  const updateActiveQuestion = (field: keyof LocalQuestion, value: any) => {
    const updated = [...questions];
    updated[activeIndex] = {
      ...updated[activeIndex],
      [field]: value,
    };
    setQuestions(updated);
    setIsDirty(true);
  };

  const handleDeleteAllEdits = () => {
    if (window.confirm('Are you sure you want to discard all current modifications?')) {
      fetchTestData();
      setIsDirty(false);
    }
  };

  // Validates questions: returns true if clean
  const validateQuestions = () => {
    // 1. Must have at least 1 question
    if (questions.length === 0) {
      toast.error('Please add at least one question.');
      return false;
    }

    // 2. Validate fields for each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (isHtmlContentEmpty(q.question)) {
        toast.error(`Question ${i + 1}: Question text cannot be empty.`);
        setActiveIndex(i);
        return false;
      }
      if (!q.option1.trim() || !q.option2.trim() || !q.option3.trim() || !q.option4.trim()) {
        toast.error(`Question ${i + 1}: All 4 options are required.`);
        setActiveIndex(i);
        return false;
      }
      if (!q.correct_option) {
        toast.error(`Question ${i + 1}: Please select a correct option.`);
        setActiveIndex(i);
        return false;
      }
    }
    return true;
  };

  const handleSaveAndNext = async () => {
    if (!validateQuestions()) return;
    
    setSaving(true);
    try {
      // 1. Bulk create/overwrite questions
      const payload = {
        questions: questions.map((q) => ({
          type: 'mcq',
          question: q.question,
          option1: q.option1,
          option2: q.option2,
          option3: q.option3,
          option4: q.option4,
          correct_option: q.correct_option,
          explanation: q.explanation || undefined,
          difficulty: q.difficulty || undefined,
          topic: q.topic || undefined,
          sub_topic: q.sub_topic || undefined,
          test_id: testId,
        })),
      };

      const qRes = await clientApi.post('/questions/bulk', payload);
      if (!qRes.data.success || !qRes.data.data) {
        throw new Error(qRes.data.message || 'Failed to save questions bulk');
      }

      const returnedData = qRes.data.data;
      // Extract IDs if it is an array of objects, otherwise use it directly
      const returnedIds = Array.isArray(returnedData)
        ? returnedData.map((item: any) => typeof item === 'object' && item !== null && item.id ? item.id : item)
        : [];

      // 2. Link question IDs to test
      const testPayload = {
        questions: returnedIds,
        total_questions: returnedIds.length,
        total_marks: (test?.correct_marks || 5) * returnedIds.length,
      };

      const testRes = await clientApi.put(`/tests/${testId}`, testPayload);
      if (testRes.data.success) {
        toast.success('Questions saved successfully!');
        setIsDirty(false);
        router.push(`/tests/${testId}/publish`);
      } else {
        throw new Error(testRes.data.message || 'Failed to update test question associations');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error occurred while saving questions.');
    } finally {
      setSaving(false);
    }
  };

  // Warn user if exiting with unsaved changes
  const handleExitClick = () => {
    if (isDirty) {
      setExitConfirmOpen(true);
    } else {
      router.push('/dashboard');
    }
  };

  const activeQuestion = questions[activeIndex];

  // Mapping subject name
  const subjectName = test ? subjects.find((s) => s.id === test.subject)?.name || test.subject : '';

  // Options configuration
  const currentTopics = topics.filter((t) => test?.topics?.includes(t.id));
  const currentSubTopics = subTopics.filter((st) => {
    // If a topic is selected in question settings, filter by it.
    // Otherwise show all subtopics configured in the test
    if (activeQuestion?.topic) {
      return st.topic_id === activeQuestion.topic;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500 font-medium">Loading question editor...</div>
      </div>
    );
  }

  return (
    <AuthGuard
      breadcrumbs={[
        { label: 'Test Creation', href: '/dashboard' },
        { label: 'Add Questions' },
      ]}
    >
      <div className="flex items-stretch gap-6 -mt-2 -mx-6 h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Left Side: Question List Panel */}
        <div
          className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
            leftPanelCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-[280px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-150 select-none">
            <div>
              <h3 className="font-medium text-gray-950 text-sm">Question creation</h3>
              <p className="text-xs text-gray-400 font-normal mt-1">
                Total Questions . {questions.length}
              </p>
            </div>
            <button
              onClick={() => setLeftPanelCollapsed(true)}
              className="rounded-lg p-1 hover:bg-gray-50 text-gray-400 hover:text-gray-600 focus:outline-none"
              title="Collapse Panel"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          {/* Question List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {questions.map((q, idx) => {
              const hasContent = !isHtmlContentEmpty(q.question);
              const isActive = idx === activeIndex;
              return (
                <div
                  key={q._localId}
                  onClick={() => setActiveIndex(idx)}
                  className={`group relative flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all select-none ${
                    isActive
                      ? 'border-[#5B6BF5] border-l-4 pl-2.5 bg-[#5B6BF5]/5 text-[#5B6BF5]'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      size={16}
                      className={hasContent ? 'text-[#10B981] fill-green-50' : 'text-gray-300'}
                    />
                    <span className={`text-xs font-medium ${isActive ? 'text-[#5B6BF5]' : 'text-gray-500'}`}>
                      Question {idx + 1}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {/* Remove question */}
                    <button
                      onClick={(e) => handleRemoveQuestion(idx, e)}
                      className="opacity-0 group-hover:opacity-100 rounded-md p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all focus:outline-none"
                      title="Delete Question"
                    >
                      <Trash2 size={13} />
                    </button>
                    <ChevronRight size={14} className="text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar Foot Buttons */}
          <div className="p-4 border-t border-gray-150 space-y-2">
            <Button
              onClick={handleAddQuestion}
              variant="outline"
              className="w-full text-xs font-medium border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-1.5 h-10 shadow-sm"
            >
              <Plus size={14} />
              <span>Question</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled
              className="w-full text-xs font-medium border-gray-100 bg-gray-50/50 text-gray-400 cursor-not-allowed flex items-center justify-center gap-1.5 h-10"
            >
              <span>+ Chapter</span>
            </Button>
          </div>
        </div>

        {/* Restore Panel trigger (when collapsed) */}
        {leftPanelCollapsed && (
          <button
            onClick={() => setLeftPanelCollapsed(false)}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-[#1A1A2E] text-white border-l border-y border-white/15 hover:bg-[#5B6BF5] rounded-r-lg p-2 shadow-lg focus:outline-none"
            title="Expand Panel"
          >
            <ChevronRight size={18} />
          </button>
        )}

        {/* Right Side: Main Editing Canvas */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6 bg-[#F7F8FC]">
          
          {/* Header Action Bar (Breadcrumbs & Publish) */}
          <div className="flex items-center justify-between select-none">
            <div className="text-xs text-gray-400 font-normal flex items-center gap-1.5">
              <span>Test Creation</span>
              <span>/</span>
              <span>Create Test</span>
              <span>/</span>
              <span className="text-gray-500 font-medium">
                {test?.type === 'chapter_wise' ? 'Chapterwise' : test?.type === 'pyq' ? 'PYQ' : 'Mock Test'}
              </span>
            </div>
            <Button
              onClick={handleSaveAndNext}
              className="font-medium bg-[#5B6BF5] hover:bg-[#4a5ae4] text-white shadow-sm flex items-center gap-1.5 h-9 px-6 rounded-lg text-xs"
              isLoading={saving}
            >
              <span>Publish</span>
            </Button>
          </div>

          {/* Test Metadata Overview Panel */}
          {test && (
            <div className="relative border border-gray-150 rounded-xl p-5 bg-white shadow-sm flex flex-wrap gap-4 items-center justify-between select-none">
              <div className="space-y-3 flex-1 min-w-[280px]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-white bg-[#1A1A2E] px-2 py-0.5 rounded uppercase tracking-wide">
                    {test.type === 'chapter_wise' ? 'Chapterwise' : test.type === 'pyq' ? 'PYQ' : 'Mock Test'}
                  </span>
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                    📖 Chapter 1
                  </span>
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded capitalize">
                    {test.difficulty}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-1 text-xs font-normal text-gray-500">
                  <div className="flex items-center gap-1">
                    <span className="w-16 text-gray-400">Subject</span>
                    <span>: {subjectName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-16 text-gray-400">Topic</span>
                    <span className="flex items-center gap-1.5">
                      : {currentTopics.map(t => (
                        <span key={t.id} className="bg-amber-50 text-amber-600 border border-amber-100 rounded px-1.5 py-0.5 text-[10px]">
                          {t.name}
                        </span>
                      ))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-16 text-gray-400">Sub Topic</span>
                    <span className="flex items-center gap-1.5">
                      : {currentSubTopics.map(st => (
                        <span key={st.id} className="bg-amber-50 text-amber-600 border border-amber-100 rounded px-1.5 py-0.5 text-[10px]">
                          {st.name}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 select-none">
                {/* Meta details outlined badge block */}
                <div className="flex items-center gap-2.5 border border-gray-150 rounded-lg p-1.5 px-3 bg-gray-50/35 text-[11px] text-gray-400 font-normal">
                  <span className="flex items-center gap-1">
                    ⏱️ {test.total_time} Min
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="flex items-center gap-1">
                    📝 {test.total_questions} Q's
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="flex items-center gap-1">
                    🏆 {test.total_marks} Marks
                  </span>
                </div>
                
                {/* Pencil Edit Icon */}
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-amber-600 transition-colors focus:outline-none cursor-pointer"
                  title="Edit test configuration"
                >
                  <Pencil size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Discard Links */}
          <div className="flex items-center justify-between -mb-2 select-none">
            <span className="text-xs font-normal text-gray-400 uppercase tracking-wider">
              Question {activeIndex + 1} <span className="text-gray-300">/</span> {questions.length}
            </span>
            {isDirty && (
              <button
                onClick={handleDeleteAllEdits}
                className="text-xs text-red-500 hover:text-red-600 hover:underline focus:outline-none cursor-pointer"
              >
                🗑️ Delete All Edits
              </button>
            )}
          </div>

          {/* Active Question Editor Card */}
          {activeQuestion && (
            <div className="border border-gray-150 rounded-xl p-6 bg-white shadow-sm space-y-6">
              
              {/* Question card header */}
              <div className="flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    Question {activeIndex + 1} <span className="text-gray-300 font-normal">/</span> {questions.length}
                  </span>
                  <div className="flex rounded-md border border-gray-150 bg-gray-50 p-0.5">
                    <button
                      type="button"
                      className="px-2 py-0.5 text-[9px] font-medium bg-white text-gray-900 rounded border border-gray-100 select-none uppercase tracking-wide cursor-pointer"
                    >
                      + MCQ
                    </button>
                    <button
                      type="button"
                      disabled
                      className="px-2 py-0.5 text-[9px] font-medium text-gray-400 select-none cursor-not-allowed uppercase tracking-wide"
                    >
                      + CSV
                    </button>
                  </div>
                </div>

                {/* Left/Right controls (Header) */}
                <div className="flex items-center gap-1">
                  <button
                    disabled={activeIndex === 0}
                    onClick={() => setActiveIndex(activeIndex - 1)}
                    className="rounded-lg p-1 border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-30 disabled:hover:bg-transparent focus:outline-none cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={activeIndex === questions.length - 1}
                    onClick={() => setActiveIndex(activeIndex + 1)}
                    className="rounded-lg p-1 border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-30 disabled:hover:bg-transparent focus:outline-none cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Tiptap Rich Text Editor */}
              <div className="space-y-1.5">
                <TiptapEditor
                  value={activeQuestion.question}
                  onChange={(val) => updateActiveQuestion('question', val)}
                />
              </div>

              {/* Options Section */}
              <div className="space-y-4 pt-2">
                <span className="text-sm font-medium text-gray-900 block select-none">
                  Type the options below
                </span>

                <div className="space-y-3.5">
                  {(['option1', 'option2', 'option3', 'option4'] as const).map((optKey, idx) => {
                    const alphabet = ['A', 'B', 'C', 'D'][idx];
                    const isSelected = activeQuestion.correct_option === optKey;
                    return (
                      <div key={optKey} className="flex items-center gap-3">
                        {/* Radio select bubble */}
                        <button
                          type="button"
                          onClick={() => updateActiveQuestion('correct_option', optKey)}
                          className={`h-5 w-5 rounded-full flex items-center justify-center border text-[10px] select-none transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#5B6BF5] bg-white text-[#5B6BF5] ring-2 ring-[#5B6BF5]/15 font-semibold'
                              : 'border-gray-300 hover:border-gray-400 text-gray-400 bg-white'
                          }`}
                        >
                          {isSelected ? '✓' : ''}
                        </button>
                        
                        {/* Option text input */}
                        <div className="flex-1">
                          <Input
                            placeholder="Type Option here"
                            value={activeQuestion[optKey]}
                            onChange={(e) => updateActiveQuestion(optKey, e.target.value)}
                            className="bg-transparent border-gray-250 focus:ring-[#5B6BF5]/10 h-10 text-sm"
                          />
                        </div>

                        {/* Visual Delete icon */}
                        <button
                          type="button"
                          onClick={() => updateActiveQuestion(optKey, '')}
                          className="rounded-lg p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 focus:outline-none transition-colors cursor-pointer"
                          title="Clear option text"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explanation textarea */}
              <div className="space-y-2 pt-2">
                <div className="text-sm font-medium text-gray-900 select-none">Add Solution</div>
                <Textarea
                  placeholder="Type here"
                  value={activeQuestion.explanation}
                  onChange={(e) => updateActiveQuestion('explanation', e.target.value)}
                />
              </div>

              {/* Center Chevron Nav Controls below explanation */}
              <div className="flex items-center justify-center gap-6 py-2 select-none">
                <button
                  disabled={activeIndex === 0}
                  onClick={() => setActiveIndex(activeIndex - 1)}
                  className="text-gray-400 hover:text-gray-800 disabled:opacity-30 focus:outline-none cursor-pointer"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  disabled={activeIndex === questions.length - 1}
                  onClick={() => setActiveIndex(activeIndex + 1)}
                  className="text-gray-400 hover:text-gray-800 disabled:opacity-30 focus:outline-none cursor-pointer"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Settings selectors */}
              <div className="border-t border-gray-100 pt-5 space-y-4">
                <span className="text-sm font-medium text-gray-900 block select-none">
                  Question settings
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Difficulty dropdown */}
                  <Select
                    label="Level of Difficulty"
                    placeholder="Select from Drop-down"
                    options={[
                      { value: 'easy', label: 'Easy' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'difficult', label: 'Difficult' },
                    ]}
                    value={activeQuestion.difficulty}
                    onChange={(e) => updateActiveQuestion('difficulty', e.target.value)}
                  />

                  {/* Topic dropdown */}
                  <Select
                    label="Topic"
                    placeholder="Select from Drop-down"
                    options={currentTopics.map((t) => ({ value: t.id, label: t.name }))}
                    value={activeQuestion.topic}
                    onChange={(e) => {
                      updateActiveQuestion('topic', e.target.value);
                      updateActiveQuestion('sub_topic', ''); // clear subtopic
                    }}
                    disabled={currentTopics.length === 0}
                  />

                  {/* SubTopic dropdown */}
                  <Select
                    label="Sub-topic"
                    placeholder="Select from Drop-down"
                    options={currentSubTopics.map((st) => ({ value: st.id, label: st.name }))}
                    value={activeQuestion.sub_topic}
                    onChange={(e) => updateActiveQuestion('sub_topic', e.target.value)}
                    disabled={currentSubTopics.length === 0}
                  />
                </div>
              </div>

            </div>
          )}

          {/* Bottom Nav Actions */}
          <div className="flex items-center justify-between border-t border-gray-150 pt-6 select-none">
            <Button
              type="button"
              onClick={handleExitClick}
              variant="outline"
              className="text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200 h-11 px-6 shadow-sm"
            >
              Exit Test Creation
            </Button>
            <Button
              onClick={handleSaveAndNext}
              className="font-medium bg-[#5B6BF5] hover:bg-[#4a5ae4] text-white px-10 shadow-md h-11 rounded-lg"
              isLoading={saving}
            >
              <span>Next</span>
            </Button>
          </div>

        </div>

      </div>

      {/* Edit Test Metadata Modal */}
      {test && (
        <EditTestModal
          test={test}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={fetchTestData}
        />
      )}

      {/* Exit Warn Dialog */}
      <Modal
        isOpen={exitConfirmOpen}
        onClose={() => setExitConfirmOpen(false)}
        title="Discard Changes?"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-50 p-2 text-amber-600 border border-amber-200">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Unsaved work detected</h4>
              <p className="text-xs text-gray-500 font-medium mt-1">
                You have modified questions. Exiting will discard your modifications. Are you sure you want to exit?
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setExitConfirmOpen(false)}
            >
              Stay
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => router.push('/dashboard')}
            >
              Discard & Exit
            </Button>
          </div>
        </div>
      </Modal>

    </AuthGuard>
  );
}
