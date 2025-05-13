// src/components/ContactsFilter.jsx
function ContactsFilter({ selectedPosition, onPositionChange, onSearch, searchTerm }) {
    const positions = [
      { id: 'all', name: 'All Positions' },
      { id: 'gm_head', name: 'GMs & Heads' },
      { id: 'level3', name: 'Senior Officials (Level 3)' },
      { id: 'level2', name: 'Mid-Level Officials (Level 2)' },
      { id: 'level1', name: 'Junior Officials (Level 1)' },
      { id: 'tech_level2', name: 'Senior Technical Staff' },
      { id: 'tech_level1', name: 'Technical Staff' }
    ]
    
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Position
            </label>
            <select
              value={selectedPosition}
              onChange={(e) => onPositionChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {positions.map(position => (
                <option key={position.id} value={position.id}>
                  {position.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Contacts
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search by name, bank, or email..."
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    )
  }
  
  export default ContactsFilter