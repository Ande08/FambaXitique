import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Row, Col, Card, Alert } from 'react-bootstrap';
import api from '../api/axiosConfig';

const ModalUpgradePlano = ({ show, onHide, onSuccess }) => {
  const [plans, setPlans] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [step, setStep] = useState(1); // 1: Choose Plan, 2: Payment Details, 3: Upload Proof
  const [loading, setLoading] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [proof, setProof] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      fetchData();
      setStep(1);
      setSelectedPlan(null);
    }
  }, [show]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, methodsRes] = await Promise.all([
        api.get('/plans'),
        api.get('/plans/payment-methods')
      ]);
      setPlans(plansRes.data.filter(p => p.monthlyPrice > 0)); // Only paid plans
      setPaymentMethods(methodsRes.data);
    } catch (err) {
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transactionId && !proof) {
      return setError('Por favor, informe o ID da transação ou anexe o comprovativo.');
    }
    
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('planId', selectedPlan.id);
    formData.append('amount', selectedPlan.monthlyPrice);
    formData.append('transactionId', transactionId);
    formData.append('proof', proof);
    // Add payment method details for snapshot
    const methodStr = paymentMethods.map(m => `${m.type}: ${m.accountNumber} (${m.accountName})`).join(' | ');
    formData.append('paymentMethodDetails', methodStr);

    try {
      await api.post('/plans/upgrade', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Sua solicitação foi enviada! Aguarde a aprovação do Super Admin.');
      onSuccess();
      onHide();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao submeter comprovativo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton className="border-0">
        <Modal.Title className="fw-bold">
          {step === 1 ? 'Escolha seu Plano' : step === 2 ? 'Pagamento' : 'Submeter Comprovativo'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4 pt-0">
        {loading && step === 1 ? (
          <div className="text-center py-5"><Spinner animation="border" /></div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : (
          <>
            {step === 1 && (
              <Row className="g-3">
                {plans.map(plan => (
                  <Col md={6} key={plan.id}>
                    <Card 
                      className={`h-100 border-0 shadow-sm rounded-4 cursor-pointer transition-hover ${selectedPlan?.id === plan.id ? 'border border-primary border-2' : ''}`}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <Card.Body className="p-4">
                        <h4 className="fw-black mb-1">{plan.name}</h4>
                        <h3 className="text-primary fw-black">{plan.monthlyPrice} MT <small className="fs-6 text-muted">/ mês</small></h3>
                        <p className="small text-muted mb-3">{plan.description}</p>
                        <ul className="list-unstyled small mb-0">
                          <li><i className="bi bi-check2 text-success me-2"></i> {plan.groupLimit === -1 ? 'Grupos Ilimitados' : `Até ${plan.groupLimit} Grupos`}</li>
                          <li><i className={`bi ${plan.botEnabled ? 'bi-check2 text-success' : 'bi-x text-danger'} me-2`}></i> Bot WhatsApp</li>
                        </ul>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
                <div className="mt-4 text-end">
                  <Button variant="primary" disabled={!selectedPlan} onClick={() => setStep(2)} className="fw-bold px-4 rounded-3">
                    Continuar
                  </Button>
                </div>
              </Row>
            )}

            {step === 2 && (
              <div>
                <Alert variant="info" className="rounded-4 border-0">
                  <h6 className="fw-bold mb-2">Para ativar o plano {selectedPlan.name}, realize o pagamento de <strong>{selectedPlan.monthlyPrice} MT</strong> para uma das contas abaixo:</h6>
                  <ul className="mb-0">
                    {paymentMethods.map(m => (
                      <li key={m.id} className="mb-2">
                        <strong>{m.type}:</strong> {m.accountNumber} <br/>
                        <small>Titular: {m.accountName}</small>
                      </li>
                    ))}
                  </ul>
                </Alert>
                <div className="mt-4 d-flex justify-content-between">
                  <Button variant="light" onClick={() => setStep(1)} className="rounded-3">Voltar</Button>
                  <Button variant="primary" onClick={() => setStep(3)} className="fw-bold px-4 rounded-3">Já realizei o pagamento</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">ID da Transação (Opcional)</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Ex: 123456789"
                    value={transactionId}
                    onChange={e => setTransactionId(e.target.value)}
                    className="rounded-3 py-2 bg-light border-0"
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold">Anexar Comprovativo (Foto/Screenshot)</Form.Label>
                  <Form.Control 
                    type="file" 
                    accept="image/*"
                    onChange={e => setProof(e.target.files[0])}
                    className="rounded-3 py-2"
                  />
                </Form.Group>
                <div className="d-flex justify-content-between">
                  <Button variant="light" onClick={() => setStep(2)} className="rounded-3">Voltar</Button>
                  <Button variant="success" type="submit" disabled={loading} className="fw-bold px-4 rounded-3">
                    {loading ? <Spinner animation="border" size="sm" /> : 'Confirmar e Enviar'}
                  </Button>
                </div>
              </Form>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default ModalUpgradePlano;
