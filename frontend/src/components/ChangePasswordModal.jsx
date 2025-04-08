import React, { useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { getTranslation } from '../utils/ln';

export default function ChangePasswordModal({ show, onHide }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const { changePassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError(getTranslation('passwordsDoNotMatch'));
      return;
    }

    try {
      setLoading(true);
      await changePassword(oldPassword, newPassword);
      setSuccess(getTranslation('passwordChanged'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(onHide, 2000);
    } catch (err) {
      setError(err.response?.data?.error || getTranslation('failedToChangePassword'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{getTranslation('changePassword')}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          
          <Form.Group className="mb-3">
            <Form.Label>{getTranslation('currentPassword')}</Form.Label>
            <Form.Control
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{getTranslation('newPassword')}</Form.Label>
            <Form.Control
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{getTranslation('confirmNewPassword')}</Form.Label>
            <Form.Control
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            {getTranslation('cancel')}
          </Button>
          <Button 
            variant="primary" 
            type="submit"
            disabled={loading}
          >
            {loading ? getTranslation('changingPassword') : getTranslation('changePasswordButton')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
} 