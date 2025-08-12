import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, BookOpen, Clock, Users, CheckCircle } from 'lucide-react';
import { db } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useClickstream } from '../hooks/useClickstream';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const CoursePage = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [userProgress, setUserProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const { trackCourseView, trackLessonStart } = useClickstream();
  const navigate = useNavigate();

  useEffect(() => {
    loadCourseData();
  }, [courseId, user]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      
      // Load course details
      const { data: courseData, error: courseError } = await db.getCourse(parseInt(courseId));
      if (courseError) {
        console.error('Error loading course:', courseError);
        return;
      }
      setCourse(courseData);
      
      // Load lessons
      const { data: lessonsData, error: lessonsError } = await db.getLessons(parseInt(courseId));
      if (lessonsError) {
        console.error('Error loading lessons:', lessonsError);
      } else {
        setLessons(lessonsData || []);
      }

      if (user) {
        // Load user enrollment
        const { data: enrollmentsData } = await db.getUserEnrollments(user.id);
        const userEnrollment = enrollmentsData?.find(e => e.course_id === parseInt(courseId));
        setEnrollment(userEnrollment);

        // Load user progress
        const { data: progressData } = await db.getUserProgress(user.id, parseInt(courseId));
        setUserProgress(progressData || []);
      }

      // Track course view
      if (courseData) {
        await trackCourseView(courseData);
      }
    } catch (error) {
      console.error('Error loading course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLessonClick = async (lesson) => {
    if (!user || !enrollment) {
      // Need to enroll first
      await handleEnroll();
      return;
    }
    
    await trackLessonStart(lesson, course);
    navigate(`/course/${courseId}/lesson/${lesson.id}`);
  };

  const handleEnroll = async () => {
    if (!user) return;
    
    try {
      await db.enrollInCourse(user.id, parseInt(courseId));
      loadCourseData(); // Refresh data
    } catch (error) {
      console.error('Error enrolling in course:', error);
    }
  };

  const getLessonProgress = (lessonId) => {
    return userProgress.find(p => p.lesson_id === lessonId);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Course not found</h2>
        <p className="text-gray-600 mt-2">The course you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Course Header */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {course.thumbnail_url && (
          <img 
            src={course.thumbnail_url} 
            alt={course.title}
            className="w-full h-64 object-cover"
          />
        )}
        <div className="px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
              <p className="mt-2 text-gray-600">{course.description}</p>
              <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  {lessons.length} lessons
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {course.estimated_duration_hours}h
                </div>
                <div className="flex items-center capitalize">
                  {course.difficulty_level}
                </div>
              </div>
              
              {enrollment && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Your Progress</span>
                    <span>{enrollment.progress_percentage || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all"
                      style={{ width: `${enrollment.progress_percentage || 0}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            
            {!enrollment ? (
              <button 
                onClick={handleEnroll}
                className="ml-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Play className="h-5 w-5 mr-2" />
                Enroll Now
              </button>
            ) : (
              <button 
                onClick={() => handleLessonClick(lessons[0])}
                className="ml-6 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center"
              >
                <Play className="h-5 w-5 mr-2" />
                Continue Learning
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Course Content</h2>
          <p className="text-sm text-gray-500 mt-1">{lessons.length} lessons</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {lessons.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No lessons available yet.
            </div>
          ) : (
            lessons.map((lesson, index) => {
              const progress = getLessonProgress(lesson.id);
              const isCompleted = progress?.status === 'completed';
              const isLocked = !enrollment;
              
              return (
                <div key={lesson.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
                            <span className="text-xs text-gray-500">{index + 1}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className={`text-sm font-medium ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>
                          {lesson.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span className="capitalize">{lesson.content_type}</span>
                          <span>{lesson.duration_minutes} min</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleLessonClick(lesson)}
                      disabled={isLocked}
                      className={`px-3 py-1 text-xs rounded ${
                        isLocked 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      {isLocked ? 'Enroll to Access' : isCompleted ? 'Review' : 'Start'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursePage;
