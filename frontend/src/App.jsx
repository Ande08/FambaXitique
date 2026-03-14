import React, { useState, useEffect } from 'react';
import DashboardAdmin from './pages/DashboardAdmin';
import DashboardMembro from './pages/DashboardMembro';
import DashboardSuperAdmin from './pages/DashboardSuperAdmin';
import Login from './pages/Login';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('membro'); // 'membro', 'admin', 'super'

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      // If Super Admin, default to super view
      if (parsedUser.role === 'SUPER_ADMIN') setView('super');
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    if (userData.role === 'SUPER_ADMIN') setView('super');
    else setView('membro');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="App">
      {user ? (
        <>
          {view === 'admin' ? (
            <DashboardAdmin onLogout={handleLogout} />
          ) : (view === 'super' && user.role === 'SUPER_ADMIN') ? (
            <DashboardSuperAdmin onLogout={handleLogout} />
          ) : (
            <DashboardMembro onLogout={handleLogout} />
          )}
          
          {/* UI Toggle restricted by Role */}
          <div className="fixed-bottom p-3 d-flex justify-content-center" style={{ pointerEvents: 'none', zIndex: 2000 }}>
             <div className="bg-dark rounded-pill p-1 shadow-lg border border-secondary d-flex" style={{ pointerEvents: 'auto' }}>
                <button 
                  onClick={() => setView('membro')}
                  className={`btn btn-sm rounded-pill px-3 fw-bold flex-fill ${view === 'membro' ? 'btn-primary' : 'text-white'}`}
                >
                  Membro
                </button>
                <button 
                  onClick={() => setView('admin')}
                  className={`btn btn-sm rounded-pill px-3 fw-bold flex-fill ${view === 'admin' ? 'btn-primary' : 'text-white'}`}
                >
                  Gestor
                </button>
                {user.role === 'SUPER_ADMIN' && (
                  <button 
                    onClick={() => setView('super')}
                    className={`btn btn-sm rounded-pill px-3 fw-bold flex-fill ${view === 'super' ? 'btn-danger' : 'text-white'}`}
                  >
                    Adm
                  </button>
                )}
             </div>
          </div>
        </>
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
