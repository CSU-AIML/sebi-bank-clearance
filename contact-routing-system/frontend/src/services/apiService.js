import axios from 'axios'

// This sets the base URL for all API requests
const API_URL = import.meta.env.VITE_API_URL || ''

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

const apiService = {
  // Get list of banks
  getBanks: () => {
    return apiClient.get('/api/banks')
  },

  getContacts: (position = 'all') => {
    return apiClient.get(`/api/contacts?position=${position}`);
  },
  
  // Get list of issue categories
  getCategories: () => {
    return apiClient.get('/api/categories')
  },
  
  // Get list of severity levels
  getSeverities: () => {
    return apiClient.get('/api/severities')
  },
  
  // Route an issue to get contact information
  routeIssue: (formData) => {
    return apiClient.post('/api/route_issue', formData)
  }
}

export default apiService