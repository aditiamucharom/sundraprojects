'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Task, Project, UserProfile, WorkspaceMember, Subtask } from '@/types';
import { dataService } from '@/lib/dataService';
import { useAuth } from '@/context/AuthContext';
import { useSearch } from '@/context/SearchContext';
import { playCompletionSound } from '@/lib/audio';
import TaskDetailDrawer from './TaskDetailDrawer';
import {
  List as ListIcon,
  Kanban as KanbanIcon,
  Calendar as CalendarIcon,
  Plus,
  CheckCircle,
  Calendar as DueIcon,
  AlertCircle,
  Clock,
  User,
  ArrowRight,
  Filter,
  CheckSquare,
  Trash,
  Repeat
} from 'lucide-react';

const getLocalDateString = (offsetDays = 0) => {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalDateTimeLocalString = (offsetDays = 0) => {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDueDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

const formatTimeOnly = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

interface TaskListProps {
  title: string;
  description?: string | null;
  color?: string;
  projectId?: string | null;
  specialFilter?: 'today' | 'upcoming' | 'my-tasks' | null;
}

export default function TaskList({
  title,
  description = '',
  color = '#007aff',
  projectId = null,
  specialFilter = null
}: TaskListProps) {
  const { user, activeWorkspace } = useAuth();
  const { searchQuery } = useSearch();
  
  // Views layout
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('list');
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline subtasks states
  const [subtasksMap, setSubtasksMap] = useState<Record<string, Subtask[]>>({});
  const [showSubtasksInline, setShowSubtasksInline] = useState(true);
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<string, string>>({});

  // Compute filtered tasks dynamically based on search query
  const tasks = useMemo(() => {
    if (!searchQuery.trim()) return rawTasks;
    const query = searchQuery.toLowerCase().trim();
    return rawTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query))
    );
  }, [rawTasks, searchQuery]);

  // Filter out recurring tasks whose due date is in the future, unless we are in calendar view or upcoming page
  const visibleTasks = useMemo(() => {
    if (specialFilter === 'upcoming' || viewMode === 'calendar') {
      return tasks;
    }
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    return tasks.filter((t) => {
      if (t.recurrence && t.due_date) {
        const dueTime = new Date(t.due_date).getTime();
        return dueTime <= todayEnd;
      }
      return true;
    });
  }, [tasks, specialFilter, viewMode]);

  
  // Detail Drawer state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Quick Add state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'none'>('none');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskRecurrence, setNewTaskRecurrence] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'none'>('none');
  const [isQuickAddExpanded, setIsQuickAddExpanded] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  // Load workspace members for assignee selection
  useEffect(() => {
    const fetchMembers = async () => {
      if (activeWorkspace) {
        try {
          const workspaceMembers = await dataService.getWorkspaceMembers(activeWorkspace.id);
          setMembers(workspaceMembers);
        } catch (err) {
          console.error('Error fetching workspace members:', err);
        }
      }
    };
    fetchMembers();
  }, [activeWorkspace]);

  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date());

  // Load Tasks
  const loadTasks = async (showLoading = true) => {
    if (!activeWorkspace) return;
    if (showLoading) setLoading(true);
    try {
      let workspaceTasks: Task[] = [];
      
      if (projectId) {
        workspaceTasks = await dataService.getTasks(projectId);
      } else {
        workspaceTasks = await dataService.getTasksByWorkspace(activeWorkspace.id);
      }

      // Filter based on Special Filters
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

      let filtered = workspaceTasks;

      if (specialFilter === 'today') {
        filtered = workspaceTasks.filter((t) => {
          if (!t.due_date) return false;
          const dueTime = new Date(t.due_date).getTime();
          return dueTime >= todayStart && dueTime <= todayEnd;
        });
      } else if (specialFilter === 'upcoming') {
        filtered = workspaceTasks.filter((t) => {
          if (!t.due_date) return false;
          const dueTime = new Date(t.due_date).getTime();
          return dueTime > todayEnd;
        });
      } else if (specialFilter === 'my-tasks') {
        filtered = workspaceTasks.filter((t) => t.assignee_id === user?.id);
      }

      // Order completed tasks to the bottom, newest todo to the top
      filtered.sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setRawTasks(filtered);

      // Fetch subtasks for all loaded tasks
      const subtasksPromises = filtered.map(async (task) => {
        try {
          const subs = await dataService.getSubtasks(task.id);
          return { taskId: task.id, subs };
        } catch (err) {
          console.error(`Error loading subtasks for task ${task.id}:`, err);
          return { taskId: task.id, subs: [] };
        }
      });
      const subtasksResults = await Promise.all(subtasksPromises);
      const newSubtasksMap: Record<string, Subtask[]> = {};
      subtasksResults.forEach(({ taskId, subs }) => {
        newSubtasksMap[taskId] = subs;
      });
      setSubtasksMap(newSubtasksMap);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, specialFilter, activeWorkspace]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleDataChanged = () => {
      loadTasks(false);
    };
    window.addEventListener('sundra-data-changed', handleDataChanged);
    return () => {
      window.removeEventListener('sundra-data-changed', handleDataChanged);
    };
  }, [projectId, specialFilter, activeWorkspace]);

  // Handle Quick Add Submit
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user || !activeWorkspace) return;

    try {
      let finalProjectId = projectId;
      
      // If we are in Today/Upcoming/My Tasks and no specific project is selected,
      // fallback to the default workspace project if it exists.
      if (!finalProjectId) {
        const workspaceProjects = await dataService.getProjects(activeWorkspace.id);
        if (workspaceProjects.length > 0) {
          finalProjectId = workspaceProjects[0].id;
        } else {
          // If no projects exist, create a default "Personal Reminders" project
          const { data: defaultProj } = await dataService.createProject(
            activeWorkspace.id,
            'Personal Reminders',
            'Default reminder list',
            '#007aff',
            'Folder',
            user.id
          );
          if (defaultProj) {
            finalProjectId = defaultProj.id;
          }
        }
      }

      // Determine due date
      let finalDueDate: string | null = null;
      if (newTaskDueDate) {
        const [datePart, timePart] = newTaskDueDate.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        const localDate = new Date(year, month - 1, day, hours, minutes);
        finalDueDate = localDate.toISOString();
      }
      if (specialFilter === 'today' && !finalDueDate) {
        finalDueDate = new Date().toISOString(); // Default to today
      }

      const finalPriority = newTaskPriority === 'none' ? 'medium' : newTaskPriority;
      
      // Determine assignee (default to newTaskAssigneeId if set, otherwise fallback to specialFilter behavior)
      let assigneeId = newTaskAssigneeId || null;
      if (!assigneeId && specialFilter === 'my-tasks') {
        assigneeId = user.id;
      }

      const { data: createdTask } = await dataService.createTask(
        activeWorkspace.id,
        finalProjectId!,
        newTaskTitle.trim(),
        '',
        assigneeId,
        finalDueDate,
        finalPriority as any,
        'todo',
        user.id,
        newTaskRecurrence === 'none' ? null : newTaskRecurrence
      );

      if (createdTask) {
        setNewTaskTitle('');
        setNewTaskDueDate('');
        setNewTaskPriority('none');
        setNewTaskAssigneeId('');
        setNewTaskRecurrence('none');
        setIsQuickAddExpanded(false);
        await loadTasks();
      }
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  // Quick Toggle Complete (Micro-interaction)
  const handleToggleComplete = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid opening drawer
    try {
      const nextStatus = task.status === 'done' ? 'todo' : 'done';
      const { data: updated } = await dataService.updateTask(
        activeWorkspace!.id,
        task.id,
        { status: nextStatus },
        user!.id
      );
      if (updated) {
        // Trigger alert notification if newly completed
        if (nextStatus === 'done') {
          playCompletionSound();
          await dataService.createNotification(
            task.created_by,
            'Task Completed',
            `Reminder completed: "${task.title}"`
          );
        }
        await loadTasks(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Inline Subtask Handlers
  const handleToggleSubtask = async (taskId: string, sub: Subtask, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const nextComplete = !sub.is_completed;
      const { data: updated } = await dataService.toggleSubtask(sub.id, nextComplete);
      if (updated) {
        if (nextComplete) {
          playCompletionSound();
        }
        setSubtasksMap((prev) => ({
          ...prev,
          [taskId]: prev[taskId].map((s) => (s.id === sub.id ? updated : s)),
        }));
        window.dispatchEvent(new CustomEvent('sundra-data-changed', { detail: { key: 'tasks' } }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubtask = async (taskId: string, subId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await dataService.deleteSubtask(subId);
      setSubtasksMap((prev) => ({
        ...prev,
        [taskId]: prev[taskId].filter((s) => s.id !== subId),
      }));
      window.dispatchEvent(new CustomEvent('sundra-data-changed', { detail: { key: 'tasks' } }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSubtaskInline = async (taskId: string, e: React.FormEvent) => {
    e.preventDefault();
    const title = newSubtaskTitles[taskId]?.trim();
    if (!title) return;
    try {
      const { data: sub } = await dataService.createSubtask(taskId, title);
      if (sub) {
        setNewSubtaskTitles((prev) => ({ ...prev, [taskId]: '' }));
        setSubtasksMap((prev) => ({
          ...prev,
          [taskId]: [...(prev[taskId] || []), sub],
        }));
        window.dispatchEvent(new CustomEvent('sundra-data-changed', { detail: { key: 'tasks' } }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Kanban Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: 'todo' | 'in_progress' | 'review' | 'done') => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    try {
      const { data: updated } = await dataService.updateTask(
        activeWorkspace!.id,
        taskId,
        { status: newStatus },
        user!.id
      );
      if (updated) {
        await loadTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const dateObjects = [];
    
    // First day of current month
    const firstDay = new Date(year, month, 1);
    // Number of leading empty days (from previous month)
    const startOffset = firstDay.getDay();

    // Days in previous month
    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      dateObjects.push({
        date: new Date(year, month - 1, prevMonthLast - i),
        isCurrentMonth: false,
      });
    }

    // Days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= totalDays; i++) {
      dateObjects.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Tail days from next month to fill grid
    const totalCells = 42; // 6 rows of 7 days
    const tailDays = totalCells - dateObjects.length;
    for (let i = 1; i <= tailDays; i++) {
      dateObjects.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return dateObjects;
  };

  const getPriorityDots = (p?: string) => {
    if (p === 'high') return <span className="text-apple-red font-bold">!!!</span>;
    if (p === 'medium') return <span className="text-apple-orange font-bold">!!</span>;
    if (p === 'low') return <span className="text-apple-blue font-bold">!</span>;
    return null;
  };

  const calendarDays = getDaysInMonth(currentDate);

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Top Title Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground transition-all flex items-center">
            <span className="h-4 w-4 rounded-full mr-3.5 inline-block shadow-custom-sm" style={{ backgroundColor: color }} />
            {title}
          </h2>
          {description && <p className="text-sm text-text-secondary mt-1 max-w-xl">{description}</p>}
        </div>

        {/* View Segmented Toggle Controls */}
        <div className="flex items-center space-x-3 self-start md:self-auto">
          {viewMode === 'list' && (
            <button
              type="button"
              onClick={() => setShowSubtasksInline(!showSubtasksInline)}
              className={`flex items-center px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                showSubtasksInline
                  ? 'bg-apple-blue/10 border-apple-blue text-apple-blue font-bold shadow-custom-sm'
                  : 'bg-card border-border-custom text-text-secondary hover:text-foreground'
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
              {showSubtasksInline ? 'Hide Subtasks' : 'Show Subtasks'}
            </button>
          )}

          <div className="inline-flex rounded-xl bg-card border border-border-custom p-0.5 shadow-custom-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center px-2 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-background text-foreground shadow-custom-sm font-bold' : 'text-text-secondary hover:text-foreground'
              }`}
            >
              <ListIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" /> List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center px-2 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-background text-foreground shadow-custom-sm font-bold' : 'text-text-secondary hover:text-foreground'
              }`}
            >
              <KanbanIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" /> Kanban
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center px-2 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === 'calendar' ? 'bg-background text-foreground shadow-custom-sm font-bold' : 'text-text-secondary hover:text-foreground'
              }`}
            >
              <CalendarIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" /> Calendar
            </button>
          </div>
        </div>
      </div>

      {/* QUICK ADD TASK FORM */}
      <div className="bg-card border border-border-custom rounded-2xl shadow-custom-sm p-4 hover:border-border-custom/80 transition-all">
        <form onSubmit={handleQuickAdd} className="space-y-3">
          <div className="flex items-center space-x-3">
            <Plus className="h-5 w-5 text-text-secondary" />
            <input
              type="text"
              placeholder="Add a new reminder..."
              value={newTaskTitle}
              onChange={(e) => {
                setNewTaskTitle(e.target.value);
                setIsQuickAddExpanded(true);
              }}
              onFocus={() => setIsQuickAddExpanded(true)}
              className="flex-1 w-full min-w-0 bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-text-secondary text-sm text-foreground"
            />
            {newTaskTitle.trim() && (
              <button
                type="submit"
                className="p-2 rounded-xl bg-apple-blue hover:opacity-90 text-white transition-all cursor-pointer"
              >
                <ArrowRight className="h-4.5 w-4.5" />
              </button>
            )}
          </div>

          {/* Quick Add Configuration Details when focused/expanded */}
          {isQuickAddExpanded && (
            <div className="pl-0 sm:pl-8 pt-2 flex flex-wrap items-center gap-2 sm:gap-3 border-t border-border-custom/50 animate-backdrop-fade-in w-full">
              {/* Due Date Option Group */}
              <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                <div className="flex items-center space-x-1.5 bg-background border border-border-custom px-2.5 py-1.5 rounded-lg text-xs min-w-0 flex-1 sm:flex-initial">
                  <DueIcon className="h-3.5 w-3.5 text-text-secondary flex-shrink-0" />
                  <input
                    type="datetime-local"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="bg-transparent border-0 focus:ring-0 p-0 text-xs w-full sm:w-44 text-foreground cursor-pointer focus:outline-none min-w-0"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = getLocalDateTimeLocalString(0);
                    setNewTaskDueDate(todayStr);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors border cursor-pointer ${
                    newTaskDueDate.startsWith(getLocalDateString(0))
                      ? 'bg-apple-blue/10 border-apple-blue text-apple-blue font-semibold'
                      : 'bg-background border-border-custom text-text-secondary hover:text-foreground hover:bg-border-custom/30'
                  }`}
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const tomorrowStr = getLocalDateTimeLocalString(1);
                    setNewTaskDueDate(tomorrowStr);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors border cursor-pointer ${
                    newTaskDueDate.startsWith(getLocalDateString(1))
                      ? 'bg-apple-blue/10 border-apple-blue text-apple-blue font-semibold'
                      : 'bg-background border-border-custom text-text-secondary hover:text-foreground hover:bg-border-custom/30'
                  }`}
                >
                  Tomorrow
                </button>
              </div>

              {/* Priority Option */}
              <div className="flex items-center space-x-1.5 bg-background border border-border-custom px-2.5 py-1.5 rounded-lg text-xs w-[calc(50%-4px)] sm:w-auto min-w-0">
                <AlertCircle className="h-3.5 w-3.5 text-text-secondary flex-shrink-0" />
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="bg-transparent border-0 focus:ring-0 p-0 text-xs text-foreground focus:outline-none cursor-pointer flex-1 w-full sm:w-28 min-w-0"
                >
                  <option value="none">Priority</option>
                  <option value="low">Low (!)</option>
                  <option value="medium">Medium (!!)</option>
                  <option value="high">High (!!!)</option>
                </select>
              </div>

              {/* Assignee Option */}
              <div className="flex items-center space-x-1.5 bg-background border border-border-custom px-2.5 py-1.5 rounded-lg text-xs w-[calc(50%-4px)] sm:w-auto min-w-0">
                <User className="h-3.5 w-3.5 text-text-secondary flex-shrink-0" />
                <select
                  value={newTaskAssigneeId}
                  onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                  className="bg-transparent border-0 focus:ring-0 p-0 text-xs text-foreground focus:outline-none cursor-pointer flex-1 w-full sm:w-32 min-w-0"
                >
                  <option value="">Assignee</option>
                  {members.map((m) => {
                    const u = m.user;
                    if (!u) return null;
                    return (
                      <option key={u.id} value={u.id}>
                        {u.id === user?.id ? 'Me' : u.full_name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Recurrence Option */}
              <div className="flex items-center space-x-1.5 bg-background border border-border-custom px-2.5 py-1.5 rounded-lg text-xs w-[calc(50%-4px)] sm:w-auto min-w-0">
                <Repeat className="h-3.5 w-3.5 text-text-secondary flex-shrink-0" />
                <select
                  value={newTaskRecurrence}
                  onChange={(e) => setNewTaskRecurrence(e.target.value as any)}
                  className="bg-transparent border-0 focus:ring-0 p-0 text-xs text-foreground focus:outline-none cursor-pointer flex-1 w-full sm:w-28 min-w-0"
                >
                  <option value="none">Never Repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsQuickAddExpanded(false)}
                className="text-[11px] font-semibold text-text-secondary hover:text-foreground w-full sm:w-auto text-center sm:text-right sm:ml-auto py-1 cursor-pointer"
              >
                Collapse
              </button>
            </div>
          )}
        </form>
      </div>

      {/* CORE PAGES VIEWS SWITCHER */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20 text-text-secondary">
          <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-apple-blue"></div>
        </div>
      ) : (
        <div className="flex-1">
          {/* LIST VIEW (Apple Reminders style) */}
          {viewMode === 'list' && (
            <div className="bg-card border border-border-custom rounded-2xl shadow-custom-md overflow-hidden">
              <div className="divide-y divide-border-custom/50">
                {visibleTasks.map((task) => {
                  const taskSubtasks = subtasksMap[task.id] || [];
                  return (
                    <React.Fragment key={task.id}>
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => {
                          setSelectedTask(task);
                          setIsDrawerOpen(true);
                        }}
                        className={`p-4 flex items-start justify-between cursor-pointer hover:bg-background/40 transition-colors group ${
                          task.status === 'done' ? 'opacity-65' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                          {/* Interactive Apple Circle Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleComplete(task, e)}
                            className="mt-0.5 flex-shrink-0 cursor-pointer focus:outline-none relative"
                          >
                            <div
                              className={`h-5.5 w-5.5 rounded-full border-2 flex items-center justify-center transition-all ${
                                task.status === 'done'
                                  ? 'bg-apple-blue border-apple-blue'
                                  : 'border-text-secondary/50 group-hover:border-apple-blue'
                              }`}
                            >
                              {task.status === 'done' && (
                                <div className="h-2 w-2 rounded-full bg-white" />
                              )}
                            </div>
                          </button>

                          {/* Reminder Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 min-w-0">
                              {getPriorityDots(task.priority)}
                              <span
                                className={`text-sm font-semibold block truncate ${
                                  task.status === 'done' ? 'line-through text-text-secondary' : 'text-foreground'
                                }`}
                              >
                                {task.title}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-xs text-text-secondary mt-1 truncate max-w-lg">
                                {task.description}
                              </p>
                            )}

                            {/* Badges details inline */}
                            <div className="flex items-center space-x-3.5 mt-2 flex-wrap gap-y-1">
                              {task.due_date && (
                                <span className="inline-flex items-center text-[10px] text-text-secondary bg-background/80 border border-border-custom px-1.5 py-0.5 rounded-md">
                                  <DueIcon className="h-3 w-3 mr-1 text-apple-red" />
                                  {formatDueDate(task.due_date)}
                                </span>
                              )}
                              
                              {task.status !== 'done' && (
                                <span className="inline-flex items-center text-[10px] text-text-secondary bg-background/80 border border-border-custom px-1.5 py-0.5 rounded-md uppercase">
                                  {task.status.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right profile indicator */}
                        <div className="flex items-center">
                          <div className="h-6 w-6 rounded-full border border-border-custom bg-background flex items-center justify-center text-[10px] font-semibold text-text-secondary">
                            <User className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>

                      {/* Hierarchical inline subtasks list */}
                      {showSubtasksInline && (
                        <div className="pl-14 pr-4 pb-3 space-y-2 border-b border-border-custom/30 bg-background/10">
                          {taskSubtasks.map((sub) => (
                            <div
                              key={sub.id}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-between py-1.5 px-3 rounded-lg border border-border-custom/40 bg-card/30 hover:bg-card/60 transition-all text-xs"
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleSubtask(task.id, sub, e)}
                                  className="cursor-pointer focus:outline-none relative flex-shrink-0"
                                >
                                  <div
                                    className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center transition-all ${
                                      sub.is_completed
                                        ? 'bg-apple-blue border-apple-blue'
                                        : 'border-text-secondary/50 hover:border-apple-blue'
                                    }`}
                                  >
                                    {sub.is_completed && (
                                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                    )}
                                  </div>
                                </button>
                                <span
                                  className={`truncate font-medium ${
                                    sub.is_completed ? 'line-through text-text-secondary' : 'text-foreground'
                                  }`}
                                >
                                  {sub.title}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSubtask(task.id, sub.id, e)}
                                className="text-text-secondary hover:text-apple-red p-1 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}

                          {/* Quick subtask create form */}
                          <form
                            onSubmit={(e) => handleAddSubtaskInline(task.id, e)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center space-x-2 mt-2"
                          >
                            <input
                              type="text"
                              placeholder="Add subtask..."
                              value={newSubtaskTitles[task.id] || ''}
                              onChange={(e) =>
                                setNewSubtaskTitles((prev) => ({
                                  ...prev,
                                  [task.id]: e.target.value,
                                }))
                              }
                              className="flex-1 min-w-0 bg-background/50 border border-border-custom/50 rounded-lg px-2.5 py-1 text-xs text-foreground placeholder-text-secondary focus:outline-none focus:border-apple-blue"
                            />
                            <button
                              type="submit"
                              className="p-1 rounded-lg bg-apple-blue hover:opacity-90 text-white transition-all cursor-pointer text-xs"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}

                {visibleTasks.length === 0 && (
                  <div className="p-12 text-center text-sm text-text-secondary italic">
                    No reminders found in this view.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* KANBAN BOARD VIEW */}
          {viewMode === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              {/* To Do Column */}
              <div
                className="bg-sidebar border border-border-custom rounded-2xl p-4 min-h-80"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'todo')}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">To Do</h4>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-background border border-border-custom text-text-secondary">
                    {visibleTasks.filter((t) => t.status === 'todo').length}
                  </span>
                </div>
                <div className="space-y-3">
                  {visibleTasks
                    .filter((t) => t.status === 'todo')
                    .map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        onClick={() => {
                          setSelectedTask(t);
                          setIsDrawerOpen(true);
                        }}
                        className="bg-card border border-border-custom rounded-xl p-3.5 shadow-custom-sm hover:border-apple-blue/50 transition-all cursor-grab active:cursor-grabbing hover:-translate-y-0.5"
                      >
                        <div className="flex items-center space-x-1.5 mb-1.5 min-w-0">
                          {getPriorityDots(t.priority)}
                          <span className="text-xs font-bold text-foreground block truncate flex-1 min-w-0">{t.title}</span>
                        </div>
                        {t.description && <p className="text-[11px] text-text-secondary truncate mb-2">{t.description}</p>}
                        {t.due_date && (
                          <div className="flex items-center text-[9px] text-apple-red">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDueDate(t.due_date)}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* In Progress Column */}
              <div
                className="bg-sidebar border border-border-custom rounded-2xl p-4 min-h-80"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'in_progress')}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">In Progress</h4>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-background border border-border-custom text-text-secondary">
                    {visibleTasks.filter((t) => t.status === 'in_progress').length}
                  </span>
                </div>
                <div className="space-y-3">
                  {visibleTasks
                    .filter((t) => t.status === 'in_progress')
                    .map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        onClick={() => {
                          setSelectedTask(t);
                          setIsDrawerOpen(true);
                        }}
                        className="bg-card border border-border-custom rounded-xl p-3.5 shadow-custom-sm hover:border-apple-blue/50 transition-all cursor-grab active:cursor-grabbing hover:-translate-y-0.5"
                      >
                        <div className="flex items-center space-x-1.5 mb-1.5 min-w-0">
                          {getPriorityDots(t.priority)}
                          <span className="text-xs font-bold text-foreground block truncate flex-1 min-w-0">{t.title}</span>
                        </div>
                        {t.description && <p className="text-[11px] text-text-secondary truncate mb-2">{t.description}</p>}
                        {t.due_date && (
                          <div className="flex items-center text-[9px] text-apple-red">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDueDate(t.due_date)}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Review Column */}
              <div
                className="bg-sidebar border border-border-custom rounded-2xl p-4 min-h-80"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'review')}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Review</h4>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-background border border-border-custom text-text-secondary">
                    {visibleTasks.filter((t) => t.status === 'review').length}
                  </span>
                </div>
                <div className="space-y-3">
                  {visibleTasks
                    .filter((t) => t.status === 'review')
                    .map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        onClick={() => {
                          setSelectedTask(t);
                          setIsDrawerOpen(true);
                        }}
                        className="bg-card border border-border-custom rounded-xl p-3.5 shadow-custom-sm hover:border-apple-blue/50 transition-all cursor-grab active:cursor-grabbing hover:-translate-y-0.5"
                      >
                        <div className="flex items-center space-x-1.5 mb-1.5 min-w-0">
                          {getPriorityDots(t.priority)}
                          <span className="text-xs font-bold text-foreground block truncate flex-1 min-w-0">{t.title}</span>
                        </div>
                        {t.description && <p className="text-[11px] text-text-secondary truncate mb-2">{t.description}</p>}
                        {t.due_date && (
                          <div className="flex items-center text-[9px] text-apple-red">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDueDate(t.due_date)}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Completed Column */}
              <div
                className="bg-sidebar border border-border-custom rounded-2xl p-4 min-h-80"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'done')}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Completed</h4>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-background border border-border-custom text-text-secondary">
                    {visibleTasks.filter((t) => t.status === 'done').length}
                  </span>
                </div>
                <div className="space-y-3">
                  {visibleTasks
                    .filter((t) => t.status === 'done')
                    .map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        onClick={() => {
                          setSelectedTask(t);
                          setIsDrawerOpen(true);
                        }}
                        className="bg-card/60 border border-border-custom/50 rounded-xl p-3.5 shadow-custom-sm hover:border-apple-blue/50 transition-all cursor-grab active:cursor-grabbing hover:-translate-y-0.5 opacity-70"
                      >
                        <span className="text-xs font-bold text-text-secondary line-through truncate block">
                          {t.title}
                        </span>
                        {t.description && <p className="text-[10px] text-text-secondary truncate mt-1">{t.description}</p>}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* CALENDAR MONTHLY AGENDA VIEW */}
          {viewMode === 'calendar' && (
            <div className="bg-card border border-border-custom rounded-2xl shadow-custom-md overflow-hidden p-3 sm:p-6">
              {/* Month Header Navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <h3 className="font-bold text-foreground text-sm sm:text-base">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex space-x-1 border border-border-custom bg-sidebar rounded-xl p-0.5 shadow-custom-sm self-start sm:self-auto">
                  <button
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold text-foreground hover:bg-background rounded-lg transition-colors cursor-pointer"
                  >
                    &lt; Prev
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold text-foreground hover:bg-background rounded-lg transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold text-foreground hover:bg-background rounded-lg transition-colors cursor-pointer"
                  >
                    Next &gt;
                  </button>
                </div>
              </div>

              {/* Day Header */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Monthly calendar cells grid */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                  // Find tasks matching this date
                  const dayTasks = tasks.filter((t) => {
                    if (!t.due_date) return false;
                    const d = new Date(t.due_date);
                    return (
                      d.getDate() === date.getDate() &&
                      d.getMonth() === date.getMonth() &&
                      d.getFullYear() === date.getFullYear()
                    );
                  });

                  const isToday =
                    date.getDate() === new Date().getDate() &&
                    date.getMonth() === new Date().getMonth() &&
                    date.getFullYear() === new Date().getFullYear();

                  return (
                    <div
                      key={idx}
                      className={`min-h-14 sm:min-h-20 p-1 sm:p-2 rounded-xl border flex flex-col justify-between transition-colors min-w-0 ${
                        isCurrentMonth ? 'bg-sidebar/30 border-border-custom' : 'bg-background/20 border-transparent opacity-40'
                      } ${isToday ? 'border-apple-blue bg-apple-blue-light/5 ring-1 ring-apple-blue' : ''}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-bold ${isToday ? 'text-apple-blue font-extrabold' : 'text-foreground'}`}>
                          {date.getDate()}
                        </span>
                      </div>
                      
                      {/* Tasks lists for this day */}
                      <div className="flex-1 space-y-1 overflow-y-auto">
                        {dayTasks.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => {
                              setSelectedTask(t);
                              setIsDrawerOpen(true);
                            }}
                            className={`px-1.5 py-0.5 rounded-lg text-[9px] font-semibold text-white truncate cursor-pointer transition-all hover:opacity-90 ${
                              t.status === 'done' ? 'bg-apple-gray line-through' : ''
                            }`}
                            style={{ backgroundColor: t.status === 'done' ? undefined : color }}
                          >
                            {t.due_date ? `${formatTimeOnly(t.due_date)} | ` : ''}{t.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RENDER THE REUSABLE DETAILED DRAWER MODULE */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedTask(null);
        }}
        onUpdate={loadTasks}
        onDelete={loadTasks}
        workspaceId={activeWorkspace?.id || ''}
      />
    </div>
  );
}
