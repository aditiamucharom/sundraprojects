import { supabase, isSupabaseConfigured } from './supabase';
import {
  Workspace,
  WorkspaceMember,
  Project,
  Task,
  Subtask,
  Comment,
  Attachment,
  Notification,
  ActivityLog,
  TaskPriority,
  TaskStatus,
  WorkspaceRole,
  UserProfile,
} from '../types';

// Local Storage Keys
const KEYS = {
  WORKSPACES: 'sundra_workspaces',
  MEMBERS: 'sundra_workspace_members',
  PROJECTS: 'sundra_projects',
  TASKS: 'sundra_tasks',
  SUBTASKS: 'sundra_subtasks',
  COMMENTS: 'sundra_comments',
  ATTACHMENTS: 'sundra_attachments',
  NOTIFICATIONS: 'sundra_notifications',
  LOGS: 'sundra_activity_logs',
};

// LocalStorage Helper functions
function getLocal<T>(key: string, defaultValue: T[] = []): T[] {
  if (typeof window === 'undefined') return defaultValue;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
}

function saveLocal<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('sundra-data-changed', { detail: { key } }));
}

// Generate unique mock IDs
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Automatically seed mock data on first load in Local-First Mode
export function seedMockData(currentUserId: string, currentUserEmail: string, currentUserName: string) {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('sundra_seeded') === 'true') return;

  const now = new Date().toISOString();

  // 1. Create a workspace
  const workspaceId = generateUUID();
  const mockWorkspaces: Workspace[] = [
    {
      id: workspaceId,
      name: 'Sundra HQ Workspace',
      slug: 'sundra-hq',
      owner_id: currentUserId,
      created_at: now,
    },
  ];
  saveLocal(KEYS.WORKSPACES, mockWorkspaces);

  // 2. Add owner member
  const mockMembers: WorkspaceMember[] = [
    {
      id: generateUUID(),
      workspace_id: workspaceId,
      user_id: currentUserId,
      role: 'Owner',
      created_at: now,
    },
  ];
  saveLocal(KEYS.MEMBERS, mockMembers);

  // 3. Create projects
  const personalProjId = generateUUID();
  const launchProjId = generateUUID();
  const designProjId = generateUUID();
  const mockProjects: Project[] = [
    {
      id: personalProjId,
      workspace_id: workspaceId,
      name: 'Personal Reminders',
      description: 'Daily operational tasks and personal follow-ups.',
      color: '#007aff', // Apple Blue
      icon: 'ListTodo',
      created_by: currentUserId,
      created_at: now,
    },
    {
      id: launchProjId,
      workspace_id: workspaceId,
      name: 'Project Launch 🚀',
      description: 'Sundra Project initial roadmap and milestones.',
      color: '#ff9500', // Apple Orange
      icon: 'Rocket',
      created_by: currentUserId,
      created_at: now,
    },
    {
      id: designProjId,
      workspace_id: workspaceId,
      name: 'Design System',
      description: 'Establishing Apple-Reminders design components.',
      color: '#af52de', // Apple Purple
      icon: 'Palette',
      created_by: currentUserId,
      created_at: now,
    },
  ];
  saveLocal(KEYS.PROJECTS, mockProjects);

  // 4. Create tasks
  const t1 = generateUUID();
  const t2 = generateUUID();
  const t3 = generateUUID();
  const t4 = generateUUID();
  const t5 = generateUUID();
  
  const todayStr = new Date();
  const tomorrowStr = new Date(todayStr);
  tomorrowStr.setDate(todayStr.getDate() + 1);
  const nextWeekStr = new Date(todayStr);
  nextWeekStr.setDate(todayStr.getDate() + 7);

  const mockTasks: Task[] = [
    {
      id: t1,
      project_id: personalProjId,
      title: 'Review daily team checklist',
      description: 'Discuss current blockers and sync on milestone 1 goals.',
      assignee_id: currentUserId,
      due_date: todayStr.toISOString(),
      priority: 'high',
      status: 'todo',
      created_by: currentUserId,
      created_at: now,
    },
    {
      id: t2,
      project_id: personalProjId,
      title: 'Update project settings page',
      description: 'Add workspace custom names and details settings UI.',
      assignee_id: null,
      due_date: null,
      priority: 'low',
      status: 'done',
      created_by: currentUserId,
      created_at: now,
    },
    {
      id: t3,
      project_id: launchProjId,
      title: 'Execute schema.sql in Supabase Console',
      description: 'Perform tables construction, hooks sync, and enable row level security.',
      assignee_id: currentUserId,
      due_date: tomorrowStr.toISOString(),
      priority: 'urgent',
      status: 'todo',
      created_by: currentUserId,
      created_at: now,
    },
    {
      id: t4,
      project_id: launchProjId,
      title: 'Design Apple Reminders UI/UX theme',
      description: 'Draft fluid colors, glassmorphism overlays, and bouncy micro-animations.',
      assignee_id: currentUserId,
      due_date: todayStr.toISOString(),
      priority: 'high',
      status: 'in_progress',
      created_by: currentUserId,
      created_at: now,
    },
    {
      id: t5,
      project_id: designProjId,
      title: 'Define harmonious HSL palette',
      description: 'Create the core design system tokens inside tailwind.config.',
      assignee_id: null,
      due_date: nextWeekStr.toISOString(),
      priority: 'medium',
      status: 'done',
      created_by: currentUserId,
      created_at: now,
    },
  ];
  saveLocal(KEYS.TASKS, mockTasks);

  // 5. Create subtasks
  const mockSubtasks: Subtask[] = [
    {
      id: generateUUID(),
      task_id: t3,
      title: 'Copy script schema.sql content',
      is_completed: true,
      created_at: now,
    },
    {
      id: generateUUID(),
      task_id: t3,
      title: 'Paste inside Supabase SQL editor and run',
      is_completed: false,
      created_at: now,
    },
    {
      id: generateUUID(),
      task_id: t4,
      title: 'Build sidebar layout details',
      is_completed: true,
      created_at: now,
    },
    {
      id: generateUUID(),
      task_id: t4,
      title: 'Add completion bouncy sound effects',
      is_completed: false,
      created_at: now,
    },
  ];
  saveLocal(KEYS.SUBTASKS, mockSubtasks);

  // 6. Create comments
  const mockComments: Comment[] = [
    {
      id: generateUUID(),
      task_id: t4,
      user_id: currentUserId,
      content: 'This sidebar feels really premium! The light mode background is neat.',
      created_at: now,
    },
  ];
  saveLocal(KEYS.COMMENTS, mockComments);

  // 7. Create activity logs
  const mockLogs: ActivityLog[] = [
    {
      id: generateUUID(),
      workspace_id: workspaceId,
      user_id: currentUserId,
      action: 'Create Project',
      details: { project_name: 'Project Launch 🚀' },
      created_at: now,
    },
    {
      id: generateUUID(),
      workspace_id: workspaceId,
      user_id: currentUserId,
      action: 'Create Task',
      details: { task_title: 'Design Apple Reminders UI/UX theme' },
      created_at: now,
    },
  ];
  saveLocal(KEYS.LOGS, mockLogs);

  // 8. Create notifications
  const mockNotifications: Notification[] = [
    {
      id: generateUUID(),
      user_id: currentUserId,
      title: 'Welcome to Sundra Project!',
      message: 'Explore the Apple Reminders styled workflow workspace. Try adding a list task!',
      is_read: false,
      link: '/dashboard/today',
      created_at: now,
    },
  ];
  saveLocal(KEYS.NOTIFICATIONS, mockNotifications);

  localStorage.setItem('sundra_seeded', 'true');
}

