import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { DashboardLayout } from '@/components/shell/DashboardLayout'
import { LandingPage } from '@/pages/LandingPage'
import { SignInPage } from '@/pages/SignInPage'
import { SignUpPage } from '@/pages/SignUpPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { TicketsPage } from '@/pages/TicketsPage'
import { TicketDetailPage } from '@/pages/TicketDetailPage'
import { TriagePage } from '@/pages/TriagePage'
import { MyAssignmentsPage } from '@/pages/MyAssignmentsPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { DirectoryPage } from '@/pages/DirectoryPage'
import { WorkersPage } from '@/pages/WorkersPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { AmplifyPage } from '@/pages/AmplifyPage'
import { AmplifySessionPage } from '@/pages/AmplifySessionPage'
import { AuditPage } from '@/pages/AuditPage'
import { JobsPage } from '@/pages/JobsPage'
import { IntakeLabPage } from '@/pages/IntakeLabPage'
import { IntakeSettingsPage } from '@/pages/IntakeSettingsPage'
import { CitizenLayout } from '@/pages/bharosa/CitizenLayout'
import { BharosaHome, BharosaLogin, FeedPage, PublicDashboard, StatusPage, TrackPage } from '@/pages/bharosa/PublicPages'
import { CaseDetailPage, CasesPage, CompletePage, WizardPage } from '@/pages/bharosa/CasePages'
import {
  AiReviewPage,
  ApprovalsPage,
  AssistedIntakePage,
  BharosaJobsPage,
  BharosaSettingsPage,
  CaseWorkspacePage,
  DirectorySourcesPage,
  EscalationsPage,
  FeedAdminPage,
  TasksPage,
  VerificationPage,
} from '@/pages/bharosa/OpsPages'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />

        <Route element={<CitizenLayout />}>
          <Route path="/bharosa" element={<BharosaHome />} />
          <Route path="/bharosa/login" element={<BharosaLogin />} />
          <Route path="/bharosa/new" element={<WizardPage />} />
          <Route path="/bharosa/cases" element={<CasesPage />} />
          <Route path="/bharosa/cases/:id" element={<CaseDetailPage />} />
          <Route path="/cases/:id" element={<CaseDetailPage />} />
          <Route path="/bharosa/status" element={<StatusPage />} />
          <Route path="/bharosa/dashboard" element={<PublicDashboard />} />
          <Route path="/bharosa/feed" element={<FeedPage />} />
          <Route path="/bharosa/track/:token" element={<TrackPage />} />
          <Route path="/track/:token" element={<TrackPage />} />
          <Route path="/bharosa/complete/:token" element={<CompletePage />} />
          <Route path="/complete/:token" element={<CompletePage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/triage" element={<TriagePage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
            <Route path="/my-assignments" element={<MyAssignmentsPage />} />
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/directory" element={<DirectoryPage />} />
            <Route path="/amplify" element={<AmplifyPage />} />
            <Route path="/amplify/:id" element={<AmplifySessionPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/admin/intake-lab" element={<IntakeLabPage />} />
            <Route path="/admin/intake-settings" element={<IntakeSettingsPage />} />
            <Route path="/bharosa/intake" element={<AssistedIntakePage />} />
            <Route path="/bharosa/verification" element={<VerificationPage />} />
            <Route path="/bharosa/tasks" element={<TasksPage />} />
            <Route path="/bharosa/approvals" element={<ApprovalsPage />} />
            <Route path="/bharosa/escalations" element={<EscalationsPage />} />
            <Route path="/bharosa/workspace/:id" element={<CaseWorkspacePage />} />
            <Route path="/bharosa/ai" element={<AiReviewPage />} />
            <Route path="/bharosa/directory-sources" element={<DirectorySourcesPage />} />
            <Route path="/bharosa/feed-admin" element={<FeedAdminPage />} />
            <Route path="/bharosa/settings" element={<BharosaSettingsPage />} />
            <Route path="/bharosa/jobs" element={<BharosaJobsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
