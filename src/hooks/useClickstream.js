import { useCallback, useEffect, useRef } from 'react'
import { 
  trackEvent, 
  trackPageView, 
  trackCourseView, 
  trackLessonStart, 
  trackLessonComplete,
  trackVideoEvent,
  trackQuizEvent,
  trackSearch,
  trackNavigation,
  trackError,
  trackEngagement
} from '../services/clickstream'

// Feature flag to disable analytics if needed
const ANALYTICS_ENABLED = import.meta.env.VITE_ENABLE_ANALYTICS === 'true'

export const useClickstream = () => {
  const pageStartTime = useRef(Date.now())
  const lastPage = useRef(window.location.pathname)

  // If analytics is disabled, return dummy functions
  if (!ANALYTICS_ENABLED) {
    return {
      trackClick: () => {},
      trackFormSubmit: () => {},
      trackVideoProgress: () => {},
      trackCourseView: () => {},
      trackLessonStart: () => {},
      trackLessonComplete: () => {},
      trackQuizStart: () => {},
      trackQuizComplete: () => {},
      trackSearch: () => {},
      trackError: () => {},
      trackLogin: () => {},
      trackLogout: () => {},
      trackRegistration: () => {},
      trackEngagement: () => {}
    }
  }

  // Track page views automatically
  useEffect(() => {
    const currentPath = window.location.pathname
    
    // Track page view
    trackPageView({
      previous_page: lastPage.current !== currentPath ? lastPage.current : null
    })

    // Track navigation if page changed
    if (lastPage.current !== currentPath && lastPage.current !== window.location.pathname) {
      trackNavigation(lastPage.current, currentPath)
    }

    lastPage.current = currentPath
    pageStartTime.current = Date.now()
  }, [window.location.pathname])

  // Track page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const timeSpent = Math.round((Date.now() - pageStartTime.current) / 1000)
      
      // Use sendBeacon for reliable tracking on page unload
      if (navigator.sendBeacon) {
        trackEvent({
          component: 'System',
          event_name: 'Page unload',
          description: `User left page: ${window.location.pathname}`,
          additional_data: {
            time_spent_seconds: timeSpent,
            page_path: window.location.pathname
          }
        })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Global error tracking
  useEffect(() => {
    const handleError = (event) => {
      trackError('JavaScript Error', event.error?.message || 'Unknown error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack?.substring(0, 500)
      })
    }

    const handleUnhandledRejection = (event) => {
      trackError('Promise Rejection', event.reason?.toString() || 'Unhandled promise rejection', {
        reason: event.reason
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // Memoized tracking functions
  const track = useCallback(trackEvent, [])
  
  const courseView = useCallback(trackCourseView, [])
  
  const lessonStart = useCallback(trackLessonStart, [])
  
  const lessonComplete = useCallback(trackLessonComplete, [])
  
  const videoEvent = useCallback(trackVideoEvent, [])
  
  const quizEvent = useCallback(trackQuizEvent, [])
  
  const search = useCallback(trackSearch, [])
  
  const navigation = useCallback(trackNavigation, [])
  
  const error = useCallback(trackError, [])
  
  const engagement = useCallback(trackEngagement, [])

  // Convenience methods for common interactions
  const trackClick = useCallback((elementId, additionalData = {}) => {
    return engagement('Button', 'clicked', elementId, additionalData)
  }, [engagement])

  const trackFormSubmit = useCallback((formId, formData = {}) => {
    return trackEvent({
      component: 'Form',
      event_name: 'Form submitted',
      description: `User submitted form: ${formId}`,
      additional_data: {
        form_id: formId,
        form_data: formData,
        timestamp: new Date().toISOString()
      }
    })
  }, [])

  const trackDownload = useCallback((fileName, fileType, courseId = null, lessonId = null) => {
    return trackEvent({
      component: 'File',
      event_name: 'File downloaded',
      description: `User downloaded file: ${fileName}`,
      course_id: courseId,
      lesson_id: lessonId,
      additional_data: {
        file_name: fileName,
        file_type: fileType,
        download_timestamp: new Date().toISOString()
      }
    })
  }, [])

  const trackLogin = useCallback((method = 'email') => {
    return trackEvent({
      component: 'Auth',
      event_name: 'User login',
      description: `User logged in via ${method}`,
      additional_data: {
        login_method: method,
        login_timestamp: new Date().toISOString()
      }
    })
  }, [])

  const trackLogout = useCallback(() => {
    const sessionDuration = Math.round((Date.now() - pageStartTime.current) / 1000)
    
    return trackEvent({
      component: 'Auth',
      event_name: 'User logout',
      description: 'User logged out',
      additional_data: {
        session_duration_seconds: sessionDuration,
        logout_timestamp: new Date().toISOString()
      }
    })
  }, [])

  const trackRegistration = useCallback((method = 'email') => {
    return trackEvent({
      component: 'Auth',
      event_name: 'User registration',
      description: `User registered via ${method}`,
      additional_data: {
        registration_method: method,
        registration_timestamp: new Date().toISOString()
      }
    })
  }, [])

  return {
    // Core tracking
    track,
    
    // Content tracking
    courseView,
    lessonStart,
    lessonComplete,
    videoEvent,
    quizEvent,
    
    // Interaction tracking
    search,
    navigation,
    error,
    engagement,
    
    // Convenience methods
    trackClick,
    trackFormSubmit,
    trackDownload,
    trackLogin,
    trackLogout,
    trackRegistration
  }
}