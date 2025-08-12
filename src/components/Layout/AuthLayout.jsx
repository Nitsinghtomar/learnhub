import React from 'react'
import { BookOpen, GraduationCap, BarChart3 } from 'lucide-react'

const AuthLayout = ({ children }) => {
  const features = [
    {
      icon: BookOpen,
      title: 'Interactive Courses',
      description: 'Engage with text, video, and quiz content'
    },
    {
      icon: GraduationCap,
      title: 'Track Progress',
      description: 'Monitor your learning journey in real-time'
    },
    {
      icon: BarChart3,
      title: 'Learning Analytics',
      description: 'Detailed insights into your study patterns'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 flex">
      {/* Left side - Branding and features */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center mb-8">
            <div className="flex items-center justify-center w-12 h-12 bg-primary-600 rounded-xl mr-4">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">LearnHub</h1>
          </div>
          
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Transform Your Learning Experience
          </h2>
          
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of learners who are advancing their skills with our 
            interactive platform and comprehensive analytics.
          </p>

          <div className="space-y-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="flex items-center justify-center w-10 h-10 bg-primary-100 rounded-lg">
                  <feature.icon className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-primary-600 rounded-xl mr-3">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">LearnHub</h1>
            </div>
            <p className="text-gray-600">Interactive Learning Platform</p>
          </div>
          
          {children}
        </div>
      </div>
    </div>
  )
}

export default AuthLayout