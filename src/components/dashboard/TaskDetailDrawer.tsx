'use client';

import React, { useState, useEffect } from 'react';
import { Task, Subtask, Comment, Attachment, UserProfile, TaskPriority } from '@/types';
import { dataService } from '@/lib/dataService';
import { useAuth } from '@/context/AuthContext';
import { playCompletionSound } from '@/lib/audio';
import {
  X,
  Calendar,
  Flag,
  User,
  CheckCircle,
  Plus,
  Trash,
  Paperclip,
  MessageSquare,
  Clock,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

const toLocalDatetimeString = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

interface TaskDetailDrawerProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  workspaceId: string;
}

export default function TaskDetailDrawer({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  workspaceId
}: TaskDetailDrawerProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'comments' | 'attachments'>('details');
  const [workspaceMembers, setWorkspaceMembers] = useState<UserProfile[]>([]);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'review' | 'done'>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [recurrence, setRecurrence] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | null>(null);
  
  // Relations states
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');

  // Load workspace members for assignee dropdown
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const members = await dataService.getWorkspaceMembers(workspaceId);
        const profiles = members.map((m) => m.user || {
          id: m.user_id,
          full_name: 'Collaborator',
          email: '',
          avatar_url: null,
          role: 'Member' as const,
          created_at: m.created_at,
          updated_at: m.created_at
        });
        setWorkspaceMembers(profiles);
      } catch (err) {
        console.error(err);
      }
    };
    if (workspaceId) {
      fetchMembers();
    }
  }, [workspaceId]);

  // Sync state with task when drawer opens or task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority || 'medium');
      setDueDate(toLocalDatetimeString(task.due_date));
      setAssigneeId(task.assignee_id || '');
      setRecurrence(task.recurrence || null);
      
      // Load subtasks, comments, attachments
      loadTaskRelations(task.id);
    }
  }, [task]);

  // Save active input and close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const loadTaskRelations = async (taskId: string) => {
    try {
      const subs = await dataService.getSubtasks(taskId);
      setSubtasks(subs);

      const comms = await dataService.getComments(taskId);
      setComments(comms);

      const atts = await dataService.getAttachments(taskId);
      setAttachments(atts);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen || !task) return null;

  // Handle Updates
  const handleFieldChange = async (fields: Partial<Task>) => {
    try {
      const { data: updated } = await dataService.updateTask(
        workspaceId,
        task.id,
        fields,
        user?.id || ''
      );
      if (updated) {
        if (fields.status === 'done') {
          playCompletionSound();
        }
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Subtask CRUD
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    try {
      const { data: sub } = await dataService.createSubtask(task.id, newSubtaskTitle.trim());
      if (sub) {
        setNewSubtaskTitle('');
        setSubtasks([...subtasks, sub]);
        onUpdate(); // Trigger parent reload
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSubtask = async (sub: Subtask) => {
    try {
      const nextComplete = !sub.is_completed;
      const { data: updated } = await dataService.toggleSubtask(sub.id, nextComplete);
      if (updated) {
        if (nextComplete) {
          playCompletionSound();
        }
        setSubtasks(subtasks.map((s) => (s.id === sub.id ? updated : s)));
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubtask = async (id: string) => {
    try {
      await dataService.deleteSubtask(id);
      setSubtasks(subtasks.filter((s) => s.id !== id));
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  // Comments CRUD
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !user) return;
    try {
      const { data: comm } = await dataService.createComment(task.id, user.id, newCommentText.trim());
      if (comm) {
        setNewCommentText('');
        // Add current user details to mocked comment author
        const hydratedComm: Comment = {
          ...comm,
          user: user,
        };
        setComments([hydratedComm, ...comments]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Attachments CRUD
  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttachmentName.trim() || !user) return;
    const url = newAttachmentUrl.trim() || 'https://google.com';
    try {
      const { data: att } = await dataService.createAttachment(
        task.id,
        newAttachmentName.trim(),
        url,
        1024,
        user.id
      );
      if (att) {
        setNewAttachmentName('');
        setNewAttachmentUrl('');
        setAttachments([...attachments, att]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    try {
      await dataService.deleteAttachment(id);
      setAttachments(attachments.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Task
  const handleDeleteTask = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await dataService.deleteTask(workspaceId, task.id, user?.id || '');
        onDelete();
        onClose();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getPriorityBadgeColor = (p: string) => {
    switch (p) {
      case 'high':
        return 'bg-apple-red/10 text-apple-red';
      case 'medium':
        return 'bg-apple-orange/10 text-apple-orange';
      case 'low':
        return 'bg-apple-blue/10 text-apple-blue';
      default:
        return 'bg-apple-gray/10 text-apple-gray';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-card h-full flex flex-col shadow-custom-lg border-l border-border-custom z-10 animate-drawer-slide-in">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-custom flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-text-secondary tracking-wide uppercase">Task Detail</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDeleteTask}
              className="p-2 rounded-xl text-text-secondary hover:bg-apple-red/10 hover:text-apple-red transition-all cursor-pointer"
              title="Delete task"
            >
              <Trash className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-text-secondary hover:bg-background border border-border-custom transition-all cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Editable Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleFieldChange({ title: title.trim() })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              placeholder="Task Title"
              className="w-full text-xl font-bold bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-text-secondary text-foreground"
            />
          </div>

          {/* Editable Description */}
          <div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => handleFieldChange({ description: description.trim() })}
              placeholder="Add description or notes..."
              className="w-full text-sm bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-text-secondary text-foreground resize-none"
            />
          </div>

          <hr className="border-border-custom" />

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status Picker */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Status</label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setStatus(val);
                    handleFieldChange({ status: val });
                  }}
                  className="w-full pl-3 pr-8 py-2 text-sm bg-background border border-border-custom rounded-xl focus:ring-1 focus:ring-apple-blue focus:border-apple-blue appearance-none text-foreground"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Completed</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* Priority Picker */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Priority</label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => {
                    const val = e.target.value as TaskPriority;
                    setPriority(val);
                    handleFieldChange({ priority: val });
                  }}
                  className="w-full pl-3 pr-8 py-2 text-sm bg-background border border-border-custom rounded-xl focus:ring-1 focus:ring-apple-blue focus:border-apple-blue appearance-none text-foreground text-capitalize"
                >
                  <option value="low">Low (!)</option>
                  <option value="medium">Medium (!!)</option>
                  <option value="high">High (!!!)</option>
                  <option value="urgent">Urgent (!!!!)</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* Due Date Picker */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Due Date</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (e.target.value) {
                    const [datePart, timePart] = e.target.value.split('T');
                    const [year, month, day] = datePart.split('-').map(Number);
                    const [hours, minutes] = timePart.split(':').map(Number);
                    const localDate = new Date(year, month - 1, day, hours, minutes);
                    handleFieldChange({ due_date: localDate.toISOString() });
                  } else {
                    handleFieldChange({ due_date: null });
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-background border border-border-custom rounded-xl focus:ring-1 focus:ring-apple-blue focus:border-apple-blue text-foreground"
              />
            </div>

            {/* Assignee Picker */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Assignee</label>
              <div className="relative">
                <select
                  value={assigneeId}
                  onChange={(e) => {
                    setAssigneeId(e.target.value);
                    handleFieldChange({ assignee_id: e.target.value || null });
                  }}
                  className="w-full pl-3 pr-8 py-2 text-sm bg-background border border-border-custom rounded-xl focus:ring-1 focus:ring-apple-blue focus:border-apple-blue appearance-none text-foreground"
                >
                  <option value="">Unassigned</option>
                  {workspaceMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* Repeat Picker */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Repeat</label>
              <div className="relative">
                <select
                  value={recurrence || 'none'}
                  onChange={(e) => {
                    const val = e.target.value === 'none' ? null : (e.target.value as any);
                    setRecurrence(val);
                    handleFieldChange({ recurrence: val });
                  }}
                  className="w-full pl-3 pr-8 py-2 text-sm bg-background border border-border-custom rounded-xl focus:ring-1 focus:ring-apple-blue focus:border-apple-blue appearance-none text-foreground"
                >
                  <option value="none">Never</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-text-secondary pointer-events-none" />
              </div>
            </div>
          </div>

          <hr className="border-border-custom" />

          {/* Navigation tabs inside the drawer */}
          <div className="flex border-b border-border-custom">
            {(['details', 'subtasks', 'comments', 'attachments'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 cursor-pointer transition-all ${
                  activeTab === tab
                    ? 'border-apple-blue text-apple-blue'
                    : 'border-transparent text-text-secondary hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab contents */}
          <div className="pt-2">
            {/* Subtasks tab */}
            {activeTab === 'subtasks' && (
              <div className="space-y-4">
                <form onSubmit={handleAddSubtask} className="flex space-x-2">
                  <input
                    type="text"
                    required
                    placeholder="Add a subtask..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    className="flex-1 rounded-xl border border-border-custom bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-apple-blue"
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-apple-blue hover:opacity-90 text-white rounded-xl cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </form>

                <div className="space-y-2">
                  {subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border-custom bg-background/50 hover:bg-background transition-all"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <button onClick={() => handleToggleSubtask(sub)} className="text-text-secondary cursor-pointer">
                          <CheckCircle
                            className={`h-5 w-5 ${
                              sub.is_completed ? 'fill-apple-blue text-apple-blue' : 'text-text-secondary/60'
                            }`}
                          />
                        </button>
                        <span className={`text-sm truncate ${sub.is_completed ? 'line-through text-text-secondary' : 'text-foreground'}`}>
                          {sub.title}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteSubtask(sub.id)}
                        className="text-text-secondary hover:text-apple-red p-1 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {subtasks.length === 0 && (
                    <p className="text-xs text-text-secondary italic text-center py-4">No subtasks yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* Comments tab */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                <form onSubmit={handleAddComment} className="flex space-x-2">
                  <input
                    type="text"
                    required
                    placeholder="Write a comment..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 rounded-xl border border-border-custom bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-apple-blue"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-apple-blue hover:opacity-90 text-white font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    Post
                  </button>
                </form>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {comments.map((comm) => (
                    <div key={comm.id} className="p-3 bg-background/50 border border-border-custom rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <img
                            src={comm.user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${comm.user?.full_name || 'User'}`}
                            alt={comm.user?.full_name || 'User'}
                            className="h-5 w-5 rounded-full border border-border-custom mr-2"
                          />
                          <span className="text-xs font-semibold text-foreground">{comm.user?.full_name || 'User'}</span>
                        </div>
                        <span className="text-[10px] text-text-secondary/70 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(comm.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed pl-7">{comm.content}</p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-xs text-text-secondary italic text-center py-4">No comments yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* Attachments tab */}
            {activeTab === 'attachments' && (
              <div className="space-y-4">
                <form onSubmit={handleAddAttachment} className="space-y-3 p-3 bg-background/50 border border-border-custom rounded-xl">
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Link Label</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Design Spec Document"
                      value={newAttachmentName}
                      onChange={(e) => setNewAttachmentName(e.target.value)}
                      className="w-full rounded-lg border border-border-custom bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-apple-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com"
                      value={newAttachmentUrl}
                      onChange={(e) => setNewAttachmentUrl(e.target.value)}
                      className="w-full rounded-lg border border-border-custom bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-apple-blue"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center py-2 bg-apple-blue hover:opacity-90 text-white font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    <Paperclip className="h-3.5 w-3.5 mr-1.5" /> Add Attachment
                  </button>
                </form>

                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border-custom bg-background/50 hover:bg-background transition-all"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <Paperclip className="h-4 w-4 text-text-secondary flex-shrink-0" />
                        <span className="text-xs font-medium truncate text-foreground">{att.file_name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-md text-apple-blue hover:bg-apple-blue-light transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteAttachment(att.id)}
                          className="p-1 rounded-md text-text-secondary hover:text-apple-red transition-colors cursor-pointer"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {attachments.length === 0 && (
                    <p className="text-xs text-text-secondary italic text-center py-4">No attachments yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* Details tab (Default details summary view) */}
            {activeTab === 'details' && (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-background/50 border border-border-custom rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-secondary font-medium">Task Status</span>
                    <span className="font-semibold text-foreground uppercase">{status}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-secondary font-medium">Priority</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${getPriorityBadgeColor(priority)}`}>
                      {priority}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-secondary font-medium">Due Date</span>
                    <span className="font-semibold text-foreground">{dueDate || 'No due date'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-secondary font-medium">Subtasks Completion</span>
                    <span className="font-semibold text-foreground">
                      {subtasks.filter((s) => s.is_completed).length} of {subtasks.length}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-background/50 border border-border-custom rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center">
                    <MessageSquare className="h-4.5 w-4.5 mr-2 text-text-secondary" />
                    <span className="text-text-secondary font-medium">Comments</span>
                  </div>
                  <span className="font-bold text-foreground">{comments.length}</span>
                </div>

                <div className="p-4 bg-background/50 border border-border-custom rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center">
                    <Paperclip className="h-4.5 w-4.5 mr-2 text-text-secondary" />
                    <span className="text-text-secondary font-medium">Attachments</span>
                  </div>
                  <span className="font-bold text-foreground">{attachments.length}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
