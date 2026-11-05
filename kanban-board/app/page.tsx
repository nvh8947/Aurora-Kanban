'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
}

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    initGuestAndFetch();
  }, []);

  async function initGuestAndFetch() {
    // Authenticate guest session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      await supabase.auth.signInAnonymously();
    }
    fetchTasks();
  }

  async function fetchTasks() {
    const { data } = await supabase.from('tasks').select('*');
    if (data) setTasks(data as Task[]);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    await supabase.from('tasks').insert([{ title, description, status: 'todo' }]);
    setTitle('');
    setDescription('');
    fetchTasks();
  }

  async function moveTask(id: string, newStatus: Task['status']) {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
    fetchTasks();
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks();
  }

  const columns: Task['status'][] = ['todo', 'in_progress', 'done'];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Kanban Task Board</h1>

      {/* Task Creation Form */}
      <form onSubmit={addTask} className="mb-8 flex gap-2">
        <input
          className="border p-2 rounded flex-1"
          placeholder="Task Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="border p-2 rounded flex-1"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Add Task
        </button>
      </form>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((col) => (
          <div key={col} className="bg-gray-100 p-4 rounded-lg">
            <h2 className="font-bold text-lg capitalize mb-4">{col.replace('_', ' ')}</h2>
            {tasks.filter((t) => t.status === col).map((task) => (
              <div key={task.id} className="bg-white p-4 rounded mb-3 shadow">
                <h3 className="font-semibold">{task.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{task.description}</p>
                <div className="flex justify-between text-xs">
                  {col !== 'todo' && (
                    <button onClick={() => moveTask(task.id, 'todo')} className="text-blue-500">
                      ← Move to To-Do
                    </button>
                  )}
                  {col !== 'in_progress' && (
                    <button onClick={() => moveTask(task.id, 'in_progress')} className="text-yellow-600">
                      {col === 'todo' ? 'Move to In Progress →' : '← Move to In Progress'}
                    </button>
                  )}
                  {col !== 'done' && (
                    <button onClick={() => moveTask(task.id, 'done')} className="text-green-600">
                      Move to Done →
                    </button>
                  )}
                  <button onClick={() => deleteTask(task.id)} className="text-red-500">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}