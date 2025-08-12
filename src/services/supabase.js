import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('🔧 Supabase config check:', {
  url: supabaseUrl ? 'Set' : 'Missing',
  key: supabaseAnonKey ? 'Set' : 'Missing',
  urlLength: supabaseUrl?.length,
  keyLength: supabaseAnonKey?.length
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
})

// Auth helper functions
export const auth = {
  signUp: async (email, password, userData = {}) => {
    try {
      console.log('🔐 Starting signup process for:', email)
      console.log('🔐 User data:', userData)
      
      // Try the standard signup first
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })
      
      console.log('🔐 Signup response:', { data, error })
      
      // If we get a database error, try a simpler signup without metadata
      if (error && error.message.includes('Database error')) {
        console.log('🔐 Retrying signup without user metadata...')
        
        const { data: retryData, error: retryError } = await supabase.auth.signUp({
          email,
          password
          // No metadata to avoid database triggers
        })
        
        console.log('🔐 Retry signup response:', { retryData, retryError })
        return { data: retryData, error: retryError }
      }
      
      return { data, error }
    } catch (error) {
      console.error('🔐 Signup catch block error:', error)
      return { data: null, error }
    }
  },

  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      return { error }
    }
  },

  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      return { user, error }
    } catch (error) {
      return { user: null, error }
    }
  },

  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Database helper functions
export const db = {
  // Courses
  getCourses: async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  getCourse: async (id) => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  // Lessons
  getLessons: async (courseId) => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })
    return { data, error }
  },

  getLesson: async (id) => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  // User Progress
  getUserProgress: async (userId, courseId = null) => {
    let query = supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data, error } = await query
    return { data, error }
  },

  updateProgress: async (progressData) => {
    const { data, error } = await supabase
      .from('user_progress')
      .upsert(progressData, {
        onConflict: 'user_id,lesson_id'
      })
    return { data, error }
  },

  // Enrollments
  enrollInCourse: async (userId, courseId) => {
    const { data, error } = await supabase
      .from('enrollments')
      .upsert({
        user_id: userId,
        course_id: courseId,
        enrolled_at: new Date().toISOString()
      })
    return { data, error }
  },

  getUserEnrollments: async (userId) => {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, courses(*)')
      .eq('user_id', userId)
    return { data, error }
  }
}

export default supabase