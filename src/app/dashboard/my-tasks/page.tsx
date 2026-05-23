'use client';

import TaskList from '@/components/dashboard/TaskList';

export default function MyTasksDashboardPage() {
  return (
    <TaskList
      title="My Tasks"
      description="All checklists and tasks currently assigned to you."
      color="#34c759" // Apple Green
      specialFilter="my-tasks"
    />
  );
}
