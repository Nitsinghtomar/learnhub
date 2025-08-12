import React from 'react';
import { useClickstream } from '../hooks/useClickstream';

const QuizPage = () => {
  const { track } = useClickstream();

  React.useEffect(() => {
    track({
      component: 'Quiz',
      event_name: 'Page viewed',
      event_context: 'Quiz Page',
      description: 'User viewed quiz page'
    });
  }, [track]);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Quiz Center</h1>
        
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Quiz Feature Coming Soon</h2>
          <p className="text-gray-600">Interactive quizzes and assessments will be available here.</p>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
