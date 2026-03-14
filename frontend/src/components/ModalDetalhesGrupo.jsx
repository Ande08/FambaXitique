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
  const [pendingRemovals, setPendingRemovals] = useState([]);
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = group?.adminId === currentUser.id;

  useEffect(() => {
    if (show && group) {
      fetchMembers();
      fetchPendingRemovals();
    }
  }, [show, group]);

  const fetchPendingRemovals = async () => {
    try {
      const res = await api.get(`/groups/${group.id}/pending-removals`);
      setPendingRemovals(res.data);
    } catch (err) {}
  };

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

  const handleRequestRemoval = async (targetUserId) => {
    const reason = prompt('Por que deseja remover este membro?');
    if (!reason) return;

    setActionLoading(targetUserId);
    try {
      await api.post('/groups/request-removal', { 
        groupId: group.id, 
        targetUserId, 
        reason 
      });
      alert('Pedido de remoção enviado. A votação foi iniciada.');
      fetchPendingRemovals();
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao solicitar remoção.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVoteRemoval = async (removalId, vote) => {
    setActionLoading(removalId);
    try {
      const res = await api.post('/groups/vote-removal', { removalId, vote });
      alert(res.data.message);
      if (res.data.status === 'approved') {
        fetchMembers(); // Target was removed
      }
      fetchPendingRemovals();
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao votar.');
    } finally {
      setActionLoading(null);
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
                    <div className="d-flex align-items-center gap-2">
                      <Badge bg={member.Membership?.role === 'ADMIN' ? 'dark' : 'light'} text={member.Membership?.role === 'ADMIN' ? 'white' : 'dark'} className="rounded-pill px-3 py-2 border">
                        {member.Membership?.role === 'ADMIN' ? 'Admin' : 'Membro'}
                      </Badge>
                      {isAdmin && member.id !== currentUser.id && (
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          className="rounded-pill px-2 py-1"
                          onClick={(e) => { e.stopPropagation(); handleRequestRemoval(member.id); }}
                          disabled={actionLoading === member.id}
                        >
                          <i className="bi bi-person-x"></i>
                        </Button>
                      )}
                    </div>
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
                      
                      {pendingRemovals.length > 0 && (
                        <Tab eventKey="removals" title={`Votações (${pendingRemovals.length})`}>
                          <div className="py-3">
                            <h6 className="fw-bold mb-3 small text-uppercase opacity-75">Processos de Remoção Pendentes</h6>
                            {pendingRemovals.map(rem => (
                              <Card key={rem.id} className="border shadow-none mb-2 rounded-3">
                                <Card.Body className="p-3 d-flex justify-content-between align-items-center">
                                  <div>
                                    <span className="fw-bold d-block">Remover: {rem.Target?.firstName} {rem.Target?.lastName}</span>
                                    <small className="text-muted">Motivo: {rem.reason || 'Não informado'}</small>
                                    <div className="mt-1">
                                      <Badge bg="info" className="me-2">{rem.Votes?.filter(v => v.vote === 'approve').length} Sim</Badge>
                                      <Badge bg="secondary">{rem.Votes?.filter(v => v.vote === 'reject').length} Não</Badge>
                                    </div>
                                  </div>
                                  {rem.targetUserId !== currentUser.id && !rem.Votes?.find(v => v.userId === currentUser.id) && (
                                    <div className="d-flex gap-2">
                                      <Button variant="success" size="sm" onClick={() => handleVoteRemoval(rem.id, 'approve')} disabled={actionLoading === rem.id}>Aprovar</Button>
                                      <Button variant="danger" size="sm" onClick={() => handleVoteRemoval(rem.id, 'reject')} disabled={actionLoading === rem.id}>Rejeitar</Button>
                                    </div>
                                  )}
                                </Card.Body>
                              </Card>
                            ))}
                          </div>
                        </Tab>
                      )}
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
