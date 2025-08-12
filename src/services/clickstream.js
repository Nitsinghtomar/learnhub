import { supabase } from './supabase'

// Feature flag to disable analytics if database tables don't exist
const ANALYTICS_ENABLED = import.meta.env.VITE_ENABLE_ANALYTICS === 'true'

// Debug environment variables in production
console.log('🔧 Clickstream Debug Info:', {
  ANALYTICS_ENABLED,
  VITE_ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS,
  VITE_APP_ENV: import.meta.env.VITE_APP_ENV,
  SUPABASE_URL_SET: !!import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_KEY_SET: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  NODE_ENV: import.meta.env.MODE
})

// Generate session ID and cache IP
let cachedIP = null
const generateSessionId = () => {
  const existing = sessionStorage.getItem('learnhub_session_id')
  if (existing) return existing
  
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  sessionStorage.setItem('learnhub_session_id', sessionId)
  
  // Clear cached IP for new session
  cachedIP = null
  
  return sessionId
}

// Get client IP address (cached per session for performance)
const getClientIP = async () => {
  if (cachedIP !== null) return cachedIP
  
  try {
    // Try multiple IP services for better reliability
    const services = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://httpbin.org/ip'
    ]
    
    for (const service of services) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        
        const response = await fetch(service, { 
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        })
        clearTimeout(timeoutId)
        
        const data = await response.json()
        
        // Handle different response formats
        let ip = null
        if (data.ip) ip = data.ip
        else if (data.origin) ip = data.origin // httpbin format
        
        if (ip) {
          cachedIP = ip
          return ip
        }
        
      } catch (error) {
        continue // Try next service
      }
    }
    
    cachedIP = 'unknown'
    return 'unknown'
  } catch (error) {
    cachedIP = 'unknown'
    return 'unknown'
  }
}

// Main tracking function - Updated to match Moodle format exactly
export const trackEvent = async (eventData) => {
  // Return early if analytics is disabled
  if (!ANALYTICS_ENABLED) {
    console.log('📊 Analytics disabled, skipping event:', eventData.event_name)
    return { data: null, error: null }
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.warn('No authenticated user for event tracking')
      return { data: null, error: 'No authenticated user' }
    }

    const sessionId = generateSessionId()
    
    // Create timestamp in local timezone instead of UTC
    const now = new Date()
    const timezoneOffset = now.getTimezoneOffset() * 60000 // offset in milliseconds
    const localTime = new Date(now.getTime() - timezoneOffset)
    const timestamp = localTime.toISOString().replace('Z', '') // Remove Z to indicate it's not UTC
    
    // Also create a more readable timestamp for debugging
    const readableTimestamp = now.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    
    console.log('🕒 Storing timestamp:', {
      utc: now.toISOString(),
      local: timestamp,
      readable: readableTimestamp,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })
    
    // Get client IP address (async, but don't wait for it to avoid blocking)
    const clientIP = await getClientIP()
    
    // Updated to match Moodle clickstream format exactly
    const clickstreamEvent = {
      user_id: user.id,
      time: timestamp, // Changed from 'timestamp' to 'time' to match Moodle
      event_context: eventData.event_context || eventData.context || '',
      component: eventData.component || 'System',
      event_name: eventData.event_name || eventData.name || 'Unknown Event',
      description: eventData.description || '',
      origin: eventData.origin || 'web',
      ip_address: clientIP && clientIP !== 'unknown' ? clientIP : null,
      session_id: sessionId,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      additional_data: {
        ...eventData.additional_data,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        referrer: document.referrer || null,
        utc_timestamp: now.toISOString(), // Keep UTC for reference
        local_timestamp: readableTimestamp, // Human-readable local time
        timezone_offset: now.getTimezoneOffset(), // Offset in minutes
        timestamp_local: timestamp
      },
      course_id: eventData.course_id || null,
      lesson_id: eventData.lesson_id || null
    }

    const { data, error } = await supabase
      .from('clickstream')
      .insert(clickstreamEvent)

    if (error) {
      // Log error but don't throw - clickstream should not break app functionality
      console.warn('Failed to track event (this is non-critical):', error.message)
      return { data: null, error }
    }

    console.log('📊 Event tracked:', {
      event: eventData.event_name,
      component: eventData.component,
      timestamp: new Date(timestamp).toLocaleTimeString()
    })

    return { data, error: null }
  } catch (error) {
    // Log error but don't throw - clickstream should not break app functionality
    console.warn('Clickstream tracking failed (this is non-critical):', error.message)
    return { data: null, error }
  }
}

// Updated tracking functions to match Moodle format exactly

