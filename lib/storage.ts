'use client';

import type { SiteProject } from './types';

const KEY = 'nfe-propertyscope-projects-v2';
const LEGACY_KEYS = ['nfe-site-intelligence-projects-v1'];

function stripUserFileContents(project: SiteProject): SiteProject {
  return {
    ...project,
    assets: project.assets.map((asset) => {
      if (asset.type === 'GENERATED_VISUAL' || project.isDemo) return asset;
      const { dataUrl: _dataUrl, ...metadataOnly } = asset;
      return { ...metadataOnly, localPreviewAvailable: false };
    })
  };
}

export function loadProjects(): SiteProject[] {
  if (typeof window === 'undefined') return [];
  try {
    let raw = window.localStorage.getItem(KEY);
    if (!raw) {
      for (const legacyKey of LEGACY_KEYS) {
        raw = window.localStorage.getItem(legacyKey);
        if (raw) break;
      }
    }
    const projects = raw ? (JSON.parse(raw) as SiteProject[]) : [];
    return projects.map(stripUserFileContents);
  } catch {
    return [];
  }
}

export function saveProjects(projects: SiteProject[]) {
  const safeProjects = projects.map(stripUserFileContents);
  window.localStorage.setItem(KEY, JSON.stringify(safeProjects));
}

export function saveProject(project: SiteProject) {
  const all = loadProjects();
  const safeProject = stripUserFileContents(project);
  const index = all.findIndex((item) => item.id === project.id);
  const next = index >= 0
    ? all.map((item) => item.id === project.id ? safeProject : item)
    : [safeProject, ...all];
  saveProjects(next);
}

export function loadProject(id: string): SiteProject | undefined {
  return loadProjects().find((item) => item.id === id);
}
