import { useState, useEffect } from 'react'
import { FiAlertCircle, FiClock, FiDatabase, FiChevronDown } from 'react-icons/fi'

function RoutingForm({ banks, categories, severities, onSubmit, disabled }) {
  const [formData, setFormData] = useState({
    bank_id: '',
    issue_category: '',
    severity: '',
    time_sensitivity: 5
  })
  
  const [formCompletion, setFormCompletion] = useState(0)
  const [timeSensitivityColor, setTimeSensitivityColor] = useState('bg-yellow-400')
  
  // Calculate form completion percentage
  useEffect(() => {
    let completed = 0
    if (formData.bank_id) completed++
    if (formData.issue_category) completed++
    if (formData.severity) completed++
    
    setFormCompletion(Math.floor((completed / 3) * 100))
  }, [formData])
  
  // Set time sensitivity color based on value
  useEffect(() => {
    const value = parseInt(formData.time_sensitivity)
    if (value <= 3) setTimeSensitivityColor('bg-green-400')
    else if (value <= 7) setTimeSensitivityColor('bg-yellow-400')
    else setTimeSensitivityColor('bg-red-400')
  }, [formData.time_sensitivity])
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }
  
  const FormField = ({ name, label, icon, children }) => (
    <div className="relative">
      <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
        {icon}
        <span className="ml-1">{label}</span>
      </label>
      <div className="relative">
        {children}
      </div>
    </div>
  )
  
  const SelectWrapper = ({ children }) => (
    <div className="relative">
      {children}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
        <FiChevronDown size={16} />
      </div>
    </div>
  )
  
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      {/* Form progress indicator */}
      <div className="mb-5">
        <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
          <span>Form completion</span>
          <span>{formCompletion}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className="h-1.5 rounded-full bg-blue-600 transition-all duration-500" 
            style={{ width: `${formCompletion}%` }}
          ></div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField 
          name="bank_id" 
          label="Bank Information" 
          icon={<FiDatabase className="text-blue-500" size={16} />}
        >
          <SelectWrapper>
            <select
              name="bank_id"
              value={formData.bank_id}
              onChange={handleChange}
              className="w-full p-3 pr-8 border border-gray-300 bg-gray-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 appearance-none transition-colors"
              required
              disabled={disabled}
            >
              <option value="">Choose a bank...</option>
              {banks.map(bank => (
                <option key={bank.Bank_ID} value={bank.Bank_ID}>
                  {bank.Bank_Name}
                </option>
              ))}
            </select>
          </SelectWrapper>
        </FormField>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField 
            name="issue_category" 
            label="Issue Category" 
            icon={<FiAlertCircle className="text-yellow-500" size={16} />}
          >
            <SelectWrapper>
              <select
                name="issue_category"
                value={formData.issue_category}
                onChange={handleChange}
                className="w-full p-3 pr-8 border border-gray-300 bg-gray-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 appearance-none transition-colors"
                required
                disabled={disabled}
              >
                <option value="">Select issue type...</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </SelectWrapper>
          </FormField>
          
          <FormField 
            name="severity" 
            label="Severity Level" 
            icon={<FiAlertCircle className="text-red-500" size={16} />}
          >
            <SelectWrapper>
              <select
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                className="w-full p-3 pr-8 border border-gray-300 bg-gray-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 appearance-none transition-colors"
                required
                disabled={disabled}
              >
                <option value="">Select severity...</option>
                {severities.map(severity => (
                  <option key={severity.id} value={severity.id}>
                    {severity.name}
                  </option>
                ))}
              </select>
            </SelectWrapper>
          </FormField>
        </div>
        
        <FormField 
          name="time_sensitivity" 
          label="Time Sensitivity" 
          icon={<FiClock className="text-blue-500" size={16} />}
        >
          <div className="mt-2">
            <div className="flex items-center">
              <div className="relative w-full">
                <input
                  type="range"
                  name="time_sensitivity"
                  min="1"
                  max="10"
                  value={formData.time_sensitivity}
                  onChange={handleChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  disabled={disabled}
                />
                <div className="absolute -bottom-0 left-0 w-full flex justify-between px-1 text-xs text-gray-400 mt-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <div key={num} className="h-1 w-px bg-gray-300"></div>
                  ))}
                </div>
              </div>
              <div 
                className={`ml-3 w-10 h-10 flex items-center justify-center rounded-full ${timeSensitivityColor} text-white font-bold text-sm transition-colors`}
              >
                {formData.time_sensitivity}
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Not Urgent</span>
              <span>Very Urgent</span>
            </div>
          </div>
        </FormField>
        
        <div className="pt-3">
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 focus:ring-2 focus:ring-blue-300 text-white font-medium py-3 px-4 rounded-lg transition duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm hover:shadow flex items-center justify-center"
            disabled={disabled || formCompletion < 100}
          >
            <span className="mr-1">Find Best Contact</span>
            {disabled && <span className="ml-2 inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>}
          </button>
          
          {formCompletion < 100 && !disabled && (
            <p className="text-xs text-center text-gray-500 mt-2">
              Please complete all required fields
            </p>
          )}
        </div>
      </form>
    </div>
  )
}

export default RoutingForm