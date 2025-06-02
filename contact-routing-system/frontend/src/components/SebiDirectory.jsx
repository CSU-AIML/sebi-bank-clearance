import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Phone, Mail, Building, X, ExternalLink, Star, Send, Clock, CheckCircle2, User, CheckCircle } from 'lucide-react';
import EmailTemplate from '../components/EmailTemplate';

// Add SEBI API service functions
const sebiApiService = {
  getSebiEntities: async (filters = {}) => {
    const API_URL = import.meta.env.VITE_API_URL || '';
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.state) params.append('state', filters.state);
    if (filters.city) params.append('city', filters.city);
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/api/sebi/entities${queryString ? '?' + queryString : ''}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch SEBI entities');
    }
    
    return await response.json();
  },

  getSebiStates: async () => {
    const API_URL = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${API_URL}/api/sebi/states`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch states');
    }
    
    return await response.json();
  }
};

const SebiDirectory = () => {
  const [entities, setEntities] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    state: '',
    city: '',
    emailFilter: 'all' // 'all', 'with-email', 'no-email'
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Email functionality state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactedEntities, setContactedEntities] = useState(new Set());
  const [emailStats, setEmailStats] = useState({
    sent: 0,
    responded: 0,
    pending: 0
  });

  // Selection and contact tracking state
  const [selectedEntities, setSelectedEntities] = useState(new Set());
  const [contactHistory, setContactHistory] = useState(new Map()); // entityId -> {contactedBy, contactedAt, method}
  const [showContactHistory, setShowContactHistory] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);
  const [filteredEntities, setFilteredEntities] = useState([]);

  useEffect(() => {
    loadInitialData();
    loadContactedEntities();
    loadContactHistory();
    loadSelectedEntities();
  }, []);

  // Update filtered entities when entities or filters change
  useEffect(() => {
    applyFilters();
  }, [entities, filters]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Load contact history from localStorage
  const loadContactHistory = () => {
    try {
      const stored = localStorage.getItem('sebiContactHistory');
      if (stored) {
        const historyArray = JSON.parse(stored);
        setContactHistory(new Map(historyArray));
      }
    } catch (error) {
      console.error('Error loading contact history:', error);
    }
  };

  // Save contact history to localStorage
  const saveContactHistory = (history) => {
    try {
      const historyArray = Array.from(history.entries());
      localStorage.setItem('sebiContactHistory', JSON.stringify(historyArray));
    } catch (error) {
      console.error('Error saving contact history:', error);
    }
  };

  // Load selected entities from localStorage
  const loadSelectedEntities = () => {
    try {
      const stored = localStorage.getItem('selectedSebiEntities');
      if (stored) {
        setSelectedEntities(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error('Error loading selected entities:', error);
    }
  };

  // Save selected entities to localStorage
  const saveSelectedEntities = (entities) => {
    try {
      localStorage.setItem('selectedSebiEntities', JSON.stringify([...entities]));
    } catch (error) {
      console.error('Error saving selected entities:', error);
    }
  };

  // Toggle entity selection
  const toggleEntitySelection = (entityId) => {
    const newSelected = new Set(selectedEntities);
    if (newSelected.has(entityId)) {
      newSelected.delete(entityId);
    } else {
      newSelected.add(entityId);
    }
    setSelectedEntities(newSelected);
    saveSelectedEntities(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  // Select all visible entities
  const selectAllVisible = () => {
    const visibleIds = getCurrentPageEntities().map(e => e.sebi_id);
    const newSelected = new Set([...selectedEntities, ...visibleIds]);
    setSelectedEntities(newSelected);
    saveSelectedEntities(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedEntities(new Set());
    saveSelectedEntities(new Set());
    setShowBulkActions(false);
  };

  // Apply filters to entities
  const applyFilters = () => {
    let filtered = [...entities];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(entity =>
        entity.name.toLowerCase().includes(searchLower) ||
        entity.registration_no.toLowerCase().includes(searchLower) ||
        (entity.contact_person && entity.contact_person.toLowerCase().includes(searchLower))
      );
    }

    // Apply state filter
    if (filters.state) {
      filtered = filtered.filter(entity =>
        (entity.primary_contact && entity.primary_contact.state && entity.primary_contact.state.toUpperCase() === filters.state.toUpperCase()) ||
        (entity.secondary_contact && entity.secondary_contact.state && entity.secondary_contact.state.toUpperCase() === filters.state.toUpperCase())
      );
    }

    // Apply city filter
    if (filters.city) {
      const cityLower = filters.city.toLowerCase();
      filtered = filtered.filter(entity =>
        (entity.primary_contact && entity.primary_contact.city && entity.primary_contact.city.toLowerCase().includes(cityLower)) ||
        (entity.secondary_contact && entity.secondary_contact.city && entity.secondary_contact.city.toLowerCase().includes(cityLower))
      );
    }

    // Apply email filter
    if (filters.emailFilter !== 'all') {
      if (filters.emailFilter === 'with-email') {
        filtered = filtered.filter(entity => 
          entity.primary_contact?.email || entity.secondary_contact?.email
        );
      } else if (filters.emailFilter === 'no-email') {
        filtered = filtered.filter(entity => 
          !entity.primary_contact?.email && !entity.secondary_contact?.email
        );
      }
    }

    setFilteredEntities(filtered);
  };

  // Get current page entities
  const getCurrentPageEntities = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredEntities.slice(startIndex, endIndex);
  };

  // Calculate total pages
  const totalPages = Math.ceil(filteredEntities.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of results
      document.getElementById('results-section')?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  // Load contacted entities from localStorage
  const loadContactedEntities = () => {
    try {
      const stored = localStorage.getItem('contactedSebiEntities');
      if (stored) {
        setContactedEntities(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error('Error loading contacted entities:', error);
    }
  };

  // Save contacted entities to localStorage
  const saveContactedEntities = (entities) => {
    try {
      localStorage.setItem('contactedSebiEntities', JSON.stringify([...entities]));
    } catch (error) {
      console.error('Error saving contacted entities:', error);
    }
  };

  // Handle email sending
  const handleEmailSent = (contact, emailData) => {
    const newContactedEntities = new Set(contactedEntities);
    newContactedEntities.add(contact.sebi_id || contact.id);
    setContactedEntities(newContactedEntities);
    saveContactedEntities(newContactedEntities);
    
    // Update contact history
    const newHistory = new Map(contactHistory);
    const currentUser = 'Current User'; // You can replace this with actual user name
    newHistory.set(contact.sebi_id || contact.id, {
      contactedBy: currentUser,
      contactedAt: new Date().toISOString(),
      method: 'Email',
      subject: emailData.subject,
      entityName: contact.bank_name
    });
    setContactHistory(newHistory);
    saveContactHistory(newHistory);
    
    // Update email stats
    setEmailStats(prev => ({
      ...prev,
      sent: prev.sent + 1,
      pending: prev.pending + 1
    }));
    
    setIsEmailModalOpen(false);
    setSelectedContact(null);
  };

  // Open email modal
  const openEmailModal = (entity) => {
    // Convert SEBI entity to contact format
    const contact = {
      sebi_id: entity.sebi_id,
      id: entity.sebi_id,
      name: entity.contact_person || entity.name,
      bank_name: entity.name, // Use entity name as "bank" name
      email: entity.primary_contact?.email || entity.secondary_contact?.email,
      position: 'SEBI Registered Entity',
      type: 'sebi'
    };
    
    setSelectedContact(contact);
    setIsEmailModalOpen(true);
  };

  // Check if entity has been contacted
  const isContactContacted = (entityId) => {
    return contactedEntities.has(entityId);
  };

  // Get contact status
  const getContactStatus = (entity) => {
    if (!entity.primary_contact?.email && !entity.secondary_contact?.email) {
      return { status: 'no-email', text: 'No Email', color: 'gray' };
    }
    
    if (isContactContacted(entity.sebi_id)) {
      return { status: 'contacted', text: 'Contacted', color: 'green' };
    }
    
    return { status: 'not-contacted', text: 'Not Contacted', color: 'blue' };
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [entitiesRes, statesRes] = await Promise.all([
        sebiApiService.getSebiEntities(),
        sebiApiService.getSebiStates()
      ]);
      
      if (entitiesRes.success) {
        setEntities(entitiesRes.entities);
        setFilteredEntities(entitiesRes.entities); // Initialize filtered entities
      } else {
        throw new Error(entitiesRes.error || 'Failed to load entities');
      }
      
      if (statesRes.success) {
        setStates(statesRes.states);
      } else {
        console.warn('Failed to load states:', statesRes.error);
        setStates([]);
      }
      
    } catch (err) {
      setError(err.message || 'Failed to load SEBI data');
      console.error('Error loading SEBI data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await sebiApiService.getSebiEntities(filters);
      
      if (response.success) {
        setEntities(response.entities);
        // filteredEntities will be updated by useEffect
      } else {
        throw new Error(response.error || 'Search failed');
      }
      
    } catch (err) {
      setError(err.message || 'Search failed');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({ search: '', state: '', city: '', emailFilter: 'all' });
    setShowFilters(false);
    setCurrentPage(1);
    loadInitialData();
  };

  // Pagination Component
  const Pagination = () => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pageNumbers = [];
      const maxVisiblePages = 5;
      
      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (startPage > 1) {
          pageNumbers.push(1);
          if (startPage > 2) pageNumbers.push('...');
        }
        
        for (let i = startPage; i <= endPage; i++) {
          pageNumbers.push(i);
        }
        
        if (endPage < totalPages) {
          if (endPage < totalPages - 1) pageNumbers.push('...');
          pageNumbers.push(totalPages);
        }
      }
      
      return pageNumbers;
    };

    return (
      <div className="flex items-center justify-between mt-8 mb-6">
        <div className="text-sm text-gray-600">
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredEntities.length)} to{' '}
          {Math.min(currentPage * itemsPerPage, filteredEntities.length)} of {filteredEntities.length} results
          {selectedEntities.size > 0 && (
            <span className="ml-2 text-purple-600 font-medium">
              • {selectedEntities.size} selected
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Selection Controls */}
          {getCurrentPageEntities().length > 0 && (
            <div className="flex items-center gap-2 mr-4">
              <button
                onClick={selectAllVisible}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                Select All Visible
              </button>
              {selectedEntities.size > 0 && (
                <button
                  onClick={clearAllSelections}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear All
                </button>
              )}
            </div>
          )}

          {/* Previous Button */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === 'number' && handlePageChange(page)}
                disabled={page === '...'}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  page === currentPage
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : page === '...'
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          
          {/* Next Button */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const EntityCard = ({ entity }) => {
    const contactStatus = getContactStatus(entity);
    const hasEmail = entity.primary_contact?.email || entity.secondary_contact?.email;
    const isSelected = selectedEntities.has(entity.sebi_id);
    const contactInfo = contactHistory.get(entity.sebi_id);
    
    return (
      <div className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-purple-200 group relative ${
        isSelected ? 'border-purple-500 bg-purple-50' : ''
      }`}>
        {/* Selection Checkbox */}
        <div className="absolute top-4 left-4 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              toggleEntitySelection(entity.sebi_id);
            }}
            className="w-5 h-5 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 cursor-pointer"
          />
        </div>

        <div className="flex justify-between items-start mb-4 ml-8">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors line-clamp-2">
              {entity.name}
            </h3>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {entity.registration_no}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <Star size={12} className="mr-1" />
                Active
              </span>
              
              {/* Contact Status Badge */}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                contactStatus.status === 'contacted' 
                  ? 'bg-green-100 text-green-800'
                  : contactStatus.status === 'no-email'
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {contactStatus.status === 'contacted' && <CheckCircle2 size={12} className="mr-1" />}
                {contactStatus.status === 'no-email' && <X size={12} className="mr-1" />}
                {contactStatus.status === 'not-contacted' && <Clock size={12} className="mr-1" />}
                {contactStatus.text}
              </span>
            </div>
            
            {entity.contact_person && (
              <p className="text-sm text-gray-600 mb-3 flex items-center gap-1">
                <User size={14} className="text-gray-400" />
                <strong>Contact:</strong> {entity.contact_person}
              </p>
            )}

            {/* Contact History Display */}
            {contactInfo && (
              <div className="mb-3 p-2 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-800 font-medium">
                  📧 Contacted by {contactInfo.contactedBy}
                </p>
                <p className="text-xs text-green-600">
                  {new Date(contactInfo.contactedAt).toLocaleDateString()} via {contactInfo.method}
                </p>
                {contactInfo.subject && (
                  <p className="text-xs text-green-600 italic">"{contactInfo.subject}"</p>
                )}
              </div>
            )}
          </div>
          
          <button
            onClick={() => setSelectedEntity(entity)}
            className="ml-4 p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition-colors"
            title="View Details"
          >
            <ExternalLink size={18} />
          </button>
        </div>
        
        {/* Primary Contact Preview */}
        {entity.primary_contact && (
          <div className="space-y-2">
            {entity.primary_contact.address && (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin size={14} className="mt-0.5 text-gray-400 flex-shrink-0" />
                <span className="line-clamp-2">
                  {entity.primary_contact.address}
                  {entity.primary_contact.city && `, ${entity.primary_contact.city}`}
                  {entity.primary_contact.state && `, ${entity.primary_contact.state}`}
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-3">
                {entity.primary_contact.email && (
                  <a
                    href={`mailto:${entity.primary_contact.email}`}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Mail size={12} />
                    Email
                  </a>
                )}
                {entity.primary_contact.telephone && (
                  <a
                    href={`tel:${entity.primary_contact.telephone}`}
                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 transition-colors"
                  >
                    <Phone size={12} />
                    Call
                  </a>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Email Action Button */}
                {hasEmail && (
                  <button
                    onClick={() => openEmailModal(entity)}
                    disabled={contactStatus.status === 'contacted'}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all transform hover:scale-105 ${
                      contactStatus.status === 'contacted'
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-sm'
                    }`}
                    title={contactStatus.status === 'contacted' ? 'Already contacted' : 'Send email'}
                  >
                    <Send size={12} />
                    {contactStatus.status === 'contacted' ? 'Sent' : 'Email'}
                  </button>
                )}
                
                <button
                  onClick={() => setSelectedEntity(entity)}
                  className="text-xs text-purple-600 hover:text-purple-800 font-medium transition-colors"
                >
                  View Details →
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* No contact info message */}
        {!entity.primary_contact?.address && !entity.primary_contact?.email && (
          <div className="text-center py-4 text-gray-500">
            <Building size={24} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Contact information not available</p>
          </div>
        )}
      </div>
    );
  };

  const EntityModal = ({ entity, onClose }) => {
    const contactStatus = getContactStatus(entity);
    const hasEmail = entity.primary_contact?.email || entity.secondary_contact?.email;
    
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
          <div className="fixed inset-0 transition-opacity bg-black bg-opacity-50" onClick={onClose}></div>
          
          <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{entity.name}</h3>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <p className="text-sm text-gray-600">Registration: {entity.registration_no}</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    contactStatus.status === 'contacted' 
                      ? 'bg-green-100 text-green-800'
                      : contactStatus.status === 'no-email'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {contactStatus.status === 'contacted' && <CheckCircle2 size={12} className="mr-1" />}
                    {contactStatus.status === 'no-email' && <X size={12} className="mr-1" />}
                    {contactStatus.status === 'not-contacted' && <Clock size={12} className="mr-1" />}
                    {contactStatus.text}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Email Action Button */}
                {hasEmail && (
                  <button
                    onClick={() => {
                      openEmailModal(entity);
                      onClose();
                    }}
                    disabled={contactStatus.status === 'contacted'}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all transform hover:scale-105 ${
                      contactStatus.status === 'contacted'
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg'
                    }`}
                    title={contactStatus.status === 'contacted' ? 'Already contacted' : 'Send email'}
                  >
                    <Send size={16} />
                    {contactStatus.status === 'contacted' ? 'Email Sent' : 'Send Email'}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {entity.contact_person && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                  <User size={16} />
                  Contact Person
                </h4>
                <p className="text-blue-800">{entity.contact_person}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Contact */}
              {entity.primary_contact && entity.primary_contact.address && (
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Building size={16} className="text-purple-600" />
                    Primary Contact
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">{entity.primary_contact.address}</p>
                    <p className="text-gray-700">
                      {entity.primary_contact.city}, {entity.primary_contact.state} {entity.primary_contact.pincode}
                    </p>
                    {entity.primary_contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-blue-500" />
                        <a href={`mailto:${entity.primary_contact.email}`} className="text-blue-600 hover:underline">
                          {entity.primary_contact.email}
                        </a>
                      </div>
                    )}
                    {entity.primary_contact.telephone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-green-500" />
                        <a href={`tel:${entity.primary_contact.telephone}`} className="text-green-600 hover:underline">
                          {entity.primary_contact.telephone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Secondary Contact */}
              {entity.secondary_contact && entity.secondary_contact.address && (
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Building size={16} className="text-purple-600" />
                    Secondary Contact
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">{entity.secondary_contact.address}</p>
                    <p className="text-gray-700">
                      {entity.secondary_contact.city}, {entity.secondary_contact.state} {entity.secondary_contact.pincode}
                    </p>
                    {entity.secondary_contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-blue-500" />
                        <a href={`mailto:${entity.secondary_contact.email}`} className="text-blue-600 hover:underline">
                          {entity.secondary_contact.email}
                        </a>
                      </div>
                    )}
                    {entity.secondary_contact.telephone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-green-500" />
                        <a href={`tel:${entity.secondary_contact.telephone}`} className="text-green-600 hover:underline">
                          {entity.secondary_contact.telephone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Registration Details */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Registration Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">From:</span>
                  <span className="ml-2 font-medium">{entity.from_date || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-600">To:</span>
                  <span className="ml-2 font-medium">{entity.to_date || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Email Campaign Info */}
            {hasEmail && (
              <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                  <Send size={16} />
                  Email Campaign Status
                </h4>
                <p className="text-sm text-purple-800">
                  {contactStatus.status === 'contacted' 
                    ? '✅ This entity has been contacted via email campaign.'
                    : '📧 This entity is available for email outreach.'
                  }
                </p>
                {contactStatus.status === 'not-contacted' && (
                  <p className="text-xs text-purple-600 mt-1">
                    Click "Send Email" to start the conversation with pre-designed templates.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-purple-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                SEBI Portfolio Managers
              </h1>
              <p className="text-gray-600">Registered entities under Securities and Exchange Board of India</p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <div className="text-2xl font-bold text-purple-600">{filteredEntities.length}</div>
                <div className="text-xs text-purple-600">Found</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-2xl font-bold text-blue-600">{filteredEntities.filter(e => e.primary_contact?.email || e.secondary_contact?.email).length}</div>
                <div className="text-xs text-blue-600">With Email</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <div className="text-2xl font-bold text-green-600">{contactedEntities.size}</div>
                <div className="text-xs text-green-600">Contacted</div>
              </div>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="space-y-4">
            {/* Main Search */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  placeholder="Search by name, registration number, or contact person..."
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 rounded-xl border transition-all ${showFilters 
                  ? 'bg-purple-100 border-purple-300 text-purple-700' 
                  : 'border-gray-300 hover:bg-gray-50'}`}
              >
                <Filter size={20} />
              </button>
              
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all transform hover:scale-105 disabled:hover:scale-100"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Quick Email Filters */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm font-medium text-gray-700">Quick filters:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({...filters, emailFilter: 'all'})}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filters.emailFilter === 'all'
                      ? 'bg-purple-100 text-purple-700 border border-purple-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All Entities
                </button>
                <button
                  onClick={() => setFilters({...filters, emailFilter: 'with-email'})}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filters.emailFilter === 'with-email'
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📧 With Email
                </button>
                <button
                  onClick={() => setFilters({...filters, emailFilter: 'no-email'})}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filters.emailFilter === 'no-email'
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ❌ No Email
                </button>
                
                {/* Contact Status Filters */}
                <button
                  onClick={() => {
                    // Filter to show only contacted entities
                    const contactedIds = Array.from(contactedEntities);
                    if (contactedIds.length > 0) {
                      // This would need additional logic to filter by contacted status
                      alert(`${contactedIds.length} entities have been contacted`);
                    }
                  }}
                  className="px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  ✅ Contacted ({contactedEntities.size})
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl border">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Filter</label>
                  <select
                    value={filters.emailFilter}
                    onChange={(e) => setFilters({...filters, emailFilter: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="all">All Entities</option>
                    <option value="with-email">With Email Only</option>
                    <option value="no-email">No Email Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <select
                    value={filters.state}
                    onChange={(e) => setFilters({...filters, state: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">All States</option>
                    {states.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={filters.city}
                    onChange={(e) => setFilters({...filters, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter city name"
                  />
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex items-center gap-2">
                <X size={16} />
                {error}
              </div>
            </div>
          )}

          {/* Selection Summary and Bulk Actions */}
          {selectedEntities.size > 0 && (
            <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-purple-900">
                  {selectedEntities.size} entities selected
                </h3>
                <button
                  onClick={clearAllSelections}
                  className="text-sm text-purple-600 hover:text-purple-800 underline"
                >
                  Clear All
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={selectAllVisible}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                >
                  Select All Visible
                </button>
                
                <button
                  onClick={() => {
                    const selectedWithEmail = Array.from(selectedEntities)
                      .map(id => entities.find(e => e.sebi_id === id))
                      .filter(e => e && (e.primary_contact?.email || e.secondary_contact?.email));
                    
                    console.log(`${selectedWithEmail.length} selected entities have email addresses`);
                    alert(`${selectedWithEmail.length} of ${selectedEntities.size} selected entities have email addresses`);
                  }}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                >
                  Check Email Availability
                </button>
                
                <button
                  onClick={() => setShowContactHistory(true)}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                >
                  View Contact History
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Email Campaign Stats */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-purple-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Send size={20} className="text-purple-600" />
            Email Campaign Overview
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-700">{entities.length}</div>
              <div className="text-sm text-gray-600">Total Entities</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-2xl font-bold text-blue-600">
                {entities.filter(e => e.primary_contact?.email || e.secondary_contact?.email).length}
              </div>
              <div className="text-sm text-blue-600">Have Email</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-2xl font-bold text-green-600">{contactedEntities.size}</div>
              <div className="text-sm text-green-600">Contacted</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-xl">
              <div className="text-2xl font-bold text-orange-600">
                {entities.filter(e => (e.primary_contact?.email || e.secondary_contact?.email) && !contactedEntities.has(e.sebi_id)).length}
              </div>
              <div className="text-sm text-orange-600">Pending</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <div className="text-2xl font-bold text-purple-600">
                {entities.filter(e => e.primary_contact?.email || e.secondary_contact?.email).length > 0 
                  ? Math.round((contactedEntities.size / entities.filter(e => e.primary_contact?.email || e.secondary_contact?.email).length) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-purple-600">Contact Rate</div>
            </div>
          </div>
          
          {/* Current Search Results */}
          {filteredEntities.length !== entities.length && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Filtered Results:</strong> Showing {filteredEntities.length} of {entities.length} entities
                {filteredEntities.filter(e => e.primary_contact?.email || e.secondary_contact?.email).length > 0 && (
                  <span className="ml-2">
                    • {filteredEntities.filter(e => e.primary_contact?.email || e.secondary_contact?.email).length} with email
                  </span>
                )}
              </p>
            </div>
          )}
          
          {/* Quick Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => {
                const entitiesWithEmail = filteredEntities.filter(e => 
                  (e.primary_contact?.email || e.secondary_contact?.email) && 
                  !contactedEntities.has(e.sebi_id)
                );
                if (entitiesWithEmail.length > 0) {
                  openEmailModal(entitiesWithEmail[0]);
                }
              }}
              disabled={filteredEntities.filter(e => (e.primary_contact?.email || e.secondary_contact?.email) && !contactedEntities.has(e.sebi_id)).length === 0}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 text-sm font-medium flex items-center gap-2"
            >
              <Send size={14} />
              Email Next Entity
            </button>
            
            <button
              onClick={() => {
                const contacted = new Set();
                setContactedEntities(contacted);
                saveContactedEntities(contacted);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Reset Campaign
            </button>
            
            {filteredEntities.length !== entities.length && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div id="results-section" className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Search Results
              </h2>
              <div className="text-white text-sm">
                Page {currentPage} of {totalPages}
              </div>
            </div>
            <p className="text-purple-100 text-sm mt-1">
              {filteredEntities.length} total entities found
              {filteredEntities.length > itemsPerPage && (
                <span className="ml-2">• Showing {itemsPerPage} per page</span>
              )}
            </p>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-4 text-gray-600">Loading SEBI entities...</p>
            </div>
          ) : getCurrentPageEntities().length > 0 ? (
            <>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getCurrentPageEntities().map((entity) => (
                    <EntityCard key={entity.sebi_id} entity={entity} />
                  ))}
                </div>
              </div>
              
              {/* Pagination */}
              <div className="border-t border-gray-200 px-6 py-4">
                <Pagination />
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2">No entities found</h3>
              <p>Try adjusting your search criteria or clear filters to see all entities.</p>
              {filteredEntities.length === 0 && entities.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contact History Modal */}
      {showContactHistory && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
            <div className="fixed inset-0 transition-opacity bg-black bg-opacity-50" onClick={() => setShowContactHistory(false)}></div>
            
            <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Contact History</h3>
                  <p className="text-gray-600">Track who has contacted which SEBI entities</p>
                </div>
                <button
                  onClick={() => setShowContactHistory(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Contact History List */}
              <div className="max-h-96 overflow-y-auto">
                {contactHistory.size === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Mail size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No contact history yet</p>
                    <p className="text-sm">Start reaching out to entities to build your contact history.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.from(contactHistory.entries()).map(([entityId, info]) => {
                      const entity = entities.find(e => e.sebi_id === entityId);
                      return (
                        <div key={entityId} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">
                                {entity?.name || info.entityName || 'Unknown Entity'}
                              </h4>
                              <p className="text-sm text-gray-600 mb-1">
                                Registration: {entity?.registration_no || 'N/A'}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <User size={14} />
                                  Contacted by: {info.contactedBy}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock size={14} />
                                  {new Date(info.contactedAt).toLocaleDateString()} at {new Date(info.contactedAt).toLocaleTimeString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Mail size={14} />
                                  Method: {info.method}
                                </span>
                              </div>
                              {info.subject && (
                                <p className="text-sm text-blue-600 mt-2 italic">
                                  Subject: "{info.subject}"
                                </p>
                              )}
                            </div>
                            
                            <div className="ml-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle2 size={12} className="mr-1" />
                                Contacted
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Summary Stats */}
              {contactHistory.size > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Contact Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{contactHistory.size}</div>
                      <div className="text-sm text-gray-600">Total Contacted</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {Array.from(contactHistory.values()).filter(info => info.method === 'Email').length}
                      </div>
                      <div className="text-sm text-gray-600">Email Contacts</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {new Set(Array.from(contactHistory.values()).map(info => info.contactedBy)).size}
                      </div>
                      <div className="text-sm text-gray-600">Team Members</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Entity Detail Modal */}
      {selectedEntity && (
        <EntityModal entity={selectedEntity} onClose={() => setSelectedEntity(null)} />
      )}

      {/* Email Template Modal */}
      <EmailTemplate
        isOpen={isEmailModalOpen}
        onClose={() => {
          setIsEmailModalOpen(false);
          setSelectedContact(null);
        }}
        contact={selectedContact}
        onSend={handleEmailSent}
      />
    </div>
  );
};

export default SebiDirectory;