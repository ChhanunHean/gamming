import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/sessions', label: 'Sessions', icon: '👥' },
  { to: '/stations', label: 'Stations', icon: '🖥️' },
  { to: '/payments', label: 'Payments', icon: '💳' },
  { to: '/reports', label: 'Reports', icon: '📈' },
];

const managerItems = [
  { to: '/staff', label: 'Staff', icon: '🔐' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
  { to: '/audit', label: 'Audit Logs', icon: '📋' },
];

export default function PortalLayout() {
  const { staff, isManager, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="portal">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>🎮</span>
          <div>
            <strong>Staff Portal</strong>
            <small>Gaming Center</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}

          {isManager && (
            <>
              <div className="nav-divider">Management</div>
              {managerItems.map((item) => (
                <NavLink key={item.to} to={item.to}>
                  <span>{item.icon}</span> {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <strong>{staff?.name}</strong>
            <span className={`role-badge ${staff?.role}`}>{staff?.role}</span>
          </div>
          <button type="button" className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="portal-main">
        <Outlet />
      </main>
    </div>
  );
}
