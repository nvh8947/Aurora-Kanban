'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  created_at?: string;
}

const COLUMN_CONFIG = [
  { id: 'todo', label: 'To Do', badgeColor: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200', dot: 'bg-slate-400' },
  { id: 'in_progress', label: 'In Progress', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300', dot: 'bg-amber-500' },
  { id: 'in_review', label: 'In Review', badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300', dot: 'bg-purple-500' },
  { id: 'done', label: 'Completed', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300', dot: 'bg-emerald-500' },
] as const;

const STATUSES: Task['status'][] = ['todo', 'in_progress', 'in_review', 'done'];

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMobileTab, setActiveMobileTab] = useState<Task['status']>('todo');
  
  // Drag and Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Task['status'] | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    initGuestAndFetch();
  }, []);

  async function initGuestAndFetch() {
    setLoading(true);
    let { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error('Failed to sign in anonymously:', error.message);
        setLoading(false);
        return;
      }
      session = data.session;
    }

    await fetchTasks();
    setLoading(false);
  }

  async function fetchTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTasks(data as Task[]);
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('User not authenticated');
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .insert([
        {
          title: title.trim(),
          description: description.trim(),
          status: 'todo',
          user_id: user.id,
        },
      ]);

    if (error) {
      console.error('Error inserting task:', error.message, error.details);
    } else {
      setTitle('');
      setDescription('');
      await fetchTasks();
    }
    
    setIsSubmitting(false);
  }

  async function moveTask(id: string, newStatus: Task['status']) {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
    await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
    fetchTasks();
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks();
  }

  // HTML5 Drag and Drop Handlers
  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, status: Task['status']) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  }

  function handleDragLeave(status: Task['status']) {
    if (dragOverColumn === status) {
      setDragOverColumn(null);
    }
  }

  function handleDrop(e: React.DragEvent, newStatus: Task['status']) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      moveTask(taskId, newStatus);
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Aurora Workspace</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Guest Session Active • Drag and drop tasks across columns
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync Ready
          </div>
        </header>

        {/* Task Creation Bar */}
        <form 
          onSubmit={addTask} 
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:gap-3 items-center"
        >
          <div className="flex-1 space-y-2 sm:space-y-0 sm:flex sm:gap-3">
            <input
              type="text"
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              required
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition shadow-sm active:scale-[0.98] whitespace-nowrap"
          >
            {isSubmitting ? 'Adding...' : '+ New Task'}
          </button>
        </form>

        {/* Mobile Column Navigation Tabs */}
        <div className="flex lg:hidden border-b border-slate-200 dark:border-slate-800 gap-1 pb-1 overflow-x-auto">
          {COLUMN_CONFIG.map((col) => {
            const count = tasks.filter((t) => t.status === col.id).length;
            const isActive = activeMobileTab === col.id;
            return (
              <button
                key={col.id}
                onClick={() => setActiveMobileTab(col.id as Task['status'])}
                className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>{col.label}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-300 dark:bg-slate-700 text-[10px]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Board Grid */}
        {loading ? (
          <div className="flex justify-center py-20 text-slate-400 text-sm animate-pulse">
            Loading tasks from Supabase...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {COLUMN_CONFIG.map((col) => {
              const columnTasks = tasks.filter((t) => t.status === col.id);
              const isHiddenOnMobile = activeMobileTab !== col.id;
              const isTargeted = dragOverColumn === col.id;

              const currentIndex = STATUSES.indexOf(col.id as Task['status']);
              const prevStatus = STATUSES[currentIndex - 1];
              const nextStatus = STATUSES[currentIndex + 1];

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => handleDragOver(e, col.id as Task['status'])}
                  onDragLeave={() => handleDragLeave(col.id as Task['status'])}
                  onDrop={(e) => handleDrop(e, col.id as Task['status'])}
                  className={`flex flex-col bg-slate-100/70 dark:bg-slate-900/40 rounded-2xl border p-4 transition-all duration-150 ${
                    isTargeted 
                      ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20' 
                      : 'border-slate-200/80 dark:border-slate-800/80'
                  } ${isHiddenOnMobile ? 'hidden lg:flex' : 'flex'}`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                      <h2 className="font-bold text-sm tracking-wide text-slate-700 dark:text-slate-300">
                        {col.label}
                      </h2>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${col.badgeColor}`}>
                      {columnTasks.length}
                    </span>
                  </div>

                  {/* Task List Container */}
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-0.5 min-h-[120px]">
                    {columnTasks.length === 0 ? (
                      <div className="border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400">
                        Drop tasks here
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={() => {
                            setDraggedTaskId(null);
                            setDragOverColumn(null);
                          }}
                          className={`group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition space-y-3 cursor-grab active:cursor-grabbing ${
                            draggedTaskId === task.id ? 'opacity-40 scale-[0.98]' : 'opacity-100'
                          }`}
                        >
                          <div>
                            <h3 className="font-semibold text-sm leading-snug break-words">
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Action Controls */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                            <div className="flex items-center gap-1">
                              {prevStatus && (
                                <button
                                  onClick={() => moveTask(task.id, prevStatus)}
                                  className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium transition"
                                  title={`Move to ${prevStatus.replace('_', ' ')}`}
                                >
                                  ←
                                </button>
                              )}
                              {nextStatus && (
                                <button
                                  onClick={() => moveTask(task.id, nextStatus)}
                                  className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium transition"
                                  title={`Move to ${nextStatus.replace('_', ' ')}`}
                                >
                                  →
                                </button>
                              )}
                            </div>

                            <button
                              onClick={() => deleteTask(task.id)}
                              className="text-red-500 hover:text-red-600 dark:hover:text-red-400 opacity-80 group-hover:opacity-100 font-medium transition px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}