import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Header from './components/Header';
import { Suspense, useEffect, useState } from 'react';
import Spinner from './components/Spinner';

// Import notification system
import notificationService from './services/notificationService';
import { NotificationSettings, ToastNotification } from './components/NotificationBell';

function App() {
  const [toastNotification, setToastNotification] = useState(null);
  const [isNotificationServiceReady, setIsNotificationServiceReady] = useState(false);

  useEffect(() => {
    // Initialize notification service
    const initializeNotifications = async () => {
      try {
        console.log('Initializing notification service...');
        
        // Request browser notification permission
        const permissionGranted = await notificationService.requestNotificationPermission();
        console.log('Browser notification permission:', permissionGranted ? 'granted' : 'denied');
        
        // Start polling for email replies (check every minute)
        notificationService.startPolling(60000);
        console.log('Started polling for email replies');
        
        // Subscribe to new notifications for toast display
        const unsubscribe = notificationService.subscribe((notifications) => {
          const latestNotification = notifications[0];
          
          // Show toast for new unread notifications
          if (latestNotification && !latestNotification.read && !latestNotification.toastShown) {
            setToastNotification(latestNotification);
            
            // Mark as toast shown to prevent duplicate toasts
            notificationService.markToastShown(latestNotification.id);
          }
        });

        setIsNotificationServiceReady(true);
        console.log('Notification service initialized successfully');

        // Cleanup function
        return () => {
          console.log('Cleaning up notification service...');
          unsubscribe();
          notificationService.stopPolling();
        };

      } catch (error) {
        console.error('Failed to initialize notification service:', error);
        setIsNotificationServiceReady(true); // Still allow app to function
      }
    };

    const cleanup = initializeNotifications();
    
    // Cleanup on unmount
    return () => {
      cleanup.then(cleanupFn => {
        if (cleanupFn && typeof cleanupFn === 'function') {
          cleanupFn();
        }
      }).catch(error => {
        console.error('Error during notification service cleanup:', error);
      });
    };
  }, []);

  // Add demo notification for testing (remove in production)
  useEffect(() => {
    // Add a test notification after 5 seconds in development
    if (process.env.NODE_ENV === 'development' && isNotificationServiceReady) {
      const timer = setTimeout(() => {
        notificationService.addNotification({
          title: 'Welcome to Notification System!',
          message: 'Your email reply notifications are now active. This is a test notification.',
          senderName: 'System',
          senderEmail: 'system@bankingrouter.com',
          subject: 'System Test',
          snippet: 'This is a demo notification to show you how the system works.'
        });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isNotificationServiceReady]);

  const handleToastClose = () => {
    setToastNotification(null);
  };

  return (
    <Router>
      <div className="app-container min-h-screen bg-gray-50 text-gray-900">
        {/* Pass notification service to Header */}
        <Header notificationService={notificationService} />

        {/* Suspense fallback for route-level loading protection */}
        <Suspense fallback={<Spinner />}>
          <main className="container mx-auto p-4" role="main">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route 
                path="/contacts" 
                element={<Contacts notificationService={notificationService} />} 
              />
              {/* Add notification settings route */}
              <Route 
                path="/settings" 
                element={
                  <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-800 mb-8">Settings</h1>
                    <NotificationSettings notificationService={notificationService} />
                  </div>
                } 
              />
              {/* Add a catch-all route to handle unknown paths securely */}
              <Route
                path="*"
                element={
                  <div className="text-center py-16">
                    <div className="max-w-md mx-auto">
                      <div className="text-6xl mb-4">🔍</div>
                      <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
                      <p className="text-xl text-red-600 mb-8">Page Not Found</p>
                      <p className="text-gray-600 mb-8">
                        The page you're looking for doesn't exist or has been moved.
                      </p>
                      <button
                        onClick={() => window.history.back()}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors mr-4"
                      >
                        Go Back
                      </button>
                      <a
                        href="/"
                        className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors inline-block"
                      >
                        Home
                      </a>
                    </div>
                  </div>
                }
              />
            </Routes>
          </main>
        </Suspense>

        {/* Toast Notification - Fixed position, high z-index */}
        {toastNotification && (
          <ToastNotification
            notification={toastNotification}
            onClose={handleToastClose}
          />
        )}

        {/* Footer */}
        <footer className="text-center py-4 text-sm text-gray-600 border-t border-gray-200 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                © {new Date().getFullYear()} Bank Contact Routing System
              </div>
              
              {/* Notification Status Indicator */}
              {isNotificationServiceReady && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-600">Email notifications active</span>
                  </div>
                  
                  {process.env.NODE_ENV === 'development' && (
                    <div className="flex items-center gap-1 ml-4">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-orange-600">Dev Mode</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </footer>

        {/* Debug Panel for Development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 bg-gray-800 text-white p-3 rounded-lg text-xs z-40">
            <div className="font-semibold mb-2">🔧 Debug Panel</div>
            <div>Notifications: {isNotificationServiceReady ? '✅' : '⏳'}</div>
            <div>Toast: {toastNotification ? '📢' : '🔇'}</div>
            <button
              onClick={() => {
                notificationService.addNotification({
                  title: 'Debug Test',
                  message: 'Manual test notification',
                  senderName: 'Debug',
                  senderEmail: 'debug@test.com',
                  subject: 'Debug Test'
                });
              }}
              className="mt-2 bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
            >
              Test Notification
            </button>
            <button
              onClick={() => {
                console.log('Notification Service Status:', {
                  isReady: isNotificationServiceReady,
                  notifications: notificationService.notifications,
                  unreadCount: notificationService.getUnreadCount(),
                  isPolling: notificationService.isPolling
                });
              }}
              className="mt-1 bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-xs block"
            >
              Log Status
            </button>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;