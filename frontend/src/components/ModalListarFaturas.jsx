import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import api from '../api/axiosConfig';

const ModalListarFaturas = ({ show, onHide, group, onSelectInvoice }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && group) {
      fetchInvoices();
    }
  }, [show, group]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/invoices/group/${group.id}`);
      // Show only unpaid invoices as requested
      const unpaid = res.data.filter(i => i.status !== 'paid');
      setInvoices(unpaid);
    } catch (err) {
      console.error('Erro ao buscar faturas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (paymentId) => {
    try {
      const response = await api.get(`/payments/receipt/${paymentId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Recibo_${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Erro ao baixar recibo:', err);
      alert('Recibo ainda não disponível ou erro no download.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid': return <Badge bg="success" className="rounded-pill px-3">Pago</Badge>;
      case 'overdue': return <Badge bg="danger" className="rounded-pill px-3">Vencida</Badge>;
      default: return <Badge bg="warning" text="dark" className="rounded-pill px-3">Pendente</Badge>;
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered className="modal-mobile-fluid">
      <Modal.Header closeButton className="border-0">
        <Modal.Title className="fw-bold h5">Faturas: {group?.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-3 p-md-4 pt-0">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : invoices.length === 0 ? (
          <Alert variant="info" className="border-0 rounded-4 shadow-sm text-center">
            Nenhuma fatura encontrada.
          </Alert>
        ) : (
          <div className="table-responsive rounded-4 border overflow-hidden shadow-sm bg-white">
            <Table hover className="mb-0 overflow-hidden" style={{ minWidth: '600px' }}>
              <thead className="bg-light">
                <tr className="small text-uppercase fw-bold text-muted">
                  <th className="px-3 px-md-4 py-3">Mês</th>
                  <th className="px-3 px-md-4 py-3">Vencimento</th>
                  <th className="px-3 px-md-4 py-3">Valor</th>
                  <th className="px-3 px-md-4 py-3">Status</th>
                  <th className="px-3 px-md-4 py-3 text-end">Ação</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="align-middle">
                    <td className="px-3 px-md-4 py-3 fw-bold">
                      {new Intl.DateTimeFormat('pt-PT', { month: 'short', year: 'numeric' }).format(new Date(invoice.year, invoice.month - 1))}
                    </td>
                    <td className="px-3 px-md-4 py-3 text-muted" style={{fontSize: '0.85rem'}}>
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 px-md-4 py-3 fw-black text-primary">
                      {invoice.amount} MT
                    </td>
                    <td className="px-3 px-md-4 py-3">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-3 px-md-4 py-3 text-end">
                      {invoice.status !== 'paid' ? (
                        <Button 
                          variant="primary" 
                          size="sm" 
                          className="fw-bold rounded-pill px-3 px-md-4"
                          onClick={() => onSelectInvoice(invoice)}
                        >
                          Pagar
                        </Button>
                      ) : (
                        <div className="d-flex flex-column align-items-end">
                          <span className="text-success small fw-bold">Liquidado</span>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 text-primary small fw-bold text-decoration-none"
                            onClick={async () => {
                              try {
                                const res = await api.get(`/payments/user/${JSON.parse(localStorage.getItem('user')).id}/group/${group.id}`);
                                const payment = res.data.find(p => p.invoiceId === invoice.id && p.status === 'approved');
                                if (payment) handleDownloadReceipt(payment.id);
                                else alert('Pagamento não localizado.');
                              } catch (e) {
                                alert('Erro ao buscar recibo.');
                              }
                            }}
                          >
                            Recibo
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="border-0 pb-4 pe-4">
        <Button variant="dark" onClick={onHide} className="fw-bold px-4 rounded-3">Fechar</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalListarFaturas;