export const trackPageView = (pageInfo = {}) => {
  return trackEvent({
    component: 'System',
    event_name: 'Page viewed',
    event_context: `Page: ${window.location.pathname}`,
    description: `The user viewed the page '${window.location.pathname}'.`,
    origin: 'web',
    additional_data: {
      page_title: document.title,
      page_path: window.location.pathname,
      page_search: window.location.search,
      ...pageInfo
    }
  })
}

export const trackCourseView = (courseId, courseName = '') => {
  return trackEvent({
    component: 'System',
    event_name: 'Course viewed',
    event_context: `Course: ${courseName || `Course ID ${courseId}`}`,
    description: `The user with id '${getCurrentUserId()}' viewed the course with id '${courseId}'.`,
    origin: 'web',
    course_id: courseId,
    additional_data: {
      course_name: courseName
    }
  })
}

export const trackLessonStart = (lessonId, courseId, lessonName = '', courseName = '') => {
  return trackEvent({
    component: 'System',
    event_name: 'Lesson started',
    event_context: `Course: ${courseName || `Course ID ${courseId}`}`,
    description: `The user with id '${getCurrentUserId()}' started lesson '${lessonName || lessonId}' in course '${courseId}'.`,
    origin: 'web',
    lesson_id: lessonId,
    course_id: courseId,
    additional_data: {
      lesson_name: lessonName,
      course_name: courseName
    }
  })
}

export const trackLessonComplete = (lessonId, courseId, lessonName = '', courseName = '', duration = null) => {
  return trackEvent({
    component: 'System',
    event_name: 'Lesson completed',
    event_context: `Course: ${courseName || `Course ID ${courseId}`}`,
    description: `The user with id '${getCurrentUserId()}' completed lesson '${lessonName || lessonId}' in course '${courseId}'.`,
    origin: 'web',
    lesson_id: lessonId,
    course_id: courseId,
    additional_data: {
      lesson_name: lessonName,
      course_name: courseName,
      completion_duration: duration
    }
  })
}

export const trackVideoEvent = (action, videoData) => {
  return trackEvent({
    component: 'Video',
    event_name: `Video ${action}`,
    event_context: `Course: ${videoData.courseTitle}`,
    description: `The user with id '${getCurrentUserId()}' ${action} video: ${videoData.title}`,
    origin: 'web',
    course_id: videoData.courseId,
    lesson_id: videoData.lessonId,
    additional_data: {
      video_action: action,
      video_title: videoData.title,
      video_url: videoData.url,
      current_time: videoData.currentTime || 0,
      duration: videoData.duration || 0,
      playback_rate: videoData.playbackRate || 1
    }
  })
}

export const trackQuizEvent = (action, quizData) => {
  return trackEvent({
    component: 'Quiz',
    event_name: `Quiz ${action}`,
    event_context: `Quiz: ${quizData.title || quizData.quizId}`,
    description: `The user with id '${getCurrentUserId()}' ${action} quiz '${quizData.title || quizData.quizId}' in course '${quizData.courseId}'.`,
    origin: 'web',
    course_id: quizData.courseId,
    lesson_id: quizData.lessonId,
    additional_data: {
      quiz_action: action,
      quiz_title: quizData.title,
      quiz_id: quizData.quizId,
      score: quizData.score,
      attempt_number: quizData.attemptNumber,
      time_taken_seconds: quizData.timeTaken,
      answers: quizData.answers,
      passed: quizData.score >= 70
    }
  })
}

// Functions to match your Moodle image format exactly
export const trackLogReportView = (courseId, courseName) => {
  return trackEvent({
    component: 'Logs',
    event_name: 'Log report viewed',
    event_context: `Course: ${courseName}`,
    description: `The user with id '${getCurrentUserId()}' viewed the log report for the course with id '${courseId}'.`,
    origin: 'web',
    course_id: courseId,
    additional_data: {
      course_name: courseName,
      report_type: 'log_report'
    }
  })
}

export const trackDiscussionView = (discussionId, forumName, courseId, courseName = '') => {
  return trackEvent({
    component: 'Forum',
    event_name: 'Discussion viewed',
    event_context: `Forum: ${forumName}`,
    description: `The user with id '${getCurrentUserId()}' has viewed the discussion with id '${discussionId}' in the forum with course module id '34874'.`,
    origin: 'ws', // Note: using 'ws' to match your image
    course_id: courseId,
    additional_data: {
      discussion_id: discussionId,
      forum_name: forumName,
      course_name: courseName,
      course_module_id: '34874'
    }
  })
}

