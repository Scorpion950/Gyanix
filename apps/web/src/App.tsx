import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore.ts';
import { AppShell } from './components/layout/AppShell.tsx';
import { AuthLayout } from './components/layout/AuthLayout.tsx';
import { LoginPage } from './features/auth/LoginPage.tsx';
import { RegisterPage } from './features/auth/RegisterPage.tsx';
import { DashboardPage } from './features/dashboard/DashboardPage.tsx';
import { OnboardingPage } from './features/onboarding/OnboardingPage.tsx';
import { ProfilePage } from './features/profile/ProfilePage.tsx';
import { LearningPathsListPage } from './features/learning/LearningPathsListPage.tsx';
import { LearningPathDetailView } from './features/learning/LearningPathDetailView.tsx';
import { LecturePlayerView } from './features/learning/LecturePlayerView.tsx';
import { NotesLibraryPage } from './features/notes/NotesLibraryPage.tsx';
import { AnalyticsPage } from './features/analytics/AnalyticsPage.tsx';
import { RoadmapGeneratorView } from './features/ai/RoadmapGeneratorView.tsx';
import { AssessmentRunnerView } from './features/assessments/AssessmentRunnerView.tsx';
import { CodePlaygroundPage } from './features/coding/CodePlaygroundPage.tsx';
import { PracticeTrackerPage } from './features/coding/PracticeTrackerPage.tsx';
import { ProblemSolvingWorkspace } from './features/coding/ProblemSolvingWorkspace.tsx';
import { DesignSystemPage } from './routes/DesignSystemPage.tsx';
import { NotFoundPage } from './routes/NotFoundPage.tsx';
import { LoadingScreen } from './components/ui/LoadingScreen.tsx';
import { useEffect } from 'react';
import { supabase } from './lib/supabase.ts';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuthStore();

  if (isLoading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuthStore();

  if (isLoading) return <LoadingScreen />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  const { setSession, setLoading } = useAuthStore();

  useEffect(() => {
    // Initialise auth state from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading]);

  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />
      </Route>

      {/* Onboarding route */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      {/* App routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/u/:username" element={<ProfilePage />} />
        <Route path="/learning" element={<LearningPathsListPage />} />
        <Route path="/learning/paths/:pathId" element={<LearningPathDetailView />} />
        <Route path="/learning/player/:itemId" element={<LecturePlayerView />} />
        <Route path="/notes" element={<NotesLibraryPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/roadmaps" element={<RoadmapGeneratorView />} />
        <Route path="/assessments" element={<AssessmentRunnerView />} />
        <Route path="/assessments/:id" element={<AssessmentRunnerView />} />
        <Route path="/code" element={<CodePlaygroundPage />} />
        <Route path="/practice" element={<PracticeTrackerPage />} />
        <Route path="/practice/problems/:slug" element={<ProblemSolvingWorkspace />} />
      </Route>

      {/* Design system — dev only */}
      <Route path="/design-system" element={<DesignSystemPage />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
