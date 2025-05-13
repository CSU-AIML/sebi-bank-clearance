// src/pages/Contacts.jsx
import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import apiService from '../services/apiService'
import ContactsFilter from '../components/ContactsFilter'
import ContactsList from '../components/ContactsList'
import Spinner from '../components/Spinner'

function Contacts() {
  const [contacts, setContacts] = useState([])
  const [filteredContacts, setFilteredContacts] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  useEffect(() => {
    fetchContacts('all')
  }, [])
  
  useEffect(() => {
    // Filter contacts based on search term
    if (contacts.length) {
      const filtered = contacts.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredContacts(filtered)
    }
  }, [searchTerm, contacts])
  
  const fetchContacts = async (position) => {
    try {
      setLoading(true)
      const response = await apiService.getContacts(position)
      if (response.success) {
        setContacts(response.contacts)
        setFilteredContacts(response.contacts)
      } else {
        toast.error(response.error || 'Failed to load contacts')
      }
      setLoading(false)
    } catch (err) {
      console.error('Error fetching contacts:', err)
      toast.error('Failed to connect to server')
      setLoading(false)
    }
  }
  
  const handlePositionChange = (position) => {
    setSelectedPosition(position)
    fetchContacts(position)
  }
  
  const handleSearch = (term) => {
    setSearchTerm(term)
  }
  
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Bank Contacts Directory</h1>
        <p className="text-gray-600">
          Find contact information for bank officials by position and bank.
        </p>
      </div>
      
      <ContactsFilter 
        selectedPosition={selectedPosition}
        onPositionChange={handlePositionChange}
        onSearch={handleSearch}
        searchTerm={searchTerm}
      />
      
      {loading ? (
        <div className="flex justify-center my-12">
          <Spinner />
          <p className="ml-2">Loading contacts...</p>
        </div>
      ) : (
        <ContactsList contacts={filteredContacts} />
      )}
    </div>
  )
}

export default Contacts