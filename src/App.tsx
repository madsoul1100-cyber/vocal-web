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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />

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
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
