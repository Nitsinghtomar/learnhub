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
  const hasTrackedCurrentPage = useRef(false)

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
      trackEngagement: () => {},
      track: () => {}
    }
  }

  // Track page views automatically but prevent duplicates
  useEffect(() => {
    const currentPath = window.location.pathname
    
    // Only track if the page actually changed and we haven't tracked this page yet
    if (lastPage.current !== currentPath && !hasTrackedCurrentPage.current) {
      // Track page view
      trackPageView({
        previous_page: lastPage.current !== currentPath ? lastPage.current : null
      })

      // Track navigation only if we have a previous page
      if (lastPage.current && lastPage.current !== currentPath) {
        trackNavigation(lastPage.current, currentPath)
      }

      lastPage.current = currentPath
      hasTrackedCurrentPage.current = true
    }
    
    pageStartTime.current = Date.now()

    // Reset tracking flag when component unmounts or path changes
    return () => {
      hasTrackedCurrentPage.current = false
    }
  }, [window.location.pathname])

  // Track page unload with throttling
  useEffect(() => {
    let unloadTracked = false
    
    const handleBeforeUnload = () => {
      if (unloadTracked) return // Prevent duplicate unload events
      
      const timeSpent = Math.round((Date.now() - pageStartTime.current) / 1000)
      
      // Only track if user spent meaningful time (more than 2 seconds)
      if (timeSpent > 2) {
        unloadTracked = true
        
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
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      unloadTracked = false
    }
  }, [])

  // Global error tracking with throttling
  useEffect(() => {
    let errorCount = 0
    const maxErrors = 5 // Limit errors per session
    
    const handleError = (event) => {
      if (errorCount >= maxErrors) return // Prevent spam
      errorCount++
      
      // Only track meaningful errors, not common browser issues
      const errorMessage = event.error?.message || 'Unknown error'
      if (errorMessage.includes('ResizeObserver') || 
          errorMessage.includes('Non-Error promise rejection')) {
        return // Skip common non-critical errors
      }
      
      trackError('JavaScript Error', errorMessage, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack?.substring(0, 500)
      })
    }

    const handleUnhandledRejection = (event) => {
      if (errorCount >= maxErrors) return // Prevent spam
      errorCount++
      
      // Only track promise rejections that are actual errors
      const reason = event.reason?.toString() || 'Unhandled promise rejection'
      if (reason.includes('TypeError') || reason.includes('ReferenceError')) {
        trackError('Promise Rejection', reason, {
          reason: event.reason
        })
      }
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