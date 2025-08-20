import { useState, useEffect, useRef } from 'react'
import { useSip } from '../App'
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Pause, 
  Play, 
  Volume2, 
  VolumeX, 
  ArrowRightLeft,
  LogOut,
  User,
  Clock
} from 'lucide-react'

const PhonePage = () => {
  const { userAgent, sipCredentials, setIsAuthenticated, setUserAgent, setSipCredentials } = useSip()
  const [dialNumber, setDialNumber] = useState('')
  const [currentCall, setCurrentCall] = useState(null)
  const [callState, setCallState] = useState('idle') // idle, dialing, ringing, connected, holding
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [transferNumber, setTransferNumber] = useState('')
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [incomingCall, setIncomingCall] = useState(null)
  
  const callTimer = useRef(null)
  const audioElement = useRef(null)

  // Call duration timer
  useEffect(() => {
    if (callState === 'connected') {
      callTimer.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    } else {
      clearInterval(callTimer.current)
      setCallDuration(0)
    }

    return () => clearInterval(callTimer.current)
  }, [callState])

  // Setup incoming call handling
  useEffect(() => {
    if (userAgent) {
      userAgent.delegate = {
        ...userAgent.delegate,
        onInvite: (invitation) => {
          console.log('Incoming call from:', invitation.remoteIdentity.displayName || invitation.remoteIdentity.uri.user)
          setIncomingCall(invitation)
          
          // Setup call event handlers
          invitation.stateChange.addListener((newState) => {
            console.log('Call state changed:', newState)
            switch (newState) {
              case 'Establishing':
                setCallState('connected')
                setCurrentCall(invitation)
                setIncomingCall(null)
                break
              case 'Established':
                setCallState('connected')
                setupMediaHandling(invitation)
                break
              case 'Terminating':
              case 'Terminated':
                setCallState('idle')
                setCurrentCall(null)
                setIncomingCall(null)
                break
            }
          })
        }
      }
    }
  }, [userAgent])

  const setupMediaHandling = (session) => {
    const sessionDescriptionHandler = session.sessionDescriptionHandler
    if (sessionDescriptionHandler && sessionDescriptionHandler.peerConnection) {
      const pc = sessionDescriptionHandler.peerConnection
      
      pc.getRemoteStreams().forEach(stream => {
        if (audioElement.current) {
          audioElement.current.srcObject = stream
          audioElement.current.play().catch(e => console.log('Audio play failed:', e))
        }
      })
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleDialpadClick = (digit) => {
    setDialNumber(prev => prev + digit)
    
    // Send DTMF if in call
    if (currentCall && callState === 'connected') {
      try {
        const sessionDescriptionHandler = currentCall.sessionDescriptionHandler
        if (sessionDescriptionHandler && sessionDescriptionHandler.sendDtmf) {
          sessionDescriptionHandler.sendDtmf(digit)
        }
      } catch (error) {
        console.error('DTMF error:', error)
      }
    }
  }

  const makeCall = async () => {
    if (!dialNumber.trim() || !userAgent) return

    try {
      setCallState('dialing')
      const target = `sip:${dialNumber}@${sipCredentials.domain}`
      const inviter = userAgent.invite(target, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false
          }
        }
      })

      setCurrentCall(inviter)

      inviter.stateChange.addListener((newState) => {
        console.log('Outgoing call state:', newState)
        switch (newState) {
          case 'Establishing':
            setCallState('ringing')
            break
          case 'Established':
            setCallState('connected')
            setupMediaHandling(inviter)
            break
          case 'Terminating':
          case 'Terminated':
            setCallState('idle')
            setCurrentCall(null)
            break
        }
      })

    } catch (error) {
      console.error('Call failed:', error)
      setCallState('idle')
      setCurrentCall(null)
    }
  }

  const answerCall = async () => {
    if (!incomingCall) return

    try {
      await incomingCall.accept({
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false
          }
        }
      })
    } catch (error) {
      console.error('Answer call failed:', error)
    }
  }

  const hangupCall = async () => {
    if (currentCall) {
      try {
        if (currentCall.state === 'Established') {
          await currentCall.bye()
        } else {
          await currentCall.cancel()
        }
      } catch (error) {
        console.error('Hangup failed:', error)
      }
    }
    
    if (incomingCall) {
      try {
        await incomingCall.reject()
      } catch (error) {
        console.error('Reject call failed:', error)
      }
    }

    setCurrentCall(null)
    setIncomingCall(null)
    setCallState('idle')
  }

  const toggleHold = async () => {
    if (!currentCall || callState !== 'connected') return

    try {
      if (callState === 'connected') {
        await currentCall.hold()
        setCallState('holding')
      } else if (callState === 'holding') {
        await currentCall.unhold()
        setCallState('connected')
      }
    } catch (error) {
      console.error('Hold/Unhold failed:', error)
    }
  }

  const toggleMute = () => {
    if (!currentCall) return

    try {
      const sessionDescriptionHandler = currentCall.sessionDescriptionHandler
      if (sessionDescriptionHandler && sessionDescriptionHandler.peerConnection) {
        const pc = sessionDescriptionHandler.peerConnection
        const localStream = pc.getLocalStreams()[0]
        
        if (localStream) {
          localStream.getAudioTracks().forEach(track => {
            track.enabled = isMuted
          })
          setIsMuted(!isMuted)
        }
      }
    } catch (error) {
      console.error('Mute toggle failed:', error)
    }
  }

  const transferCall = async () => {
    if (!currentCall || !transferNumber.trim()) return

    try {
      const target = `sip:${transferNumber}@${sipCredentials.domain}`
      await currentCall.refer(target)
      setShowTransferDialog(false)
      setTransferNumber('')
    } catch (error) {
      console.error('Transfer failed:', error)
    }
  }

  const logout = async () => {
    if (userAgent) {
      try {
        if (currentCall) {
          await hangupCall()
        }
        await userAgent.stop()
      } catch (error) {
        console.error('Logout error:', error)
      }
    }
    
    setIsAuthenticated(false)
    setSipCredentials(null)
    setUserAgent(null)
  }

  const dialpadNumbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ]

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span className="font-medium">{sipCredentials?.username}</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center space-x-1 text-indigo-200 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>

        {/* Call Status */}
        <div className="p-4 border-b">
          {incomingCall && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="text-center">
                <Phone className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <p className="text-lg font-medium text-gray-900">Incoming Call</p>
                <p className="text-sm text-gray-600">
                  {incomingCall.remoteIdentity.displayName || incomingCall.remoteIdentity.uri.user}
                </p>
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={answerCall}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
                  >
                    Answer
                  </button>
                  <button
                    onClick={hangupCall}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          )}

          {callState !== 'idle' && (
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-lg font-mono">{formatTime(callDuration)}</span>
              </div>
              <p className="text-sm text-gray-600 capitalize">{callState}</p>
              {currentCall && (
                <p className="text-sm text-gray-800 font-medium">
                  {dialNumber || 'Unknown'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Dialer Display */}
        <div className="p-4">
          <input
            type="text"
            value={dialNumber}
            onChange={(e) => setDialNumber(e.target.value)}
            placeholder="Enter phone number"
            className="w-full text-xl text-center py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Dialpad */}
        <div className="p-4">
          <div className="grid grid-cols-3 gap-3">
            {dialpadNumbers.flat().map((digit) => (
              <button
                key={digit}
                onClick={() => handleDialpadClick(digit)}
                className="h-12 bg-gray-50 hover:bg-gray-100 rounded-lg text-xl font-medium border border-gray-200 transition-colors"
              >
                {digit}
              </button>
            ))}
          </div>
        </div>

        {/* Call Controls */}
        <div className="p-4 border-t">
          {callState === 'idle' ? (
            <button
              onClick={makeCall}
              disabled={!dialNumber.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <PhoneCall className="h-5 w-5" />
              <span>Call</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex space-x-2">
                <button
                  onClick={toggleHold}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-3 rounded-lg flex items-center justify-center space-x-1"
                >
                  {callState === 'holding' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  <span className="text-sm">{callState === 'holding' ? 'Resume' : 'Hold'}</span>
                </button>
                
                <button
                  onClick={toggleMute}
                  className={`flex-1 ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'} text-white py-2 px-3 rounded-lg flex items-center justify-center space-x-1`}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  <span className="text-sm">{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>
                
                <button
                  onClick={() => setShowTransferDialog(true)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg flex items-center justify-center space-x-1"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  <span className="text-sm">Transfer</span>
                </button>
              </div>
              
              <button
                onClick={hangupCall}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg flex items-center justify-center space-x-2"
              >
                <PhoneOff className="h-5 w-5" />
                <span>Hang Up</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Transfer Dialog */}
      {showTransferDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-medium mb-4">Transfer Call</h3>
            <input
              type="text"
              value={transferNumber}
              onChange={(e) => setTransferNumber(e.target.value)}
              placeholder="Enter transfer number"
              className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />
            <div className="flex space-x-2">
              <button
                onClick={transferCall}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
              >
                Transfer
              </button>
              <button
                onClick={() => {
                  setShowTransferDialog(false)
                  setTransferNumber('')
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden audio element for call audio */}
      <audio ref={audioElement} autoPlay playsInline />
    </div>
  )
}

export default PhonePage
