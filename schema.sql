-- SQL Schema for Sundra Project
-- Paste this script into your Supabase SQL Editor.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

---------------------------------------------------------
-- 1. TABLES DEFINITIONS
---------------------------------------------------------

-- Profiles Table (synchronized with auth.users)
CREATE TABLE public.users_profile (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'Member' CHECK (role IN ('Super Admin', 'Owner', 'Admin/Manager', 'Member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Workspaces Table
CREATE TABLE public.workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Workspace Members Table
CREATE TABLE public.workspace_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users_profile(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'Member' CHECK (role IN ('Owner', 'Admin/Manager', 'Member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id, user_id)
);

-- Projects Table
CREATE TABLE public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#007aff', -- Apple theme color default
    icon TEXT DEFAULT 'Folder',    -- Default Apple Reminders style folder icon
    created_by UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tasks Table
CREATE TABLE public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assignee_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
    recurrence TEXT CHECK (recurrence IN ('daily', 'weekly', 'monthly', 'yearly')) DEFAULT NULL,
    created_by UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Subtasks Table
CREATE TABLE public.subtasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Comments Table
CREATE TABLE public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users_profile(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Attachments Table
CREATE TABLE public.attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL, -- in bytes
    uploaded_by UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Notifications Table
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users_profile(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Activity Logs Table
CREATE TABLE public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g. 'Create Task', 'Complete Task'
    details JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

---------------------------------------------------------
-- 2. AUTOMATIC PROFILE SYNC TRIGGER FROM AUTH.USERS
---------------------------------------------------------

-- Function to handle profile creation on Auth Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_first_user BOOLEAN;
    assigned_role TEXT;
BEGIN
    -- Check if this is the very first user registering in the system
    SELECT NOT EXISTS (SELECT 1 FROM public.users_profile) INTO is_first_user;
    
    IF is_first_user THEN
        assigned_role := 'Super Admin';
    ELSE
        assigned_role := 'Member';
    END IF;

    INSERT INTO public.users_profile (id, full_name, email, avatar_url, role)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.email,
        new.raw_user_meta_data->>'avatar_url',
        assigned_role
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for sync
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

---------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
---------------------------------------------------------

-- Enable RLS on all public tables
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if a user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users_profile
        WHERE id = user_uuid AND role = 'Super Admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is a member of a workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.is_super_admin(user_uuid) OR EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = workspace_uuid AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is a manager/owner of a workspace
CREATE OR REPLACE FUNCTION public.is_workspace_manager(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.is_super_admin(user_uuid) OR EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = workspace_uuid 
          AND user_id = user_uuid 
          AND role IN ('Owner', 'Admin/Manager')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check project access via workspace membership
CREATE OR REPLACE FUNCTION public.is_project_member(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    project_workspace_uuid UUID;
BEGIN
    SELECT workspace_id INTO project_workspace_uuid FROM public.projects WHERE id = project_uuid;
    RETURN public.is_workspace_member(project_workspace_uuid, user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check task access via projects
CREATE OR REPLACE FUNCTION public.is_task_member(task_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    task_project_uuid UUID;
BEGIN
    SELECT project_id INTO task_project_uuid FROM public.tasks WHERE id = task_uuid;
    RETURN public.is_project_member(task_project_uuid, user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- A. USERS PROFILE POLICIES
CREATE POLICY "Allow public read of profiles for workspace members" ON public.users_profile
    FOR SELECT USING (true); -- Accessible to let users see teammates

CREATE POLICY "Allow users to update own profile" ON public.users_profile
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Super Admins have full access on profiles" ON public.users_profile
    FOR ALL USING (public.is_super_admin(auth.uid()));


-- B. WORKSPACES POLICIES
CREATE POLICY "Allow members to view workspaces" ON public.workspaces
    FOR SELECT USING (public.is_workspace_member(id, auth.uid()));

CREATE POLICY "Allow authenticated users to create workspaces" ON public.workspaces
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow owners and admins to update/delete workspaces" ON public.workspaces
    FOR ALL USING (
        auth.uid() = owner_id OR public.is_super_admin(auth.uid())
    );


-- C. WORKSPACE MEMBERS POLICIES
CREATE POLICY "Allow members to view workspace memberships" ON public.workspace_members
    FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Allow owners to add themselves as members" ON public.workspace_members
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND EXISTS (
            SELECT 1 FROM public.workspaces
            WHERE id = workspace_members.workspace_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Allow workspace managers to invite/edit members" ON public.workspace_members
    FOR ALL USING (public.is_workspace_manager(workspace_id, auth.uid()));


-- D. PROJECTS POLICIES
CREATE POLICY "Allow workspace members to read projects" ON public.projects
    FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Allow workspace members to manage projects" ON public.projects
    FOR ALL USING (public.is_workspace_member(workspace_id, auth.uid()));


-- E. TASKS POLICIES
CREATE POLICY "Allow project members to read tasks" ON public.tasks
    FOR SELECT USING (public.is_project_member(project_id, auth.uid()));

CREATE POLICY "Allow project members to manage tasks" ON public.tasks
    FOR ALL USING (public.is_project_member(project_id, auth.uid()));


-- F. SUBTASKS POLICIES
CREATE POLICY "Allow project members to read subtasks" ON public.subtasks
    FOR SELECT USING (public.is_task_member(task_id, auth.uid()));

CREATE POLICY "Allow project members to manage subtasks" ON public.subtasks
    FOR ALL USING (public.is_task_member(task_id, auth.uid()));


-- G. COMMENTS POLICIES
CREATE POLICY "Allow project members to read comments" ON public.comments
    FOR SELECT USING (public.is_task_member(task_id, auth.uid()));

CREATE POLICY "Allow project members to add comments" ON public.comments
    FOR INSERT WITH CHECK (
        public.is_task_member(task_id, auth.uid()) AND auth.uid() = user_id
    );

CREATE POLICY "Allow users to delete or update own comments" ON public.comments
    FOR ALL USING (
        auth.uid() = user_id OR public.is_super_admin(auth.uid())
    );


-- H. ATTACHMENTS POLICIES
CREATE POLICY "Allow project members to read attachments" ON public.attachments
    FOR SELECT USING (public.is_task_member(task_id, auth.uid()));

CREATE POLICY "Allow project members to add attachments" ON public.attachments
    FOR INSERT WITH CHECK (
        public.is_task_member(task_id, auth.uid()) AND auth.uid() = uploaded_by
    );

CREATE POLICY "Allow users to delete own attachments" ON public.attachments
    FOR DELETE USING (
        auth.uid() = uploaded_by OR public.is_super_admin(auth.uid())
    );


-- I. NOTIFICATIONS POLICIES
CREATE POLICY "Allow users to read and write own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);


-- J. ACTIVITY LOGS POLICIES
CREATE POLICY "Allow workspace members to read activity logs" ON public.activity_logs
    FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Allow writing activity logs by workspace members" ON public.activity_logs
    FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
