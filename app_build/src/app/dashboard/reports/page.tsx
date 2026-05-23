'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dataService } from '@/lib/dataService';
import { Task, Project, ActivityLog } from '@/types';
import {
  Calendar,
  ArrowDownToLine,
  Printer,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle,
  Folder,
  User,
  Tag,
  ChevronRight,
  TrendingDown,
  Info,
  Search,
  Activity,
  RefreshCw
} from 'lucide-react';

const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDateRange = (startStr: string, endStr: string) => {
  const [sYear, sMonth, sDay] = startStr.split('-').map(Number);
  const [eYear, eMonth, eDay] = endStr.split('-').map(Number);
  const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
  const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
  return { start, end };
};

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatRelativeTime = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  if (isNaN(diffMs) || diffMs < 0) return 'Just now';
  
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return 'Just now';
  
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getAvatarColor = (name: string) => {
  if (!name) return 'bg-apple-gray/20 text-text-secondary';
  const charCodeSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const colors = [
    'bg-apple-blue/10 text-apple-blue',
    'bg-apple-green/10 text-apple-green',
    'bg-apple-orange/10 text-apple-orange',
    'bg-apple-purple/10 text-apple-purple',
    'bg-apple-red/10 text-apple-red',
  ];
  return colors[charCodeSum % colors.length];
};

