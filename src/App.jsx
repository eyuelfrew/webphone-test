import { useState, createContext, useContext } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './components/LoginPage'
import PhonePage from './components/PhonePage'

// Create context for SIP user session
const SipContext = createContext()

export const useSip = () => {
  const context = useContext(SipContext)
  if (!context) {
    throw new Error('useSip must be used within a SipProvider')
  }
  return context
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sipCredentials, setSipCredentials] = useState(null)
  const [userAgent, setUserAgent] = useState(null)

  const sipContextValue = {
    isAuthenticated,
    setIsAuthenticated,
    sipCredentials,
    setSipCredentials,
    userAgent,
    setUserAgent
  }

  return (
    <SipContext.Provider value={sipContextValue}>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Routes>
            <Route 
              path="/login" 
              element={
                isAuthenticated ? 
                <Navigate to="/phone" replace /> : 
                <LoginPage />
              } 
            />
            <Route 
              path="/phone" 
              element={
              1==1 ? 
                <PhonePage /> : 
                <Navigate to="/login" replace />
              } 
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </SipContext.Provider>
  )
}

export default App
