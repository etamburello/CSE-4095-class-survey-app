import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider.tsx'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { SurveyProvider } from './components/SurveyProvider.tsx'
import { AnalyticsPage } from './pages/AnalyticsPage.tsx'
import { CoursesPage } from './pages/CoursesPage.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { LandingPage } from './pages/LandingPage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { PresentPage } from './pages/PresentPage.tsx'
import { QuestionBankPage } from './pages/QuestionBankPage.tsx'
import { ResultsPage } from './pages/ResultsPage.tsx'
import { SemestersPage } from './pages/SemestersPage.tsx'
import { StudentSurveyPage } from './pages/StudentSurveyPage.tsx'
import { SurveyEditorPage } from './pages/SurveyEditorPage.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SurveyProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/s/:slug" element={<StudentSurveyPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/surveys/new" element={<SurveyEditorPage />} />
              <Route path="/surveys/:id/edit" element={<SurveyEditorPage />} />
              <Route path="/surveys/:id/present" element={<PresentPage />} />
              <Route path="/surveys/:id/results" element={<ResultsPage />} />
              <Route path="/question-bank" element={<QuestionBankPage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/semesters" element={<SemestersPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </SurveyProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
