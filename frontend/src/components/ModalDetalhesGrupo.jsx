import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Spinner, Badge, Accordion, Tabs, Tab, Form } from 'react-bootstrap';
import api from '../api/axiosConfig';

const ModalDetalhesGrupo = ({ show, onHide, group }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(null); // userId
  const [invoiceLoading, setInvoiceLoading] = useState(null); // userId
  const [paymentHistory, setPaymentHistory] = useState({}); // userId -> payments array
  const [userInvoices, setUserInvoices] = useState({}); // userId -> invoices array
  const [invoiceFilter, setInvoiceFilter] = useState('all');

  useEffect(() => {
    if (show && group) {
      fetchMembers();
    }
  }, [show, group]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/groups/${group.id}`);
      setMembers(res.data.Members || []);
    } catch (err) {
      console.error('Erro ao buscar membros:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDataForMember = (userId) => {
    fetchUserHistory(userId);
    fetchUserInvoices(userId);
  };

  const fetchUserHistory = async (userId) => {
    if (paymentHistory[userId]) return; // Already fetched

    setHistoryLoading(userId);
    try {
      const res = await api.get(`/payments/user/${userId}/group/${group.id}`);
      setPaymentHistory(prev => ({ ...prev, [userId]: res.data }));
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    } finally {
      setHistoryLoading(null);
    }
  };

  const fetchUserInvoices = async (userId) => {
    if (userInvoices[userId]) return;

    setInvoiceLoading(userId);
    try {
      const res = await api.get(`/invoices/user/${userId}/group/${group.id}`);
      setUserInvoices(prev => ({ ...prev, [userId]: res.data }));
    } catch (err) {
      console.error('Erro ao buscar faturas:', err);
    } finally {
      setInvoiceLoading(null);
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

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="border-0">
        <Modal.Title className="fw-bold">Membros do Grupo: {group?.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4 pt-0">
        {group && (
          <div className="bg-light p-3 rounded-4 mb-4 border-0 d-flex justify-content-around text-center">
            <div>
              <small className="text-muted text-uppercase fw-bold d-block" style={{ fontSize: '10px' }}>Saldo em Caixa</small>
              <h5 className="fw-black text-success mb-0">{group.balance} MT</h5>
            </div>
            <div className="border-start border-2 opacity-25 mx-2"></div>
            <div>
              <small className="text-muted text-uppercase fw-bold d-block" style={{ fontSize: '10px' }}>Lucro (Juros)</small>
              <h5 className="fw-black text-info mb-0">
                {Number(group.Loans?.reduce((sum, l) => sum + (l.status === 'approved' || l.status === 'settled' ? (l.totalToRepay - l.amountRequested) : 0), 0)).toFixed(2)} MT
              </h5>
            </div>
            <div className="border-start border-2 opacity-25 mx-2"></div>
            <div>
              <small className="text-muted text-uppercase fw-bold d-block" style={{ fontSize: '10px' }}>Taxa de Juro</small>
              <h5 className="fw-black text-dark mb-0">{group.loanInterestRate || 10}%</h5>
            </div>
          </div>
        )}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          <Accordion className="rounded-4 overflow-hidden border-0 shadow-sm">
            {members.map((member) => (
              <Accordion.Item eventKey={member.id} key={member.id} className="border-0 border-bottom">
                <Accordion.Header onClick={() => fetchDataForMember(member.id)}>
                  <div className="d-flex justify-content-between align-items-center w-100 me-3 py-2">
                    <div className="text-start">
                      <span className="fw-bold d-block text-dark">{member.firstName} {member.lastName}</span>
                      <small className="text-muted d-block" style={{ fontSize: '12px' }}>{member.phone}</small>
                    </div>
                    <Badge bg={member.Membership?.role === 'ADMIN' ? 'dark' : 'light'} text={member.Membership?.role === 'ADMIN' ? 'white' : 'dark'} className="rounded-pill px-3 py-2 border">
                      {member.Membership?.role === 'ADMIN' ? 'Admin' : 'Membro'}
                    </Badge>
                  </div>
                </Accordion.Header>
                <Accordion.Body className="bg-light p-0">
                  <div className="bg-white p-3 border-top">
                    <Tabs defaultActiveKey="history" className="mb-3 custom-tabs">
                      <Tab eventKey="history" title="Histórico de Pagamentos">
                        <div className="py-2">
                          <div className="d-flex justify-content-between align-items-center mb-3 px-1">
                            <h6 className="fw-bold mb-0 small text-uppercase opacity-75">Pagamentos Aprovados</h6>
                            {historyLoading === member.id && <Spinner animation="border" size="sm" variant="primary" />}
                          </div>
                          
                          {paymentHistory[member.id]?.length > 0 ? (
                            <div className="table-responsive rounded-3 border overflow-hidden">
                              <Table size="sm" hover className="small mb-0">
                                <thead className="bg-light">
                                  <tr>
                                    <th className="px-3 py-2 border-0">Data</th>
                                    <th className="px-3 py-2 border-0">Fatura</th>
                                    <th className="px-3 py-2 border-0">Conta</th>
                                    <th className="px-3 py-2 border-0">Valor</th>
                                    <th className="px-3 py-2 border-0 text-end">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {paymentHistory[member.id].map(p => (
                                    <tr key={p.id}>
                                      <td className="px-3 py-2">{new Date(p.createdAt).toLocaleDateString()}</td>
                                      <td className="px-3 py-2 fw-bold text-dark">
                                        {p.Invoice ? new Intl.DateTimeFormat('pt-PT', { month: 'short', year: 'numeric' }).format(new Date(p.Invoice.year, p.Invoice.month - 1)) : '-'}
                                      </td>
                                      <td className="px-3 py-2 text-muted small">
                                        {p.paymentMethod || (p.transactionId ? p.transactionId.substring(0,8) : '-')}
                                      </td>
                                      <td className="px-3 py-2 fw-black text-primary">{p.amount} MT</td>
                                      <td className="px-3 py-2 text-end">
                                        <Badge bg={p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'} className="rounded-pill px-2">
                                          {p.status === 'approved' ? 'Aprovado' : p.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                                        </Badge>
                                        {p.status === 'approved' && (
                                          <Button 
                                            variant="link" 
                                            size="sm" 
                                            className="p-0 ms-2 text-primary"
                                            onClick={() => handleDownloadReceipt(p.id)}
                                          >
                                            <i className="bi bi-download"></i>
                                          </Button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            </div>
                          ) : historyLoading !== member.id && (
                            <div className="text-center py-4 bg-light rounded-3 border dashed">
                              <p className="text-muted small mb-0">Nenhum pagamento registrado.</p>
                            </div>
                          )}
                        </div>
                      </Tab>
                      
                      <Tab eventKey="invoices" title="Faturas">
                        <div className="py-2">
                          <div className="d-flex justify-content-between align-items-center mb-3 px-1">
                            <h6 className="fw-bold mb-0 small text-uppercase opacity-75">Estado das Faturas</h6>
                            <Form.Select 
                              size="sm" 
                              className="w-auto shadow-none border-0 bg-light fw-bold text-muted"
                              value={invoiceFilter}
                              onChange={(e) => setInvoiceFilter(e.target.value)}
                            >
                              <option value="all">Todas</option>
                              <option value="pending">Pendentes</option>
                              <option value="paid">Pagas</option>
                              <option value="overdue">Atrasadas</option>
                            </Form.Select>
                          </div>

                          {invoiceLoading === member.id ? (
                            <div className="text-center py-4">
                              <Spinner animation="border" size="sm" variant="primary" />
                            </div>
                          ) : userInvoices[member.id]?.filter(inv => invoiceFilter === 'all' || inv.status === invoiceFilter).length > 0 ? (
                            <div className="table-responsive rounded-3 border overflow-hidden">
                              <Table size="sm" hover className="small mb-0">
                                <thead className="bg-light">
                                  <tr>
                                    <th className="px-3 py-2 border-0">Mês</th>
                                    <th className="px-3 py-2 border-0 text-center">Vencimento</th>
                                    <th className="px-3 py-2 border-0 text-center">Valor</th>
                                    <th className="px-3 py-2 border-0 text-end">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {userInvoices[member.id]
                                    .filter(inv => invoiceFilter === 'all' || inv.status === invoiceFilter)
                                    .map(inv => (
                                    <tr key={inv.id}>
                                      <td className="px-3 py-2 fw-bold text-dark">
                                        {new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(new Date(inv.year, inv.month - 1))}
                                      </td>
                                      <td className="px-3 py-2 text-center text-muted">
                                        {new Date(inv.dueDate).toLocaleDateString()}
                                      </td>
                                      <td className="px-3 py-2 text-center fw-black">{inv.amount} MT</td>
                                      <td className="px-3 py-2 text-end">
                                        <Badge 
                                          bg={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : 'warning'} 
                                          className="rounded-pill px-2"
                                        >
                                          {inv.status === 'paid' ? 'Pago' : inv.status === 'overdue' ? 'Atrasada' : 'Pendente'}
                                        </Badge>
                                        {inv.status === 'paid' && (
                                          <Button 
                                            variant="link" 
                                            size="sm" 
                                            className="p-0 ms-2 text-primary"
                                            onClick={() => {
                                              const payment = paymentHistory[member.id]?.find(p => p.invoiceId === inv.id && p.status === 'approved');
                                              if (payment) handleDownloadReceipt(payment.id);
                                              else alert('Recibo não encontrado.');
                                            }}
                                          >
                                            <i className="bi bi-download"></i>
                                          </Button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            </div>
                          ) : (
                            <div className="text-center py-4 bg-light rounded-3 border dashed">
                              <p className="text-muted small mb-0">Nenhuma fatura encontrada com este filtro.</p>
                            </div>
                          )}
                        </div>
                      </Tab>
                    </Tabs>
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        )}
      </Modal.Body>
      <Modal.Footer className="border-0 pb-4 pe-4">
        <Button variant="dark" onClick={onHide} className="fw-bold px-4 rounded-3">Fechar</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalDetalhesGrupo;
