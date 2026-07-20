'use client';

import type { SiteProject } from './types';

const KEY = 'nfe-site-intelligence-projects-v1';

export function loadProjects(): SiteProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SiteProject[]) : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects: SiteProject[]) {
  window.localStorage.setItem(KEY, JSON.stringify(projects));
}

export function saveProject(project: SiteProject) {
  const all = loadProjects();
  const index = all.findIndex((item) => item.id === project.id);
  const next = index >= 0 ? all.map((item) => item.id === project.id ? project : item) : [project, ...all];
  saveProjects(next);
}

export function loadProject(id: string): SiteProject | undefined {
  return loadProjects().find((item) => item.id === id);
}
