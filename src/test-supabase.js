// Test Supabase connection
import { supabase } from './services/supabase.js'

window.testSupabase = async () => {
  console.log('🧪 Testing Supabase connection...')
  
  try {
    // Test basic connection
    const { data, error } = await supabase.auth.getSession()
    console.log('🧪 Session check:', { data, error })
    
    // Test signup with a dummy user
    const testEmail = `test-${Date.now()}@example.com`
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'test123456',
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User'
        }
      }
    })
    
    console.log('🧪 Test signup result:', { signupData, signupError })
    
    return { success: !signupError, error: signupError }
  } catch (error) {
    console.error('🧪 Test failed:', error)
    return { success: false, error }
  }
}

console.log('🧪 Test function loaded. Run window.testSupabase() in console to test.')
