import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi, getAccessToken } from './auth/api';
import { useAuth } from './auth/AuthContext';
import Sidebar from './Sidebar';
import { getProgressSnapshot, getRoadmapSnapshot, replaceProgress, replaceRoadmap, useProgress, useRoadmap } from './data/roadmap';

const LEGACY_IMPORT_KEY = 'myspace.legacy-imported.v1';

export default function MainBar() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [syncReady, setSyncReady] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [retrySync, setRetrySync] = useState(0);
  const { user } = useAuth();
  const roadmap = useRoadmap();
  const progress = useProgress();

  useEffect(() => {
    let active = true;
    const token = getAccessToken();
    setSyncReady(false);
    setSyncError('');

    if (!token) {
      setSyncError('Your session token is missing. Please sign in again.');
      return () => { active = false; };
    }
    const accessToken = token;

    async function loadDashboard() {
      try {
        const remote = await authApi.dashboard(accessToken);
        if (!active) return;

        const localRoadmap = getRoadmapSnapshot();
        const localProgress = getProgressSnapshot();
        const hasImportedLegacyData = localStorage.getItem(LEGACY_IMPORT_KEY) === 'true';

        if (remote.roadmap.stages.length > 0) {
          replaceRoadmap(remote.roadmap.title, remote.roadmap.stages);
          replaceProgress(remote.progress);
        } else if (localRoadmap.stages.length > 0 && !hasImportedLegacyData) {
          const imported = await authApi.saveDashboard(accessToken, { roadmap: localRoadmap, progress: localProgress });
          localStorage.setItem(LEGACY_IMPORT_KEY, 'true');
          if (!active) return;
          replaceRoadmap(imported.roadmap.title, imported.roadmap.stages);
          replaceProgress(imported.progress);
        } else {
          localStorage.setItem(LEGACY_IMPORT_KEY, 'true');
          replaceRoadmap(remote.roadmap.title, remote.roadmap.stages);
          replaceProgress(remote.progress);
        }

        if (active) setSyncReady(true);
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : 'Could not load your cloud roadmap.';
          setSyncError(message);
          toast.error(`Cloud sync: ${message}`, { id: 'cloud-sync-error' });
        }
      }
    }

    void loadDashboard();
    return () => { active = false; };
  }, [user?.id, retrySync]);

  useEffect(() => {
    if (!syncReady) return;
    const token = getAccessToken();
    if (!token) return;
    const accessToken = token;

    const timer = window.setTimeout(() => {
      void authApi.saveDashboard(accessToken, { roadmap, progress })
        .then(() => {
          setSyncError('');
          toast.dismiss('cloud-sync-error');
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Could not save your cloud roadmap.';
          setSyncError(message);
          toast.error(`Cloud sync: ${message}`, { id: 'cloud-sync-error' });
        });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [roadmap, progress, syncReady]);

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6e8e3]">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <main className={`min-h-screen px-4 pb-8 pt-[68px] transition-[margin] duration-300 sm:px-6 md:pt-8 ${sidebarCollapsed ? 'md:ml-[78px]' : 'md:ml-[264px]'}`}>
        {!syncReady ? (
          <div className="mx-auto mt-16 max-w-md rounded-2xl border border-[#29343a] bg-[#141b20] p-6 text-center">
            {syncError ? <>
              <p className="text-sm text-[#e9aaa0]">{syncError}</p>
              <button type="button" onClick={() => setRetrySync((attempt) => attempt + 1)} className="mt-4 rounded-lg bg-[#9be2c5] px-4 py-2 text-xs font-semibold text-[#142019]">Try again</button>
            </> : <p className="text-sm text-[#aab6af]">Loading your cloud roadmap…</p>}
          </div>
        ) : <>
          {syncError && <div role="status" className="mx-auto mb-4 max-w-6xl rounded-lg border border-[#79584a] bg-[#33251f] px-4 py-2 text-xs text-[#e9c1a2]">Cloud sync issue: {syncError}</div>}
          <Outlet />
        </>}
      </main>
    </div>
  );
}
