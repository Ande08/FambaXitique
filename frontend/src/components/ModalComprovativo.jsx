import React from 'react';
import { Modal, Button, Row, Col, Badge, Spinner } from 'react-bootstrap';

const ModalComprovativo = ({ payment, onClose, onAction, loading }) => {
  if (!payment) return null;

  const imageUrl = payment.proofImage 
    ? (payment.proofImage.startsWith('http') ? payment.proofImage : `http://localhost:5000/${payment.proofImage.replace(/\\/g, '/')}`)
    : null;

  return (
    <Modal show={!!payment} onHide={onClose} size="lg" centered rounded="4">
      <Modal.Header closeButton className="bg-light border-0">
        <Modal.Title className="fw-bold h5">Validar Pagamento</Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="p-4 pt-2">
        <div className="text-center mb-4 bg-dark rounded-4 overflow-hidden shadow-inner d-flex align-items-center justify-content-center" style={{ minHeight: '320px' }}>
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt="Comprovativo" 
              className="img-fluid rounded-3"
              style={{ maxHeight: '500px', cursor: 'zoom-in' }}
              onClick={() => window.open(imageUrl, '_blank')}
            />
          ) : (
            <div className="text-white p-5">
              <div className="display-1 mb-3 opacity-25">📄</div>
              <h5 className="fw-bold text-uppercase tracking-wide">Sem Anexo Digital</h5>
              <p className="small text-muted mb-0">Esta transação foi informada apenas com o ID: <span className="text-white">{payment.transactionId}</span></p>
            </div>
          )}
        </div>
        
        <Row className="g-3 mb-4">
          <Col xs={6}>
            <div className="bg-light p-3 rounded-3 border-0">
              <label className="text-uppercase text-muted fw-bold small d-block mb-1">Membro</label>
              <span className="fw-bold text-dark">{payment.User ? `${payment.User.firstName} ${payment.User.lastName}` : 'Desconhecido'}</span>
            </div>
          </Col>
          <Col xs={6}>
            <div className="bg-light p-3 rounded-3 border-0">
              <label className="text-uppercase text-muted fw-bold small d-block mb-1">Valor</label>
              <span className="fw-bold text-dark">{payment.amount} MT</span>
            </div>
          </Col>
          <Col xs={6}>
            <div className="bg-light p-3 rounded-3 border-0">
              <label className="text-uppercase text-muted fw-bold small d-block mb-1">Transação ID</label>
              <code className="fw-bold text-primary">{payment.transactionId || 'N/A'}</code>
            </div>
          </Col>
          <Col xs={6}>
            <div className="bg-light p-3 rounded-3 border-0">
              <label className="text-uppercase text-muted fw-bold small d-block mb-1">Forma de Pagamento</label>
              <span className="fw-bold text-dark">{payment.paymentMethod || 'Não especificada'}</span>
            </div>
          </Col>
          <Col xs={6}>
            <div className="bg-light p-3 rounded-3 border-0">
              <label className="text-uppercase text-muted fw-bold small d-block mb-1">Grupo</label>
              <span className="fw-bold text-dark">{payment.Group?.name || 'N/A'}</span>
            </div>
          </Col>
          {payment.notes && (
            <Col xs={12}>
              <div className="bg-light p-3 rounded-3 border-0">
                <label className="text-uppercase text-muted fw-bold small d-block mb-1">Notas do Membro</label>
                <p className="small mb-0 text-dark">{payment.notes}</p>
              </div>
            </Col>
          )}

          {payment.Invoice && (
            <Col xs={12}>
              <div className="bg-primary bg-opacity-10 p-3 rounded-3 border-primary border-opacity-25 border">
                <label className="text-uppercase text-primary fw-bold small d-block mb-1">Pagamento Referente a:</label>
                <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-primary">
                        {new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(new Date(payment.Invoice.year, payment.Invoice.month - 1))}
                    </span>
                    <small className="text-muted font-monospace" style={{ fontSize: '10px' }}>Ref: {payment.Invoice.id.split('-')[0].toUpperCase()}</small>
                </div>
              </div>
            </Col>
          )}
        </Row>
        
        <Row className="g-3">
          <Col>
            <Button
              variant="outline-danger"
              className="w-100 py-3 fw-bold border-2"
              onClick={() => onAction(payment.id, 'reject')}
              disabled={loading}
            >
              {loading ? <Spinner animation="border" size="sm" /> : 'Rejeitar'}
            </Button>
          </Col>
          <Col>
            <Button
              variant="primary"
              className="w-100 py-3 fw-bold shadow-sm"
              onClick={() => onAction(payment.id, 'approve')}
              disabled={loading}
            >
              {loading ? <Spinner animation="border" size="sm" className="me-2" /> : 'Aprovar Pagamento'}
            </Button>
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
};

export default ModalComprovativo;
