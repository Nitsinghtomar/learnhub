import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './hooks/useAuth.jsx'
import ErrorBoundary from './components/Common/ErrorBoundary'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import AuthLayout from './components/Layout/AuthLayout'
import MainLayout from './components/Layout/MainLayout'
import Login from './components/Auth/Login'
import Register from './components/Auth/Register'
import Dashboard from './pages/Dashboard'
import CoursePage from './pages/CoursePage'
import LessonPage from './pages/LessonPage'
import AnalyticsPage from './pages/AnalyticsPage'
import QuizPage from './pages/QuizPage'
import VideoActionsPage from './pages/VideoActionsPage'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Auth Routes */}
              <Route 
                path="/login" 
                element={
                  <AuthLayout>
                    <Login />
                  </AuthLayout>
                } 
              />
              <Route 
                path="/register" 
                element={
                  <AuthLayout>
                    <Register />
                  </AuthLayout>
                } 
              />

              {/* Protected Routes */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/course/:courseId" 
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <CoursePage />
                    </MainLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/course/:courseId/lesson/:lessonId" 
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <LessonPage />
                    </MainLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/analytics" 
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <AnalyticsPage />
                    </MainLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/quiz" 
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <QuizPage />
                    </MainLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/video-actions" 
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <VideoActionsPage />
                    </MainLayout>
                  </ProtectedRoute>
                } 
              />

              {/* Redirect any unknown routes to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Toast notifications */}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  style: {
                    background: '#10b981',
                  },
                },
                error: {
                  style: {
                    background: '#ef4444',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App