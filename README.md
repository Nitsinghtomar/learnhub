# LearnHub - Educational Platform with Analytics

A modern learning management system built with React and Supabase, featuring comprehensive user interaction tracking and analytics similar to Moodle's clickstream data.

## 🚀 Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **Vite** - Fast build tool and development server
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Modern icon library
- **Recharts** - Data visualization and charting library
- **React Hot Toast** - Elegant toast notifications

### Backend & Database
- **Supabase** - Backend-as-a-Service platform providing:
  - PostgreSQL database
  - Real-time subscriptions
  - Authentication
  - Row Level Security (RLS)
  - RESTful API

### Development Tools
- **ESLint** - Code linting and quality assurance
- **PostCSS** - CSS preprocessing
- **JavaScript (ES6+)** - Modern JavaScript features

## 📋 Features

### Core Functionality
- ✅ **User Authentication** - Sign up, login, logout with Supabase Auth
- ✅ **Course Management** - Browse and enroll in courses
- ✅ **Real-time Analytics** - Comprehensive user interaction tracking
- ✅ **Responsive Design** - Mobile-friendly interface
- ✅ **Error Handling** - Robust error boundaries and user feedback

### Analytics & Tracking
- ✅ **Clickstream Data** - Every user interaction is tracked
- ✅ **Moodle-format Analytics** - Compatible with educational analytics standards
- ✅ **Real-time Charts** - Activity visualization by type and hour
- ✅ **Session Tracking** - User session management and analytics
- ✅ **Timezone Support** - Local timezone handling for accurate timestamps

## 🗂️ Project Structure

```
learnhub/
├── public/
│   └── vite.svg
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Login.jsx           # User login form
│   │   │   ├── Register.jsx        # User registration form
│   │   │   └── ProtectedRoute.jsx  # Route protection component
│   │   ├── Common/
│   │   │   ├── ErrorBoundary.jsx   # Error handling wrapper
│   │   │   └── LoadingSpinner.jsx  # Loading state component
│   │   └── Layout/
│   │       ├── AuthLayout.jsx      # Layout for auth pages
│   │       └── MainLayout.jsx      # Main app layout with navigation
│   ├── hooks/
│   │   ├── useAuth.jsx            # Authentication hook
│   │   └── useClickstream.js      # Analytics tracking hook
│   ├── pages/
│   │   ├── Dashboard.jsx          # Main dashboard with courses
│   │   ├── CoursePage.jsx         # Individual course view
│   │   ├── LessonPage.jsx         # Individual lesson view
│   │   ├── AnalyticsPage.jsx      # User analytics dashboard
│   │   ├── QuizPage.jsx           # Quiz center (placeholder)
│   │   └── VideoActionsPage.jsx   # Video actions (placeholder)
│   ├── services/
│   │   ├── supabase.js           # Supabase client and auth functions
│   │   └── clickstream.js        # Analytics tracking service
│   ├── styles/
│   │   ├── global.css            # Global styles
│   │   └── globals.css           # Additional global styles
│   ├── App.jsx                   # Main app component with routing
│   └── main.jsx                  # App entry point
├── .env                          # Environment variables
├── package.json                  # Dependencies and scripts
├── tailwind.config.js           # Tailwind CSS configuration
├── vite.config.js               # Vite configuration
└── safe_cleanup_and_setup.sql   # Database schema and setup
```

## 📊 Database Schema

### Core Tables
- **profiles** - User profile information
- **courses** - Course catalog and metadata
- **lessons** - Individual lessons within courses
- **quizzes** - Quiz definitions and questions
- **enrollments** - User course enrollments
- **user_progress** - Learning progress tracking
- **quiz_attempts** - Quiz attempt records

### Analytics Table
- **clickstream** - Comprehensive user interaction tracking
  - User actions, timestamps, context
  - IP addresses, session IDs, user agents
  - Page URLs, component interactions
  - Additional metadata in JSON format

## 🖥️ Pages Overview

### 1. Dashboard (`/`)
**Purpose**: Main landing page after login
**Features**:
- Course statistics (total courses, enrolled courses, completion rate)
- Available course catalog with thumbnails
- Enrollment functionality
- Progress tracking for enrolled courses
- Course difficulty levels and duration estimates

### 2. Analytics (`/analytics`)
**Purpose**: User interaction analytics and insights
**Features**:
- Real-time clickstream data visualization
- Activity charts by type and hour (local timezone)
- Event summary statistics
- Raw clickstream data table (Moodle format)
- Recent activity timeline
- Timezone debugging information
- Test button for timestamp verification

### 3. Course Page (`/course/:courseId`)
**Purpose**: Individual course details and lessons
**Features**:
- Course overview and description
- Lesson listing and navigation
- Progress tracking
- Course enrollment status

