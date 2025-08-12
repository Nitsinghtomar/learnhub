import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useClickstream } from '../hooks/useClickstream'
import { getAnalyticsData } from '../services/clickstream'
import { supabase } from '../services/supabase'
import LoadingSpinner from '../components/Common/LoadingSpinner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { TrendingUp, MousePointer, Clock, Eye, Database, Calendar } from 'lucide-react'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

const AnalyticsPage = () => {
  const { user } = useAuth()
  const { track } = useClickstream()
  const [rawClickstream, setRawClickstream] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const testConnection = async () => {
    console.log('🧪 Testing Supabase connection...')
    
    try {
      // Test basic connection
      const { data, error } = await supabase.from('courses').select('count').limit(1)
      console.log('🧪 Connection test result:', { data, error })
      
      if (error) {
        alert('Connection Error: ' + error.message)
      } else {
        alert('✅ Connection successful!')
      }
    } catch (err) {
      console.error('🧪 Connection test failed:', err)
      alert('❌ Connection failed: ' + err.message)
    }
  }

  const testTimestamp = async () => {
    console.log('🧪 Testing timestamp...')
    await track({
      component: 'Analytics',
      event_name: 'Timestamp test',
      event_context: 'Testing timestamp accuracy',
      description: `Timestamp test clicked at ${new Date().toLocaleString()}`
    })
    
    // Reload analytics after a short delay
    setTimeout(() => {
      loadAnalytics()
    }, 1000)
  }

  const loadAnalytics = async () => {
    try {
      if (!user?.id) {
        console.log('🔍 No user ID available for analytics')
        setLoading(false)
        return
      }

      console.log('🔍 Loading analytics for user:', user.id)
      console.log('🔍 Environment check:', {
        SUPABASE_URL: !!supabase?.supabaseUrl,
        ANALYTICS_ENABLED: import.meta.env.VITE_ENABLE_ANALYTICS,
        NODE_ENV: import.meta.env.MODE
      })
      
      // Track page view
      try {
        await track({
          component: 'Analytics',
          event_name: 'Page viewed',
          event_context: 'Analytics Page',
          description: 'User viewed analytics page'
        })
        console.log('✅ Page view tracked successfully')
      } catch (trackError) {
        console.error('❌ Error tracking page view:', trackError)
      }
      
      // Get raw clickstream data directly from Supabase
      console.log('🔍 Querying clickstream data...')
      const { data: clickstreamData, error: clickstreamError } = await supabase
        .from('clickstream')
        .select('*')
        .eq('user_id', user.id)
        .order('time', { ascending: false })
        .limit(100)

      console.log('🔍 Clickstream query result:', { 
        data: clickstreamData, 
        error: clickstreamError,
        dataLength: clickstreamData?.length 
      })

      if (clickstreamError) {
        console.error('❌ Error loading clickstream:', clickstreamError)
        setError('Failed to load analytics: ' + clickstreamError.message)
      } else {
        console.log('✅ Raw clickstream data loaded:', clickstreamData?.length || 0, 'events')
        setRawClickstream(clickstreamData || [])
        
        // Process analytics
        if (clickstreamData && clickstreamData.length > 0) {
          const processedAnalytics = processClickstreamData(clickstreamData)
          console.log('✅ Processed analytics:', processedAnalytics)
          setAnalytics(processedAnalytics)
        } else {
          console.log('ℹ️ No clickstream data found, showing empty state')
          setAnalytics({
            totalEvents: 0,
            activityByType: [],
            activityByHour: [],
            recentActivity: [],
            totalSessions: 0
          })
        }
      }
    } catch (err) {
      console.error('❌ Error loading analytics:', err)
      setError('Failed to load analytics: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [user?.id])

  const processClickstreamData = (data) => {
    const totalEvents = data.length
    
    // Group by event type
    const eventTypeCounts = {}
    data.forEach(event => {
      const eventType = event.event_name || 'Unknown'
      eventTypeCounts[eventType] = (eventTypeCounts[eventType] || 0) + 1
    })
    
    const activityByType = Object.entries(eventTypeCounts).map(([event_type, count]) => ({
      event_type,
      count
    }))
    
    // Group by hour (convert to local timezone)
    const hourCounts = {}
    
    // Initialize all hours to 0
    for (let i = 0; i < 24; i++) {
      hourCounts[i] = 0
    }
    
    data.forEach(event => {
      // Parse the timestamp and convert to local time
      const eventDate = new Date(event.time)
      const localHour = eventDate.getHours() // This gives local time
      hourCounts[localHour] = (hourCounts[localHour] || 0) + 1
    })
    
    const activityByHour = Object.entries(hourCounts).map(([hour, count]) => ({
      hour: parseInt(hour),
      hourLabel: `${hour.toString().padStart(2, '0')}:00`,
      count
    })).sort((a, b) => a.hour - b.hour) // Sort by hour
    
    // Get unique sessions
    const sessions = new Set(data.map(event => event.session_id).filter(Boolean))
    const totalSessions = sessions.size || 1
    
    // Recent activity (last 10 events)
    const recentActivity = data.slice(0, 10).map(event => ({
      event_type: event.event_name,
      created_at: event.time,
      event_data: { 
        page: event.page_url,
        course_id: event.course_id,
        component: event.component
      }
    }))
    
    return {
      totalEvents,
      activityByType,
      activityByHour,
      recentActivity,
      totalSessions
    }
  }

  const formatTime = (timeString) => {
    try {
      const date = new Date(timeString)
      // Format to local time with explicit timezone
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    } catch {
      return timeString
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Analytics</h3>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (!analytics || analytics.totalEvents === 0) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-medium">No Analytics Data</h3>
          <p className="text-yellow-600 mt-1">Start interacting with the platform to see your analytics data.</p>
        </div>
      </div>
    )
  }

  const activityByTypeData = analytics.activityByType?.map(item => ({
    name: item.event_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count: item.count
  })) || []

  const activityByHourData = analytics.activityByHour?.map(item => ({
    hour: item.hourLabel, // Use the formatted label
    hourNumber: item.hour,
    count: item.count
  })) || []

  const recentActivityData = analytics.recentActivity?.slice(0, 10).map((activity, index) => ({
    id: index,
    event: activity.event_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown',
    time: formatTime(activity.created_at),
    details: activity.event_data?.page || activity.event_data?.course_id || activity.event_data?.component || 'N/A'
  })) || []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Learning Analytics</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={testConnection}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            🔗 Test Connection
          </button>
          <button
            onClick={testTimestamp}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            🧪 Test Timestamp
          </button>
          <div className="text-sm text-gray-500">
            Total Events: {analytics.totalEvents || 0}
          </div>
        </div>
      </div>

      {/* Debug Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-blue-800 font-medium mb-2">Timezone Debug Info</h3>
        <div className="text-blue-600 text-sm space-y-1">
          <p><strong>Current Local Time:</strong> {new Date().toLocaleString()}</p>
          <p><strong>Current UTC Time:</strong> {new Date().toISOString()}</p>
          <p><strong>Your Timezone:</strong> {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
          <p><strong>Current Hour (Local):</strong> {new Date().getHours()}:00</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <MousePointer className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalEvents || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Eye className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Page Views</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.activityByType?.find(item => item.event_type.toLowerCase().includes('page'))?.count || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalSessions || 1}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Event Types</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.activityByType?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity by Type */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Activity by Type</h3>
          {activityByTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={activityByTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {activityByTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-8">No activity data available</div>
          )}
        </div>

        {/* Activity by Hour */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Activity by Hour (Local Time)</h3>
          {activityByHourData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityByHourData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour" 
                  label={{ value: 'Hour of Day', position: 'insideBottom', offset: -10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  label={{ value: 'Number of Events', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => [value, 'Events']}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-8">No hourly data available</div>
          )}
        </div>
      </div>

      {/* Raw Clickstream Data Table - Similar to Supabase view */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200 flex items-center">
          <Database className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Clickstream Data </h3>
        </div>
        <div className="p-6">
          {rawClickstream.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Event Context</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Event Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Origin</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rawClickstream.slice(0, 20).map((event, index) => (
                    <tr key={event.id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {formatTime(event.time)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {event.event_context || '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {event.component || '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                        {event.event_name || '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">
                        {event.description || '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {event.origin || '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {event.ip_address || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rawClickstream.length > 20 && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Showing 20 of {rawClickstream.length} events
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">No clickstream data available</div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200 flex items-center">
          <Calendar className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          {recentActivityData.length > 0 ? (
            <div className="space-y-4">
              {recentActivityData.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.event}</p>
                      <p className="text-xs text-gray-500">{activity.details}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">No recent activity available</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage
