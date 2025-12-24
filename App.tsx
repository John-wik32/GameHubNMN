
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import EditorPage from './pages/EditorPage';
import ProjectsHub from './pages/ProjectsHub';
import CoursePlayer from './components/CoursePlayer';
import CourseOverview from './components/CourseOverview';
import AuthModal from './components/AuthModal';
import Workstation from './components/Workstation';
import ProjectBuilder from './components/ProjectBuilder';
import { Course, UserProfile, Project, CompanyProject } from './types';
import { COURSES, PROJECTS, COMPANY_PROJECTS } from './constants';

const DEFAULT_PROFILE: UserProfile = {
  account: { id: 'guest', username: 'Guest', isGuest: true },
  stats: {
    xp: 0,
    level: 1,
    streak: 0,
    badges: [],
    accuracy: 0,
    readinessScore: 0,
    skillPoints: 0,
    cognitiveLoad: 'Low',
    sentiment: 'Neutral'
  },
  completedLessonIds: [],
  completedProjectIds: [],
  skillGraph: []
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeWorkProject, setActiveWorkProject] = useState<CompanyProject | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('nexus_profile_v8');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });

  useEffect(() => {
    localStorage.setItem('nexus_profile_v8', JSON.stringify(profile));
  }, [profile]);

  const handleStartCourse = (courseId: string) => {
    const course = COURSES.find(c => c.id === courseId);
    if (course) {
      setActiveCourse(course);
      setViewingCourse(null);
    }
  };

  const handleProgressUpdate = (lessonId: string) => {
    if (!profile.completedLessonIds.includes(lessonId)) {
      setProfile(prev => ({
        ...prev,
        completedLessonIds: [...prev.completedLessonIds, lessonId],
        stats: { ...prev.stats, xp: prev.stats.xp + 250 }
      }));
    }
  };

  if (activeWorkProject) return <Workstation project={activeWorkProject} onExit={() => setActiveWorkProject(null)} />;
  if (activeProject) return <ProjectBuilder project={activeProject} onExit={() => setActiveProject(null)} />;
  if (activeCourse) return <CoursePlayer course={activeCourse} onExit={() => setActiveCourse(null)} onProgressUpdate={handleProgressUpdate} />;

  return (
    <>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} profile={profile} onLoginClick={() => setShowAuth(true)}>
        {activeTab === 'dashboard' && (
          <Dashboard 
            profile={profile} 
            onStartCourse={handleStartCourse} 
            onStartSimulation={() => {}} 
            onStartWork={(p) => setActiveWorkProject(p)}
          />
        )}
        {activeTab === 'explore' && <Explore onStartCourse={(id) => setViewingCourse(COURSES.find(c => c.id === id) || null)} />}
        {activeTab === 'projects' && <ProjectsHub onStartProject={(p) => setActiveProject(p)} />}
        {activeTab === 'profile' && <div className="text-center py-40 font-black text-slate-700 uppercase tracking-widest">User Profile Exp. Coming Soon</div>}
      </Layout>

      {viewingCourse && <CourseOverview course={viewingCourse} onStart={handleStartCourse} onClose={() => setViewingCourse(null)} />}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onLogin={() => {}} />
    </>
  );
};

export default App;
