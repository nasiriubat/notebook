import React, { useState, useRef, useEffect } from 'react';
import { Navbar, Nav, Container, Offcanvas } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { MdLightMode, MdDarkMode, MdMenu, MdPerson, MdLogout, MdLogin } from "react-icons/md";
import ChangePasswordModal from './ChangePasswordModal';
import LanguageSwitcher from './LanguageSwitcher';
import { getTranslation } from '../utils/ln';

export default function NavigationBar() {
  const navigate = useNavigate();
  const { logout: authLogout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  const handleLogout = async () => {
    try {
      await authLogout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      <Navbar 
        bg={theme === 'light' ? 'light' : 'dark'} 
        variant={theme === 'light' ? 'light' : 'dark'} 
        expand="lg" 
        className="sticky-top"
      >
        <Container>
          <Navbar.Brand href="/" className={theme === 'light' ? 'text-dark' : 'text-light'}>
            {import.meta.env.VITE_APP_NAME ? import.meta.env.VITE_APP_NAME : 'NoteScholar'}
          </Navbar.Brand>
          <Nav className="ms-auto d-flex align-items-center">
            <div className="d-flex align-items-center gap-2">
              <button
                className={`btn btn-link nav-link ${theme === 'light' ? 'text-dark' : 'text-light'}`}
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <MdDarkMode size={24} /> : <MdLightMode size={24} />}
              </button>
              {/* Mobile Menu Button */}
              <button
                className={`btn btn-link nav-link d-md-none ${theme === 'light' ? 'text-dark' : 'text-light'}`}
                onClick={() => setShowDrawer(true)}
                title={getTranslation('menu')}
              >
                <MdMenu size={24} />
              </button>
              {/* Desktop Menu Items */}
              <div className="d-none d-md-flex align-items-center gap-3">
                <LanguageSwitcher className="me-2" />
                {user ? (
                  <>
                    <button
                      className={`btn btn-link nav-link ${theme === 'light' ? 'text-dark' : 'text-light'}`}
                      onClick={() => setShowChangePassword(true)}
                    >
                      <MdPerson size={24} className="me-1" />
                    </button>
                    <button
                      className="btn btn-link nav-link text-danger"
                      onClick={handleLogout}
                    >
                      <MdLogout size={24} className="me-1" />
                    </button>
                  </>
                ) : (
                  <button
                    className={`btn btn-link nav-link ${theme === 'light' ? 'text-dark' : 'text-light'}`}
                    onClick={() => navigate('/login')}
                  >
                    {getTranslation('login')}
                  </button>
                )}
              </div>
            </div>
          </Nav>
        </Container>
      </Navbar>

      {/* Mobile Drawer */}
      <Offcanvas 
        show={showDrawer} 
        onHide={() => setShowDrawer(false)}
        placement="start"
        className={theme === 'light' ? 'bg-light' : 'bg-dark'}
      >
        <Offcanvas.Header closeButton className={theme === 'light' ? 'text-dark' : 'text-light'}>
          <Offcanvas.Title>{getTranslation('menu')}</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="d-flex flex-column gap-2">
            {user ? (
              <>
                <button
                  className={`btn btn-link nav-link text-start ${theme === 'light' ? 'text-dark' : 'text-light'}`}
                  onClick={() => {
                    setShowChangePassword(true);
                    setShowDrawer(false);
                  }}
                >
                  <MdPerson size={24} className="me-2" />
                  {getTranslation('changePassword')}
                </button>
                <button
                  className="btn btn-link nav-link text-start text-danger"
                  onClick={() => {
                    handleLogout();
                    setShowDrawer(false);
                  }}
                >
                  <MdLogout size={24} className="me-2" />
                  {getTranslation('logout')}
                </button>
              </>
            ) : (
              <button
                className={`btn btn-link nav-link text-start ${theme === 'light' ? 'text-dark' : 'text-light'}`}
                onClick={() => {
                  navigate('/login');
                  setShowDrawer(false);
                }}
              >
                <MdLogin size={24} className="me-2" />
                {getTranslation('login')}
              </button>
            )}
                        <LanguageSwitcher className="mb-3" />

          </div>
        </Offcanvas.Body>
      </Offcanvas>

      <ChangePasswordModal 
        show={showChangePassword} 
        onHide={() => setShowChangePassword(false)} 
      />
      <style>
        {`
          .nav-link {
            padding: 0.5rem;
            text-decoration: none;
          }
          .nav-link:hover {
            opacity: 0.8;
          }
          .offcanvas {
            max-width: 300px;
          }
          .offcanvas-header {
            border-bottom: 1px solid ${theme === 'light' ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.1)'};
          }
          .offcanvas-body .nav-link {
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
          }
          .offcanvas-body .nav-link:hover {
            background-color: ${theme === 'light' ? '#f8f9fa' : '#495057'};
          }
        `}
      </style>
    </>
  );
}
