'use client';

import TaskList from '@/components/dashboard/TaskList';

export default function TodayDashboardPage() {
  return (
    <TaskList
      title="Today"
      description="Review all reminders and checklists due today."
      color="#007aff" // Apple Blue
      specialFilter="today"
    />
  );
}
