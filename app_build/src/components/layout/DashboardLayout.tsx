'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSearch } from '@/context/SearchContext';
import { dataService } from '@/lib/dataService';
import { Project, Notification, Task } from '@/types';
import {
  Calendar,
  Inbox,
  UserCheck,
  Folder,
  Users,
  Settings,
  ShieldCheck,
  Plus,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Menu as MenuIcon,
  X,
  Sun,
  Moon,
  CheckSquare,
  Circle,
  Hash,
  AlertCircle,
  Edit2,
  BarChart2
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, workspaces, activeWorkspace, setActiveWorkspace, logout, refreshWorkspaces } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { searchQuery, setSearchQuery } = useSearch();

  // Responsive state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  
  // UI states
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [projects, setProjects] = useState<Project[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [taskCounts, setTaskCounts] = useState({ today: 0, upcoming: 0, inbox: 0, myTasks: 0 });
  
  // Modals state
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#007aff');
  const [newProjectIcon, setNewProjectIcon] = useState('Folder');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);

  const appleColors = [
    '#007aff', // Blue
    '#34c759', // Green
    '#ff9500', // Orange
    '#ff3b30', // Red
    '#af52de', // Purple
    '#ff2d55', // Pink
    '#ffcc00', // Yellow
    '#8e8e93', // Gray
  ];

  const appleIcons = [
    { name: 'Folder', icon: Folder },
    { name: 'Inbox', icon: Inbox },
    { name: 'Calendar', icon: Calendar },
    { name: 'Users', icon: Users },
    { name: 'Hash', icon: Hash },
    { name: 'AlertCircle', icon: AlertCircle },
  ];

  // Theme Sync
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('sundra_theme') as 'light' | 'dark' | null;
      const initialTheme = savedTheme || 'light';
      setTheme(initialTheme);
      if (initialTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('sundra_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Load sidebar data (projects, tasks count, notifications)
  const loadSidebarData = async () => {
    if (!user || !activeWorkspace) return;
    try {
      // 1. Fetch projects
      const projs = await dataService.getProjects(activeWorkspace.id);
      setProjects(projs);
      // 2. Fetch notifications
      const notifs = await dataService.getNotifications(user.id);
      setNotifications(notifs);

      // 3. Fetch all tasks in workspace to calculate counts
      const tasks = await dataService.getTasksByWorkspace(activeWorkspace.id);
      
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

      let todayCount = 0;
      let upcomingCount = 0;
      let inboxCount = 0;
      let myTasksCount = 0;

      tasks.forEach((t) => {
        if (t.status === 'done') return; // Skip completed tasks for badge counts
        
        // Today check
        if (t.due_date) {
          const dueTime = new Date(t.due_date).getTime();
          if (dueTime >= todayStart && dueTime <= todayEnd) {
            todayCount++;
          } else if (dueTime > todayEnd) {
            upcomingCount++;
          }
        }

        // Inbox check (task does not belong to standard projects, or is personal)
        // For simplicity: if project name is Personal Reminders or it's the first project in list
        const proj = projs.find((p) => p.id === t.project_id);
        if (proj && proj.name === 'Personal Reminders') {
          inboxCount++;
        }

        // My Tasks check
        if (t.assignee_id === user.id) {
          myTasksCount++;
        }
      });

      setTaskCounts({
        today: todayCount,
        upcoming: upcomingCount,
        inbox: inboxCount,
        myTasks: myTasksCount,
      });

    } catch (err) {
      console.error('Error fetching sidebar data:', err);
    }
  };

  useEffect(() => {
    loadSidebarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeWorkspace, pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleDataChanged = () => {
      loadSidebarData();
    };
    window.addEventListener('sundra-data-changed', handleDataChanged);
    return () => {
      window.removeEventListener('sundra-data-changed', handleDataChanged);
    };
  }, [user, activeWorkspace]);

  // Close notifications and workspace dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Element;
      if (!target || typeof target.closest !== 'function') return;

      if (notificationsOpen && !target.closest('.notifications-container')) {
        setNotificationsOpen(false);
      }
      if (workspaceDropdownOpen && !target.closest('.workspace-container')) {
        setWorkspaceDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [notificationsOpen, workspaceDropdownOpen]);

  // Handle Workspace creation
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim() || !user) return;

    const ownsWorkspace = workspaces.some((ws) => ws.owner_id === user.id);
    if (ownsWorkspace) {
      alert("Workspace limit reached. You can only own one workspace. However, you can join other workspaces if you are invited.");
      setIsWorkspaceModalOpen(false);
      return;
    }

    try {
      const { data: newWs, error } = await dataService.createWorkspace(newWorkspaceName.trim(), user.id);
      if (error) {
        alert(error.message || 'Failed to create workspace.');
        return;
      }
      if (newWs) {
        setNewWorkspaceName('');
        setIsWorkspaceModalOpen(false);
        setWorkspaceDropdownOpen(false);
        await refreshWorkspaces();
        setActiveWorkspace(newWs);
        router.push('/dashboard/today');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'An unexpected error occurred.');
    }
  };

  const openNewProjectModal = () => {
    setEditingProject(null);
    setNewProjectName('');
    setNewProjectDesc('');
    setNewProjectColor('#007aff');
    setNewProjectIcon('Folder');
    setIsProjectModalOpen(true);
  };

  const openEditProjectModal = (proj: Project) => {
    setEditingProject(proj);
    setNewProjectName(proj.name);
    setNewProjectDesc(proj.description || '');
    setNewProjectColor(proj.color);
    setNewProjectIcon(proj.icon || 'Folder');
    setIsProjectModalOpen(true);
  };

  // Handle Project creation / update
  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !user || !activeWorkspace) return;
    try {
      if (editingProject) {
        const { data: updatedProj } = await dataService.updateProject(
          activeWorkspace.id,
          editingProject.id,
          newProjectName.trim(),
          newProjectDesc.trim() || null,
          newProjectColor,
          newProjectIcon,
          user.id
        );

        if (updatedProj) {
          setIsProjectModalOpen(false);
          await loadSidebarData();
          setEditingProject(null);
        }
      } else {
        const { data: newProj } = await dataService.createProject(
          activeWorkspace.id,
          newProjectName.trim(),
          newProjectDesc.trim() || null,
          newProjectColor,
          newProjectIcon,
          user.id
        );

        if (newProj) {
          setIsProjectModalOpen(false);
          await loadSidebarData();
          router.push(`/dashboard/projects/${newProj.id}`);
        }
      }
      setNewProjectName('');
      setNewProjectDesc('');
      setNewProjectColor('#007aff');
      setNewProjectIcon('Folder');
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Project deletion
  const handleDeleteProject = async () => {
    if (!editingProject || !user || !activeWorkspace) return;
    if (confirm(`Are you sure you want to delete the list "${editingProject.name}"? All tasks inside will be permanently deleted.`)) {
      try {
        const { error } = await dataService.deleteProject(
          activeWorkspace.id,
          editingProject.id,
          user.id
        );
        if (!error) {
          setIsProjectModalOpen(false);
          const deletedProjId = editingProject.id;
          setEditingProject(null);
          await loadSidebarData();
          if (pathname === `/dashboard/projects/${deletedProjId}`) {
            router.push('/dashboard/today');
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Handle marking notification as read
  const handleNotificationRead = async (id: string) => {
    await dataService.markNotificationAsRead(id);
    await loadSidebarData();
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await dataService.markAllNotificationsAsRead(user.id);
    await loadSidebarData();
  };

  // Sidebar drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    setDragOverProjectId(projectId);
  };

  const handleDragLeave = () => {
    setDragOverProjectId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetProjectId: string) => {
    e.preventDefault();
    setDragOverProjectId(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId || !activeWorkspace || !user) return;

    try {
      const { data: updated } = await dataService.updateTask(
        activeWorkspace.id,
        taskId,
        { project_id: targetProjectId },
        user.id
      );
      if (updated) {
        window.dispatchEvent(new CustomEvent('sundra-data-changed', { detail: { key: 'tasks' } }));
      }
    } catch (err) {
      console.error('Error moving task to project:', err);
    }
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length;

  if (!user || !activeWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-apple-blue"></div>
      </div>
    );
  }

  // Sidebar contents reusable
  const renderSidebarContent = () => (
    <div className="flex-1 flex flex-col min-h-0 bg-sidebar border-r border-border-custom px-4 py-6">
      {/* User Session Info & Workspace Selector */}
      <div className="relative mb-5 workspace-container">
        <button
          onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-background/80 transition-all focus:outline-none border border-transparent hover:border-border-custom cursor-pointer"
        >
          <div className="flex items-center text-left min-w-0">
            <div className="h-9 w-9 rounded-xl bg-apple-blue/10 text-apple-blue flex items-center justify-center font-bold text-sm mr-3 border border-apple-blue/20">
              {activeWorkspace.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary font-medium tracking-wide truncate">WORKSPACE</p>
              <p className="text-sm font-semibold text-foreground truncate">{activeWorkspace.name}</p>
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-text-secondary flex-shrink-0" />
        </button>

        {/* Dropdown Menu */}
        {workspaceDropdownOpen && (
          <div className="absolute left-0 right-0 mt-2 rounded-xl bg-card border border-border-custom shadow-custom-lg z-50 overflow-hidden py-1">
            <div className="px-3 py-2 text-xs font-semibold text-text-secondary border-b border-border-custom">
              Switch Workspace
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspace(ws);
                    setWorkspaceDropdownOpen(false);
                    router.push('/dashboard/today');
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-background/80 flex items-center justify-between transition-colors cursor-pointer ${
                    activeWorkspace.id === ws.id ? 'text-apple-blue font-semibold bg-apple-blue-light' : 'text-foreground'
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                  {activeWorkspace.id === ws.id && <div className="h-1.5 w-1.5 rounded-full bg-apple-blue" />}
                </button>
              ))}
            </div>
            <div className="border-t border-border-custom p-1.5 bg-sidebar">
              <button
                onClick={() => {
                  const ownsWorkspace = workspaces.some((ws) => ws.owner_id === user?.id);
                  if (ownsWorkspace) {
                    alert("Workspace limit reached. You can only own one workspace. However, you can join other workspaces if you are invited.");
                  } else {
                    setIsWorkspaceModalOpen(true);
                  }
                }}
                className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-apple-blue bg-card border border-border-custom hover:bg-background rounded-lg shadow-custom-sm transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Create Workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Global Quick Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
        <input
          type="text"
          placeholder="Search Reminders"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border-custom bg-background/50 text-foreground placeholder-text-secondary focus:outline-none focus:border-apple-blue focus:ring-1 focus:ring-apple-blue text-sm transition-all"
        />
      </div>

      {/* Apple 2x2 Grid Indicators */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Today */}
        <Link
          href="/dashboard/today"
          className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
            pathname === '/dashboard/today'
              ? 'bg-card border-apple-blue shadow-custom-md'
              : 'bg-card/40 border-border-custom hover:bg-card/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 rounded-full bg-apple-blue text-white flex items-center justify-center">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <span className="text-2xl font-bold text-foreground">{taskCounts.today}</span>
          </div>
          <span className="text-xs font-semibold text-text-secondary mt-3">Today</span>
        </Link>

        {/* Scheduled / Upcoming */}
        <Link
          href="/dashboard/upcoming"
          className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
            pathname === '/dashboard/upcoming'
              ? 'bg-card border-apple-orange shadow-custom-md'
              : 'bg-card/40 border-border-custom hover:bg-card/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 rounded-full bg-apple-orange text-white flex items-center justify-center">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <span className="text-2xl font-bold text-foreground">{taskCounts.upcoming}</span>
          </div>
          <span className="text-xs font-semibold text-text-secondary mt-3">Scheduled</span>
        </Link>

        {/* Inbox */}
        <Link
          href="/dashboard/my-tasks"
          className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
            pathname === '/dashboard/my-tasks'
              ? 'bg-card border-apple-green shadow-custom-md'
              : 'bg-card/40 border-border-custom hover:bg-card/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 rounded-full bg-apple-green text-white flex items-center justify-center">
              <UserCheck className="h-4.5 w-4.5" />
            </div>
            <span className="text-2xl font-bold text-foreground">{taskCounts.myTasks}</span>
          </div>
          <span className="text-xs font-semibold text-text-secondary mt-3">My Tasks</span>
        </Link>

        {/* All / Projects overview */}
        <Link
          href="/dashboard/projects"
          className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
            pathname === '/dashboard/projects'
              ? 'bg-card border-apple-gray shadow-custom-md'
              : 'bg-card/40 border-border-custom hover:bg-card/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 rounded-full bg-apple-gray text-white flex items-center justify-center">
              <Folder className="h-4.5 w-4.5" />
            </div>
            <span className="text-2xl font-bold text-foreground">{projects.length}</span>
          </div>
          <span className="text-xs font-semibold text-text-secondary mt-3">All Lists</span>
        </Link>
      </div>

      {/* Scrollable Navigation Sections */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1 -mr-2">
        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary tracking-wide uppercase px-2 mb-2">
            <span>My Lists</span>
            <button
              onClick={openNewProjectModal}
              className="text-apple-blue hover:bg-background/80 p-1 rounded-md transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-0.5">
            {projects.map((proj) => {
              const isActive = pathname === `/dashboard/projects/${proj.id}`;
              const IconComponent = appleIcons.find((i) => i.name === proj.icon)?.icon || Folder;
              const isDragOver = dragOverProjectId === proj.id;
              return (
                <div
                  key={proj.id}
                  className="group relative flex items-center transition-all duration-200"
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, proj.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, proj.id)}
                >
                  <Link
                    href={`/dashboard/projects/${proj.id}`}
                    className={`flex-1 flex items-center justify-between pl-3 pr-10 py-2 text-sm rounded-xl transition-all cursor-pointer ${
                      isActive
                        ? 'bg-card font-semibold text-foreground shadow-custom-sm border border-border-custom/50'
                        : 'text-foreground hover:bg-card/40 border border-transparent'
                    } ${
                      isDragOver
                        ? 'ring-2 ring-apple-blue scale-102 bg-apple-blue-light/10 border-apple-blue shadow-custom-sm'
                        : ''
                    }`}
                  >
                    <div className="flex items-center min-w-0">
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center mr-3 text-white flex-shrink-0"
                        style={{ backgroundColor: proj.color }}
                      >
                        <IconComponent className="h-3 w-3" />
                      </div>
                      <span className="truncate">{proj.name}</span>
                    </div>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openEditProjectModal(proj);
                    }}
                    className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-text-secondary hover:text-foreground hover:bg-background/80 transition-all cursor-pointer z-10"
                    title="Edit List"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}

            {projects.length === 0 && (
              <p className="text-xs text-text-secondary italic px-3 py-2">No projects found. Add a list!</p>
            )}
          </div>
        </div>

        {/* General Management Section */}
        <div>
          <div className="text-xs font-semibold text-text-secondary tracking-wide uppercase px-2 mb-2">
            Collaborate
          </div>
          <div className="space-y-0.5">
            <Link
              href="/dashboard/teams"
              className={`flex items-center px-3 py-2.5 text-sm rounded-xl transition-all cursor-pointer ${
                pathname === '/dashboard/teams' ? 'bg-card font-semibold text-foreground border border-border-custom/50 shadow-custom-sm' : 'text-foreground hover:bg-card/40 border border-transparent'
              }`}
            >
              <Users className="h-4 w-4 mr-3 text-text-secondary" />
              <span>Teams & Members</span>
            </Link>

            <Link
              href="/dashboard/reports"
              className={`flex items-center px-3 py-2.5 text-sm rounded-xl transition-all cursor-pointer ${
                pathname === '/dashboard/reports' ? 'bg-card font-semibold text-foreground border border-border-custom/50 shadow-custom-sm' : 'text-foreground hover:bg-card/40 border border-transparent'
              }`}
            >
              <BarChart2 className="h-4 w-4 mr-3 text-text-secondary" />
              <span>Reports & Analytics</span>
            </Link>
            
            <Link
              href="/dashboard/settings"
              className={`flex items-center px-3 py-2.5 text-sm rounded-xl transition-all cursor-pointer ${
                pathname === '/dashboard/settings' ? 'bg-card font-semibold text-foreground border border-border-custom/50 shadow-custom-sm' : 'text-foreground hover:bg-card/40 border border-transparent'
              }`}
            >
              <Settings className="h-4 w-4 mr-3 text-text-secondary" />
              <span>Settings</span>
            </Link>

            {user.role === 'Super Admin' && (
              <Link
                href="/dashboard/super-admin"
                className={`flex items-center px-3 py-2.5 text-sm rounded-xl border transition-all cursor-pointer ${
                  pathname === '/dashboard/super-admin'
                    ? 'bg-apple-purple/10 border-apple-purple/35 text-apple-purple font-semibold'
                    : 'text-apple-purple hover:bg-apple-purple/5 border-transparent'
                }`}
              >
                <ShieldCheck className="h-4 w-4 mr-3" />
                <span>Super Admin</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Footer Profil Panel */}
      <div className="border-t border-border-custom pt-4 mt-auto flex items-center justify-between">
        <div className="flex items-center min-w-0">
          <img
            src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}`}
            alt={user.full_name}
            className="h-9 w-9 rounded-xl border border-border-custom bg-card flex-shrink-0"
          />
          <div className="ml-3 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{user.full_name}</p>
            <span className="inline-flex items-center rounded-full bg-apple-blue/10 px-2 py-0.2 text-[10px] font-semibold text-apple-blue">
              {user.role}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Light/Dark mode */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-background/80 text-text-secondary hover:text-foreground transition-all cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
          </button>
          
          {/* LogOut */}
          <button
            onClick={logout}
            className="p-1.5 rounded-lg hover:bg-apple-red/10 text-text-secondary hover:text-apple-red transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col md:flex-row w-full max-w-full h-screen overflow-hidden print:h-auto print:overflow-visible print:bg-white">
      {/* Mobile Top Navbar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border-custom print:hidden">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 rounded-lg text-text-secondary hover:bg-background transition-colors cursor-pointer"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          
          <div className="flex items-center ml-3">
            <div className="h-8 w-8 rounded-xl bg-apple-blue text-white flex items-center justify-center shadow-custom-sm">
              <CheckSquare className="h-5 w-5" />
            </div>
            <span className="ml-2 font-bold text-foreground text-base">Sundra</span>
          </div>
        </div>

        {/* Notifications and Profile */}
        <div className="flex items-center space-x-3">
          <div className="relative notifications-container">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-xl hover:bg-background text-text-secondary hover:text-foreground relative transition-colors cursor-pointer"
            >
              <Bell className="h-5 w-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-apple-red text-[10px] font-bold text-white flex items-center justify-center rounded-full">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-card border border-border-custom shadow-custom-lg z-50 overflow-hidden py-1">
                <div className="px-4 py-3 border-b border-border-custom flex items-center justify-between bg-sidebar">
                  <span className="text-xs font-bold text-foreground">Notifications</span>
                  {unreadNotificationsCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-apple-blue hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-border-custom">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 transition-colors ${n.is_read ? 'bg-card/50' : 'bg-apple-blue-light/5'}`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-semibold text-foreground">{n.title}</p>
                        {!n.is_read && (
                          <button
                            onClick={() => handleNotificationRead(n.id)}
                            className="text-[10px] text-apple-blue font-semibold hover:underline cursor-pointer"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-1">{n.message}</p>
                      <p className="text-[10px] text-text-secondary/70 mt-2">
                        {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="p-6 text-center text-xs text-text-secondary italic">
                      No notifications yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden md:flex md:flex-col md:w-68 flex-shrink-0 print:hidden">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Sidebar (Drawer Overlay) */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-50 md:hidden animate-backdrop-fade-in bg-black/40 backdrop-blur-xs">
          <div className="relative flex flex-col w-full max-w-xs flex-1">
            {/* Close Button */}
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg bg-card border border-border-custom hover:bg-background text-text-secondary hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {renderSidebarContent()}
          </div>
          <div className="flex-1" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full max-w-full min-w-0 overflow-y-auto overflow-x-hidden bg-background transition-colors duration-200 print:overflow-visible print:bg-white">
        {/* Top desktop header bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-border-custom/50 bg-card/10 backdrop-blur-md print:hidden">
          <div>
            <h1 className="text-lg font-bold text-foreground">Sundra Project</h1>
          </div>
          <div className="flex items-center space-x-4">
            {/* Notifications Popover */}
            <div className="relative notifications-container">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2.5 rounded-xl hover:bg-card text-text-secondary hover:text-foreground border border-transparent hover:border-border-custom/50 relative transition-all cursor-pointer"
              >
                <Bell className="h-5 w-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-apple-red text-[10px] font-bold text-white flex items-center justify-center rounded-full shadow-custom-sm">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-card border border-border-custom shadow-custom-lg z-50 overflow-hidden py-1">
                  <div className="px-4 py-3 border-b border-border-custom flex items-center justify-between bg-sidebar">
                    <span className="text-xs font-bold text-foreground">Notifications</span>
                    {unreadNotificationsCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-semibold text-apple-blue hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-border-custom">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-4 transition-colors ${n.is_read ? 'bg-card/50' : 'bg-apple-blue-light/5'}`}
                      >
                        <div className="flex justify-between items-start">
                          <p className="text-xs font-semibold text-foreground">{n.title}</p>
                          {!n.is_read && (
                            <button
                              onClick={() => handleNotificationRead(n.id)}
                              className="text-[10px] text-apple-blue font-semibold hover:underline cursor-pointer"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary mt-1">{n.message}</p>
                        <p className="text-[10px] text-text-secondary/70 mt-2">
                          {new Date(n.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="p-6 text-center text-xs text-text-secondary italic">
                        No notifications yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Inner Content */}
        <div className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden p-4 md:p-8 print:p-0 print:overflow-visible">
          {children}
        </div>
      </main>

      {/* CREATE WORKSPACE MODAL (HTML dialog with backdrop blur) */}
      {isWorkspaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border-custom shadow-custom-lg overflow-hidden animate-backdrop-fade-in p-6">
            <h3 className="text-lg font-bold text-foreground mb-1">Create Workspace</h3>
            <p className="text-xs text-text-secondary mb-4">Workspaces help isolate different organization/team tasks.</p>
            <form onSubmit={handleCreateWorkspace}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Workspace Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp, Marketing Team"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full rounded-xl border border-border-custom bg-background px-4 py-3 text-foreground shadow-sm placeholder-text-secondary focus:border-apple-blue focus:ring-1 focus:ring-apple-blue focus:outline-none text-sm transition-all"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWorkspaceModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl text-text-secondary hover:bg-background border border-border-custom transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold rounded-xl text-white bg-apple-blue hover:opacity-90 active:scale-98 transition-all cursor-pointer"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE/EDIT PROJECT MODAL (HTML dialog with custom accent circles) */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border-custom shadow-custom-lg overflow-hidden animate-backdrop-fade-in p-6">
            <h3 className="text-lg font-bold text-foreground mb-1">
              {editingProject ? 'Edit List' : 'New List'}
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              {editingProject
                ? 'Update your list name, colors, and iconic attributes.'
                : 'Organize your tasks into thematic lists or folder components.'}
            </p>
            <form onSubmit={handleSubmitProject}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">List Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Design Checklist, Reminders"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full rounded-xl border border-border-custom bg-background px-4 py-3 text-foreground shadow-sm placeholder-text-secondary focus:border-apple-blue focus:ring-1 focus:ring-apple-blue focus:outline-none text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Optional project explanation..."
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full rounded-xl border border-border-custom bg-background px-4 py-3 text-foreground shadow-sm placeholder-text-secondary focus:border-apple-blue focus:ring-1 focus:ring-apple-blue focus:outline-none text-sm transition-all resize-none"
                  />
                </div>
                
                {/* Color Chooser */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">Accent Color</label>
                  <div className="flex flex-wrap gap-2.5">
                    {appleColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewProjectColor(color)}
                        className={`h-7 w-7 rounded-full transition-transform active:scale-90 cursor-pointer ${
                          newProjectColor === color ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Icon Chooser */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">Folder Icon</label>
                  <div className="grid grid-cols-6 gap-2">
                    {appleIcons.map(({ name, icon: IconComponent }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setNewProjectIcon(name)}
                        className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                          newProjectIcon === name
                            ? 'bg-foreground text-background border-foreground scale-105'
                            : 'bg-background hover:bg-sidebar text-text-secondary border-border-custom'
                        }`}
                      >
                        <IconComponent className="h-5 w-5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-6 border-t border-border-custom mt-6">
                {editingProject ? (
                  <button
                    type="button"
                    onClick={handleDeleteProject}
                    className="px-4 py-2 text-sm font-semibold rounded-xl text-apple-red hover:bg-apple-red/10 transition-colors cursor-pointer"
                  >
                    Delete List
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProjectModalOpen(false);
                      setEditingProject(null);
                    }}
                    className="px-4 py-2 text-sm font-semibold rounded-xl text-text-secondary hover:bg-background border border-border-custom transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-semibold rounded-xl text-white bg-apple-blue hover:opacity-90 active:scale-98 transition-all cursor-pointer"
                    style={{ backgroundColor: newProjectColor }}
                  >
                    {editingProject ? 'Save' : 'Create List'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
