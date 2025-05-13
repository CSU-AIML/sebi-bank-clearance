// src/components/ContactsList.jsx
function ContactsList({ contacts }) {
    const groupByPosition = () => {
      const grouped = {};
      
      contacts.forEach(contact => {
        if (!grouped[contact.position_type]) {
          grouped[contact.position_type] = [];
        }
        grouped[contact.position_type].push(contact);
      });
      
      return grouped;
    };
    
    const renderContact = (contact) => (
      <div key={`${contact.bank_id}-${contact.position_type}`} className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-medium text-lg text-gray-800">{contact.name}</h3>
        <p className="text-blue-600 font-medium">{contact.bank_name}</p>
        <p className="text-gray-500 text-sm">{contact.position}</p>
        <div className="mt-3 space-y-1">
          {contact.email && (
            <a 
              href={`mailto:${contact.email}`}
              className="flex items-center text-blue-500 hover:underline text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {contact.email}
            </a>
          )}
          {contact.phone && (
            <a 
              href={`tel:${contact.phone}`}
              className="flex items-center text-blue-500 hover:underline text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {contact.phone}
            </a>
          )}
        </div>
      </div>
    );
    
    if (contacts.length === 0) {
      return (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-700">No contacts found matching your criteria. Try changing your filters.</p>
        </div>
      );
    }
    
    // If using regular list view (no grouping)
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {contacts.map(contact => renderContact(contact))}
      </div>
    );
  }
  
  export default ContactsList