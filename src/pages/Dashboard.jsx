import React, { useState, useEffect } from 'react';
import { BookOpen, Users, TrendingUp, Clock } from 'lucide-react';
import { db } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useClickstream } from '../hooks/useClickstream';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const Dashboard = () => {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalCourses: 0,
    enrolledCourses: 0,
    completionRate: 0,
    studyHours: 0
  });
  
  const { user } = useAuth();
  const { trackCourseView, trackEngagement } = useClickstream();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading dashboard data for user:', user?.id);
      
      // Load courses
      const { data: coursesData, error: coursesError } = await db.getCourses();
      if (coursesError) {
        console.error('❌ Error loading courses:', coursesError);
        setError('Failed to load courses: ' + coursesError.message);
      } else {
        console.log('✅ Loaded courses:', coursesData);
        setCourses(coursesData || []);
      }

      // Load user enrollments if user is authenticated
      if (user) {
        const { data: enrollmentsData, error: enrollmentsError } = await db.getUserEnrollments(user.id);
        if (enrollmentsError) {
          console.error('❌ Error loading enrollments:', enrollmentsError);
          // Don't set error for enrollments, just log it
        } else {
          console.log('✅ Loaded enrollments:', enrollmentsData);
          setEnrollments(enrollmentsData || []);
        }

        // Calculate stats
        const totalCourses = coursesData?.length || 0;
        const enrolledCourses = enrollmentsData?.length || 0;
        const completedCourses = enrollmentsData?.filter(e => e.progress_percentage === 100).length || 0;
        const completionRate = enrolledCourses > 0 ? Math.round((completedCourses / enrolledCourses) * 100) : 0;
        
        setStats({
          totalCourses,
          enrolledCourses,
          completionRate,
          studyHours: 42 // This would come from user_progress time_spent aggregation
        });
      } else {
        // For non-authenticated users, just show course stats
        const totalCourses = coursesData?.length || 0;
        setStats({
          totalCourses,
          enrolledCourses: 0,
          completionRate: 0,
          studyHours: 0
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = async (course) => {
    // Track course view
    await trackCourseView(course);
    navigate(`/course/${course.id}`);
  };

  const handleEnrollClick = async (course) => {
    if (!user) return;
    
    try {
      await trackEngagement('button', 'clicked', `enroll-course-${course.id}`, { course_title: course.title });
      await db.enrollInCourse(user.id, course.id);
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error enrolling in course:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Dashboard</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              loadDashboardData();
            }}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const dashboardStats = [
    { name: 'Available Courses', value: stats.totalCourses.toString(), icon: BookOpen, color: 'bg-blue-500' },
    { name: 'Enrolled Courses', value: stats.enrolledCourses.toString(), icon: Users, color: 'bg-green-500' },
    { name: 'Completion Rate', value: `${stats.completionRate}%`, icon: TrendingUp, color: 'bg-purple-500' },
    { name: 'Study Hours', value: stats.studyHours.toString(), icon: Clock, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back! Here's what's happening in your learning hub.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`h-8 w-8 rounded-md ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd className="text-lg font-medium text-gray-900">{stat.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Available Courses */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Available Courses</h3>
          {courses.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No courses available yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => {
                const isEnrolled = enrollments.some(e => e.course_id === course.id);
                const enrollment = enrollments.find(e => e.course_id === course.id);
                
                return (
                  <div key={course.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    {course.thumbnail_url && (
                      <img 
                        src={course.thumbnail_url} 
                        alt={course.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">{course.title}</h4>
                      <p className="text-sm text-gray-600 mb-3 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{course.description}</p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <span>{course.difficulty_level}</span>
                        <span>{course.estimated_duration_hours}h</span>
                      </div>

                      {isEnrolled ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progress</span>
                            <span>{enrollment?.progress_percentage || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${enrollment?.progress_percentage || 0}%` }}
                            ></div>
                          </div>
                          <button
                            onClick={() => handleCourseClick(course)}
                            className="w-full mt-2 px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            Continue Learning
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEnrollClick(course)}
                          className="w-full px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                        >
                          Enroll Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
