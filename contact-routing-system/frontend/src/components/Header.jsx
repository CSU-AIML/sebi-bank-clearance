import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Menu, X, Github, BarChart3, User, Settings, Users } from 'lucide-react'

function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`${isScrolled 
      ? 'bg-white text-blue-800 shadow-lg' 
      : 'bg-gradient-to-r from-blue-800 to-blue-600 text-white'} 
      fixed w-full z-10 transition-all duration-300`}>
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 group">
          <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center 
                    text-blue-800 shadow-sm group-hover:bg-white transition-all">
            <span className="font-bold text-lg">B</span>
          </div>
          <span className={`${isScrolled ? 'text-blue-800' : 'text-white'} 
                    font-bold text-xl tracking-tight`}>
            Banking Router
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:block">
          <ul className="flex items-center space-x-6">
            <li>
              <Link to="/" className={`flex items-center space-x-1 ${isScrolled 
                ? 'hover:text-blue-600' 
                : 'hover:text-blue-100'} 
                transition-colors py-2`}>
                <BarChart3 size={18} />
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link to="/contacts" className={`flex items-center space-x-1 ${isScrolled 
                ? 'hover:text-blue-600' 
                : 'hover:text-blue-100'} 
                transition-colors py-2`}>
                <Users size={18} />
                <span>Contacts</span>
              </Link>
            </li>
            <li>
              <Link to="/profile" className={`flex items-center space-x-1 ${isScrolled 
                ? 'hover:text-blue-600' 
                : 'hover:text-blue-100'} 
                transition-colors py-2`}>
                <User size={18} />
                <span>Profile</span>
              </Link>
            </li>
            <li>
              <Link to="/settings" className={`flex items-center space-x-1 ${isScrolled 
                ? 'hover:text-blue-600' 
                : 'hover:text-blue-100'} 
                transition-colors py-2`}>
                <Settings size={18} />
                <span>Settings</span>
              </Link>
            </li>
            <li className="ml-2">
              <a 
                href="https://github.com/yourusername/contact-routing-system" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`flex items-center space-x-1 ${isScrolled 
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' 
                  : 'bg-blue-700/30 hover:bg-blue-700/50 text-white'} 
                  px-4 py-2 rounded-full transition-colors`}
              >
                <Github size={18} />
                <span>GitHub</span>
              </a>
            </li>
          </ul>
        </nav>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-white hover:text-blue-100 focus:outline-none"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X size={24} className={`${isScrolled ? 'text-blue-800' : 'text-white'}`} />
          ) : (
            <Menu size={24} className={`${isScrolled ? 'text-blue-800' : 'text-white'}`} />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <nav className="container mx-auto px-4 py-3">
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/" 
                  className="flex items-center space-x-2 text-blue-800 hover:text-blue-600 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <BarChart3 size={18} />
                  <span>Dashboard</span>
                </Link>
              </li>
              <li>
                <Link 
                  to="/contacts" 
                  className="flex items-center space-x-2 text-blue-800 hover:text-blue-600 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Users size={18} />
                  <span>Contacts Directory</span>
                </Link>
              </li>
              <li>
                <Link 
                  to="/profile" 
                  className="flex items-center space-x-2 text-blue-800 hover:text-blue-600 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User size={18} />
                  <span>Profile</span>
                </Link>
              </li>
              <li>
                <Link 
                  to="/settings" 
                  className="flex items-center space-x-2 text-blue-800 hover:text-blue-600 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Settings size={18} />
                  <span>Settings</span>
                </Link>
              </li>
              <li className="pt-2 border-t border-gray-100">
                <a 
                  href="https://github.com/yourusername/contact-routing-system" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-gray-800 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Github size={18} />
                  <span>GitHub Repository</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  )
}

export default Header