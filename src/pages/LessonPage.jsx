import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, ChevronLeft, ChevronRight, BookOpen, Video, FileText, HelpCircle } from 'lucide-react';
import ReactPlayer from 'react-player';
import { db } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useClickstream } from '../hooks/useClickstream';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const LessonPage = () => {
  const { courseId, lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  
  const { user } = useAuth();
  const { trackLessonStart, trackLessonComplete, trackVideoEvent } = useClickstream();
  const navigate = useNavigate();

  useEffect(() => {
    loadLessonData();
  }, [courseId, lessonId, user]);

  const loadLessonData = async () => {
    try {
      setLoading(true);
      
      // Load lesson details
      const { data: lessonData, error: lessonError } = await db.getLesson(parseInt(lessonId));
      if (lessonError) {
        console.error('Error loading lesson:', lessonError);
        return;
      }
      setLesson(lessonData);
      
      // Load course details
      const { data: courseData } = await db.getCourse(parseInt(courseId));
      setCourse(courseData);
      
      // Load all lessons for navigation
      const { data: lessonsData } = await db.getLessons(parseInt(courseId));
      if (lessonsData) {
        setLessons(lessonsData);
        const index = lessonsData.findIndex(l => l.id === parseInt(lessonId));
        setCurrentIndex(index);
      }

      if (user) {
        // Load user progress for this lesson
        const { data: progressData } = await db.getUserProgress(user.id, parseInt(courseId));
        const lessonProgress = progressData?.find(p => p.lesson_id === parseInt(lessonId));
        setProgress(lessonProgress);
      }

      // Track lesson start
      if (lessonData && courseData) {
        await trackLessonStart(lessonData, courseData);
      }
    } catch (error) {
      console.error('Error loading lesson data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!user || !lesson || !course) return;
    
    try {
      // Update progress in database
      await db.updateProgress({
        user_id: user.id,
        course_id: parseInt(courseId),
        lesson_id: parseInt(lessonId),
        status: 'completed',
        completed_at: new Date().toISOString()
      });

      // Track lesson completion
      await trackLessonComplete(lesson, course);
      
      // Refresh progress
      loadLessonData();
    } catch (error) {
      console.error('Error marking lesson as complete:', error);
    }
  };

  const handleNavigation = (direction) => {
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < lessons.length) {
      const nextLesson = lessons[nextIndex];
      navigate(`/course/${courseId}/lesson/${nextLesson.id}`);
    }
  };

  const renderContent = () => {
    if (!lesson || !lesson.content_data) return null;

    const contentData = lesson.content_data;

    switch (lesson.content_type) {
      case 'text':
        return (
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: contentData.content }} />
          </div>
        );
      
      case 'video':
        return (
          <div className="space-y-4">
            {contentData.description && (
              <p className="text-gray-600">{contentData.description}</p>
            )}
            <div className="aspect-video">
              <ReactPlayer
                url={contentData.video_url}
                width="100%"
                height="100%"
                controls
                onPlay={() => trackVideoEvent('played', {
                  title: lesson.title,
                  url: contentData.video_url,
                  courseId: parseInt(courseId),
                  lessonId: parseInt(lessonId),
                  courseTitle: course?.title
                })}
                onPause={() => trackVideoEvent('paused', {
                  title: lesson.title,
                  url: contentData.video_url,
                  courseId: parseInt(courseId),
                  lessonId: parseInt(lessonId),
                  courseTitle: course?.title
                })}
              />
            </div>
          </div>
        );
      
      case 'quiz':
        return <QuizComponent quiz={contentData} lesson={lesson} course={course} />;
      
      default:
        return <div>Content type not supported yet.</div>;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Lesson not found</h2>
        <p className="text-gray-600 mt-2">The lesson you're looking for doesn't exist.</p>
      </div>
    );
  }

  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const isCompleted = progress?.status === 'completed';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Lesson Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center">
                {lesson.content_type === 'video' && <Video className="h-5 w-5 mr-2" />}
                {lesson.content_type === 'text' && <FileText className="h-5 w-5 mr-2" />}
                {lesson.content_type === 'quiz' && <HelpCircle className="h-5 w-5 mr-2" />}
                {lesson.title}
              </h1>
              <p className="text-sm text-gray-500">{course?.title} • {lesson.duration_minutes} min</p>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => handleNavigation('prev')}
                disabled={!prevLesson}
                className={`p-2 rounded ${prevLesson ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'}`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-gray-500">
                {currentIndex + 1} of {lessons.length}
              </span>
              <button 
                onClick={() => handleNavigation('next')}
                disabled={!nextLesson}
                className={`p-2 rounded ${nextLesson ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'}`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Lesson Content */}
        <div className="px-6 py-8">
          {renderContent()}
        </div>
        
        {/* Lesson Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <BookOpen className="h-4 w-4 mr-1" />
            Back to Course
          </button>
          
          <div className="flex items-center space-x-3">
            {!isCompleted && (
              <button
                onClick={handleComplete}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Mark as Complete
              </button>
            )}
            
            {isCompleted && (
              <span className="text-green-600 text-sm font-medium">✓ Completed</span>
            )}
            
            {nextLesson && (
              <button
                onClick={() => handleNavigation('next')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                Next Lesson
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Quiz Component
const QuizComponent = ({ quiz, lesson, course }) => {
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  
  const { trackQuizEvent } = useClickstream();

  const handleAnswerSelect = (questionId, answerIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: answerIndex
    });
  };

  const handleSubmit = async () => {
    let correctAnswers = 0;
    const totalQuestions = quiz.questions.length;
    
    quiz.questions.forEach(question => {
      if (selectedAnswers[question.id] === question.correct) {
        correctAnswers++;
      }
    });
    
    const finalScore = Math.round((correctAnswers / totalQuestions) * 100);
    setScore(finalScore);
    setSubmitted(true);
    
    // Track quiz completion
    await trackQuizEvent('completed', {
      title: lesson.title,
      courseTitle: course?.title,
      courseId: course?.id,
      lessonId: lesson.id,
      score: finalScore,
      answers: selectedAnswers,
      attemptNumber: 1,
      timeTaken: 0 // Could track actual time
    });
  };

  return (
    <div className="space-y-6">
      {quiz.instructions && (
        <p className="text-gray-600 italic">{quiz.instructions}</p>
      )}
      
      {quiz.questions.map((question, index) => (
        <div key={question.id} className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-3">
            {index + 1}. {question.question}
          </h3>
          
          <div className="space-y-2">
            {question.options.map((option, optionIndex) => {
              const isSelected = selectedAnswers[question.id] === optionIndex;
              const isCorrect = question.correct === optionIndex;
              const showResult = submitted;
              
              return (
                <label
                  key={optionIndex}
                  className={`flex items-center p-2 rounded cursor-pointer ${
                    showResult
                      ? isCorrect
                        ? 'bg-green-100 text-green-800'
                        : isSelected
                        ? 'bg-red-100 text-red-800'
                        : 'bg-white'
                      : isSelected
                      ? 'bg-blue-100'
                      : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={optionIndex}
                    checked={isSelected}
                    onChange={() => handleAnswerSelect(question.id, optionIndex)}
                    disabled={submitted}
                    className="mr-2"
                  />
                  {option}
                  {showResult && isCorrect && <span className="ml-auto text-green-600">✓</span>}
                  {showResult && !isCorrect && isSelected && <span className="ml-auto text-red-600">✗</span>}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      
      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={Object.keys(selectedAnswers).length !== quiz.questions.length}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          Submit Quiz
        </button>
      ) : (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900">Quiz Complete!</h3>
          <p className="text-blue-800">Your score: {score}%</p>
          {score >= 70 ? (
            <p className="text-green-600">Congratulations! You passed!</p>
          ) : (
            <p className="text-orange-600">Keep studying and try again!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LessonPage;