export const trackCourseModuleView = (moduleType, moduleId, courseId, courseName = '') => {
  return trackEvent({
    component: 'System',
    event_name: 'Course module viewed',
    event_context: `Course: ${courseName}`,
    description: `The user with id '${getCurrentUserId()}' viewed the '${moduleType}' activity with course module id '${moduleId}'.`,
    origin: 'web',
    course_id: courseId,
    additional_data: {
      module_type: moduleType,
      module_id: moduleId,
      course_name: courseName,
      activity_type: moduleType
    }
  })
}

export const trackQuizAttemptReview = (quizId, attemptId, courseId, quizName = '') => {
  return trackEvent({
    component: 'Quiz',
    event_name: 'Quiz attempt reviewed',
    event_context: `Quiz: ${quizName || quizId}`,
    description: `The user with id '${getCurrentUserId()}' has had their attempt with id '${attemptId}' reviewed for quiz '${quizName || quizId}'.`,
    origin: 'web',
    course_id: courseId,
    additional_data: {
      quiz_id: quizId,
      quiz_name: quizName,
      attempt_id: attemptId,
      review_type: 'attempt_review'
    }
  })
}

// Helper function to get current user ID (simplified for description formatting)
const getCurrentUserId = () => {
  // This will be replaced with actual user ID in the trackEvent function
  return 'USER_ID'
}

export const trackSearch = (query, resultsCount = 0) => {
  return trackEvent({
    component: 'Search',
    event_name: 'Search performed',
    event_context: 'Search',
    description: `The user with id '${getCurrentUserId()}' searched for: "${query}"`,
    origin: 'web',
    additional_data: {
      search_query: query,
      results_count: resultsCount,
      search_timestamp: new Date().toISOString()
    }
  })
}

export const trackNavigation = (fromPage, toPage) => {
  return trackEvent({
    component: 'Navigation',
    event_name: 'Page navigation',
    event_context: 'Navigation',
    description: `The user with id '${getCurrentUserId()}' navigated from ${fromPage} to ${toPage}`,
    origin: 'web',
    additional_data: {
      from_page: fromPage,
      to_page: toPage,
      navigation_type: 'internal'
    }
  })
}

export const trackError = (errorType, errorMessage, context = {}) => {
  return trackEvent({
    component: 'System',
    event_name: 'Error occurred',
    event_context: 'System Error',
    description: `The user with id '${getCurrentUserId()}' encountered ${errorType}: ${errorMessage}`,
    origin: 'web',
    additional_data: {
      error_type: errorType,
      error_message: errorMessage,
      error_context: context,
      stack_trace: new Error().stack?.substring(0, 500),
      url: window.location.href,
      timestamp: new Date().toISOString()
    }
  })
}

export const trackEngagement = (elementType, action, elementId, additionalData = {}) => {
  return trackEvent({
    component: 'Interaction',
    event_name: `${elementType} ${action}`,
    event_context: 'User Interaction',
    description: `The user with id '${getCurrentUserId()}' ${action} ${elementType}: ${elementId}`,
    origin: 'web',
    additional_data: {
      element_type: elementType,
      element_id: elementId,
      action: action,
      interaction_timestamp: new Date().toISOString(),
      ...additionalData
    }
  })
}

// Analytics retrieval functions - Updated to use 'time' instead of 'timestamp'
export const getAnalyticsData = async (filters = {}) => {
  try {
    let query = supabase.from('clickstream').select('*')

    // Apply filters
    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }

    if (filters.startDate) {
      query = query.gte('time', filters.startDate)
    }

    if (filters.endDate) {
      query = query.lte('time', filters.endDate)
    }

    if (filters.component) {
      query = query.eq('component', filters.component)
    }

    if (filters.eventName) {
      query = query.eq('event_name', filters.eventName)
    }

    if (filters.courseId) {
      query = query.eq('course_id', filters.courseId)
    }

    if (filters.sessionId) {
      query = query.eq('session_id', filters.sessionId)
    }

    // Order by time descending and limit results
    query = query.order('time', { ascending: false }).limit(filters.limit || 1000)

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch analytics data:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Analytics query failed:', error)
    return { data: null, error }
  }
}

export const getEventSummary = async (userId, timeRange = '24h') => {
  try {
    const now = new Date()
    let startDate

    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    const { data, error } = await supabase
      .from('clickstream')
      .select('*')
      .eq('user_id', userId)
      .gte('time', startDate)
      .lte('time', now)
      .order('time', { ascending: false })

    if (error) {
      console.error('Failed to fetch event summary:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Event summary query failed:', error)
    return { data: null, error }
  }
}