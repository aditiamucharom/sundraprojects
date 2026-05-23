'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { dataService } from '@/lib/dataService';
import { Project } from '@/types';
import TaskList from '@/components/dashboard/TaskList';

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      if (!id || typeof id !== 'string') return;
      setLoading(true);
      try {
        const proj = await dataService.getProjectById(id);
        if (proj) {
          setProject(proj);
        } else {
          router.replace('/dashboard/projects');
        }
      } catch (err) {
        console.error('Error fetching project:', err);
        router.replace('/dashboard/projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-apple-blue"></div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <TaskList
      title={project.name}
      description={project.description}
      color={project.color}
      projectId={project.id}
    />
  );
}
