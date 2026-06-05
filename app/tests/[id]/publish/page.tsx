// app/tests/[id]/publish/page.tsx
'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  ArrowLeft, 
  Pencil, 
  Eye, 
  Bookmark,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { EditTestModal } from '@/components/test/EditTestModal';
import { Button } from '@/components/ui/Button';
import clientApi from '@/lib/clientApi';
import { Test, Question, Subject, Topic, SubTopic } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PublishPage({ params }: PageProps) {
  const { id: testId } = use(params);
  const router = useRouter();

  const [test, setTest] = useState<Test | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Tab State: 'now' | 'schedule'
  const [publishTab, setPublishTab] = useState<'now' | 'schedule'>('now');

  // Publish Form parameters
  const [liveUntil, setLiveUntil] = useState<string>('always');
  const [customDate, setCustomDate] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('12:00');
  
  // Schedule Form parameters
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('09:00');

  // Edit Test Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);

  const fetchPublishData = async () => {
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

        // Fetch Topics
        const topicsRes = await clientApi.get(`/topics/subject/${testObj.subject}`);
        if (topicsRes.data.success) {
          setTopics(topicsRes.data.data);
        }

        // Fetch Subtopics
        if (testObj.topics && testObj.topics.length > 0) {
          const subTopicsRes = await clientApi.post('/sub-topics/multi-topics', {
            topic_ids: testObj.topics,
          });
          if (subTopicsRes.data.success) {
            setSubTopics(subTopicsRes.data.data);
          }
        }

        // Fetch Questions details
        if (testObj.questions && testObj.questions.length > 0) {
          const qRes = await clientApi.post('/questions/fetchBulk', {
            question_ids: testObj.questions,
          });
          if (qRes.data.success && qRes.data.data) {
            setQuestions(qRes.data.data);
          }
        }
      } else {
        toast.error('Test not found.');
        router.push('/dashboard');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load preview details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublishData();
  }, [testId]);

  const handleConfirmPublish = async () => {
    setPublishing(true);
    try {
      // Build additional status properties
      const statusPayload = {
        status: 'live',
        publish_config: {
          tab: publishTab,
          live_until: liveUntil,
          custom_until: liveUntil === 'custom' ? { date: customDate, time: customTime } : null,
          schedule: publishTab === 'schedule' ? { date: scheduleDate, time: scheduleTime } : null,
        },
      };

      const res = await clientApi.put(`/tests/${testId}`, statusPayload);
      if (res.data.success) {
        toast.success(
          publishTab === 'now' 
            ? 'Test published successfully!' 
            : 'Test publication scheduled successfully!'
        );
        router.push('/dashboard');
      } else {
        throw new Error(res.data.message || 'Publishing failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to publish test');
    } finally {
      setPublishing(false);
    }
  };

  const getSubjectName = (subId: string) => {
    return subjects.find((s) => s.id === subId)?.name || subId;
  };

  const getTopicNames = (topicIds: string[]) => {
    return topics
      .filter((t) => topicIds?.includes(t.id))
      .map((t) => t.name);
  };

  const getSubTopicNames = (subTopicIds?: string[]) => {
    if (!subTopicIds) return [];
    return subTopics
      .filter((st) => subTopicIds.includes(st.id))
      .map((st) => st.name);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500 font-medium">Loading test details...</div>
      </div>
    );
  }

  const breadcrumbs = [
    { label: 'Test Creation', href: '/dashboard' },
    { label: 'Preview & Publish' },
  ];

  return (
    <AuthGuard breadcrumbs={breadcrumbs}>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Title Heading */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Test creation</h1>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full select-none shadow-sm">
            <CheckCircle2 size={13} className="text-[#10B981]" />
            Test created • All {questions.length} Questions done
          </span>
        </div>

        {/* Test metadata card */}
        {test && (
          <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm flex flex-wrap gap-4 items-center justify-between">
            <div className="space-y-1.5 flex-1 min-w-[280px]">
              <div className="flex items-center gap-3 select-none">
                <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {test.type.replace('_', ' ')}
                </span>
                <span className="text-xs font-bold text-gray-400 uppercase">{test.difficulty}</span>
              </div>
              <h3 className="font-bold text-gray-990 text-base">{test.name}</h3>
              
              <div className="flex flex-wrap gap-2.5 pt-1.5 select-none">
                {/* Subject name */}
                <span className="text-xs font-semibold text-[#5B6BF5] bg-[#5B6BF5]/5 border border-[#5B6BF5]/15 px-2.5 py-0.5 rounded-full">
                  {getSubjectName(test.subject)}
                </span>
                {/* Topic badges */}
                {getTopicNames(test.topics).map((n) => (
                  <span key={n} className="text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full">
                    {n}
                  </span>
                ))}
                {/* Subtopic badges */}
                {getSubTopicNames(test.sub_topics).map((n) => (
                  <span key={n} className="text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-0.5 rounded-full">
                    {n}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6 select-none">
              <div className="flex flex-col gap-0.5 text-center">
                <span className="text-xs font-medium text-gray-400">Duration</span>
                <span className="text-xs font-bold text-gray-900">{test.total_time} Min</span>
              </div>
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex flex-col gap-0.5 text-center">
                <span className="text-xs font-medium text-gray-400">Questions</span>
                <span className="text-xs font-bold text-gray-900">{test.total_questions} Qs</span>
              </div>
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex flex-col gap-0.5 text-center">
                <span className="text-xs font-medium text-gray-400">Marks</span>
                <span className="text-xs font-bold text-gray-900">{test.total_marks} Marks</span>
              </div>
              <div className="h-6 w-px bg-gray-200" />
              
              <button
                onClick={() => setEditModalOpen(true)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-amber-600 transition-colors focus:outline-none"
                title="Edit test configuration"
              >
                <Pencil size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Publish Action Box Card */}
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col">
          {/* Header tabs */}
          <div className="flex bg-gray-50 border-b border-gray-200 px-6">
            <button
              onClick={() => setPublishTab('now')}
              className={`py-4 px-1 text-sm font-semibold tracking-wide border-b-2 mr-6 select-none transition-all focus:outline-none ${
                publishTab === 'now'
                  ? 'border-[#5B6BF5] text-[#5B6BF5]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Publish Now
            </button>
            <button
              onClick={() => setPublishTab('schedule')}
              className={`py-4 px-1 text-sm font-semibold tracking-wide border-b-2 select-none transition-all focus:outline-none ${
                publishTab === 'schedule'
                  ? 'border-[#5B6BF5] text-[#5B6BF5]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Schedule Publish
            </button>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            
            {/* Conditional parameters */}
            {publishTab === 'schedule' && (
              <div className="space-y-2 max-w-md">
                <label className="text-sm font-semibold text-gray-700 block select-none">
                  Select Date and Time
                </label>
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5B6BF5]/20 focus:border-[#5B6BF5]"
                    />
                  </div>
                  <div className="relative w-36">
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5B6BF5]/20 focus:border-[#5B6BF5]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Live Until radio configurations */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 block select-none">
                Live Until
              </label>
              <div className="flex flex-wrap gap-4 items-center">
                {['always', '1_week', '2_weeks', '3_weeks', '1_month', 'custom'].map((opt) => {
                  const label = opt.replace('_', ' ');
                  return (
                    <label
                      key={opt}
                      className={`flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition-all select-none hover:bg-gray-50 capitalize ${
                        liveUntil === opt 
                          ? 'border-[#5B6BF5] bg-[#5B6BF5]/5 text-[#5B6BF5] font-semibold' 
                          : 'bg-white text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        value={opt}
                        checked={liveUntil === opt}
                        onChange={() => setLiveUntil(opt)}
                        className="sr-only"
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Custom live until datetime selector */}
            {liveUntil === 'custom' && (
              <div className="space-y-2 max-w-md bg-gray-50 rounded-lg p-4 border border-gray-150 animate-fade-in select-none">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  End Date and Time
                </span>
                <div className="flex gap-4 mt-1.5">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 focus:outline-none"
                  />
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-32 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-6">
              <Link href={`/tests/${testId}/questions`}>
                <Button variant="outline" className="font-semibold px-6 border-gray-200 hover:border-gray-300">
                  Back
                </Button>
              </Link>
              <div className="flex gap-3">
                <Link href="/dashboard">
                  <Button variant="outline" className="font-semibold border-gray-200 hover:border-gray-300">
                    Cancel
                  </Button>
                </Link>
                <Button
                  onClick={handleConfirmPublish}
                  className="font-semibold px-8 shadow-sm"
                  isLoading={publishing}
                >
                  Confirm
                </Button>
              </div>
            </div>

          </div>
        </div>

        {/* Scrollable Questions list visual preview */}
        <div className="space-y-4 pt-4">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2 select-none">
            <Eye size={18} className="text-[#5B6BF5]" />
            <span>Questions Preview ({questions.length})</span>
          </h2>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id || idx} className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between select-none border-b border-gray-100 pb-2">
                  <span className="text-sm font-bold text-[#5B6BF5]">
                    Question {idx + 1}
                  </span>
                  {q.difficulty && (
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded uppercase select-none">
                      {q.difficulty}
                    </span>
                  )}
                </div>

                {/* Rendered HTML content */}
                <div 
                  className="text-sm text-gray-900 font-medium leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: q.question }}
                />

                {/* Option display items */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 select-none">
                  {([
                    { key: 'option1', prefix: 'A' },
                    { key: 'option2', prefix: 'B' },
                    { key: 'option3', prefix: 'C' },
                    { key: 'option4', prefix: 'D' },
                  ] as const).map(({ key, prefix }) => {
                    const isCorrect = q.correct_option === key;
                    const text = q[key];
                    return (
                      <div 
                        key={key} 
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm transition-all ${
                          isCorrect 
                            ? 'border-green-500 bg-green-50/50 text-green-900 font-semibold' 
                            : 'border-gray-200 bg-white text-gray-700'
                        }`}
                      >
                        <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          isCorrect ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {prefix}
                        </span>
                        <span>{text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Solution description if present */}
                {q.explanation && (
                  <div className="bg-amber-50/30 border border-amber-200/50 rounded-lg p-4 space-y-1">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block select-none">
                      Explanation / Solution
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed font-medium">
                      {q.explanation}
                    </p>
                  </div>
                )}

              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Edit Test Modal inside preview page */}
      {test && (
        <EditTestModal
          test={test}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={fetchPublishData}
        />
      )}

    </AuthGuard>
  );
}
