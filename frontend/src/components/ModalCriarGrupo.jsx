import React, { useState } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import api from '../api/axiosConfig';

const ModalCriarGrupo = ({ show, onHide, onSuccess }) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/groups', formData);
      setLoading(false); // Reset before alert
      onSuccess();
      setFormData({ name: '', description: '' });
      onHide();
      alert('Pedido de criação enviado! Aguarde a aprovação do Admin Supremo.');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar grupo.');
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold">Novo Grupo de Xitique</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="text-uppercase small fw-bold opacity-75">Nome do Grupo</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Ex: Xitique da Família"
              className="py-2 shadow-none"
            />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label className="text-uppercase small fw-bold opacity-75">Descrição (Opcional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descreva o objetivo do grupo..."
              className="py-2 shadow-none"
            />
          </Form.Group>
          {error && <p className="text-danger small mb-3">{error}</p>}
          <Button variant="primary" type="submit" className="w-100 py-2 fw-bold" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Solicitar Criação'}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default ModalCriarGrupo;
