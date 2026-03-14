import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import api from '../api/axiosConfig';

const ModalSubmeterPagamento = ({ show, onHide, group, onSuccess, invoice, loan }) => {
  const [formData, setFormData] = useState({
    amount: '',
    transactionId: '',
    notes: '',
    paymentMethod: ''
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      if (invoice) {
        setFormData(prev => ({ ...prev, amount: invoice.amount }));
      } else if (loan) {
        setFormData(prev => ({ ...prev, amount: '' })); // Let user choose amount for abatement
      } else if (group) {
        setFormData(prev => ({ ...prev, amount: group.contributionAmount }));
      }
    }
  }, [group, invoice, loan, show]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'proof') {
      setFile(files[0]);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.transactionId && !file) {
      setError('Por favor, digite o ID da transação ou carregue o comprovativo (foto/doc).');
      return;
    }

    setLoading(true);
    setError('');

    const data = new FormData();
    data.append('amount', formData.amount);
    data.append('transactionId', formData.transactionId);
    data.append('groupId', group.id);
    data.append('notes', formData.notes);
    data.append('paymentMethod', formData.paymentMethod);
    if (invoice) {
      data.append('invoiceId', invoice.id);
    }
    if (loan) {
      data.append('loanId', loan.id);
    }
    data.append('proof', file);

    try {
      await api.post('/payments/submit', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setLoading(false);
      onSuccess();
      setFormData({ amount: group?.contributionAmount || '', transactionId: '', notes: '' });
      setFile(null);
      onHide();
      alert('Comprovativo enviado com sucesso! Aguarde a validação do administrador.');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao submeter pagamento.');
      setLoading(false);
    }
  };

  const monthYearLabel = invoice ? new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(new Date(invoice.year, invoice.month - 1)) : '';

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          {loan ? 'Abatimento de Empréstimo' : 'Informar Pagamento'}
          {invoice && <span className="text-primary ms-2 small">({monthYearLabel})</span>}
          {loan && <span className="text-primary ms-2 small">(Capital: {loan.amountRequested} MT)</span>}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        {group && (
          <div className="mb-4 bg-light p-3 rounded-4 border-0">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '10px' }}>Grupo</small>
              <Badge bg="white" text="dark" className="border rounded-pill px-2">{group.name}</Badge>
            </div>
            {loan ? (
               <div className="d-flex justify-content-between align-items-center">
                 <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '10px' }}>Saldo Devedor Atual</small>
                 <span className="fw-black text-danger">{loan.remainingBalance} MT</span>
               </div>
            ) : (
               <div className="d-flex justify-content-between align-items-center">
                 <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '10px' }}>Valor {invoice ? 'da Fatura' : 'Sugerido'}</small>
                 <span className="fw-black text-primary">{formData.amount} MT</span>
               </div>
            )}
            
            {group.paymentMethods?.length > 0 && (
              <div className="mt-3 border-top pt-3">
                <small className="text-muted text-uppercase fw-bold d-block mb-2" style={{ fontSize: '10px' }}>Enviar pagamento para:</small>
                {group.paymentMethods.map((m, i) => (
                  <div key={i} className="mb-2 bg-white p-2 rounded-3 border small">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">{m.type}:</span>
                      <span className="fw-bold text-dark">{m.accountNumber}</span>
                    </div>
                    <div className="d-flex justify-content-between mt-1">
                      <small className="text-muted">Titular:</small>
                      <small className="fw-bold text-dark">{m.accountName}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

          <Form.Group className="mb-3">
            <Form.Label className="text-uppercase small fw-bold opacity-75">Forma de Pagamento</Form.Label>
            <Form.Select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              required
              className="py-3 shadow-none bg-light border-0 rounded-3"
            >
              <option value="">Selecione como pagou...</option>
               {group?.paymentMethods?.map((m, i) => (
                <option key={i} value={m.type}>{m.type} - {m.accountNumber} ({m.accountName})</option>
              ))}
              <option value="Outro">Outro</option>
            </Form.Select>
          </Form.Group>

          <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="text-uppercase small fw-bold opacity-75">Valor Pago (MT)</Form.Label>
            <Form.Control
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              className="py-3 shadow-none bg-light border-0 rounded-3"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="text-uppercase small fw-bold opacity-75">ID da Transação</Form.Label>
            <Form.Control
              type="text"
              name="transactionId"
              value={formData.transactionId}
              onChange={handleChange}
              placeholder="Ex: 50A7HJK8..."
              className="py-3 shadow-none bg-light border-0 rounded-3"
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="text-uppercase small fw-bold opacity-75">Comprovativo (Foto/PDF/Doc)</Form.Label>
            <Form.Control
              type="file"
              name="proof"
              onChange={handleChange}
              accept="image/*,.pdf,.doc,.docx"
              className="py-2 shadow-none border-2 border-dashed rounded-3"
            />
            <div className="d-flex justify-content-between mt-1">
               <small className="text-muted" style={{ fontSize: '11px' }}>Máx 5MB</small>
               {file && <small className="text-success fw-bold" style={{ fontSize: '11px' }}>✓ Selecionado</small>}
            </div>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="text-uppercase small fw-bold opacity-75">Notas (Opcional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Ex: Pagamento referente ao mês de..."
              className="py-3 shadow-none bg-light border-0 rounded-3"
            />
          </Form.Group>

          {error && <Alert variant="danger" className="py-2 small border-0 rounded-3">{error}</Alert>}

          <Button variant="primary" type="submit" className="w-100 py-3 fw-bold rounded-3 shadow-sm" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Confirmar Pagamento'}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default ModalSubmeterPagamento;
