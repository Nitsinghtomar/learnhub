-- =============================================
-- CLEAN DATABASE SETUP - NO SAMPLE CLICKSTREAM DATA
-- This only sets up the structure, no fake data
-- =============================================

-- =============================================
-- 1. SAFE CLEANUP
-- =============================================
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
    DROP TABLE IF EXISTS quiz_attempts CASCADE;
    DROP TABLE IF EXISTS user_progress CASCADE;
    DROP TABLE IF EXISTS enrollments CASCADE;
    DROP TABLE IF EXISTS clickstream CASCADE;
    DROP TABLE IF EXISTS quizzes CASCADE;
    DROP TABLE IF EXISTS lessons CASCADE;
    DROP TABLE IF EXISTS courses CASCADE;
    DROP TABLE IF EXISTS profiles CASCADE;
EXCEPTION 
    WHEN OTHERS THEN NULL;
END $$;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 2. CREATE TABLES
-- =============================================

-- Profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'learner',
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_id UUID REFERENCES profiles(id),
    thumbnail_url VARCHAR(500),
    is_published BOOLEAN DEFAULT true,
    difficulty_level VARCHAR(20) DEFAULT 'beginner',
    estimated_duration_hours INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lessons table
CREATE TABLE lessons (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_data JSONB,
    order_index INTEGER DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quizzes table
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    questions JSONB NOT NULL,
    passing_score INTEGER DEFAULT 70,
    max_attempts INTEGER DEFAULT 3,
    time_limit_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CLICKSTREAM TABLE - This is what matters for your tracking
CREATE TABLE clickstream (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Note: 'time' not 'timestamp'
    event_context VARCHAR(500),
    component VARCHAR(100),
    event_name VARCHAR(100),
    description TEXT,
    origin VARCHAR(50) DEFAULT 'web',
    ip_address INET,
    session_id VARCHAR(255),
    page_url VARCHAR(500),
    user_agent TEXT,
    additional_data JSONB DEFAULT '{}',
    course_id INTEGER REFERENCES courses(id),
    lesson_id INTEGER REFERENCES lessons(id)
);

-- User progress table
CREATE TABLE user_progress (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    course_id INTEGER REFERENCES courses(id),
    lesson_id INTEGER REFERENCES lessons(id),
    status VARCHAR(50) DEFAULT 'not_started',
    score INTEGER,
    time_spent INTEGER DEFAULT 0,
    last_accessed TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

-- Enrollments table
CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    course_id INTEGER REFERENCES courses(id),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    progress_percentage INTEGER DEFAULT 0,
    UNIQUE(user_id, course_id)
);

-- Quiz attempts table
CREATE TABLE quiz_attempts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    quiz_id INTEGER REFERENCES quizzes(id),
    lesson_id INTEGER REFERENCES lessons(id),
    answers JSONB,
    score INTEGER,
    passed BOOLEAN DEFAULT false,
    attempt_number INTEGER DEFAULT 1,
    time_taken INTEGER,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 3. ROW LEVEL SECURITY
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clickstream ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Enable insert for authentication users only" ON profiles
    FOR INSERT WITH CHECK (true);

-- Clickstream policies
CREATE POLICY "Users can insert own clickstream" ON clickstream 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own clickstream" ON clickstream 
    FOR SELECT USING (auth.uid() = user_id);

-- User progress policies
CREATE POLICY "Users can manage own progress" ON user_progress 
    FOR ALL USING (auth.uid() = user_id);

-- Enrollments policies
CREATE POLICY "Users can view own enrollments" ON enrollments 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can enroll themselves" ON enrollments 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Quiz attempts policies
CREATE POLICY "Users can view own quiz attempts" ON quiz_attempts 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quiz attempts" ON quiz_attempts 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public access for courses and lessons
CREATE POLICY "Anyone can view published courses" ON courses 
    FOR SELECT USING (is_published = true);
CREATE POLICY "Anyone can view published lessons" ON lessons 
    FOR SELECT USING (
        is_published = true AND 
        EXISTS (SELECT 1 FROM courses WHERE id = course_id AND is_published = true)
    );
CREATE POLICY "Anyone can view quizzes" ON quizzes 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lessons l 
            JOIN courses c ON l.course_id = c.id 
            WHERE l.id = lesson_id AND l.is_published = true AND c.is_published = true
        )
    );

-- =============================================
-- 4. USER PROFILE TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- 5. PERFORMANCE INDEXES
-- =============================================
CREATE INDEX idx_clickstream_user_id ON clickstream(user_id);
CREATE INDEX idx_clickstream_time ON clickstream(time);
CREATE INDEX idx_clickstream_event_name ON clickstream(event_name);
CREATE INDEX idx_clickstream_component ON clickstream(component);
CREATE INDEX idx_clickstream_session ON clickstream(session_id);
CREATE INDEX idx_user_progress_user_course ON user_progress(user_id, course_id);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_lessons_course ON lessons(course_id, order_index);

-- =============================================
-- 6. ONLY ESSENTIAL COURSE DATA (for the app to work)
-- =============================================
INSERT INTO courses (title, description, thumbnail_url, difficulty_level, estimated_duration_hours) VALUES
('Introduction to Web Development', 
 'Learn the fundamentals of HTML, CSS, and JavaScript to build modern web applications.',
 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=400&h=300&fit=crop',
 'beginner', 8),

('Data Science Fundamentals', 
 'Master Python, statistics, and data visualization to unlock insights from data.',
 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
 'intermediate', 12),

('Digital Marketing Strategy', 
 'Learn modern marketing techniques including SEO, social media marketing, and analytics.',
 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
 'beginner', 6);

-- Sample lessons (needed for app functionality)
INSERT INTO lessons (course_id, title, content_type, content_data, order_index, duration_minutes) VALUES
(1, 'HTML Basics', 'text', '{
    "content": "HTML (HyperText Markup Language) is the standard markup language for creating web pages."
}', 1, 30),

(1, 'CSS Styling Fundamentals', 'video', '{
    "video_url": "https://www.youtube.com/watch?v=yfoY53QXEnI",
    "description": "Learn CSS basics including selectors, properties, and the box model"
}', 2, 45),

(1, 'JavaScript Basics Quiz', 'quiz', '{
    "instructions": "Test your understanding of JavaScript fundamentals",
    "questions": [
        {
            "id": 1,
            "question": "What does var stand for in JavaScript?",
            "options": ["Variable", "Variant", "Various", "Virtual"],
            "correct": 0
        }
    ]
}', 3, 20);

-- =============================================
-- 7. MOODLE FORMAT VIEW (for easy querying)
-- =============================================
CREATE OR REPLACE VIEW clickstream_moodle_view AS
SELECT 
    TO_CHAR(time, 'DD/MM/YY, HH24:MI:SS') as "Time",
    event_context as "Event context",
    component as "Component", 
    event_name as "Event name",
    description as "Description",
    origin as "Origin",
    COALESCE(ip_address::text, '') as "IP address",
    user_id,
    course_id,
    lesson_id
FROM clickstream
ORDER BY time DESC;

-- =============================================
-- SETUP COMPLETE!
-- =============================================
SELECT 'Database setup completed successfully!' as status;
SELECT 'Clickstream table ready for real user data.' as message;
SELECT 'No sample clickstream data created - will be generated by actual usage.' as note;