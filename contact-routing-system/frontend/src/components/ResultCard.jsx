import { useState } from 'react'
import { FiUser, FiMail, FiPhone, FiCheckCircle, FiAlertTriangle, FiX, FiShare2, FiClipboard } from 'react-icons/fi'

function ResultCard({ result }) {
  const [showCopyNotification, setShowCopyNotification] = useState(false)
  
  const getConfidenceColor = (confidence) => {
    if (confidence < 50) return 'bg-red-500'
    if (confidence < 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }
  
  const getConfidenceIcon = (confidence) => {
    if (confidence < 50) return <FiX className="mr-1" />
    if (confidence < 75) return <FiAlertTriangle className="mr-1" />
    return <FiCheckCircle className="mr-1" />
  }
  
  const getConfidenceText = (confidence) => {
    if (confidence < 50) return 'Low confidence'
    if (confidence < 75) return 'Medium confidence'
    return 'High confidence'
  }
  
  const getConfidenceTextColor = (confidence) => {
    if (confidence < 50) return 'text-red-600'
    if (confidence < 75) return 'text-yellow-600'
    return 'text-green-600'
  }

  const copyContactInfo = () => {
    const contactInfo = `
Contact: ${result.contact_name}
Email: ${result.contact_email}
Phone: ${result.contact_phone}
Bank: ${result.bank}
Level: ${result.level_name.replace('_', ' ')}
    `.trim()
    
    navigator.clipboard.writeText(contactInfo)
    setShowCopyNotification(true)
    
    setTimeout(() => {
      setShowCopyNotification(false)
    }, 2000)
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg border-t-4" 
         style={{ borderTopColor: getConfidenceColor(result.confidence).replace('bg-', '#').replace('500', '600') }}>
      
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{result.bank}</h3>
            <p className="text-sm text-gray-600">
              Escalation Level: <span className="font-medium capitalize">{result.level_name.replace('_', ' ')}</span>
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={copyContactInfo}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              title="Copy contact information"
            >
              <FiClipboard size={18} />
            </button>
            <button 
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              title="Share this contact"
            >
              <FiShare2 size={18} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <div className="space-y-4">
          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start">
              <div className="mr-3 text-blue-500 bg-blue-50 p-2 rounded-full">
                <FiUser size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Contact Name</p>
                <p className="font-medium text-gray-800">{result.contact_name}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-3 text-blue-500 bg-blue-50 p-2 rounded-full">
                <FiMail size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Email</p>
                <a 
                  href={`mailto:${result.contact_email}`}
                  className="font-medium text-blue-600 hover:underline break-all"
                >
                  {result.contact_email}
                </a>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-3 text-blue-500 bg-blue-50 p-2 rounded-full">
                <FiPhone size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Phone</p>
                <a 
                  href={`tel:${result.contact_phone}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {result.contact_phone}
                </a>
              </div>
            </div>
          </div>
          
          {/* Confidence Meter */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Routing Confidence</p>
              <p className={`text-sm font-bold ${getConfidenceTextColor(result.confidence)} flex items-center`}>
                {getConfidenceIcon(result.confidence)}
                {getConfidenceText(result.confidence)} ({result.confidence.toFixed(1)}%)
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getConfidenceColor(result.confidence)}`} 
                style={{ width: `${result.confidence}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Copy Notification */}
      {showCopyNotification && (
        <div className="absolute bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg text-sm">
          Contact information copied!
        </div>
      )}
    </div>
  )
}

export default ResultCard