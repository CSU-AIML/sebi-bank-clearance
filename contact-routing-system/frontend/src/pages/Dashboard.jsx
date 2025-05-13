import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { motion } from 'framer-motion'
import { 
  FiBarChart2, 
  FiRefreshCw, 
  FiInfo, 
  FiArrowRight, 
  FiCalendar,
  FiAlertTriangle, 
  FiX, 
  FiSearch,
  FiFilter
} from 'react-icons/fi'
import apiService from '../services/apiService'
import RoutingForm from '../components/RoutingForm'
import ResultCard from '../components/ResultCard'
import Spinner from '../components/Spinner'
import StatsCard from '../components/StatsCard'

function Dashboard() {
  const [banks, setBanks] = useState([])
  const [categories, setCategories] = useState([])
  const [severities, setSeverities] = useState([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [routingHistory, setRoutingHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({
    totalBanks: 0,
    regionsCount: 0,
    routedIssues: 0,
    previousRoutedIssues: 0,
    activeContacts: 0
  })
  const [lastRefreshed, setLastRefreshed] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const resultCardRef = useRef(null)

  // Fetch all initial data
  useEffect(() => {
    fetchInitialData()
    loadRoutingHistory()
  }, [])

  // Scroll to result when available
  useEffect(() => {
    if (result && resultCardRef.current) {
      // Only scroll on small screens
      if (window.innerWidth < 1024) {
        resultCardRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        })
      }
    }
  }, [result])

  async function fetchInitialData() {
    try {
      setInitialLoading(true)
      
      // Simulate concurrent API requests with Promise.all
      const [banksResponse, categoriesResponse, severitiesResponse] = await Promise.all([
        apiService.getBanks(),
        apiService.getCategories(),
        apiService.getSeverities()
      ])
      
      setBanks(banksResponse.banks)
      setCategories(categoriesResponse.categories)
      setSeverities(severitiesResponse.severities)
      
      // Get previous count for trend calculation
      const currentRoutedIssues = localStorage.getItem('routedIssues') 
        ? parseInt(localStorage.getItem('routedIssues')) 
        : 0
      
      const previousRoutedIssues = localStorage.getItem('previousRoutedIssues')
        ? parseInt(localStorage.getItem('previousRoutedIssues'))
        : 0
      
      // Calculate active contacts (simulated)
      const activeContacts = Math.floor(banksResponse.banks.length * 1.5)
      
      // Set stats with trend data
      setStats({
        totalBanks: banksResponse.banks.length,
        regionsCount: new Set(banksResponse.banks.map(bank => bank.Region_Name)).size || 5,
        routedIssues: currentRoutedIssues,
        previousRoutedIssues: previousRoutedIssues,
        activeContacts: activeContacts
      })
      
      setLastRefreshed(new Date())
      setInitialLoading(false)
    } catch (err) {
      console.error('Error fetching initial data:', err)
      toast.error('Failed to load initial data. Please refresh the page.')
      setInitialLoading(false)
    }
  }
  
  const refreshData = async () => {
    if (isRefreshing) return
    
    setIsRefreshing(true)
    toast.info('Refreshing dashboard data...')
    await fetchInitialData()
    setIsRefreshing(false)
    toast.success('Dashboard data refreshed!')
  }

  const loadRoutingHistory = () => {
    try {
      const historyJson = localStorage.getItem('routingHistory')
      if (historyJson) {
        const history = JSON.parse(historyJson)
        setRoutingHistory(history)
      }
    } catch (error) {
      console.error('Error loading routing history:', error)
    }
  }

  const saveRoutingHistory = (newEntry) => {
    try {
      const historyJson = localStorage.getItem('routingHistory')
      let history = historyJson ? JSON.parse(historyJson) : []
      
      // Add new entry at the beginning
      history = [newEntry, ...history].slice(0, 10) // Keep only last 10 entries
      
      localStorage.setItem('routingHistory', JSON.stringify(history))
      setRoutingHistory(history)
    } catch (error) {
      console.error('Error saving routing history:', error)
    }
  }

  const handleSubmit = async (formData) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiService.routeIssue(formData)
      
      if (response.success) {
        // Add timestamp to result
        const resultWithTimestamp = {
          ...response.result,
          timestamp: new Date().toISOString()
        }
        
        setResult(resultWithTimestamp)
        
        // Save to history
        const historyEntry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          bank: banks.find(b => b.Bank_ID === formData.bank_id)?.Bank_Name || 'Unknown Bank',
          category: categories.find(c => c.id === formData.issue_category)?.name || 'Unknown Category',
          severity: severities.find(s => s.id === formData.severity)?.name || 'Unknown Severity',
          timeSensitivity: formData.time_sensitivity,
          result: resultWithTimestamp
        }
        
        saveRoutingHistory(historyEntry)
        
        // Update routed issues count and store previous count for trend
        const currentCount = stats.routedIssues
        localStorage.setItem('previousRoutedIssues', currentCount.toString())
        localStorage.setItem('routedIssues', (currentCount + 1).toString())
        
        setStats(prev => ({
          ...prev,
          previousRoutedIssues: currentCount,
          routedIssues: currentCount + 1
        }))
        
        // Show success message
        toast.success('Contact found successfully!')
      } else {
        setError(response.error || 'An error occurred while routing the issue')
        toast.error(response.error || 'Failed to route issue')
      }
      
      setLoading(false)
    } catch (err) {
      console.error('Error routing issue:', err)
      setError('Failed to connect to server. Please try again.')
      toast.error('Failed to connect to server')
      setLoading(false)
    }
  }

  const clearResult = () => {
    setResult(null)
    setError(null)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const filteredHistory = routingHistory.filter(entry => 
    entry.bank.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner className="w-12 h-12 mx-auto" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard pb-12">
      {/* Dashboard Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 md:mb-0">Bank Contact Routing Dashboard</h1>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <button 
              onClick={refreshData}
              disabled={isRefreshing}
              className="flex items-center space-x-1 bg-white py-1 px-3 rounded-md hover:bg-gray-50 transition-colors border border-gray-200"
            >
              <FiRefreshCw className={`${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <div className="flex items-center space-x-1">
              <FiCalendar size={14} />
              <span>Last updated: {lastRefreshed.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
        <p className="text-gray-600">
          Route customer issues to the appropriate contact based on issue details and severity.
        </p>
      </div>
      
      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        <StatsCard 
          title="Banks in System" 
          value={stats.totalBanks} 
          icon="bank" 
          color="blue"
          timeFrame="Total Available"
        />
        <StatsCard 
          title="Banking Regions" 
          value={stats.regionsCount} 
          icon="globe" 
          color="green"
          timeFrame="Global Coverage"
        />
        <StatsCard 
          title="Issues Routed" 
          value={stats.routedIssues} 
          icon="ticket" 
          color="purple"
          timeFrame="Lifetime"
          trend={true}
          previousValue={stats.previousRoutedIssues}
        />
        <StatsCard 
          title="Active Contacts" 
          value={stats.activeContacts} 
          icon="users" 
          color="orange"
          timeFrame="Available Now"
        />
      </motion.div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Form */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Route New Issue</h2>
              <div className="flex items-center text-sm text-blue-600">
                <FiInfo size={16} className="mr-1" />
                <span>Fill all fields for best results</span>
              </div>
            </div>
            
            {loading && !result ? (
              <div className="flex justify-center items-center py-12">
                <Spinner className="w-8 h-8 mr-2" />
                <p>Processing request...</p>
              </div>
            ) : (
              <RoutingForm 
                banks={banks} 
                categories={categories} 
                severities={severities} 
                onSubmit={handleSubmit}
                disabled={loading}
              />
            )}
          </div>
          
          {/* Routing History Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Routing History</h2>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="text-blue-600 text-sm flex items-center"
              >
                {showHistory ? 'Hide History' : 'Show History'} 
                <FiArrowRight className="ml-1" />
              </button>
            </div>
            
            {showHistory && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-3 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Search history..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No routing history found</p>
                    <p className="text-sm">Route an issue to create history</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {filteredHistory.map(entry => (
                      <div key={entry.id} className="bg-gray-50 p-3 rounded-md border border-gray-100 hover:border-blue-200 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-gray-800">{entry.bank}</span>
                          <span className="text-xs text-gray-500">{formatDate(entry.timestamp)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{entry.category}</span>
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                            Severity: {entry.severity}
                          </span>
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                            Urgency: {entry.timeSensitivity}/10
                          </span>
                        </div>
                        
                        <div className="mt-2 flex justify-between items-center">
                          <span className="text-sm text-gray-700">
                            Routed to: <span className="font-semibold">{entry.result.contact_name}</span>
                          </span>
                          <button 
                            onClick={() => setResult(entry.result)}
                            className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
        
        {/* Right Column - Result */}
        <motion.div 
          ref={resultCardRef}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white p-6 rounded-lg shadow-md"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Routing Result</h2>
            {result && (
              <button 
                onClick={clearResult}
                className="text-gray-500 hover:text-gray-700"
                title="Clear result"
              >
                <FiX size={20} />
              </button>
            )}
          </div>
          
          {error ? (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 text-red-700 rounded">
              <div className="flex items-start">
                <FiAlertTriangle className="mt-0.5 mr-2" />
                <div>
                  <p className="font-semibold mb-1">Routing Error</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          ) : loading && !result ? (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <div className="bg-gray-100 rounded-full p-3 mb-3">
                <FiFilter className="text-gray-400" size={24} />
              </div>
              <p className="text-gray-500 mb-2">Submit an issue to see routing result</p>
              <p className="text-sm text-gray-400">Complete the form on the left</p>
            </div>
          ) : result ? (
            <div>
              {result.timestamp && (
                <div className="mb-4 text-sm text-gray-500 flex items-center">
                  <FiCalendar className="mr-1" size={14} />
                  Route generated: {formatDate(result.timestamp)}
                </div>
              )}
              <ResultCard result={result} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <div className="bg-gray-100 rounded-full p-3 mb-3">
                <FiFilter className="text-gray-400" size={24} />
              </div>
              <p className="text-gray-500 mb-2">Submit an issue to see routing result</p>
              <p className="text-sm text-gray-400">Complete the form on the left</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default Dashboard