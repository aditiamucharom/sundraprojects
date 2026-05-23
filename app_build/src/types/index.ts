export type UserRole = 'Super Admin' | 'Owner' | 'Admin/Manager' | 'Member';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type WorkspaceRole = 'Owner' | 'Admin/Manager' | 'Member';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  user?: UserProfile; // Joined profile details
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string; // Hex color for Apple-style icons
  icon: string;  // Icon name (e.g. Folder, List, Inbox, Calendar, etc.)
  created_by: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  created_by: string;
  created_at: string;
  assignee?: UserProfile | null; // Joined profile details
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: UserProfile; // Joined profile details
}

export interface Attachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
  uploader?: UserProfile; // Joined profile details
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  workspace_id: string;
  user_id: string | null;
  action: string;
  details: Record<string, any>;
  created_at: string;
  user?: UserProfile | null; // Joined profile details
}