// Calculate the next due date for recurring tasks
export function calculateNextDueDate(
  currentDueDateStr: string | null | undefined,
  recurrence: 'daily' | 'weekly' | 'monthly' | 'yearly'
): string {
  let baseDate = currentDueDateStr ? new Date(currentDueDateStr) : new Date();
  if (isNaN(baseDate.getTime())) {
    baseDate = new Date();
  }

  // Always advance by at least one interval first
  switch (recurrence) {
    case 'daily':
      baseDate.setDate(baseDate.getDate() + 1);
      break;
    case 'weekly':
      baseDate.setDate(baseDate.getDate() + 7);
      break;
    case 'monthly':
      baseDate.setMonth(baseDate.getMonth() + 1);
      break;
    case 'yearly':
      baseDate.setFullYear(baseDate.getFullYear() + 1);
      break;
    default:
      baseDate.setDate(baseDate.getDate() + 1);
      break;
  }

  const now = new Date();
  // Ensure the next due date is strictly in the future
  while (baseDate <= now) {
    switch (recurrence) {
      case 'daily':
        baseDate.setDate(baseDate.getDate() + 1);
        break;
      case 'weekly':
        baseDate.setDate(baseDate.getDate() + 7);
        break;
      case 'monthly':
        baseDate.setMonth(baseDate.getMonth() + 1);
        break;
      case 'yearly':
        baseDate.setFullYear(baseDate.getFullYear() + 1);
        break;
      default:
        baseDate.setDate(baseDate.getDate() + 1);
        break;
    }
  }
  return baseDate.toISOString();
}

