import { useState } from 'react'
import { UserAgent } from 'sip.js'
import { useSip } from '../App'
import { User, Lock, Server, Loader } from 'lucide-react'

const LoginPage = () => {
  const { setIsAuthenticated, setSipCredentials, setUserAgent } = useSip()
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    server: 'ws://10.42.0.1:8088/ws',
    domain: '10.42.0.1'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Create SIP URI
      const uri = `sip:${formData.username}@${formData.domain}`
      
      // Create UserAgent configuration
      const userAgentOptions = {
        uri,
        transportOptions: {
          server: formData.server
        },
        authorizationUsername: formData.username,
        authorizationPassword: formData.password,
        sessionDescriptionHandlerFactoryOptions: {
          constraints: {
            audio: true,
            video: false
          }
        }
      }

      // Create UserAgent instance
      const userAgent = new UserAgent(userAgentOptions)

      // Handle registration events
      userAgent.delegate = {
        onConnect: () => {
          console.log('Connected to SIP server')
          setIsAuthenticated(true)
        },
        onDisconnect: (error) => {
          console.log('Disconnected from SIP server:', error)
          setError('Disconnected from server')
        }
      }

      // Start the UserAgent
      await userAgent.start()

      // Register with the server
      const registerer = userAgent.registerer
      if (registerer) {
        registerer.stateChange.addListener((newState) => {
          console.log('Registration state:', newState)
          if (newState === 'Registered') {
            // Registration successful
            setSipCredentials(formData)
            setUserAgent(userAgent)
            setIsAuthenticated(true)
          } else if (newState === 'Unregistered') {
            setError('Registration failed. Please check your credentials.')
          }
        })

        await registerer.register()
      }

    } catch (err) {
      console.error('Registration error:', err)
      setError('Failed to connect. Please check your server settings and credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Agent Phone Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your SIP credentials to connect
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleInputChange}
                  className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="SIP Username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Password"
                />
              </div>
            </div>

            <div>
              <label htmlFor="server" className="block text-sm font-medium text-gray-700">
                WebSocket Server
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Server className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="server"
                  name="server"
                  type="url"
                  required
                  value={formData.server}
                  onChange={handleInputChange}
                  className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="wss://your-server.com:8089/ws"
                />
              </div>
            </div>

            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-gray-700">
                Domain
              </label>
              <div className="mt-1">
                <input
                  id="domain"
                  name="domain"
                  type="text"
                  required
                  value={formData.domain}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="your-domain.com"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader className="h-5 w-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
