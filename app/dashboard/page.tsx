// app/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import useRouter from 'next/navigation'; // Wait, let's use import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Eye, 
  PlusCircle, 
  Calendar,
  Layers,
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { EditTestModal } from '@/components/test/EditTestModal';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import clientApi from '@/lib/clientApi';
import { Test, Subject } from '@/types';

export default function DashboardPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  const [deletingTest, setDeletingTest] = useState<Test | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch tests and subjects in parallel
      const [testsRes, subjectsRes] = await Promise.all([
        clientApi.get('/tests'),
        clientApi.get('/subjects'),
      ]);

      if (testsRes.data.success) {
        setTests(testsRes.data.data);
      }
      if (subjectsRes.data.success) {
        setSubjects(subjectsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      toast.error('Failed to refresh tests list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleOpenEdit = (test: Test) => {
    setEditingTest(test);
    setEditModalOpen(true);
  };

  const handleOpenDelete = (test: Test) => {
    setDeletingTest(test);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingTest) return;
    setDeleteLoading(true);
    try {
      const res = await clientApi.delete(`/tests/${deletingTest.id}`);
      if (res.data.success) {
        toast.success('Test deleted successfully!');
        setTests(tests.filter((t) => t.id !== deletingTest.id));
        setDeleteConfirmOpen(false);
      } else {
        throw new Error(res.data.message || 'Delete failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete test');
    } finally {
      setDeleteLoading(false);
      setDeletingTest(null);
    }
  };

  // Helper to resolve Subject Name
  const getSubjectName = (subId: string) => {
    const s = subjects.find((sub) => sub.id === subId);
    return s ? s.name : subId;
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Filter tests by search query
  const filteredTests = tests.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    getSubjectName(t.subject).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AuthGuard breadcrumbs={[{ label: 'Test Creation' }]}>
      <div className="space-y-6">
        
        {/* Upper Header Card */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <ClipboardList className="text-[#5B6BF5]" size={24} />
              <span>Test Creation</span>
            </h1>
            <p className="text-sm text-gray-400 font-medium">
              Create, customize, edit and publish assessment tests.
            </p>
          </div>
          <Link href="/tests/create">
            <Button className="font-semibold shadow-md flex items-center gap-1.5 h-11">
              <Plus size={18} />
              <span>Create New Test</span>
            </Button>
          </Link>
        </div>

        {/* Search controls */}
        {tests.length > 0 && (
          <div className="relative max-w-md w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by test name or subject..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6BF5]/20 focus:border-[#5B6BF5] placeholder:text-gray-400"
            />
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        ) : filteredTests.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-2xl bg-white p-16 text-center shadow-sm">
            <div className="rounded-full bg-[#5B6BF5]/5 p-4 text-[#5B6BF5] mb-4">
              <PlusCircle size={36} />
            </div>
            <h3 className="text-lg font-bold text-gray-950 mb-1">No tests yet</h3>
            <p className="text-sm text-gray-400 font-medium max-w-sm mb-6">
              Get started by creating your first Chapter-wise, PYQ, or Full Mock Test.
            </p>
            <Link href="/tests/create">
              <Button variant="outline" className="font-semibold border-gray-200 hover:border-gray-300">
                Create First Test
              </Button>
            </Link>
          </div>
        ) : (
          /* Data Table */
          <div className="overflow-hidden border border-gray-200 rounded-xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-150">
                  <tr>
                    <th scope="col" className="px-6 py-4">Test Name</th>
                    <th scope="col" className="px-6 py-4">Subject</th>
                    <th scope="col" className="px-6 py-4">Topics Covered</th>
                    <th scope="col" className="px-6 py-4">Status</th>
                    <th scope="col" className="px-6 py-4">Created At</th>
                    <th scope="col" className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {filteredTests.map((t) => {
                    const isLive = t.status === 'live';
                    return (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          <div>
                            <span className="block text-sm font-semibold">{t.name}</span>
                            <span className="text-xs text-gray-400 capitalize font-medium">
                              {t.type.replace('_', ' ')} • {t.total_questions} Qs • {t.total_marks} Marks
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-700">
                          {getSubjectName(t.subject)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
                            {t.topics?.length || 0} Topic{t.topics?.length !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isLive ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full select-none">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full select-none">
                              <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                              Draft
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-400 select-none">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={13} />
                            {formatDate(t.created_at)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2.5">
                            {/* View / Publish Page */}
                            <Link href={`/tests/${t.id}/publish`}>
                              <button
                                title="View details / Publish"
                                className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-[#5B6BF5] focus:outline-none transition-all cursor-pointer"
                              >
                                <Eye size={16} />
                              </button>
                            </Link>

                            {/* Edit Modal */}
                            <button
                              onClick={() => handleOpenEdit(t)}
                              title="Edit test configuration"
                              className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-amber-600 focus:outline-none transition-all cursor-pointer"
                            >
                              <Pencil size={16} />
                            </button>

                            {/* Delete Confirm */}
                            <button
                              onClick={() => handleOpenDelete(t)}
                              title="Delete test"
                              className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-red-600 focus:outline-none transition-all cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Modal Component */}
        {editingTest && (
          <EditTestModal
            test={editingTest}
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setEditingTest(null);
            }}
            onSuccess={fetchDashboardData}
          />
        )}

        {/* Custom Confirmation Dialog for Delete */}
        <Modal
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          title="Delete Test?"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-500">
              Are you sure you want to delete <strong className="text-gray-900">"{deletingTest?.name}"</strong>? This will permanently delete the test and all of its associated questions.
            </p>

            {deletingTest?.status === 'live' && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 font-semibold">
                ⚠️ Warning: This test is currently LIVE. Deleting it will disrupt candidates!
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={deleteLoading}
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AuthGuard>
  );
}
