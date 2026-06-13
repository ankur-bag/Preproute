// components/test/EditTestModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { MarkSchemeSpinner } from '@/components/ui/MarkSchemeSpinner';
import { Button } from '@/components/ui/Button';
import clientApi from '@/lib/clientApi';
import { Test, Subject, Topic, SubTopic } from '@/types';

const testSchema = z.object({
  name: z.string().min(1, 'Test name is required'),
  type: z.enum(['chapter_wise', 'pyq', 'mock_test']),
  subject: z.string().min(1, 'Subject is required'),
  topics: z.array(z.string()).min(1, 'At least one topic must be selected'),
  sub_topics: z.array(z.string()).optional(),
  difficulty: z.enum(['easy', 'medium', 'difficult']),
  total_time: z.number().min(1, 'Duration must be at least 1 minute'),
  correct_marks: z.number().min(0, 'Must be at least 0'),
  wrong_marks: z.number().max(0, 'Must be 0 or negative'),
  unattempt_marks: z.number().min(0, 'Must be at least 0'),
  total_questions: z.number().min(1, 'Must be at least 1 question'),
});

type TestFormFields = z.infer<typeof testSchema>;

interface EditTestModalProps {
  test: Test | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditTestModal: React.FC<EditTestModalProps> = ({
  test,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);
  
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TestFormFields>({
    resolver: zodResolver(testSchema),
  });

  const selectedSubject = watch('subject');
  const selectedTopics = watch('topics');
  const correctMarks = watch('correct_marks') || 0;
  const totalQuestions = watch('total_questions') || 0;
  const testType = watch('type');

  // Load initial subjects
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchSubjects = async () => {
      try {
        const { data } = await clientApi.get('/subjects');
        if (data.success) {
          setSubjects(data.data);
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
      }
    };
    fetchSubjects();
  }, [isOpen]);

