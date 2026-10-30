import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { SurveyProvider } from './components/SurveyProvider.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { LandingPage } from './pages/LandingPage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { PresentPage } from './pages/PresentPage.tsx'
import { ResultsPage } from './pages/ResultsPage.tsx'
import { StudentSurveyPage } from './pages/StudentSurveyPage.tsx'
import { SurveyEditorPage } from './pages/SurveyEditorPage.tsx'

export default function App() {
  return (
    <SurveyProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/surveys/new" element={<SurveyEditorPage />} />
          <Route path="/surveys/:id/edit" element={<SurveyEditorPage />} />
          <Route path="/surveys/:id/present" element={<PresentPage />} />
          <Route path="/surveys/:id/results" element={<ResultsPage />} />
          <Route path="/s/:slug" element={<StudentSurveyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </SurveyProvider>
  )
}
