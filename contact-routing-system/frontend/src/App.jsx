import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Contacts from './pages/Contacts'
import Header from './components/Header'

function App() {
  return (
    <Router>
      <div className="app-container min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/contacts" element={<Contacts />} />
          </Routes>
        </main>
        <footer className="text-center py-4 text-sm text-gray-600">
          © {new Date().getFullYear()} Bank Contact Routing System
        </footer>
      </div>
    </Router>
  )
}

export default App