import React, { useState } from 'react';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { MdLightMode, MdDarkMode, MdPerson, MdMenu, MdClose } from "react-icons/md";
import ChangePasswordModal from './ChangePasswordModal';

export default function NavigationBar() {
  const navigate = useNavigate();
  const { logout: authLogout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

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
            GPT Lab
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link href="/" className={theme === 'light' ? 'text-dark' : 'text-light'}>
                Home
              </Nav.Link>
            </Nav>
            <Nav className="d-flex align-items-center">
              <button
                className={`btn btn-link nav-link me-2 ${theme === 'light' ? 'text-dark' : 'text-light'}`}
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <MdDarkMode size={24} /> : <MdLightMode size={24} />}
              </button>
              <NavDropdown 
                title={<MdPerson size={24} className={theme === 'light' ? 'text-dark' : 'text-light'} />} 
                id="basic-nav-dropdown"
                align="end"
                className="user-dropdown"
              >
                <NavDropdown.Item onClick={() => setShowChangePassword(true)}>
                  Change Password
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>
                  Logout
                </NavDropdown.Item>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <ChangePasswordModal 
        show={showChangePassword} 
        onHide={() => setShowChangePassword(false)} 
      />
      <style>
        {`
          .user-dropdown .dropdown-menu {
            min-width: 200px;
            margin-top: 0.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
            background-color: ${theme === 'light' ? '#fff' : '#343a40'};
            border: 1px solid ${theme === 'light' ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.1)'};
          }
          .user-dropdown .dropdown-item {
            padding: 0.5rem 1rem;
            color: ${theme === 'light' ? '#333' : '#fff'};
          }
          .user-dropdown .dropdown-item:hover {
            background-color: ${theme === 'light' ? '#f8f9fa' : '#495057'};
            color: ${theme === 'light' ? '#000' : '#fff'};
          }
          .user-dropdown .dropdown-divider {
            margin: 0.5rem 0;
            border-color: ${theme === 'light' ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.1)'};
          }
          .nav-link {
            padding: 0.5rem;
          }
          .nav-link:hover {
            opacity: 0.8;
          }
          .user-dropdown .dropdown-toggle {
            padding: 0.5rem;
          }
          .user-dropdown .dropdown-toggle:hover,
          .user-dropdown .dropdown-toggle:focus {
            opacity: 0.8;
          }
          .user-dropdown .dropdown-toggle::after {
            color: ${theme === 'light' ? '#333' : '#fff'};
          }
        `}
      </style>
    </>
  );
}
