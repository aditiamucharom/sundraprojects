'use client';

import TaskList from '@/components/dashboard/TaskList';

export default function UpcomingDashboardPage() {
  return (
    <TaskList
      title="Scheduled"
      description="All scheduled tasks and reminders due in the future."
      color="#ff9500" // Apple Orange
      specialFilter="upcoming"
    />
  );
}
