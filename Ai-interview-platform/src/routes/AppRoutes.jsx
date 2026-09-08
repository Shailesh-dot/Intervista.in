import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "../pages/landing/LandingPage";

import UserLogin from "../pages/auth/UserLogin";
import UserRegister from "../pages/auth/UserRegister";

import CompanyLogin from "../pages/auth/CompanyLogin";
import CompanyRegister from "../pages/auth/CompanyRegister";
import { loadTestInfo, loadCompletedModules, getOrderedModules } from '../utils/testFlowUtils';
import PricingPage from "../pages/Intervista-pages/PricingPage";
import AboutusPage from "../pages/Intervista-pages/AboutusPage";
import PrivacypolicyPage from "../pages/Intervista-pages/PrivacypolicyPage";
import TermsConditions from "../pages/Intervista-pages/TermsConditions";
import FeaturesPage from "../pages/Intervista-pages/FeaturesPage";
import Contact from "../pages/Intervista-pages/Contact";
import HowItWorks from "../pages/Intervista-pages/HowItWorks";

import UserDashboard from "../pages/user/UserDashboard";
import SubmitProfile from "../pages/user/SubmitProfile";
import Guidelines from "../pages/user/Guidelines";

import CompanyDashboard from "../pages/company/CompanyDashboard";
import CompanyInfoOnboarding from "../pages/company/CompanyInfoOnboarding";


import ResumeParser from "../pages/test-portal/ResumeParser";
import TestPortal from "../pages/test-portal/TestPortal";
import TestEvaluation from "../pages/test-portal/TestEvaluation";

import StartingTest from "../pages/aptitude-test-portal/StartingTest";
import AptitudeTest from "../pages/aptitude-test-portal/AptitudeTest";


import InitialProcess from "../pages/interview-module/InitialProcess";
import MainAssessment from "../pages/interview-module/MainAssessment";
import Results from "../pages/interview-module/Results";

import VerbalStartingTest from "../pages/verbal-test/StartingTest";
import SpeakingTest from "../pages/verbal-test/SpeakingTest";
import ListeningTest from "../pages/verbal-test/ListeningTest";
import VerbalResults from "../pages/verbal-test/Results";

import Error404 from "../pages/errors/Error404";

// Guard component to prevent users from returning to test pages after completion
function TestRouteGuard({ children }) {
  try {
    const testInfo = loadTestInfo();
    if (testInfo) {
      const orderedModules = getOrderedModules(testInfo);
      const completedModules = loadCompletedModules();
      // Check if ALL assigned modules for this test are completed
      const allModulesDone = orderedModules.length > 0 && 
        orderedModules.every(m => completedModules.includes(m.key));
      if (allModulesDone) {
        return <Navigate to="/user/dashboard" replace />;
      }
    }
  } catch (e) {
    console.error("Error in TestRouteGuard:", e);
  }
  return children;
}

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about" element={<AboutusPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/privacy-policy" element={<PrivacypolicyPage />} />
        <Route path="/terms-conditions" element={<TermsConditions />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/how-it-works" element={<HowItWorks />} />

        {/* User Authentication */}
        <Route path="/login" element={<UserLogin />} />
        <Route path="/register" element={<UserRegister />} />

        {/* Company Authentication */}
        <Route path="/company/login" element={<CompanyLogin />} />
        <Route path="/company/register" element={<CompanyRegister />} />

        {/* User Dashboard */}
        <Route path="/user/dashboard" element={<UserDashboard />} />
        <Route path="/user/submit-profile" element={<SubmitProfile />} />
        <Route path="/user/guidelines" element={<Guidelines />} />

        {/* Company Dashboard & Setup */}
        <Route path="/company/dashboard" element={<CompanyDashboard />} />
        <Route path="/company/setup" element={<CompanyInfoOnboarding />} />


        {/* Interview Flow */}
        <Route path="/interview/resume-parser" element={<TestRouteGuard><ResumeParser /></TestRouteGuard>} />
        <Route path="/interview/test-portal" element={<TestRouteGuard><TestPortal /></TestRouteGuard>} />
        <Route path="/interview/evaluation" element={<TestRouteGuard><TestEvaluation /></TestRouteGuard>} />

        {/* Test Portal (Legacy) */}
        <Route path="/test/:testId" element={<TestRouteGuard><TestPortal /></TestRouteGuard>} />

        {/* Aptitude Test */}
        <Route path="/aptitude/start" element={<TestRouteGuard><StartingTest /></TestRouteGuard>} />
        <Route path="/aptitude/test" element={<TestRouteGuard><AptitudeTest /></TestRouteGuard>} />


        {/* Coding Assessment Module */}
        <Route path="/coding/instructions" element={<TestRouteGuard><InitialProcess /></TestRouteGuard>} />
        <Route path="/coding/assessment"   element={<TestRouteGuard><MainAssessment /></TestRouteGuard>} />
        <Route path="/coding/results"      element={<TestRouteGuard><Results /></TestRouteGuard>} />

        {/* Verbal Communication Assessment */}
        <Route path="/verbal/start"     element={<TestRouteGuard><VerbalStartingTest /></TestRouteGuard>} />
        <Route path="/verbal/speaking"  element={<TestRouteGuard><SpeakingTest /></TestRouteGuard>} />
        <Route path="/verbal/listening" element={<TestRouteGuard><ListeningTest /></TestRouteGuard>} />
        <Route path="/verbal/results"   element={<TestRouteGuard><VerbalResults /></TestRouteGuard>} />

        {/* Error Page */}
        <Route path="*" element={<Error404 />} />
      </Routes>
    </Router>
  );
}