// Unified Database API
export const dataService = {
  // Helper: Retrieve profiles list for joins
  async _getProfilesList(): Promise<UserProfile[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('users_profile').select('*');
      return data || [];
    } else {
      const stored = localStorage.getItem('sundra_profiles');
      return stored ? JSON.parse(stored) : [];
    }
  },

  // ---------------------------------------------------------
  // WORKSPACES
  // ---------------------------------------------------------
  async getWorkspaces(userId: string): Promise<Workspace[]> {
    if (isSupabaseConfigured && supabase) {
      // Get workspaces where user is a member
      const { data, error } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(*)')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error fetching workspaces:', error);
        return [];
      }
      return (data || []).map((item: any) => item.workspaces).filter(Boolean);
    } else {
      const workspaces = getLocal<Workspace>(KEYS.WORKSPACES);
      const memberships = getLocal<WorkspaceMember>(KEYS.MEMBERS);
      const userWorkspaceIds = memberships
        .filter((m) => m.user_id === userId)
        .map((m) => m.workspace_id);
      return workspaces.filter((w) => userWorkspaceIds.includes(w.id));
    }
  },

  async getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('slug', slug)
        .single();
      return error ? null : data;
    } else {
      const workspaces = getLocal<Workspace>(KEYS.WORKSPACES);
      return workspaces.find((w) => w.slug === slug) || null;
    }
  },

  async createWorkspace(name: string, ownerId: string): Promise<{ data: Workspace | null; error: any }> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);
    
    if (isSupabaseConfigured && supabase) {
      // Check if user already owns a workspace
      const { data: existing, error: existError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', ownerId);
      
      if (existing && existing.length > 0) {
        return { data: null, error: { message: 'Workspace limit reached. You can only own one workspace.' } };
      }

      // 1. Insert Workspace
      const { data: ws, error: wsError } = await supabase
        .from('workspaces')
        .insert({ name, slug, owner_id: ownerId })
        .select()
        .single();
      
      if (wsError) return { data: null, error: wsError };

      // 2. Add owner to workspace_members
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({ workspace_id: ws.id, user_id: ownerId, role: 'Owner' });

      if (memberError) return { data: null, error: memberError };
      return { data: ws as Workspace, error: null };
    } else {
      const workspaces = getLocal<Workspace>(KEYS.WORKSPACES);
      const memberships = getLocal<WorkspaceMember>(KEYS.MEMBERS);

      if (workspaces.some((w) => w.owner_id === ownerId)) {
        return { data: null, error: { message: 'Workspace limit reached. You can only own one workspace.' } };
      }

      const newWorkspace: Workspace = {
        id: generateUUID(),
        name,
        slug,
        owner_id: ownerId,
        created_at: new Date().toISOString(),
      };

      const newMember: WorkspaceMember = {
        id: generateUUID(),
        workspace_id: newWorkspace.id,
        user_id: ownerId,
        role: 'Owner',
        created_at: new Date().toISOString(),
      };

      workspaces.push(newWorkspace);
      memberships.push(newMember);
      
      saveLocal(KEYS.WORKSPACES, workspaces);
      saveLocal(KEYS.MEMBERS, memberships);

      await this.createActivityLog(newWorkspace.id, ownerId, 'Create Workspace', { workspace_name: name });

      return { data: newWorkspace, error: null };
    }
  },

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*, user:users_profile(*)')
        .eq('workspace_id', workspaceId);
      
      if (error) return [];
      return data as WorkspaceMember[];
    } else {
      const memberships = getLocal<WorkspaceMember>(KEYS.MEMBERS);
      const profiles = await this._getProfilesList();
      
      return memberships
        .filter((m) => m.workspace_id === workspaceId)
        .map((m) => ({
          ...m,
          user: profiles.find((p) => p.id === m.user_id),
        }));
    }
  },

  async addWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('workspace_members')
        .insert({ workspace_id: workspaceId, user_id: userId, role });
      
      return { error };
    } else {
      const memberships = getLocal<WorkspaceMember>(KEYS.MEMBERS);
      const alreadyMember = memberships.some((m) => m.workspace_id === workspaceId && m.user_id === userId);
      if (alreadyMember) {
        return { error: { message: 'User is already a member of this workspace.' } };
      }

      const newMember: WorkspaceMember = {
        id: generateUUID(),
        workspace_id: workspaceId,
        user_id: userId,
        role,
        created_at: new Date().toISOString(),
      };

      memberships.push(newMember);
      saveLocal(KEYS.MEMBERS, memberships);

      // Notify user
      await this.createNotification(userId, 'New Workspace Invitation', `You have been added to a workspace.`, '/dashboard/settings');

      return { error: null };
    }
  },

  async removeWorkspaceMember(workspaceId: string, userId: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);
      return { error };
    } else {
      const memberships = getLocal<WorkspaceMember>(KEYS.MEMBERS);
      const filtered = memberships.filter((m) => !(m.workspace_id === workspaceId && m.user_id === userId));
      saveLocal(KEYS.MEMBERS, filtered);
      return { error: null };
    }
  },

  // ---------------------------------------------------------
  // PROJECTS
  // ---------------------------------------------------------
  async getProjects(workspaceId: string): Promise<Project[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });
      if (error) return [];
      return data as Project[];
    } else {
      const projects = getLocal<Project>(KEYS.PROJECTS);
      return projects.filter((p) => p.workspace_id === workspaceId);
    }
  },

  async getProjectById(projectId: string): Promise<Project | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      return error ? null : data;
    } else {
      const projects = getLocal<Project>(KEYS.PROJECTS);
      return projects.find((p) => p.id === projectId) || null;
    }
  },

  async createProject(
    workspaceId: string,
    name: string,
    description: string | null,
    color: string,
    icon: string,
    createdBy: string
  ): Promise<{ data: Project | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('projects')
        .insert({ workspace_id: workspaceId, name, description, color, icon, created_by: createdBy })
        .select()
        .single();
      return { data: data as Project | null, error };
    } else {
      const projects = getLocal<Project>(KEYS.PROJECTS);
      const newProj: Project = {
        id: generateUUID(),
        workspace_id: workspaceId,
        name,
        description,
        color,
        icon,
        created_by: createdBy,
        created_at: new Date().toISOString(),
      };
      projects.push(newProj);
      saveLocal(KEYS.PROJECTS, projects);

      await this.createActivityLog(workspaceId, createdBy, 'Create Project', { project_name: name });

      return { data: newProj, error: null };
    }
  },

  async updateProject(
    workspaceId: string,
    id: string,
    name: string,
    description: string | null,
    color: string,
    icon: string,
    userId: string
  ): Promise<{ data: Project | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('projects')
        .update({ name, description, color, icon })
        .eq('id', id)
        .select()
        .single();
      return { data: data as Project | null, error };
    } else {
      const projects = getLocal<Project>(KEYS.PROJECTS);
      const idx = projects.findIndex((p) => p.id === id);
      if (idx === -1) return { data: null, error: { message: 'Project not found' } };

      projects[idx] = {
        ...projects[idx],
        name,
        description,
        color,
        icon,
      };
      saveLocal(KEYS.PROJECTS, projects);

      await this.createActivityLog(workspaceId, userId, 'Update Project', { project_name: name });

      return { data: projects[idx], error: null };
    }
  },

  async deleteProject(workspaceId: string, id: string, userId: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      return { error };
    } else {
      const projects = getLocal<Project>(KEYS.PROJECTS);
      const project = projects.find((p) => p.id === id);
      const filtered = projects.filter((p) => p.id !== id);
      saveLocal(KEYS.PROJECTS, filtered);

      if (project) {
        await this.createActivityLog(workspaceId, userId, 'Delete Project', { project_name: project.name });
      }

      return { error: null };
    }
  },

  // ---------------------------------------------------------
  // TASKS
  // ---------------------------------------------------------
  async getTasks(projectId: string): Promise<Task[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:users_profile!assignee_id(*)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data as Task[];
    } else {
      const tasks = getLocal<Task>(KEYS.TASKS);
      const profiles = await this._getProfilesList();
      return tasks
        .filter((t) => t.project_id === projectId)
        .map((t) => ({
          ...t,
          assignee: t.assignee_id ? profiles.find((p) => p.id === t.assignee_id) : null,
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  async getTasksByWorkspace(workspaceId: string): Promise<Task[]> {
    if (isSupabaseConfigured && supabase) {
      // Fetch tasks belonging to projects inside the workspace
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('workspace_id', workspaceId);
      
      const projectIds = (projects || []).map((p) => p.id);
      if (projectIds.length === 0) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:users_profile!assignee_id(*)')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });
      
      if (error) return [];
      return data as Task[];
    } else {
      const projects = getLocal<Project>(KEYS.PROJECTS);
      const projectIds = projects.filter((p) => p.workspace_id === workspaceId).map((p) => p.id);
      const tasks = getLocal<Task>(KEYS.TASKS);
      const profiles = await this._getProfilesList();

      return tasks
        .filter((t) => projectIds.includes(t.project_id))
        .map((t) => ({
          ...t,
          assignee: t.assignee_id ? profiles.find((p) => p.id === t.assignee_id) : null,
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  async createTask(
    workspaceId: string,
    projectId: string,
    title: string,
    description: string | null,
    assigneeId: string | null,
    dueDate: string | null,
    priority: TaskPriority,
    status: TaskStatus,
    createdBy: string,
    recurrence: 'daily' | 'weekly' | 'monthly' | 'yearly' | null = null
  ): Promise<{ data: Task | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          title,
          description,
          assignee_id: assigneeId,
          due_date: dueDate,
          priority,
          status,
          recurrence,
          created_by: createdBy,
        })
        .select('*, assignee:users_profile!assignee_id(*)')
        .single();
      return { data: data as Task | null, error };
    } else {
      const tasks = getLocal<Task>(KEYS.TASKS);
      const profiles = await this._getProfilesList();

      const newTask: Task = {
        id: generateUUID(),
        project_id: projectId,
        title,
        description,
        assignee_id: assigneeId,
        due_date: dueDate,
        priority,
        status,
        recurrence,
        created_by: createdBy,
        created_at: new Date().toISOString(),
      };
      
      tasks.push(newTask);
      saveLocal(KEYS.TASKS, tasks);

      const responseTask: Task = {
        ...newTask,
        assignee: assigneeId ? profiles.find((p) => p.id === assigneeId) : null,
      };

      await this.createActivityLog(workspaceId, createdBy, 'Create Task', { task_title: title });

      if (assigneeId && assigneeId !== createdBy) {
        await this.createNotification(assigneeId, 'New Task Assigned', `You have been assigned to: ${title}`, `/dashboard/my-tasks`);
      }

      return { data: responseTask, error: null };
    }
  },

  async updateTask(
    workspaceId: string,
    id: string,
    updates: Partial<Task>,
    userId: string
  ): Promise<{ data: Task | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      // 1. Fetch old task details to inspect status and recurrence
      const { data: oldTask } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      const statusChangedToDone = updates.status === 'done' && oldTask && oldTask.status !== 'done';
      const hasRecurrence = oldTask && oldTask.recurrence;

      if (statusChangedToDone && hasRecurrence && oldTask) {
        const nextDueDate = calculateNextDueDate(oldTask.due_date, oldTask.recurrence as 'daily' | 'weekly' | 'monthly' | 'yearly');
        updates.recurrence = null; // Completed task doesn't repeat anymore

        // Insert cloned task
        const { data: clonedTask, error: cloneErr } = await supabase
          .from('tasks')
          .insert({
            project_id: oldTask.project_id,
            title: oldTask.title,
            description: oldTask.description,
            assignee_id: oldTask.assignee_id,
            due_date: nextDueDate,
            priority: oldTask.priority,
            status: 'todo',
            recurrence: oldTask.recurrence, // Clone inherits the recurrence
            created_by: oldTask.created_by
          })
          .select()
          .single();

        if (!cloneErr && clonedTask) {
          // Fetch subtasks and clone them in uncompleted state
          const { data: subtasks } = await supabase
            .from('subtasks')
            .select('*')
            .eq('task_id', oldTask.id);
          
          if (subtasks && subtasks.length > 0) {
            const subtaskClones = subtasks.map(sub => ({
              task_id: clonedTask.id,
              title: sub.title,
              is_completed: false
            }));
            await supabase.from('subtasks').insert(subtaskClones);
          }
        }
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select('*, assignee:users_profile!assignee_id(*)')
        .single();
      return { data: data as Task | null, error };
    } else {
      const tasks = getLocal<Task>(KEYS.TASKS);
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx === -1) return { data: null, error: { message: 'Task not found' } };

      const oldTask = tasks[idx];
      const statusChangedToDone = updates.status === 'done' && oldTask.status !== 'done';
      const hasRecurrence = oldTask.recurrence;

      if (statusChangedToDone && hasRecurrence) {
        const nextDueDate = calculateNextDueDate(oldTask.due_date, oldTask.recurrence as 'daily' | 'weekly' | 'monthly' | 'yearly');
        updates.recurrence = null; // Completed task doesn't repeat anymore

        const clonedTaskId = generateUUID();
        const clonedTask: Task = {
          id: clonedTaskId,
          project_id: oldTask.project_id,
          title: oldTask.title,
          description: oldTask.description,
          assignee_id: oldTask.assignee_id,
          due_date: nextDueDate,
          priority: oldTask.priority,
          status: 'todo',
          recurrence: oldTask.recurrence, // Clone inherits the recurrence
          created_by: oldTask.created_by,
          created_at: new Date().toISOString()
        };

        tasks.push(clonedTask);

        // Fetch subtasks of old task and clone them
        const subtasks = getLocal<Subtask>(KEYS.SUBTASKS);
        const oldSubtasks = subtasks.filter(sub => sub.task_id === oldTask.id);
        if (oldSubtasks.length > 0) {
          const clonedSubtasks: Subtask[] = oldSubtasks.map(sub => ({
            id: generateUUID(),
            task_id: clonedTaskId,
            title: sub.title,
            is_completed: false,
            created_at: new Date().toISOString()
          }));
          subtasks.push(...clonedSubtasks);
          saveLocal(KEYS.SUBTASKS, subtasks);
        }
      }

      const updated = {
        ...oldTask,
        ...updates,
      };
      tasks[idx] = updated;
      saveLocal(KEYS.TASKS, tasks);

      const profiles = await this._getProfilesList();
      const responseTask: Task = {
        ...updated,
        assignee: updated.assignee_id ? profiles.find((p) => p.id === updated.assignee_id) : null,
      };

      // Activity Logging for key status changes
      if (updates.status && updates.status !== oldTask.status) {
        await this.createActivityLog(workspaceId, userId, 'Update Task Status', {
          task_title: updated.title,
          from_status: oldTask.status,
          to_status: updates.status,
        });
      } else {
        await this.createActivityLog(workspaceId, userId, 'Update Task', { task_title: updated.title });
      }

      // Notify new assignee if changed
      if (updates.assignee_id && updates.assignee_id !== oldTask.assignee_id && updates.assignee_id !== userId) {
        await this.createNotification(updates.assignee_id, 'New Task Assigned', `You have been assigned to: ${updated.title}`, `/dashboard/my-tasks`);
      }

      return { data: responseTask, error: null };
    }
  },

  async deleteTask(workspaceId: string, id: string, userId: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      return { error };
    } else {
      const tasks = getLocal<Task>(KEYS.TASKS);
      const task = tasks.find((t) => t.id === id);
      const filtered = tasks.filter((t) => t.id !== id);
      saveLocal(KEYS.TASKS, filtered);

      if (task) {
        await this.createActivityLog(workspaceId, userId, 'Delete Task', { task_title: task.title });
      }

      return { error: null };
    }
  },

  // ---------------------------------------------------------
  // SUBTASKS
  // ---------------------------------------------------------
  async getSubtasks(taskId: string): Promise<Subtask[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) return [];
      return data as Subtask[];
    } else {
      const subtasks = getLocal<Subtask>(KEYS.SUBTASKS);
      return subtasks.filter((s) => s.task_id === taskId).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
  },

  async createSubtask(taskId: string, title: string): Promise<{ data: Subtask | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('subtasks')
        .insert({ task_id: taskId, title, is_completed: false })
        .select()
        .single();
      return { data: data as Subtask | null, error };
    } else {
      const subtasks = getLocal<Subtask>(KEYS.SUBTASKS);
      const newSub: Subtask = {
        id: generateUUID(),
        task_id: taskId,
        title,
        is_completed: false,
        created_at: new Date().toISOString(),
      };
      subtasks.push(newSub);
      saveLocal(KEYS.SUBTASKS, subtasks);
      return { data: newSub, error: null };
    }
  },

  async toggleSubtask(id: string, isCompleted: boolean): Promise<{ data: Subtask | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('subtasks')
        .update({ is_completed: isCompleted })
        .eq('id', id)
        .select()
        .single();
      return { data: data as Subtask | null, error };
    } else {
      const subtasks = getLocal<Subtask>(KEYS.SUBTASKS);
      const idx = subtasks.findIndex((s) => s.id === id);
      if (idx === -1) return { data: null, error: { message: 'Subtask not found' } };

      subtasks[idx].is_completed = isCompleted;
      saveLocal(KEYS.SUBTASKS, subtasks);
      return { data: subtasks[idx], error: null };
    }
  },

  async deleteSubtask(id: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('subtasks').delete().eq('id', id);
      return { error };
    } else {
      const subtasks = getLocal<Subtask>(KEYS.SUBTASKS);
      const filtered = subtasks.filter((s) => s.id !== id);
      saveLocal(KEYS.SUBTASKS, filtered);
      return { error: null };
    }
  },

  // ---------------------------------------------------------
  // COMMENTS
  // ---------------------------------------------------------
  async getComments(taskId: string): Promise<Comment[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('comments')
        .select('*, user:users_profile(*)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) return [];
      return data as Comment[];
    } else {
      const comments = getLocal<Comment>(KEYS.COMMENTS);
      const profiles = await this._getProfilesList();
      return comments
        .filter((c) => c.task_id === taskId)
        .map((c) => ({
          ...c,
          user: profiles.find((p) => p.id === c.user_id),
        }))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
  },

  async createComment(taskId: string, userId: string, content: string): Promise<{ data: Comment | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('comments')
        .insert({ task_id: taskId, user_id: userId, content })
        .select('*, user:users_profile(*)')
        .single();
      return { data: data as Comment | null, error };
    } else {
      const comments = getLocal<Comment>(KEYS.COMMENTS);
      const profiles = await this._getProfilesList();

      const newComment: Comment = {
        id: generateUUID(),
        task_id: taskId,
        user_id: userId,
        content,
        created_at: new Date().toISOString(),
      };
      
      comments.push(newComment);
      saveLocal(KEYS.COMMENTS, comments);

      const responseComment: Comment = {
        ...newComment,
        user: profiles.find((p) => p.id === userId),
      };

      // Notify task assignee if it's someone else
      const tasks = getLocal<Task>(KEYS.TASKS);
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.assignee_id && task.assignee_id !== userId) {
        await this.createNotification(task.assignee_id, 'New Comment on Task', `A comment was added to "${task.title}": ${content.substring(0, 30)}...`, `/dashboard/projects/${task.project_id}?task=${taskId}`);
      }

      return { data: responseComment, error: null };
    }
  },

  async deleteComment(id: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      return { error };
    } else {
      const comments = getLocal<Comment>(KEYS.COMMENTS);
      const filtered = comments.filter((c) => c.id !== id);
      saveLocal(KEYS.COMMENTS, filtered);
      return { error: null };
    }
  },

  // ---------------------------------------------------------
  // ATTACHMENTS
  // ---------------------------------------------------------
  async getAttachments(taskId: string): Promise<Attachment[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('attachments')
        .select('*, uploader:users_profile(*)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data as Attachment[];
    } else {
      const attachments = getLocal<Attachment>(KEYS.ATTACHMENTS);
      const profiles = await this._getProfilesList();
      return attachments
        .filter((a) => a.task_id === taskId)
        .map((a) => ({
          ...a,
          uploader: profiles.find((p) => p.id === a.uploaded_by),
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  async createAttachment(
    taskId: string,
    fileName: string,
    fileUrl: string,
    fileSize: number,
    uploadedBy: string
  ): Promise<{ data: Attachment | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('attachments')
        .insert({
          task_id: taskId,
          file_name: fileName,
          file_url: fileUrl,
          file_size: fileSize,
          uploaded_by: uploadedBy,
        })
        .select('*, uploader:users_profile(*)')
        .single();
      return { data: data as Attachment | null, error };
    } else {
      const attachments = getLocal<Attachment>(KEYS.ATTACHMENTS);
      const profiles = await this._getProfilesList();

      const newAttachment: Attachment = {
        id: generateUUID(),
        task_id: taskId,
        file_name: fileName,
        file_url: fileUrl,
        file_size: fileSize,
        uploaded_by: uploadedBy,
        created_at: new Date().toISOString(),
      };
      
      attachments.push(newAttachment);
      saveLocal(KEYS.ATTACHMENTS, attachments);

      const responseAttachment: Attachment = {
        ...newAttachment,
        uploader: profiles.find((p) => p.id === uploadedBy),
      };

      return { data: responseAttachment, error: null };
    }
  },

  async deleteAttachment(id: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('attachments').delete().eq('id', id);
      return { error };
    } else {
      const attachments = getLocal<Attachment>(KEYS.ATTACHMENTS);
      const filtered = attachments.filter((a) => a.id !== id);
      saveLocal(KEYS.ATTACHMENTS, filtered);
      return { error: null };
    }
  },

  // ---------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------
  async getNotifications(userId: string): Promise<Notification[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data as Notification[];
    } else {
      const notifications = getLocal<Notification>(KEYS.NOTIFICATIONS);
      return notifications
        .filter((n) => n.user_id === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  async markNotificationAsRead(id: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      return { error };
    } else {
      const notifications = getLocal<Notification>(KEYS.NOTIFICATIONS);
      const idx = notifications.findIndex((n) => n.id === id);
      if (idx !== -1) {
        notifications[idx].is_read = true;
        saveLocal(KEYS.NOTIFICATIONS, notifications);
      }
      return { error: null };
    }
  },

  async markAllNotificationsAsRead(userId: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);
      return { error };
    } else {
      const notifications = getLocal<Notification>(KEYS.NOTIFICATIONS);
      notifications.forEach((n) => {
        if (n.user_id === userId) n.is_read = true;
      });
      saveLocal(KEYS.NOTIFICATIONS, notifications);
      return { error: null };
    }
  },

  async createNotification(userId: string, title: string, message: string, link: string | null = null): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title,
        message,
        link,
      });
    } else {
      const notifications = getLocal<Notification>(KEYS.NOTIFICATIONS);
      const newNotif: Notification = {
        id: generateUUID(),
        user_id: userId,
        title,
        message,
        is_read: false,
        link,
        created_at: new Date().toISOString(),
      };
      notifications.push(newNotif);
      saveLocal(KEYS.NOTIFICATIONS, notifications);
    }
  },

  // ---------------------------------------------------------
  // ACTIVITY LOGS
  // ---------------------------------------------------------
  async getActivityLogs(workspaceId: string): Promise<ActivityLog[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, user:users_profile(*)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data as ActivityLog[];
    } else {
      const logs = getLocal<ActivityLog>(KEYS.LOGS);
      const profiles = await this._getProfilesList();
      return logs
        .filter((l) => l.workspace_id === workspaceId)
        .map((l) => ({
          ...l,
          user: l.user_id ? profiles.find((p) => p.id === l.user_id) : null,
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  async createActivityLog(
    workspaceId: string,
    userId: string | null,
    action: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('activity_logs').insert({
        workspace_id: workspaceId,
        user_id: userId,
        action,
        details,
      });
    } else {
      const logs = getLocal<ActivityLog>(KEYS.LOGS);
      const newLog: ActivityLog = {
        id: generateUUID(),
        workspace_id: workspaceId,
        user_id: userId,
        action,
        details,
        created_at: new Date().toISOString(),
      };
      logs.push(newLog);
      saveLocal(KEYS.LOGS, logs);
    }
  },

  // Super admin utility: get all activities in the system
  async getSuperAdminActivityLogs(): Promise<ActivityLog[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, user:users_profile(*)')
        .order('created_at', { ascending: false });
      if (error) return [];
      return data as ActivityLog[];
    } else {
      const logs = getLocal<ActivityLog>(KEYS.LOGS);
      const profiles = await this._getProfilesList();
      return logs
        .map((l) => ({
          ...l,
          user: l.user_id ? profiles.find((p) => p.id === l.user_id) : null,
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  // Super admin utility: get all workspaces
  async getSuperAdminWorkspaces(): Promise<Workspace[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return [];
      return data as Workspace[];
    } else {
      return getLocal<Workspace>(KEYS.WORKSPACES);
    }
  },

  // ---------------------------------------------------------
  // USER PROFILES & MEMBERSHIPS (ADDITIONAL HELPER METHODS)
  // ---------------------------------------------------------
  async findUserByEmail(email: string): Promise<{ data: UserProfile | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('users_profile')
        .select('*')
        .eq('email', email)
        .single();
      return { data: data as UserProfile | null, error };
    } else {
      const profiles = await this._getProfilesList();
      const user = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase()) || null;
      return { data: user, error: user ? null : { message: 'User not found' } };
    }
  },

  async createUserProfile(id: string, email: string, fullName: string, role: string): Promise<{ data: UserProfile | null; error: any }> {
    const now = new Date().toISOString();
    const newProfile: UserProfile = {
      id,
      email,
      full_name: fullName,
      avatar_url: null,
      role: role as any,
      created_at: now,
      updated_at: now
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('users_profile')
        .insert(newProfile)
        .select()
        .single();
      return { data: data as UserProfile | null, error };
    } else {
      const profiles = await this._getProfilesList();
      profiles.push(newProfile);
      localStorage.setItem('sundra_profiles', JSON.stringify(profiles));
      return { data: newProfile, error: null };
    }
  },

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('users_profile')
        .update(updates)
        .eq('id', userId);
      return { error };
    } else {
      const profiles = await this._getProfilesList();
      const idx = profiles.findIndex((p) => p.id === userId);
      if (idx === -1) return { error: { message: 'Profile not found' } };
      profiles[idx] = { ...profiles[idx], ...updates, updated_at: new Date().toISOString() };
      localStorage.setItem('sundra_profiles', JSON.stringify(profiles));
      return { error: null };
    }
  },

  async deleteUser(userId: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('users_profile').delete().eq('id', userId);
      return { error };
    } else {
      const profiles = await this._getProfilesList();
      const filtered = profiles.filter((p) => p.id !== userId);
      localStorage.setItem('sundra_profiles', JSON.stringify(filtered));
      return { error: null };
    }
  },

  async getSystemUsers(): Promise<UserProfile[]> {
    return this._getProfilesList();
  },

  async getSystemWorkspaces(): Promise<Workspace[]> {
    return this.getSuperAdminWorkspaces();
  },

  async getSystemProjectsCount(): Promise<number> {
    if (isSupabaseConfigured && supabase) {
      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    } else {
      return getLocal<Project>(KEYS.PROJECTS).length;
    }
  },

  async getSystemTasksCount(): Promise<number> {
    if (isSupabaseConfigured && supabase) {
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    } else {
      return getLocal<Task>(KEYS.TASKS).length;
    }
  },

  async updateWorkspaceMemberRole(membershipId: string, role: 'Admin/Manager' | 'Member'): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('id', membershipId);
      return { error };
    } else {
      const memberships = getLocal<WorkspaceMember>(KEYS.MEMBERS);
      const idx = memberships.findIndex((m) => m.id === membershipId);
      if (idx === -1) return { error: { message: 'Membership not found' } };
      memberships[idx].role = role;
      saveLocal(KEYS.MEMBERS, memberships);
      return { error: null };
    }
  },

  async updateWorkspace(workspaceId: string, updates: { name: string }): Promise<{ error: any }> {
    const slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('workspaces')
        .update({ name: updates.name, slug })
        .eq('id', workspaceId);
      return { error };
    } else {
      const workspaces = getLocal<Workspace>(KEYS.WORKSPACES);
      const idx = workspaces.findIndex((w) => w.id === workspaceId);
      if (idx === -1) return { error: { message: 'Workspace not found' } };
      workspaces[idx].name = updates.name;
      workspaces[idx].slug = slug;
      saveLocal(KEYS.WORKSPACES, workspaces);
      return { error: null };
    }
  },

  async deleteWorkspace(workspaceId: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('workspaces').delete().eq('id', workspaceId);
      return { error };
    } else {
      const workspaces = getLocal<Workspace>(KEYS.WORKSPACES);
      saveLocal(KEYS.WORKSPACES, workspaces.filter((w) => w.id !== workspaceId));

      const memberships = getLocal<WorkspaceMember>(KEYS.MEMBERS);
      saveLocal(KEYS.MEMBERS, memberships.filter((m) => m.workspace_id !== workspaceId));

      const projects = getLocal<Project>(KEYS.PROJECTS);
      const projectIds = projects.filter((p) => p.workspace_id === workspaceId).map((p) => p.id);
      saveLocal(KEYS.PROJECTS, projects.filter((p) => p.workspace_id !== workspaceId));

      const tasks = getLocal<Task>(KEYS.TASKS);
      saveLocal(KEYS.TASKS, tasks.filter((t) => !projectIds.includes(t.project_id)));

      return { error: null };
    }
  }
};
