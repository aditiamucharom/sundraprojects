'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { dataService } from '@/lib/dataService';
import { Project } from '@/types';
import { Folder, Plus, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function ProjectsIndexPage() {
  const { activeWorkspace } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const list = await dataService.getProjects(activeWorkspace.id);
      setProjects(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-apple-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">My Lists</h2>
        <p className="text-sm text-text-secondary mt-1">Manage and organize your reminders in lists.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((proj) => (
          <Link
            key={proj.id}
            href={`/dashboard/projects/${proj.id}`}
            className="group bg-card hover:bg-card/85 border border-border-custom hover:border-border-custom/80 rounded-2xl p-5 shadow-custom-sm transition-all flex flex-col justify-between h-40 hover:-translate-y-0.5"
          >
            <div className="flex justify-between items-start">
              <div
                className="h-10 w-10 rounded-2xl flex items-center justify-center text-white shadow-custom-sm group-hover:scale-105 transition-transform"
                style={{ backgroundColor: proj.color }}
              >
                <Folder className="h-5 w-5" />
              </div>
              <ChevronRight className="h-5 w-5 text-text-secondary group-hover:text-foreground transition-colors" />
            </div>

            <div className="mt-4">
              <h3 className="text-base font-bold text-foreground truncate">{proj.name}</h3>
              {proj.description && (
                <p className="text-xs text-text-secondary mt-1 truncate">{proj.description}</p>
              )}
            </div>
          </Link>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full border border-dashed border-border-custom rounded-2xl p-12 text-center text-text-secondary">
            <Folder className="h-10 w-10 mx-auto text-text-secondary/50 mb-3" />
            <h3 className="font-bold text-foreground">No lists found</h3>
            <p className="text-xs text-text-secondary mt-1">Create your first folder/list in the sidebar to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