### 4. Lesson Page (`/course/:courseId/lesson/:lessonId`)
**Purpose**: Individual lesson content delivery
**Features**:
- Lesson content display
- Progress tracking
- Navigation between lessons

### 5. Quiz Center (`/quiz`)
**Purpose**: Quiz management and taking (placeholder)
**Status**: Ready for implementation
**Planned Features**:
- Quiz listing and categories
- Quiz taking interface
- Results and scoring
- Attempt history

### 6. Video Actions (`/video-actions`)
**Purpose**: Video interaction analytics (placeholder)
**Status**: Ready for implementation
**Planned Features**:
- Video playback analytics
- Engagement metrics
- Interactive video elements

## 🔧 Setup and Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Supabase account

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd learnhub
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
# Copy environment template
copy .env.example .env

# Edit .env with your Supabase credentials
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ENABLE_ANALYTICS=true
```

4. **Database setup**
- Run the SQL script `safe_cleanup_and_setup.sql` in your Supabase SQL editor
- This creates all necessary tables, indexes, and sample data

5. **Start development server**
```bash
npm run dev
```

6. **Access the application**
- Open http://localhost:3000 (or the port shown in terminal)
- Register a new account or login

## 🚀 Deployment

### Deploy to Vercel

1. **Push to GitHub** (already done)
```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

2. **Deploy to Vercel**
- Go to [vercel.com](https://vercel.com) and sign in with GitHub
- Click "New Project"
- Import your `learnhub` repository
- Configure environment variables:
  - `VITE_SUPABASE_URL`: Your Supabase project URL
  - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
  - `VITE_ENABLE_ANALYTICS`: `true`
  - `VITE_APP_ENV`: `production`
- Click "Deploy"

3. **Production URL**
Your app will be available at: `https://learnhub-[random-id].vercel.app`

### Environment Variables for Production
Make sure to set these in Vercel dashboard:
```env
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key
VITE_ENABLE_ANALYTICS=true
VITE_APP_ENV=production
```

## 📈 Analytics Implementation

### Clickstream Tracking
The application tracks comprehensive user interactions including:

- **Page Views** - When users navigate between pages
- **Button Clicks** - All button interactions with context
- **Course Actions** - Enrollments, course views, lesson starts
- **Navigation** - Page-to-page navigation patterns
- **Form Submissions** - User form interactions
- **Video Events** - Play, pause, seek, complete (when implemented)
- **Quiz Events** - Start, submit, review (when implemented)
- **Error Events** - JavaScript errors and user feedback

### Data Format
All events follow Moodle's clickstream format:
- **Time** - Local timezone timestamp
- **Event Context** - Page or feature context
- **Component** - System component (Course, Quiz, Navigation, etc.)
- **Event Name** - Specific action performed
- **Description** - Human-readable event description
- **Origin** - Source of the event (web, mobile, etc.)
- **IP Address** - User's IP address
- **Additional Data** - JSON metadata with extra context

### Privacy & Security
- User data is protected with Row Level Security (RLS)
- Users can only view their own analytics data
- IP address collection can be disabled
- Timezone information helps with accurate local time tracking

## 🚀 Next Steps

### Immediate Priorities

1. **Quiz System Implementation**
   - Quiz creation interface for instructors
   - Quiz taking experience for students
   - Automated scoring and feedback
   - Analytics for quiz performance

2. **Video System Enhancement**
   - Video player integration
   - Playback analytics (play, pause, seek, completion)
   - Interactive video features (chapters, annotations)
   - Video progress tracking

3. **Advanced Analytics**
   - Learning path analytics
   - Performance predictions
   - Comparative analytics (peer comparison)
   - Export functionality for data analysis

### Medium-term Features

4. **Instructor Dashboard**
   - Course creation and management
   - Student progress monitoring
   - Analytics dashboard for instructors
   - Content management system

5. **Enhanced User Experience**
   - Dark mode support
   - Accessibility improvements
   - Mobile app (React Native)
   - Offline content support

6. **Social Learning Features**
   - Discussion forums
   - Peer review systems
   - Study groups
   - Collaborative projects

### Long-term Vision

7. **AI Integration**
   - Personalized learning recommendations
   - Automated content generation
   - Intelligent tutoring system
   - Predictive analytics

8. **Advanced Integrations**
   - LTI (Learning Tools Interoperability) support
   - Third-party tool integrations
   - API for external systems
   - SSO (Single Sign-On) support

9. **Scalability & Performance**
   - CDN integration for content delivery
   - Caching strategies
   - Database optimization
   - Load balancing

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

## 🔒 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **Authentication** - Secure user authentication with Supabase
- **Input Validation** - Client and server-side validation
- **HTTPS** - Secure data transmission
- **Environment Variables** - Secure configuration management

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For support and questions:
- Open an issue in the repository
- Check the documentation
- Review the database schema in `safe_cleanup_and_setup.sql`

---

**Built with ❤️ for modern education**