export default function ReportsPage() {
  const { activeWorkspace, user } = useAuth();
  
  // Date states
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const [startDate, setStartDate] = useState(formatDateLocal(defaultStart));
  const [endDate, setEndDate] = useState(formatDateLocal(now));
  const [activePreset, setActivePreset] = useState<string>('7days');

  // Data states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'activity'>('analytics');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Load raw data
  const fetchData = async () => {
    if (!activeWorkspace) return;
    try {
      const [allTasks, allProjects, logs] = await Promise.all([
        dataService.getTasksByWorkspace(activeWorkspace.id),
        dataService.getProjects(activeWorkspace.id),
        dataService.getActivityLogs(activeWorkspace.id),
      ]);
      setTasks(allTasks);
      setProjects(allProjects);
      setActivityLogs(logs || []);
    } catch (err) {
      console.error('Error fetching reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshLogs = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const filteredLogs = useMemo(() => {
    let list = activityLogs;
    if (logSearchQuery.trim() !== '') {
      const q = logSearchQuery.toLowerCase();
      list = list.filter((log) => {
        const userName = (log.user?.full_name || 'Someone').toLowerCase();
        const action = log.action.toLowerCase();
        const detailsStr = JSON.stringify(log.details || {}).toLowerCase();
        return userName.includes(q) || action.includes(q) || detailsStr.includes(q);
      });
    }
    return list.slice(0, 50);
  }, [activityLogs, logSearchQuery]);

  const getLogColorClass = (action: string) => {
    if (action.includes('Create')) {
      return {
        dot: 'bg-apple-green',
        bg: 'bg-apple-green/10 text-apple-green',
      };
    }
    if (action.includes('Delete')) {
      return {
        dot: 'bg-apple-red',
        bg: 'bg-apple-red/10 text-apple-red',
      };
    }
    if (action === 'Update Task Status') {
      return {
        dot: 'bg-apple-blue',
        bg: 'bg-apple-blue/10 text-apple-blue',
      };
    }
    return {
      dot: 'bg-apple-orange',
      bg: 'bg-apple-orange/10 text-apple-orange',
    };
  };

  const renderLogMessage = (log: ActivityLog) => {
    const details = log.details || {};
    const action = log.action;
    
    const boldSpan = (text: string) => <span className="font-semibold text-foreground">{text}</span>;

    switch (action) {
      case 'Create Workspace':
        return (
          <span>
            created workspace {boldSpan(details.workspace_name || 'a new workspace')}
          </span>
        );
      case 'Create Project':
        return (
          <span>
            created project list {boldSpan(details.project_name || 'a list')}
          </span>
        );
      case 'Update Project':
        return (
          <span>
            updated project list {boldSpan(details.project_name || 'a list')}
          </span>
        );
      case 'Delete Project':
        return (
          <span>
            deleted project list {boldSpan(details.project_name || 'a list')}
          </span>
        );
      case 'Create Task':
        return (
          <span>
            created task {boldSpan(details.task_title || 'a task')}
          </span>
        );
      case 'Update Task Status':
        const fromStatus = (details.from_status || '').replace('_', ' ').toLowerCase();
        const toStatus = (details.to_status || '').replace('_', ' ').toLowerCase();
        return (
          <span>
            moved task {boldSpan(details.task_title || 'a task')} from <span className="text-text-secondary italic">{fromStatus || 'unknown'}</span> to <span className="font-medium text-apple-blue">{toStatus || 'unknown'}</span>
          </span>
        );
      case 'Update Task':
        return (
          <span>
            updated details of task {boldSpan(details.task_title || 'a task')}
          </span>
        );
      case 'Delete Task':
        return (
          <span>
            deleted task {boldSpan(details.task_title || 'a task')}
          </span>
        );
      default:
        return (
          <span>
            performed action <span className="italic">{action}</span> {details.task_title || details.project_name ? `on ${boldSpan(details.task_title || details.project_name)}` : ''}
          </span>
        );
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace]);

  // Sync with workspace updates
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleDataChanged = () => {
      fetchData();
    };
    window.addEventListener('sundra-data-changed', handleDataChanged);
    return () => {
      window.removeEventListener('sundra-data-changed', handleDataChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace]);

  // Dynamic filter matching created_at against selected range
  const filteredTasks = useMemo(() => {
    if (!startDate || !endDate) return tasks;
    const { start, end } = parseLocalDateRange(startDate, endDate);
    return tasks.filter((t) => {
      const taskDate = new Date(t.created_at);
      return taskDate >= start && taskDate <= end;
    });
  }, [tasks, startDate, endDate]);

  // Preset quick ranges handler
  const selectPreset = (preset: string) => {
    const today = new Date();
    setActivePreset(preset);
    if (preset === 'today') {
      setStartDate(formatDateLocal(today));
      setEndDate(formatDateLocal(today));
    } else if (preset === '7days') {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
      setStartDate(formatDateLocal(start));
      setEndDate(formatDateLocal(today));
    } else if (preset === '30days') {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
      setStartDate(formatDateLocal(start));
      setEndDate(formatDateLocal(today));
    } else if (preset === '6months') {
      const start = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
      setStartDate(formatDateLocal(start));
      setEndDate(formatDateLocal(today));
    } else if (preset === '1year') {
      const start = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      setStartDate(formatDateLocal(start));
      setEndDate(formatDateLocal(today));
    }
  };

  // Custom date pickers change handler
  const handleCustomDateChange = (type: 'start' | 'end', val: string) => {
    setActivePreset('custom');
    if (type === 'start') {
      setStartDate(val);
    } else {
      setEndDate(val);
    }
  };

  // KPI calculations
  const kpis = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter((t) => t.status === 'done').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Overdue tasks: due date is in the past, and not completed
    const overdue = filteredTasks.filter((t) => {
      if (!t.due_date || t.status === 'done') return false;
      return new Date(t.due_date) < new Date();
    }).length;

    return { total, completed, rate, overdue };
  }, [filteredTasks]);

  // Breakdown calculations
  const distributions = useMemo(() => {
    // 1. Status Breakdown
    const statusCounts = { todo: 0, in_progress: 0, review: 0, done: 0 };
    filteredTasks.forEach((t) => {
      if (t.status in statusCounts) {
        statusCounts[t.status as keyof typeof statusCounts]++;
      }
    });

    // 2. Priority Breakdown
    const priorityCounts = { low: 0, medium: 0, high: 0, urgent: 0 };
    filteredTasks.forEach((t) => {
      const prio = t.priority || 'medium';
      if (prio in priorityCounts) {
        priorityCounts[prio as keyof typeof priorityCounts]++;
      }
    });

    // 3. Project/List Breakdown
    const projectCounts: Record<string, number> = {};
    filteredTasks.forEach((t) => {
      const pId = t.project_id;
      projectCounts[pId] = (projectCounts[pId] || 0) + 1;
    });

    const projectData = Object.entries(projectCounts)
      .map(([pId, count]) => {
        const proj = projects.find((p) => p.id === pId);
        return {
          id: pId,
          name: proj ? proj.name : 'Unknown List',
          color: proj ? proj.color : '#8e8e93',
          count
        };
      })
      .sort((a, b) => b.count - a.count);

    return { statusCounts, priorityCounts, projectData };
  }, [filteredTasks, projects]);

  // Export tasks as Microsoft Excel compatible UTF-8 BOM CSV
  const handleExportCSV = () => {
    if (filteredTasks.length === 0) return;
    
    const headers = ['Title', 'List/Project', 'Priority', 'Status', 'Assignee', 'Created Date', 'Due Date', 'Description'];
    
    const rows = filteredTasks.map((t) => {
      const project = projects.find((p) => p.id === t.project_id);
      const projectName = project ? project.name : 'Unknown';
      const assigneeName = t.assignee?.full_name || 'Unassigned';
      const createdDate = new Date(t.created_at).toLocaleDateString();
      const dueDate = t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A';
      
      return [
        t.title,
        projectName,
        t.priority.toUpperCase(),
        t.status.replace('_', ' ').toUpperCase(),
        assigneeName,
        createdDate,
        dueDate,
        t.description || ''
      ].map(val => `"${val.replace(/"/g, '""')}"`);
    });
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    // Add UTF-8 BOM for perfect Excel loading
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Sundra_Report_${activeWorkspace?.name || 'Workspace'}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable layout configurations
  const handlePrintPDF = () => {
    setActiveTab('analytics');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (!activeWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-background text-text-secondary">
        Select a workspace to view reports.
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 md:space-y-8 animate-backdrop-fade-in relative pb-12">
      {/* Dynamic inline styles specifically for PDF browser printing formatting */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .print-card {
            border: 1px solid #e5e5ea !important;
            box-shadow: none !important;
            background-color: #ffffff !important;
            break-inside: avoid;
            border-radius: 12px !important;
            padding: 16px !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .print-table th {
            background-color: #f2f2f7 !important;
            color: #000000 !important;
            border-bottom: 2px solid #c7c7cc !important;
            font-weight: 700 !important;
          }
          .print-table td {
            border-bottom: 1px solid #e5e5ea !important;
          }
          @page {
            size: letter;
            margin: 15mm;
          }
        }
      `}</style>

      {/* Print-Only Header Branding */}
      <div className="hidden print:block border-b border-apple-gray pb-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-black">Sundra Workspace Report</h1>
            <p className="text-sm text-gray-600 mt-1">
              Workspace: <span className="font-semibold">{activeWorkspace.name}</span>
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>Generated by: {user?.full_name || 'System'}</p>
            <p>Date Range: {formatDisplayDate(startDate)} - {formatDisplayDate(endDate)}</p>
            <p>Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* Dashboard Screen Header (Hides on print) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground transition-all flex items-center">
            Reports & Analytics
          </h2>
          <p className="text-sm text-text-secondary mt-1 max-w-xl">
            Customizable date-range analysis, task distributions, and file exports.
          </p>
        </div>

        {/* Action triggers */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          {activeTab === 'analytics' ? (
            <>
              <button
                onClick={handleExportCSV}
                disabled={filteredTasks.length === 0}
                className="flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl text-foreground bg-card border border-border-custom hover:bg-background/80 shadow-custom-sm transition-all cursor-pointer active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
              >
                <ArrowDownToLine className="h-4 w-4 mr-2 text-text-secondary" />
                Export CSV
              </button>
              
              <button
                onClick={handlePrintPDF}
                disabled={filteredTasks.length === 0}
                className="flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl text-white bg-apple-blue hover:opacity-90 shadow-custom-sm transition-all cursor-pointer active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Report (PDF)
              </button>
            </>
          ) : (
            <button
              onClick={handleRefreshLogs}
              disabled={refreshing}
              className="flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl text-foreground bg-card border border-border-custom hover:bg-background/80 shadow-custom-sm transition-all cursor-pointer active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
            >
              <RefreshCw className={`h-4 w-4 mr-2 text-text-secondary ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Logs
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher (Hides on print) */}
      <div className="flex border-b border-border-custom/50 print:hidden">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'border-apple-blue text-apple-blue font-bold'
              : 'border-transparent text-text-secondary hover:text-foreground'
          }`}
        >
          Analytics & Exports
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all cursor-pointer ${
            activeTab === 'activity'
              ? 'border-apple-blue text-apple-blue font-bold'
              : 'border-transparent text-text-secondary hover:text-foreground'
          }`}
        >
          Activity Log
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-secondary">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-apple-blue"></div>
        </div>
      ) : (
        <>
          {activeTab === 'analytics' ? (
            <>
              {/* Date Range Selector controls (Hides on print) */}
              <div className="bg-card border border-border-custom rounded-2xl p-4 shadow-custom-sm space-y-4 print:hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-text-secondary tracking-wide uppercase">Select Range Template</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'today', label: 'Today' },
                      { id: '7days', label: 'Last 7 Days' },
                      { id: '30days', label: 'Last 30 Days' },
                      { id: '6months', label: 'Last 6 Months' },
                      { id: '1year', label: 'Last Year' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => selectPreset(p.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          activePreset === p.id
                            ? 'bg-apple-blue/10 border-apple-blue text-apple-blue font-bold shadow-custom-sm'
                            : 'bg-card border-border-custom text-text-secondary hover:text-foreground hover:bg-background/80'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border-custom/50">
                  <div className="flex items-center space-x-3 bg-background border border-border-custom px-3 py-2 rounded-xl text-sm min-w-0">
                    <span className="text-xs font-semibold text-text-secondary uppercase w-12 flex-shrink-0">From</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleCustomDateChange('start', e.target.value)}
                      className="bg-transparent border-0 focus:ring-0 p-0 text-sm text-foreground cursor-pointer focus:outline-none w-full"
                    />
                  </div>

                  <div className="flex items-center space-x-3 bg-background border border-border-custom px-3 py-2 rounded-xl text-sm min-w-0">
                    <span className="text-xs font-semibold text-text-secondary uppercase w-12 flex-shrink-0">To</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => handleCustomDateChange('end', e.target.value)}
                      className="bg-transparent border-0 focus:ring-0 p-0 text-sm text-foreground cursor-pointer focus:outline-none w-full"
                    />
                  </div>
                </div>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="bg-card border border-border-custom rounded-2xl p-12 text-center shadow-custom-sm">
                  <div className="h-12 w-12 rounded-full bg-apple-blue/10 text-apple-blue flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1">No Data Available</h3>
                  <p className="text-sm text-text-secondary max-w-sm mx-auto">
                    We couldn't find any tasks created between <span className="font-semibold">{formatDisplayDate(startDate)}</span> and <span className="font-semibold">{formatDisplayDate(endDate)}</span>.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 md:space-y-8">
                  
                  {/* KPI Summary Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Tasks */}
                    <div className="print-card bg-card border border-border-custom rounded-2xl p-5 shadow-custom-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-text-secondary tracking-wide uppercase">Total Tasks</p>
                        <h3 className="text-3xl font-extrabold text-foreground">{kpis.total}</h3>
                        <p className="text-[10px] text-text-secondary flex items-center">
                          Created in selected range
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-apple-blue/10 text-apple-blue flex items-center justify-center shadow-custom-sm">
                        <Folder className="h-5 w-5" />
                      </div>
                    </div>

                    {/* Completed Tasks */}
                    <div className="print-card bg-card border border-border-custom rounded-2xl p-5 shadow-custom-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-text-secondary tracking-wide uppercase">Completed Tasks</p>
                        <h3 className="text-3xl font-extrabold text-foreground">{kpis.completed}</h3>
                        <p className="text-[10px] text-text-secondary flex items-center">
                          Completed out of total
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-apple-green/10 text-apple-green flex items-center justify-center shadow-custom-sm">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                    </div>

                    {/* Completion Rate with SVG circular progress ring */}
                    <div className="print-card bg-card border border-border-custom rounded-2xl p-5 shadow-custom-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-text-secondary tracking-wide uppercase">Completion Rate</p>
                        <h3 className="text-3xl font-extrabold text-foreground">{kpis.rate}%</h3>
                        <p className="text-[10px] text-text-secondary flex items-center">
                          {kpis.rate === 100 ? 'All tasks finished!' : 'Overall progress'}
                        </p>
                      </div>
                      
                      {/* Premium Progress Ring */}
                      <div className="relative flex items-center justify-center h-14 w-14">
                        <svg className="w-14 h-14 transform -rotate-90">
                          {/* Background track */}
                          <circle
                            cx="28"
                            cy="28"
                            r="23"
                            stroke="var(--border-color)"
                            strokeWidth="4"
                            fill="transparent"
                          />
                          {/* Progress indicator */}
                          <circle
                            cx="28"
                            cy="28"
                            r="23"
                            stroke="var(--apple-green)"
                            strokeWidth="4"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 23}
                            strokeDashoffset={2 * Math.PI * 23 * (1 - kpis.rate / 100)}
                            strokeLinecap="round"
                            className="transition-all duration-500"
                          />
                        </svg>
                        <span className="absolute text-[10px] font-bold text-foreground">{kpis.rate}%</span>
                      </div>
                    </div>

                    {/* Overdue Tasks */}
                    <div className="print-card bg-card border border-border-custom rounded-2xl p-5 shadow-custom-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-text-secondary tracking-wide uppercase">Overdue Tasks</p>
                        <h3 className="text-3xl font-extrabold text-foreground">{kpis.overdue}</h3>
                        <p className="text-[10px] text-text-secondary flex items-center">
                          Missing due dates
                        </p>
                      </div>
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-custom-sm ${
                        kpis.overdue > 0 ? 'bg-apple-red/10 text-apple-red' : 'bg-apple-gray/10 text-apple-gray'
                      }`}>
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  {/* Breakdown / Distributions charts grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Status & Priority Distributions Card */}
                    <div className="print-card bg-card border border-border-custom rounded-2xl p-5 md:p-6 shadow-custom-sm space-y-6">
                      
                      {/* Status Breakdown Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-foreground">Status Breakdown</h4>
                          <span className="text-xs text-text-secondary">{kpis.total} Total Tasks</span>
                        </div>
                        
                        {/* Horizontal Segmented Progress Bar */}
                        <div className="h-3 w-full bg-border-custom rounded-full overflow-hidden flex shadow-custom-sm">
                          {['todo', 'in_progress', 'review', 'done'].map((status) => {
                            const count = distributions.statusCounts[status as keyof typeof distributions.statusCounts];
                            const percent = kpis.total > 0 ? (count / kpis.total) * 100 : 0;
                            if (count === 0) return null;
                            
                            const colorClass = 
                              status === 'todo' ? 'bg-apple-gray' :
                              status === 'in_progress' ? 'bg-apple-blue' :
                              status === 'review' ? 'bg-apple-orange' : 'bg-apple-green';
                              
                            return (
                              <div
                                key={status}
                                className={`${colorClass} h-full transition-all duration-300`}
                                style={{ width: `${percent}%` }}
                                title={`${status.replace('_', ' ')}: ${count} (${Math.round(percent)}%)`}
                              />
                            );
                          })}
                        </div>

                        {/* Status breakdown legend */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                          {[
                            { id: 'todo', label: 'Todo', color: 'bg-apple-gray' },
                            { id: 'in_progress', label: 'In Progress', color: 'bg-apple-blue' },
                            { id: 'review', label: 'Review', color: 'bg-apple-orange' },
                            { id: 'done', label: 'Completed', color: 'bg-apple-green' }
                          ].map((item) => {
                            const count = distributions.statusCounts[item.id as keyof typeof distributions.statusCounts];
                            const percent = kpis.total > 0 ? Math.round((count / kpis.total) * 100) : 0;
                            return (
                              <div key={item.id} className="flex items-center space-x-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${item.color} flex-shrink-0`} />
                                <div className="min-w-0">
                                  <p className="font-semibold text-foreground truncate">{item.label}</p>
                                  <p className="text-[10px] text-text-secondary">{count} ({percent}%)</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Priority Distribution Section */}
                      <div className="space-y-4 pt-4 border-t border-border-custom/50">
                        <h4 className="text-sm font-bold text-foreground">Priority Distribution</h4>
                        <div className="space-y-3">
                          {[
                            { id: 'low', label: 'Low', color: 'bg-apple-blue' },
                            { id: 'medium', label: 'Medium', color: 'bg-apple-orange' },
                            { id: 'high', label: 'High', color: 'bg-apple-red' },
                            { id: 'urgent', label: 'Urgent', color: 'bg-apple-purple' }
                          ].map((prio) => {
                            const count = distributions.priorityCounts[prio.id as keyof typeof distributions.priorityCounts];
                            const percent = kpis.total > 0 ? Math.round((count / kpis.total) * 100) : 0;
                            return (
                              <div key={prio.id} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-foreground">{prio.label}</span>
                                  <span className="text-text-secondary">{count} ({percent}%)</span>
                                </div>
                                <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border-custom/30">
                                  <div
                                    className={`${prio.color} h-full rounded-full transition-all duration-300`}
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* List/Project Distribution Card */}
                    <div className="print-card bg-card border border-border-custom rounded-2xl p-5 md:p-6 shadow-custom-sm flex flex-col justify-between">
                      <div className="space-y-4 w-full">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-foreground">List Distribution</h4>
                          <span className="text-xs text-text-secondary">{distributions.projectData.length} Lists Active</span>
                        </div>
                        
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                          {distributions.projectData.map((proj) => {
                            const percent = kpis.total > 0 ? Math.round((proj.count / kpis.total) * 100) : 0;
                            return (
                              <div key={proj.id} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center space-x-2 min-w-0">
                                    <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: proj.color }} />
                                    <span className="font-semibold text-foreground truncate">{proj.name}</span>
                                  </div>
                                  <span className="text-text-secondary flex-shrink-0">{proj.count} ({percent}%)</span>
                                </div>
                                <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border-custom/30">
                                  <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{ width: `${percent}%`, backgroundColor: proj.color }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                          
                          {distributions.projectData.length === 0 && (
                            <p className="text-xs text-text-secondary italic text-center py-6">No tasks distributed inside lists.</p>
                          )}
                        </div>
                      </div>

                      {/* Informational tip */}
                      <div className="mt-4 pt-4 border-t border-border-custom/50 flex items-start space-x-2 text-text-secondary text-[11px] print:hidden">
                        <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-apple-blue" />
                        <p>
                          Distribution shows task volumes across your workspace categories. Move items between lists to balance project priorities.
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Detailed Tasks Data Table Card */}
                  <div className="print-card bg-card border border-border-custom rounded-2xl shadow-custom-sm overflow-hidden">
                    <div className="p-5 border-b border-border-custom flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground">Detailed Task List</h4>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-background border border-border-custom text-text-secondary">
                        {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>
                    
                    <div className="overflow-x-auto w-full">
                      <table className="print-table w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-sidebar border-b border-border-custom text-text-secondary font-semibold uppercase tracking-wider">
                            <th className="px-5 py-3.5">Title</th>
                            <th className="px-5 py-3.5">List</th>
                            <th className="px-5 py-3.5">Priority</th>
                            <th className="px-5 py-3.5">Status</th>
                            <th className="px-5 py-3.5">Assignee</th>
                            <th className="px-5 py-3.5">Created</th>
                            <th className="px-5 py-3.5">Due Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-custom/50">
                          {filteredTasks.map((task) => {
                            const project = projects.find((p) => p.id === task.project_id);
                            const isTaskOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
                            
                            const prioColor = 
                              task.priority === 'urgent' ? 'text-apple-purple bg-apple-purple/10 border-apple-purple/20' :
                              task.priority === 'high' ? 'text-apple-red bg-apple-red/10 border-apple-red/20' :
                              task.priority === 'medium' ? 'text-apple-orange bg-apple-orange/10 border-apple-orange/20' :
                              'text-apple-blue bg-apple-blue/10 border-apple-blue/20';

                            const statusColor =
                              task.status === 'done' ? 'text-apple-green bg-apple-green/10 border-apple-green/20' :
                              task.status === 'review' ? 'text-apple-orange bg-apple-orange/10 border-apple-orange/20' :
                              task.status === 'in_progress' ? 'text-apple-blue bg-apple-blue/10 border-apple-blue/20' :
                              'text-apple-gray bg-apple-gray/10 border-apple-gray/20';

                            return (
                              <tr key={task.id} className="hover:bg-background/20 transition-colors">
                                {/* Title */}
                                <td className="px-5 py-3.5 font-semibold text-foreground max-w-xs truncate">
                                  {task.title}
                                </td>
                                {/* List name */}
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center space-x-1.5">
                                    <span
                                      className="h-2 w-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: project ? project.color : '#8e8e93' }}
                                    />
                                    <span className="text-text-secondary truncate max-w-[120px]">
                                      {project ? project.name : 'Unknown List'}
                                    </span>
                                  </div>
                                </td>
                                {/* Priority */}
                                <td className="px-5 py-3.5">
                                  <span className={`px-2 py-0.5 rounded-md border font-semibold uppercase text-[10px] ${prioColor}`}>
                                    {task.priority || 'medium'}
                                  </span>
                                </td>
                                {/* Status */}
                                <td className="px-5 py-3.5">
                                  <span className={`px-2 py-0.5 rounded-md border font-semibold uppercase text-[10px] ${statusColor}`}>
                                    {task.status.replace('_', ' ')}
                                  </span>
                                </td>
                                {/* Assignee */}
                                <td className="px-5 py-3.5 text-text-secondary">
                                  <div className="flex items-center space-x-2">
                                    <User className="h-3.5 w-3.5 text-text-secondary flex-shrink-0" />
                                    <span className="truncate max-w-[120px]">
                                      {task.assignee?.full_name || 'Unassigned'}
                                    </span>
                                  </div>
                                </td>
                                {/* Created Date */}
                                <td className="px-5 py-3.5 text-text-secondary">
                                  {new Date(task.created_at).toLocaleDateString()}
                                </td>
                                {/* Due Date */}
                                <td className={`px-5 py-3.5 font-medium ${
                                  isTaskOverdue ? 'text-apple-red font-semibold' : 'text-text-secondary'
                                }`}>
                                  {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}
            </>
          ) : (
            <div className="space-y-6 print:hidden">
              {/* Activity Log Controls */}
              <div className="bg-card border border-border-custom rounded-2xl p-4 shadow-custom-sm flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Workspace Activities</h4>
                  <p className="text-xs text-text-secondary mt-0.5">Showing the latest activities in this workspace.</p>
                </div>
                
                {/* Search Input */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Filter logs by keyword..."
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    className="w-full bg-background border border-border-custom hover:border-border-custom/80 focus:border-apple-blue rounded-xl py-2 pl-9 pr-4 text-xs text-foreground placeholder-text-secondary focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Timeline List */}
              {filteredLogs.length === 0 ? (
                <div className="bg-card border border-border-custom rounded-2xl p-12 text-center shadow-custom-sm">
                  <div className="h-12 w-12 rounded-full bg-apple-gray/10 text-text-secondary flex items-center justify-center mx-auto mb-4">
                    <Activity className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1">No Activity Logs</h3>
                  <p className="text-sm text-text-secondary max-w-sm mx-auto">
                    {logSearchQuery ? "No activities matched your search keyword." : "We couldn't find any recent activities recorded in this workspace."}
                  </p>
                </div>
              ) : (
                <div className="bg-card border border-border-custom rounded-2xl p-5 md:p-6 shadow-custom-sm">
                  <div className="relative pl-6 sm:pl-8 space-y-6">
                    {/* Timeline vertical connector line */}
                    <div className="absolute left-[11px] sm:left-[15px] top-2 bottom-2 w-0.5 bg-border-custom/50" />
                    
                    {filteredLogs.map((log) => {
                      const colors = getLogColorClass(log.action);
                      const userName = log.user?.full_name || 'Someone';
                      const userInitials = getInitials(userName);
                      const avatarColor = getAvatarColor(userName);
                      
                      return (
                        <div key={log.id} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2 group transition-all">
                          {/* Timeline node */}
                          <span className={`absolute -left-[20px] sm:-left-[24px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card ${colors.dot} ring-4 ring-card z-10`} />
                          
                          <div className="flex items-center space-x-3 min-w-0">
                            {/* Avatar */}
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-custom-sm ${avatarColor}`}>
                              {userInitials}
                            </div>
                            
                            {/* Message Description */}
                            <div className="text-xs text-text-secondary leading-relaxed min-w-0">
                              <span className="font-semibold text-foreground">{userName}</span>{' '}
                              {renderLogMessage(log)}
                            </div>
                          </div>
                          
                          {/* Time and category tag */}
                          <div className="flex items-center space-x-2 self-start sm:self-center pl-11 sm:pl-0 flex-shrink-0">
                            <span className="text-[10px] text-text-secondary font-medium">
                              {formatRelativeTime(log.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
