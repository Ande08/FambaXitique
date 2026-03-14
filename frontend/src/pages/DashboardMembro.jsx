import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import ModalComprovativo from '../components/ModalComprovativo'; // Though not used here yet
import ModalCriarGrupo from '../components/ModalCriarGrupo';
import ModalSubmeterPagamento from '../components/ModalSubmeterPagamento';
import ModalDetalhesGrupo from '../components/ModalDetalhesGrupo';
import ModalListarFaturas from '../components/ModalListarFaturas';
import ModalRelatorioGrupo from '../components/ModalRelatorioGrupo';
import ModalUpgradePlano from '../components/ModalUpgradePlano';
import { Container, Row, Col, Card, Button, Badge, Form, Modal, Spinner, Stack } from 'react-bootstrap';

const DashboardMembro = ({ onLogout }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loans, setLoans] = useState([]);
  const [showLoanRequestModal, setShowLoanRequestModal] = useState(false);
  const [loanFormData, setLoanFormData] = useState({ amountRequested: '', notes: '' });
  const [requestingLoan, setRequestingLoan] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGroups();
    fetchLoans();
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await api.get('/plans/my-subscription');
      setSubscription(res.data);
    } catch (err) {}
  };

  const fetchLoans = async () => {
    try {
      // For simplicity, let's fetch all loans for the user
      // or we can fetch per group. Let's do a general fetch if endpoint exists, 
      // or just fetch when selectedGroup changes. 
      // Better: Fetch all loans to show a summary list.
      const res = await api.get('/loans/pending'); // This gets pending, let's add getUserLoans
    } catch (err) {}
  };

  const fetchUserLoansInGroup = async (groupId) => {
    try {
      const res = await api.get(`/loans/group/${groupId}`);
      setLoans(res.data);
    } catch (err) {
      console.error('Erro ao buscar empréstimos:', err);
    }
  };

  const handleRequestLoan = async (e) => {
    e.preventDefault();
    setRequestingLoan(true);
    try {
      await api.post('/loans/request', { 
        groupId: selectedGroup.id, 
        amountRequested: loanFormData.amountRequested,
        notes: loanFormData.notes
      });
      setRequestingLoan(false);
      setShowLoanRequestModal(false);
      setLoanFormData({ amountRequested: '', notes: '' });
      fetchUserLoansInGroup(selectedGroup.id);
      alert('Solicitação de empréstimo enviada!');
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao solicitar empréstimo');
      setRequestingLoan(false);
    }
  };
  
  const handleVote = async (loanId, vote) => {
    try {
      await api.post(`/loans/vote/${loanId}`, { vote });
      alert('Voto registrado com sucesso!');
      fetchGroups();
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao votar no empréstimo.');
    }
  };

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/groups');
      setGroups(res.data);
    } catch (err) {
      console.error('Erro ao carregar grupos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    setJoining(true);
    setError('');
    try {
      await api.post('/groups/join', { code: joinCode });
      setJoining(false); // Reset before alert
      setShowJoinModal(false);
      setJoinCode('');
      fetchGroups();
      alert('Entrou no grupo com sucesso!');
    } catch (err) {
      setError(err.response?.data?.message || 'Código inválido ou expirado.');
      setJoining(false);
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
    <div className="bg-light min-vh-100">
      <NavbarSimple onLogout={onLogout} btnText="Sair" />

      <Container className="py-4">
        <Row className="mb-4 align-items-center">
          <Col>
            <div className="d-flex align-items-center gap-3">
              <h1 className="h3 fw-bold text-dark mb-1">Meus Grupos</h1>
              {subscription ? (
                <Badge bg="success" className="rounded-pill px-3 py-2">
                  Plano: {subscription.Plan?.name} 
                  {subscription.endDate && ` (Até ${new Date(subscription.endDate).toLocaleDateString()})`}
                </Badge>
              ) : (
                <Badge bg="secondary" className="rounded-pill px-3 py-2">Plano: Grátis</Badge>
              )}
              <Button 
                variant="link" 
                size="sm" 
                className="text-primary fw-bold p-0 text-decoration-none"
                onClick={() => setShowUpgradeModal(true)}
              >
                Fazer Upgrade
              </Button>
            </div>
            <p className="text-muted small">Gerencie suas participações no xitique.</p>
          </Col>
          <Col xs="auto">
            <Button 
                variant="outline-dark" 
                className="fw-bold px-3 rounded-3 me-2"
                onClick={() => setShowCreateModal(true)}
            >
              Criar Grupo
            </Button>
            <Button 
                variant="primary" 
                className="fw-bold px-4 rounded-3 shadow-sm"
                onClick={() => setShowJoinModal(true)}
            >
              Entrar em Grupo
            </Button>
          </Col>
        </Row>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          <Row className="g-4">
            {groups.length === 0 ? (
              <Col xs={12}>
                <Card className="border-0 shadow-sm p-5 text-center rounded-4">
                  <div className="mb-3 display-6">👋</div>
                  <h3 className="h5 fw-bold">Nenhum grupo encontrado</h3>
                  <p className="text-muted">Você ainda não faz parte de nenhum grupo de xitique.</p>
                  <div className="mt-2">
                    <Button variant="outline-primary" onClick={() => setShowJoinModal(true)}>
                        Inserir Código de Convite
                    </Button>
                  </div>
                </Card>
              </Col>
            ) : (
              groups.map(group => (
                <Col md={6} lg={4} key={group.id}>
                  <Card className="border-0 shadow-sm rounded-4 h-100 transition-hover">
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <Badge bg={group.Members?.[0]?.Membership?.role === 'ADMIN' ? 'dark' : 'primary'} className="px-3 py-2 rounded-pill me-2">
                          {group.Members?.[0]?.Membership?.role === 'ADMIN' ? 'Administrador' : 'Membro'}
                        </Badge>
                        {group.status === 'pending' && (
                          <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill fw-bold">
                            Aguardando Aprovação
                          </Badge>
                        )}
                      </div>
                      <Card.Title className="fw-bold h5 mb-2">{group.name}</Card.Title>
                      <Card.Text className="text-muted small mb-4">
                        {group.description || 'Sem descrição.'}
                      </Card.Text>
                      <div className="border-top pt-3 mt-auto">
                        <div className="row g-3 mb-4">
                          <div className="col-6">
                            <span className="text-muted d-block small uppercase fw-bold" style={{fontSize: '9px'}}>Contribuição</span>
                            <span className="fw-black text-primary d-block small">
                              {group.contributionAmount} MT 
                              <span className="text-muted fw-normal ms-1">({group.contributionFrequency === 'daily' ? 'Diário' : group.contributionFrequency === 'weekly' ? 'Semanal' : 'Mensal'})</span>
                            </span>
                          </div>
                          <div className="col-6">
                            <span className="text-muted d-block small uppercase fw-bold" style={{fontSize: '9px'}}>Saldo em Caixa</span>
                            <span className="fw-black text-success d-block small">{group.status === 'pending' ? '---' : `${group.balance} MT`}</span>
                          </div>
                          
                          {group.status !== 'pending' && (() => {
                              const activeSettledLoans = group.Loans?.filter(l => l.status === 'approved' || l.status === 'settled') || [];
                              const totalInterestRealized = activeSettledLoans.reduce((sum, l) => {
                                  const totalInterest = Number(l.totalToRepay) - Number(l.amountRequested);
                                  const percentagePaid = (Number(l.totalToRepay) - Number(l.remainingBalance)) / Number(l.totalToRepay);
                                  return sum + (totalInterest * percentagePaid);
                              }, 0);
                              const totalInterestPending = activeSettledLoans.reduce((sum, l) => {
                                  const totalInterest = Number(l.totalToRepay) - Number(l.amountRequested);
                                  const percentagePending = Number(l.remainingBalance) / Number(l.totalToRepay);
                                  return sum + (totalInterest * percentagePending);
                              }, 0);
                              
                              return (
                                  <>
                                    <div className="col-6">
                                        <span className="text-muted d-block small uppercase fw-bold" style={{fontSize: '9px'}}>Juros Recebidos</span>
                                        <span className="fw-black text-success d-block small">{totalInterestRealized.toFixed(2)} MT</span>
                                    </div>
                                    <div className="col-6">
                                        <span className="text-muted d-block small uppercase fw-bold" style={{fontSize: '9px'}}>Juros a Receber</span>
                                        <span className="fw-black text-warning d-block small">{totalInterestPending.toFixed(2)} MT</span>
                                    </div>
                                  </>
                              );
                          })()}
                        </div>

                        <div className="d-flex flex-wrap gap-2 pt-2">
                          <Button 
                            variant="light" 
                            size="sm" 
                            className="fw-bold rounded-pill px-3 flex-fill"
                            disabled={group.status === 'pending'}
                            onClick={() => { 
                              setSelectedGroup(group); 
                              setShowDetailsModal(true); 
                              fetchUserLoansInGroup(group.id);
                            }}
                          >
                            {group.status === 'pending' ? 'Bloqueado' : 'Detalhes'}
                          </Button>
                          
                          {group.status === 'active' && (
                            <>
                              <Button 
                                variant="primary" 
                                size="sm" 
                                className="fw-bold rounded-pill px-3 flex-fill"
                                onClick={() => { setSelectedGroup(group); setShowInvoicesModal(true); }}
                              >
                                Pagar
                              </Button>
                              <Button 
                                variant="outline-primary" 
                                size="sm" 
                                className="fw-bold rounded-pill px-3 flex-fill"
                                onClick={() => { setSelectedGroup(group); setShowLoanRequestModal(true); }}
                              >
                                Crédito
                              </Button>
                              <Button 
                                variant="outline-info" 
                                size="sm" 
                                className="fw-bold rounded-pill px-3 flex-fill"
                                onClick={() => { setSelectedGroup(group); setShowReportModal(true); }}
                              >
                                Relatório
                              </Button>
                              {group.Loans?.some(l => l.status === 'pending') && (
                                <Button 
                                  variant="warning" 
                                  size="sm" 
                                  className="fw-bold rounded-pill px-3 flex-fill position-relative"
                                  onClick={() => { setSelectedGroup(group); setShowVotingModal(true); }}
                                >
                                  Votar 
                                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{fontSize: '8px'}}>
                                    {group.Loans.filter(l => l.status === 'pending').length}
                                  </span>
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))
            )}
          </Row>
        )}

        {/* Active Loans Section */}
        {loans.length > 0 && (
          <div className="mt-5">
            <h5 className="fw-bold mb-3">Meus Empréstimos Ativos</h5>
            <Row className="g-3">
              {loans.filter(l => l.status === 'approved' || l.status === 'pending').map(loan => (
                <Col md={6} key={loan.id}>
                  <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                          <small className="text-muted text-uppercase fw-bold d-block" style={{ fontSize: '10px' }}>Saldo Devedor</small>
                          <h4 className="fw-black text-danger mb-0">{loan.remainingBalance} MT</h4>
                        </div>
                        <Badge bg={loan.status === 'pending' ? 'warning' : 'primary'} className="rounded-pill px-3 py-2">
                          {loan.status === 'pending' ? 'Pendente' : 'Ativo'}
                        </Badge>
                      </div>
                      
                      {loan.status === 'approved' && (
                        <>
                          <div className="mb-2 d-flex justify-content-between">
                            <small className="text-muted">Progresso de Pagamento</small>
                            <small className="fw-bold text-dark">
                              {Math.round((1 - loan.remainingBalance / loan.totalToRepay) * 100)}%
                            </small>
                          </div>
                          <div className="progress mb-4" style={{ height: '8px', borderRadius: '4px' }}>
                            <div 
                              className="progress-bar bg-primary" 
                              role="progressbar" 
                              style={{ width: `${(1 - loan.remainingBalance / loan.totalToRepay) * 100}%` }}
                            ></div>
                          </div>
                          <Button 
                            variant="dark" 
                            className="w-100 fw-bold rounded-3" 
                            size="sm"
                            onClick={() => {
                              setSelectedLoan(loan);
                              setSelectedGroup(groups.find(g => g.id === loan.groupId));
                              setShowPaymentModal(true);
                            }}
                          >
                            Abater Dívida
                          </Button>
                        </>
                      )}
                      
                      {loan.status === 'pending' && (
                        <p className="text-muted small mb-0 italic">Aguardando aprovação do administrador do grupo.</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Container>

      {/* Join Group Modal */}
      <Modal show={showJoinModal} onHide={() => setShowJoinModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">Entrar em um Grupo</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 pt-2">
          <p className="text-muted small mb-4">Insira o código de 6 dígitos fornecido pelo administrador do grupo.</p>
          <Form onSubmit={handleJoinGroup}>
            <Form.Group className="mb-4">
              <Form.Label className="text-uppercase small fw-bold opacity-75">Código de Convite</Form.Label>
              <Form.Control 
                type="text" 
                maxLength="6"
                placeholder="Ex: 123456"
                className="py-3 text-center h3 fw-black tracking-widest bg-light border-0 rounded-3 shadow-none focus-none"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                required
              />
              {error && <div className="text-danger small mt-2 fw-bold text-center">{error}</div>}
            </Form.Group>
            <Button 
                variant="primary" 
                type="submit" 
                className="w-100 py-3 fw-bold rounded-3 shadow-sm"
                disabled={joining || joinCode.length !== 6}
            >
              {joining ? <Spinner animation="border" size="sm" /> : 'Confirmar Entrada'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      <ModalCriarGrupo 
        show={showCreateModal} 
        onHide={() => setShowCreateModal(false)} 
        onSuccess={fetchGroups} 
      />

      <ModalSubmeterPagamento 
        show={showPaymentModal} 
        onHide={() => { 
          setShowPaymentModal(false); 
          setSelectedInvoice(null); 
          setSelectedLoan(null); 
        }} 
        group={selectedGroup} 
        invoice={selectedInvoice}
        loan={selectedLoan}
        onSuccess={() => {
          fetchGroups();
          if (selectedGroup) fetchUserLoansInGroup(selectedGroup.id);
        }} 
      />

      {/* Loan Request Modal */}
      <Modal show={showLoanRequestModal} onHide={() => setShowLoanRequestModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-dark">Solicitar Empréstimo</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 pt-2">
          {selectedGroup && (
            <Form onSubmit={handleRequestLoan}>
              <p className="text-muted small mb-4">Peça crédito ao grupo <strong>{selectedGroup.name}</strong>. Aplica-se uma taxa de juro de {selectedGroup.loanInterestRate || 10}%.</p>
              
              <Form.Group className="mb-3">
                <Form.Label className="text-uppercase small fw-bold opacity-75">Valor do Empréstimo (MT)</Form.Label>
                <Form.Control
                  type="number"
                  value={loanFormData.amountRequested}
                  onChange={(e) => setLoanFormData({...loanFormData, amountRequested: e.target.value})}
                  required
                  placeholder="Ex: 5000"
                  className="py-3 shadow-none bg-light border-0 rounded-3 h4 fw-black text-primary"
                />
              </Form.Group>

              {loanFormData.amountRequested && (
                <div className="bg-light p-3 rounded-4 mb-4 border-0">
                  <div className="d-flex justify-content-between mb-2">
                    <small className="text-muted">Total a Devolver (com {selectedGroup.loanInterestRate || 10}% juros):</small>
                    <span className="fw-bold text-dark">{(parseFloat(loanFormData.amountRequested) * (1 + (selectedGroup.loanInterestRate || 10) / 100)).toFixed(2)} MT</span>
                  </div>
                </div>
              )}

              <Form.Group className="mb-4">
                <Form.Label className="text-uppercase small fw-bold opacity-75">Motivo / Notas</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={loanFormData.notes}
                  onChange={(e) => setLoanFormData({...loanFormData, notes: e.target.value})}
                  placeholder="Explique para que precisa do crédito..."
                  className="py-3 shadow-none bg-light border-0 rounded-3"
                />
              </Form.Group>

              <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 py-3 fw-bold rounded-3 shadow-sm"
                  disabled={requestingLoan || !loanFormData.amountRequested}
              >
                {requestingLoan ? <Spinner animation="border" size="sm" /> : 'Enviar Solicitação'}
              </Button>
            </Form>
          )}
        </Modal.Body>
      </Modal>

      <ModalDetalhesGrupo
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        group={selectedGroup}
      />

      <ModalListarFaturas
        show={showInvoicesModal}
        onHide={() => setShowInvoicesModal(false)}
        group={selectedGroup}
        onSelectInvoice={(invoice) => {
          setSelectedInvoice(invoice);
          setShowInvoicesModal(false);
          setShowPaymentModal(true);
        }}
      />

      <ModalRelatorioGrupo
        show={showReportModal}
        onHide={() => setShowReportModal(false)}
        group={selectedGroup}
      />

      <ModalUpgradePlano
        show={showUpgradeModal}
        onHide={() => setShowUpgradeModal(false)}
        onSuccess={fetchSubscription}
      />

      {/* Voting Modal */}
      <Modal show={showVotingModal} onHide={() => setShowVotingModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">Votação de Empréstimos</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedGroup && selectedGroup.Loans?.filter(l => l.status === 'pending').length > 0 ? (
            <div className="list-group list-group-flush">
              {selectedGroup.Loans.filter(l => l.status === 'pending').map(loan => {
                const myVote = loan.Votes?.find(v => v.userId === JSON.parse(localStorage.getItem('user'))?.id);
                const approvedCount = loan.Votes?.filter(v => v.vote === 'approve').length || 0;
                const totalNeeded = selectedGroup.Members?.length || 0;

                return (
                  <div key={loan.id} className="list-group-item border-0 bg-light rounded-4 mb-3 p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <h6 className="fw-bold mb-0">{loan.User?.firstName} {loan.User?.lastName}</h6>
                        <small className="text-muted">Solicitou: <span className="fw-bold text-primary">{loan.amountRequested} MT</span></small>
                      </div>
                      <div className="text-end">
                        <Badge bg="info" className="rounded-pill px-3 py-2">
                          {approvedCount} de {totalNeeded} votos
                        </Badge>
                      </div>
                    </div>
                    <p className="small text-muted mb-4">{loan.notes || 'Sem notas.'}</p>
                    
                    <div className="d-flex gap-2">
                      <Button 
                        variant={myVote?.vote === 'approve' ? 'success' : 'outline-success'}
                        className="flex-fill fw-bold rounded-3"
                        onClick={() => handleVote(loan.id, 'approve')}
                      >
                        {myVote?.vote === 'approve' ? '✓ Aprovado' : 'Aprovar'}
                      </Button>
                      <Button 
                        variant={myVote?.vote === 'reject' ? 'danger' : 'outline-danger'}
                        className="flex-fill fw-bold rounded-3"
                        onClick={() => handleVote(loan.id, 'reject')}
                      >
                         {myVote?.vote === 'reject' ? '✗ Rejeitado' : 'Rejeitar'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-4 text-muted">Nenhuma votação pendente.</p>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

// Simplified Navbar component
const NavbarSimple = ({ onLogout, btnText }) => (
  <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
    <div className="container">
      <a className="navbar-brand fw-black" href="/">Famba<span className="text-primary">Xitique</span></a>
      <button className="btn btn-outline-light btn-sm fw-bold px-3 rounded-pill" onClick={onLogout}>
        {btnText}
      </button>
    </div>
  </nav>
);

export default DashboardMembro;
