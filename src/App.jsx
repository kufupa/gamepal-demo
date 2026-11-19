import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';
import CampProfile from '@/pages/CampProfile';
import IndividualAnimals from '@/pages/IndividualAnimals';
import AnimalProfile from '@/pages/AnimalProfile';
import Breeding from '@/pages/Breeding';
import Movements from '@/pages/Movements';
import Mortality from '@/pages/Mortality';
import AllAnimalsOverview from '@/pages/AllAnimalsOverview';
import Sales from '@/pages/Sales';
import Settings from '@/pages/Settings';
import MovementDetail from '@/pages/MovementDetail';
import SaleDetail from '@/pages/SaleDetail';
import MortalityDetail from '@/pages/MortalityDetail';
import PlannedMovementDetail from '@/pages/PlannedMovementDetail';
import HuntDetail from '@/pages/HuntDetail';
import AuctionDetail from '@/pages/AuctionDetail';
import PlannedSaleDetail from '@/pages/PlannedSaleDetail';
import CaptureEventBuilder from '@/pages/CaptureEventBuilder';
import BrandPreview from '@/pages/BrandPreview';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/" element={<Home />} />
        <Route path="/camp/:id" element={<CampProfile />} />
        <Route path="/animals" element={<IndividualAnimals />} />
        <Route path="/animal/:id" element={<AnimalProfile />} />
        <Route path="/breeding" element={<Breeding />} />
        <Route path="/movements" element={<Movements />} />
        <Route path="/mortality" element={<Mortality />} />
        <Route path="/all-animals-overview" element={<AllAnimalsOverview />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/movement/:id" element={<MovementDetail />} />
        <Route path="/sale/:id" element={<SaleDetail />} />
        <Route path="/mortality/:id" element={<MortalityDetail />} />
        <Route path="/planned-movement/:id" element={<PlannedMovementDetail />} />
        <Route path="/hunt/:id" element={<HuntDetail />} />
        <Route path="/auction/:id" element={<AuctionDetail />} />
        <Route path="/planned-sale/:id" element={<PlannedSaleDetail />} />
      <Route path="/capture-event/new" element={<CaptureEventBuilder />} />
      <Route path="/brand-preview" element={<BrandPreview />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App