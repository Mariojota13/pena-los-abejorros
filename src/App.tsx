import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SessionProvider, useSession } from './context/SessionContext'
import { ToastProvider } from './context/ToastContext'
import { SplashScreen } from './components/Skeleton'
import Login from './pages/Login'
import NoProfile from './pages/NoProfile'
import AppLayout from './components/AppLayout'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Birthdays from './pages/Birthdays'
import Events from './pages/Events'
import Members from './pages/Members'
import Treasury from './pages/Treasury'
import Sanctions from './pages/Sanctions'

function Gate() {
  const { loading, hasSession, profile } = useSession()

  if (loading) {
    return <SplashScreen />
  }

  if (!hasSession) return <Login />
  if (!profile) return <NoProfile />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/cumpleanos" element={<Birthdays />} />
        <Route path="/eventos" element={<Events />} />
        <Route path="/miembros" element={<Members />} />
        <Route path="/cuotas" element={<Treasury />} />
        <Route path="/multas" element={<Sanctions />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <ToastProvider>
          <Gate />
        </ToastProvider>
      </SessionProvider>
    </BrowserRouter>
  )
}