  // Handle cascading triggers on Subject change
  useEffect(() => {
    if (!isOpen || !selectedSubject) {
      setTopics([]);
      setSubTopics([]);
      return;
    }

    const fetchTopics = async () => {
      setLoadingDropdowns(true);
      try {
        const { data } = await clientApi.get(`/topics/subject/${selectedSubject}`);
        if (data.success) {
          setTopics(data.data);
        }
      } catch (err) {
        console.error('Failed to load topics:', err);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchTopics();
  }, [selectedSubject, isOpen]);

  // Handle cascading triggers on Topics change
  useEffect(() => {
    if (!isOpen || !selectedTopics || selectedTopics.length === 0) {
      setSubTopics([]);
      return;
    }

    const fetchSubTopics = async () => {
      try {
        const { data } = await clientApi.post('/sub-topics/multi-topics', {
          topic_ids: selectedTopics,
        });
        if (data.success) {
          setSubTopics(data.data);
        }
      } catch (err) {
        console.error('Failed to load sub-topics:', err);
      }
    };
    fetchSubTopics();
  }, [selectedTopics, isOpen]);

  // Load and pre-fill form fields when modal opens with a test
  useEffect(() => {
    if (isOpen && test) {
      reset({
        name: test.name,
        type: test.type,
        subject: test.subject,
        topics: test.topics || [],
        sub_topics: test.sub_topics || [],
        difficulty: test.difficulty,
        total_time: test.total_time,
        correct_marks: test.correct_marks,
        wrong_marks: test.wrong_marks,
        unattempt_marks: test.unattempt_marks,
        total_questions: test.total_questions,
      });

      // Trigger load cascading dropdowns for existing data
      const preloadCascades = async () => {
        setLoadingDropdowns(true);
        try {
          // Preload topics
          const tRes = await clientApi.get(`/topics/subject/${test.subject}`);
          if (tRes.data.success) setTopics(tRes.data.data);

          // Preload subtopics
          if (test.topics && test.topics.length > 0) {
            const stRes = await clientApi.post('/sub-topics/multi-topics', {
              topic_ids: test.topics,
            });
            if (stRes.data.success) setSubTopics(stRes.data.data);
          }
        } catch (e) {
          console.error('Error preloading cascading lists:', e);
        } finally {
          setLoadingDropdowns(false);
        }
      };
      preloadCascades();
    }
  }, [test, isOpen, reset]);

  const onSubmit = async (data: TestFormFields) => {
    if (!test) return;
    setSubmitting(true);
    try {
      const calculatedTotalMarks = data.total_questions * data.correct_marks;
      
      const payload = {
        ...data,
        total_marks: calculatedTotalMarks,
      };

      const res = await clientApi.put(`/tests/${test.id}`, payload);
      if (res.data.success) {
        toast.success('Test updated successfully!');
        onSuccess();
        onClose();
      } else {
        throw new Error(res.data.message || 'Update failed');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update test';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalMarksValue = correctMarks * totalQuestions;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Test creation" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Test Type Tab selector */}
        <div className="flex border-b border-gray-100 pb-4">
          <div className="flex rounded-lg border border-gray-100 bg-gray-50/50 p-1 w-full sm:w-fit">
            {(['chapter_wise', 'pyq', 'mock_test'] as const).map((type) => {
              const label = type === 'chapter_wise' ? 'Chapterwise' : type === 'pyq' ? 'PYQ' : 'Mock Test';
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setValue('type', type)}
                  className={`px-4 py-2 text-xs font-medium rounded-md transition-all select-none ${
                    testType === type
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-150'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Restructured Two-Column layout to match download.jpg */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column */}
          <div className="space-y-6">
            {/* Subject Dropdown */}
            <Select
              label="Subject"
              placeholder="Choose from Drop-down"
              options={subjects.map((s) => ({ value: s.id, label: s.name }))}
              error={errors.subject?.message}
              {...register('subject', {
                onChange: (e) => {
                  setValue('topics', []);
                  setValue('sub_topics', []);
                },
              })}
            />

            {/* Topics Multi-Select */}
            <Controller
              name="topics"
              control={control}
              render={({ field }) => (
                <MultiSelect
                  label="Topic"
                  placeholder={loadingDropdowns ? 'Loading topics...' : 'Choose from Drop-down'}
                  options={topics.map((t) => ({ value: t.id, label: t.name }))}
                  value={field.value || []}
                  onChange={(vals) => {
                    field.onChange(vals);
                    setValue('sub_topics', []);
                  }}
                  disabled={loadingDropdowns || !selectedSubject}
                  error={errors.topics?.message}
                />
              )}
            />

            {/* Duration */}
            <Input
              label="Duration (Minutes)"
              type="number"
              placeholder="Enter the time"
              error={errors.total_time?.message}
              {...register('total_time', { valueAsNumber: true })}
            />

            {/* Marking Scheme: Wrong Answer & Unattempted */}
            <div className="space-y-4 pt-2">
              <div className="text-sm font-semibold text-gray-700 select-none">Marking Scheme:</div>
              <div className="grid grid-cols-2 gap-4">
                {/* Wrong Answer */}
                <Controller
                  name="wrong_marks"
                  control={control}
                  render={({ field }) => (
                    <MarkSchemeSpinner
                      label="Wrong Answer"
                      value={field.value}
                      onChange={field.onChange}
                      min={-10}
                      max={0}
                      error={errors.wrong_marks?.message}
                    />
                  )}
                />

                {/* Unattempted */}
                <Controller
                  name="unattempt_marks"
                  control={control}
                  render={({ field }) => (
                    <MarkSchemeSpinner
                      label="Unattempted"
                      value={field.value}
                      onChange={field.onChange}
                      min={0}
                      max={20}
                      error={errors.unattempt_marks?.message}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Test Name */}
            <Input
              label="Name of Test"
              placeholder="Enter name of Test"
              error={errors.name?.message}
              {...register('name')}
            />

            {/* Sub-Topics Multi-Select */}
            <Controller
              name="sub_topics"
              control={control}
              render={({ field }) => (
                <MultiSelect
                  label="Sub Topic"
                  placeholder={
                    !selectedTopics || selectedTopics.length === 0
                      ? 'Select topics first'
                      : 'Choose from Drop-down'
                  }
                  options={subTopics.map((st) => ({ value: st.id, label: st.name }))}
                  value={field.value || []}
                  onChange={field.onChange}
                  disabled={!selectedTopics || selectedTopics.length === 0}
                  error={errors.sub_topics?.message}
                />
              )}
            />

            {/* Difficulty Level Radio */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-gray-700 select-none">
                Test Difficulty Level
              </span>
              <div className="flex gap-4 items-center h-[42px]">
                {(['easy', 'medium', 'difficult'] as const).map((diff) => (
                  <label key={diff} className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 select-none capitalize">
                    <input
                      type="radio"
                      value={diff}
                      checked={watch('difficulty') === diff}
                      onChange={() => setValue('difficulty', diff)}
                      className="h-4 w-4 border-gray-300 text-[#5B6BF5] focus:ring-[#5B6BF5]"
                    />
                    <span>{diff}</span>
                  </label>
                ))}
              </div>
              {errors.difficulty?.message && (
                <span className="text-xs text-red-500 font-medium">{errors.difficulty.message}</span>
              )}
            </div>

            {/* Marking Scheme: Correct Answer, No of Questions, Total Marks */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                {/* Correct Answer */}
                <Controller
                  name="correct_marks"
                  control={control}
                  render={({ field }) => (
                    <MarkSchemeSpinner
                      label="Correct Answer"
                      value={field.value}
                      onChange={field.onChange}
                      min={0}
                      max={20}
                      error={errors.correct_marks?.message}
                    />
                  )}
                />

                {/* Number of Questions */}
                <Input
                  label="No of Questions"
                  type="number"
                  placeholder="Ex:250 Marks"
                  error={errors.total_questions?.message}
                  {...register('total_questions', { valueAsNumber: true })}
                />
              </div>

              {/* Total Marks */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-gray-400 select-none">Total Marks</label>
                <input
                  type="text"
                  disabled
                  placeholder="Ex:250 Marks"
                  value={totalMarksValue ? `${totalMarksValue}` : ''}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-400 select-none cursor-not-allowed text-center"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Button type="button" variant="outline" className="px-6 hover:bg-gray-50 border-gray-200" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="px-6 bg-[#5B6BF5]" isLoading={submitting}>
            Save
          </Button>
        </div>

      </form>
    </Modal>
  );
};
