import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import ModalComprovativo from '../components/ModalComprovativo';
import ModalListarFaturas from '../components/ModalListarFaturas';
import ModalRelatorioGrupo from '../components/ModalRelatorioGrupo';
import { Container, Row, Col, Card, Button, Badge, Spinner, Nav, Navbar, Modal, Form } from 'react-bootstrap';

const DashboardAdmin = ({ onLogout }) => {
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectedGroupForCode, setSelectedGroupForCode] = useState('');
  const [userGroups, setUserGroups] = useState([]);
  const [actionLoading, setActionLoading] = useState(null); // ID of payment being processed
  const [pendingLoans, setPendingLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [approvingLoan, setApprovingLoan] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanActionType, setLoanActionType] = useState('approve'); // approve or reject
  const [disbursementFile, setDisbursementFile] = useState(null);
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedGroupForSettings, setSelectedGroupForSettings] = useState(null);
  const [settingsFormData, setSettingsFormData] = useState({ 
    contributionAmount: '', 
    contributionFrequency: 'monthly',
    dueDay: 5,
    loanInterestRate: 10.00,
    name: '',
    paymentMethods: [],
    generateNow: false
  });
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [startingCycle, setStartingCycle] = useState(null); // groupId
  const [subscription, setSubscription] = useState(null);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [allPlans, setAllPlans] = useState([]);

  useEffect(() => {
    fetchPayments();
    fetchUserGroups();
    fetchPendingLoans();
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await api.get('/plans/my-subscription');
      setSubscription(res.data);
    } catch (err) {
      console.error('Erro ao buscar subscrição:', err);
    }
  };

  const fetchAllPlans = async () => {
    try {
      const res = await api.get('/plans');
      setAllPlans(res.data);
    } catch (err) {
      console.error('Erro ao buscar planos:', err);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setUpdatingSettings(true);
    try {
      await api.patch(`/groups/${selectedGroupForSettings.id}/settings`, settingsFormData);
      setUpdatingSettings(false);
      setShowSettingsModal(false);
      fetchUserGroups();
      alert('Configurações atualizadas com sucesso!');
    } catch (err) {
      setUpdatingSettings(false);
      alert(err.response?.data?.message || 'Erro ao atualizar configurações');
    }
  };

  const handleStartMonthCycle = async (groupId) => {
    if (!window.confirm('Deseja gerar faturas para todos os membros deste grupo para o mês atual?')) return;
    
    setStartingCycle(groupId);
    try {
      const res = await api.post(`/invoices/group/${groupId}/bulk-generate`);
      alert(`${res.data.message}\nNovas: ${res.data.counts.created}\nJá existiam: ${res.data.counts.existing}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao iniciar ciclo de faturas');
    } finally {
      setStartingCycle(null);
    }
  };

  const fetchUserGroups = async () => {
    try {
      const res = await api.get('/groups');
      // Filter for groups where user is ADMIN (Membership exists and has role ADMIN)
      const adminGroups = res.data.filter(g => g.Members?.some(m => m.Membership?.role === 'ADMIN'));
      setUserGroups(adminGroups);
      if (adminGroups.length > 0) setSelectedGroupForCode(adminGroups[0].id);
    } catch (err) {
      console.error('Erro ao buscar grupos:', err);
    }
  };

  const generateCode = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/groups/generate-code', { groupId: selectedGroupForCode });
      setGeneratedCode(res.data.code);
      setGenerating(false);
    } catch (err) {
      setGenerating(false);
      alert('Erro ao gerar código');
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payments/pending');
      setPayments(res.data);
    } catch (err) {
      console.error('Erro ao carregar pagamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingLoans = async () => {
    try {
      const res = await api.get('/loans/pending');
      setPendingLoans(res.data);
    } catch (err) {
      console.error('Erro ao buscar empréstimos:', err);
    }
  };

  const handleLoanAction = async (e) => {
    e.preventDefault();
    if (loanActionType === 'approve' && !disbursementFile) {
      alert('Por favor, carregue o comprovativo da transferência para o membro.');
      return;
    }

    setApprovingLoan(true);
    const data = new FormData();
    data.append('action', loanActionType);
    if (disbursementFile) data.append('proof', disbursementFile);

    try {
      await api.post(`/loans/approve/${selectedLoan.id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowLoanModal(false);
      setPendingLoans(pendingLoans.filter(l => l.id !== selectedLoan.id));
      setSelectedLoan(null);
      setDisbursementFile(null);
      fetchUserGroups(); // Update admin group balances
      alert(`Crédito ${loanActionType === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao processar empréstimo');
    } finally {
      setApprovingLoan(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      setActionLoading(id);
      await api.post(`/payments/approve/${id}`, { action });
      setPayments(payments.filter(p => p.id !== id));
      setSelectedPayment(null);
      setActionLoading(null);
      alert(`Pagamento ${action === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso!`);
    } catch (err) {
      console.error('Erro ao processar ação:', err);
      setActionLoading(null);
      alert('Falha ao processar ação.');
    }
  };

  return (
    <div className="bg-light min-vh-100">
      <Navbar bg="white" expand="lg" className="shadow-sm mb-4">
        <Container>
          <Navbar.Brand className="fw-black text-dark">
            Famba<span className="text-primary">Xitique</span>
          </Navbar.Brand>
          <Nav className="ms-auto">
            <Button variant="outline-dark" size="sm" className="fw-bold" onClick={onLogout}>
              Sair
            </Button>
          </Nav>
        </Container>
      </Navbar>

      <Container>
        <Row className="mb-4 align-items-center g-3">
          <Col md>
            <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2 gap-md-3">
              <div>
                <h1 className="h3 fw-bold text-dark mb-1">Painel do Gestor</h1>
                <p className="text-muted small mb-0">Gerencie seus grupos e valide pagamentos.</p>
              </div>
              {subscription && (
                <div className="d-flex align-items-center flex-wrap gap-2">
                  <Badge bg={subscription.Plan?.name === 'Premium' ? 'warning' : subscription.Plan?.name === 'Básico' ? 'info' : 'secondary'} className="rounded-pill px-3 py-2 fw-bold text-dark">
                    <i className="bi bi-star-fill me-2"></i> {subscription.Plan?.name}
                  </Badge>
                  {subscription.Plan?.name === 'Grátis' && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-primary fw-bold text-decoration-none p-0"
                      onClick={() => { fetchAllPlans(); setShowPlansModal(true); }}
                    >
                      Upgrade 🚀
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Col>
          <Col md="auto">
            <Button 
              variant="primary" 
              className="fw-bold px-4 rounded-3 w-100"
              onClick={() => setShowCodeModal(true)}
            >
              Convidar Membro
            </Button>
          </Col>
        </Row>

        {/* My Groups Management Section */}
        <Card className="border-0 shadow-sm rounded-4 mb-5 overflow-hidden">
          <Card.Header className="bg-white border-0 pt-4 px-4">
            <h5 className="fw-bold mb-0">Meus Grupos Ativos</h5>
            <small className="text-muted">Configure o valor e a frequência de contribuição.</small>
          </Card.Header>
          <Card.Body className="p-4">
             {userGroups.length === 0 ? (
               <p className="text-muted small mb-0">Você não tem grupos ativos para configurar. Aguarde a aprovação do Admin Supremo.</p>
             ) : (
                <>
                  {/* Desktop/Tablet Table View */}
                  <div className="d-none d-md-block table-responsive rounded-3 border">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr className="small text-uppercase fw-bold text-muted">
                          <th className="border-0 px-4 py-3">Grupo</th>
                          <th className="border-0 py-3">Contribuição</th>
                          <th className="border-0 py-3">Frequência</th>
                          <th className="border-0 py-3 text-success">Juros Rec.</th>
                          <th className="border-0 py-3 text-warning">Juros Pend.</th>
                          <th className="border-0 py-3 text-end px-4">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userGroups.map(group => (
                          <tr key={group.id}>
                            <td className="fw-bold px-4">{group.name}</td>
                            <td className="text-primary fw-bold">{group.contributionAmount} MT</td>
                            <td>
                              <Badge bg="light" text="dark" className="border">
                                {group.contributionFrequency === 'daily' ? 'Diário' : 
                                 group.contributionFrequency === 'weekly' ? 'Semanal' : 'Mensal'}
                              </Badge>
                             </td>
                             <td className="fw-bold text-success">
                                  {Number(group.Loans?.filter(l => l.status === 'approved' || l.status === 'settled').reduce((sum, l) => {
                                    const totalInterest = Number(l.totalToRepay) - Number(l.amountRequested);
                                    const percentagePaid = (Number(l.totalToRepay) - Number(l.remainingBalance)) / Number(l.totalToRepay);
                                    return sum + (totalInterest * percentagePaid);
                                  }, 0)).toFixed(2)} MT
                              </td>
                              <td className="fw-bold text-warning">
                                  {Number(group.Loans?.filter(l => l.status === 'approved' || l.status === 'settled').reduce((sum, l) => {
                                    const totalInterest = Number(l.totalToRepay) - Number(l.amountRequested);
                                    const percentagePending = Number(l.remainingBalance) / Number(l.totalToRepay);
                                    return sum + (totalInterest * percentagePending);
                                  }, 0)).toFixed(2)} MT
                              </td>
                             <td className="text-end px-4">
                                <div className="d-flex justify-content-end gap-2">
                                  <Button 
                                    variant="link" 
                                    size="sm"
                                    className="p-0 fw-bold text-decoration-none" 
                                    onClick={() => {
                                      setSelectedGroupForSettings(group);
                                      setSettingsFormData({ 
                                        contributionAmount: group.contributionAmount, 
                                        contributionFrequency: group.contributionFrequency,
                                        dueDay: group.dueDay || 5,
                                        loanInterestRate: group.loanInterestRate || 10.00,
                                        name: group.name,
                                        paymentMethods: group.paymentMethods || [
                                          { type: 'M-Pesa', accountName: '', accountNumber: '' },
                                          { type: 'e-Mola', accountName: '', accountNumber: '' }
                                        ],
                                        generateNow: false
                                      });
                                      setShowSettingsModal(true);
                                    }}
                                  >
                                    Configurar
                                  </Button>
                                  <Button 
                                    variant="link" 
                                    size="sm"
                                    className="p-0 fw-bold text-primary text-decoration-none" 
                                    onClick={() => { setSelectedGroup(group); setShowInvoicesModal(true); }}
                                  >
                                    Faturas
                                  </Button>
                                  <Button 
                                    variant="link" 
                                    size="sm"
                                    className="p-0 fw-bold text-info text-decoration-none" 
                                    onClick={() => { setSelectedGroup(group); setShowReportModal(true); }}
                                  >
                                    Relatório
                                  </Button>
                                </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="d-md-none">
                    {userGroups.map(group => (
                      <div key={group.id} className="bg-white rounded-4 border p-3 mb-3 shadow-sm">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <h6 className="fw-bold mb-0 text-dark">{group.name}</h6>
                          <Badge bg="light" text="dark" className="border small">
                            {group.contributionFrequency === 'daily' ? 'Diário' : 
                             group.contributionFrequency === 'weekly' ? 'Semanal' : 'Mensal'}
                          </Badge>
                        </div>
                        
                        <Row className="mb-3 g-2">
                          <Col xs={6}>
                            <small className="text-muted d-block opacity-75 small text-uppercase fw-bold">Contribuição</small>
                            <span className="fw-bold text-primary">{group.contributionAmount} MT</span>
                          </Col>
                          <Col xs={6}>
                            <small className="text-muted d-block opacity-75 small text-uppercase fw-bold">Juros Rec.</small>
                            <span className="fw-bold text-success">
                              {Number(group.Loans?.filter(l => l.status === 'approved' || l.status === 'settled').reduce((sum, l) => {
                                const totalInterest = Number(l.totalToRepay) - Number(l.amountRequested);
                                const percentagePaid = (Number(l.totalToRepay) - Number(l.remainingBalance)) / Number(l.totalToRepay);
                                return sum + (totalInterest * percentagePaid);
                              }, 0)).toFixed(1)} MT
                            </span>
                          </Col>
                        </Row>

                        <div className="d-flex gap-2 border-top pt-3 mt-2">
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="flex-grow-1 fw-bold rounded-pill"
                            onClick={() => {
                              setSelectedGroupForSettings(group);
                              setSettingsFormData({ 
                                contributionAmount: group.contributionAmount, 
                                contributionFrequency: group.contributionFrequency,
                                dueDay: group.dueDay || 5,
                                loanInterestRate: group.loanInterestRate || 10.00,
                                name: group.name,
                                paymentMethods: group.paymentMethods || [
                                  { type: 'M-Pesa', accountName: '', accountNumber: '' },
                                  { type: 'e-Mola', accountName: '', accountNumber: '' }
                                ],
                                generateNow: false
                              });
                              setShowSettingsModal(true);
                            }}
                          >
                            Ajustes
                          </Button>
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="fw-bold rounded-pill"
                            onClick={() => { setSelectedGroup(group); setShowInvoicesModal(true); }}
                          >
                            Faturas
                          </Button>
                          <Button 
                            variant="outline-info" 
                            size="sm" 
                            className="fw-bold rounded-pill"
                            onClick={() => { setSelectedGroup(group); setShowReportModal(true); }}
                          >
                            Relatório
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
             )}
          </Card.Body>
        </Card>

        {/* Pending Validations Section */}
        <h5 className="fw-bold mb-3">Validações Pendentes</h5>
        {loading ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          <Row className="g-4 mb-5">
            {payments.length === 0 ? (
              <Col className="text-center">
                <Card className="border-0 shadow-sm p-5 rounded-4 bg-white">
                  <p className="text-muted mb-0">Nenhum pagamento pendente no momento. 🙌</p>
                </Card>
              </Col>
            ) : (
              payments.map(payment => (
                <Col md={6} lg={4} key={payment.id}>
                  <Card 
                    className="border-0 shadow-sm rounded-4 overflow-hidden h-100 transition-hover"
                    onClick={() => setSelectedPayment(payment)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="position-relative bg-light d-flex align-items-center justify-content-center" style={{ height: '200px' }}>
                      {payment.proofImage ? (
                        <Card.Img 
                          variant="top" 
                          src={`http://localhost:5000/${payment.proofImage.replace(/\\/g, '/')}`} 
                          className="h-100 w-100 object-fit-cover"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <div className="display-4 text-muted mb-2">📄</div>
                          <small className="text-muted d-block fw-bold">Apenas ID de Transação</small>
                          <code className="bg-white px-2 py-1 rounded border mt-2 d-inline-block">{payment.transactionId}</code>
                        </div>
                      )}
                      <Badge 
                        bg="primary" 
                        className="position-absolute top-0 end-0 m-3 px-3 py-2 rounded-pill shadow-sm"
                      >
                        {payment.amount} MT
                      </Badge>
                    </div>
                    <Card.Body className="p-4">
                      <Card.Title className="fw-bold mb-1">
                        {payment.User?.firstName} {payment.User?.lastName}
                      </Card.Title>
                      <Card.Text className="text-muted small mb-4">
                        Grupo: <span className="text-primary fw-semibold">{payment.Group?.name}</span>
                      </Card.Text>
                      <Button variant="dark" className="w-100 fw-bold py-2 rounded-3">
                        Ver Detalhes
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))
            )}
          </Row>
        )}

        {/* Pending Loans Section */}
        {pendingLoans.length > 0 && (
          <div className="mt-5 mb-5">
            <h5 className="fw-bold mb-3">Solicitações de Crédito</h5>
            <Row className="g-4">
              {pendingLoans.map(loan => (
                <Col md={6} key={loan.id}>
                  <Card className="border-0 shadow-sm rounded-4 overflow-hidden border-start border-4 border-warning">
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h6 className="fw-bold mb-1">{loan.User?.firstName} {loan.User?.lastName}</h6>
                          <small className="text-muted">{loan.User?.phone}</small>
                        </div>
                        <h4 className="fw-black text-warning mb-0">{loan.amountRequested} MT</h4>
                      </div>
                      <p className="bg-light p-2 rounded-3 small text-muted mb-3 italic">
                        "{loan.notes || 'Sem notas.'}"
                      </p>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <small className="text-muted">Total c/ Juros: <strong>{loan.totalToRepay} MT</strong></small>
                        <div className="text-end">
                            <Badge bg="light" text="dark" className="border px-2 mb-1 d-block">{loan.Group?.name}</Badge>
                            <Badge bg={loan.Votes?.filter(v => v.vote === 'approve').length === loan.Group?.Members?.length ? 'success' : 'info'} className="rounded-pill px-3 py-1">
                                {loan.Votes?.filter(v => v.vote === 'approve').length || 0} de {loan.Group?.Members?.length || 0} votos
                            </Badge>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <Button 
                          variant="primary" 
                          className="flex-grow-1 fw-bold rounded-3"
                          disabled={loan.Votes?.filter(v => v.vote === 'approve').length < loan.Group?.Members?.length}
                          onClick={() => {
                            setSelectedLoan(loan);
                            setLoanActionType('approve');
                            setShowLoanModal(true);
                          }}
                        >
                          {loan.Votes?.filter(v => v.vote === 'approve').length < loan.Group?.Members?.length ? 'Aguardando Votos' : 'Liberar Valor'}
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          className="fw-bold rounded-3"
                          onClick={() => {
                            setSelectedLoan(loan);
                            setLoanActionType('reject');
                            handleLoanAction({ preventDefault: () => {} });
                          }}
                        >
                          Recusar
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Container>

      <ModalComprovativo 
        payment={selectedPayment} 
        onClose={() => setSelectedPayment(null)} 
        onAction={handleAction}
        loading={actionLoading === selectedPayment?.id}
      />

      {/* Generate Code Modal */}
      <Modal show={showCodeModal} onHide={() => { setShowCodeModal(false); setGeneratedCode(''); }} centered>
        <Modal.Header closeButton>
          <Modal.Title>Gerar Código de Convite</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {!generatedCode ? (
            <>
              <p className="text-muted small">Selecione o grupo para o qual deseja gerar um código de entrada única.</p>
              <Form.Select 
                className="mb-4 py-3 shadow-none border-2"
                value={selectedGroupForCode}
                onChange={(e) => setSelectedGroupForCode(e.target.value)}
              >
                {userGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </Form.Select>
              <Button 
                variant="primary" 
                className="w-100 py-3 fw-bold rounded-3" 
                onClick={generateCode}
                disabled={generating || userGroups.length === 0}
              >
                {generating ? <Spinner animation="border" size="sm" /> : 'Gerar Novo Código'}
              </Button>
              {userGroups.length === 0 && <p className="text-danger small mt-2 text-center">Você não é administrador de nenhum grupo.</p>}
            </>
          ) : (
            <div className="text-center py-3">
              <p className="text-muted small mb-2">Código gerado com sucesso! Envie para o novo membro:</p>
              <div className="bg-light p-4 rounded-4 mb-3 border">
                <span className="display-4 fw-black text-primary tracking-widest">{generatedCode}</span>
              </div>
              <p className="text-danger small mb-4">Este código é de <b>uso único</b> e expira em 24h.</p>
              <Button 
                variant="dark" 
                className="w-100 py-3 fw-bold rounded-3"
                onClick={() => {
                   navigator.clipboard.writeText(generatedCode);
                   alert('Código copiado!');
                }}
              >
                Copiar Código
              </Button>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Group Settings Modal */}
      <Modal show={showSettingsModal} onHide={() => setShowSettingsModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Configurar Grupo</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedGroupForSettings && (
            <Form onSubmit={handleUpdateSettings}>
              <p className="text-muted small mb-4">Ajuste as regras de contribuição para o grupo <strong>{selectedGroupForSettings.name}</strong>.</p>
              
              <Form.Group className="mb-3">
                <Form.Label className="text-uppercase small fw-bold opacity-75">Nome do Grupo</Form.Label>
                <Form.Control
                  type="text"
                  value={settingsFormData.name}
                  onChange={(e) => setSettingsFormData({...settingsFormData, name: e.target.value})}
                  required
                  placeholder="Nome do Grupo"
                  className="py-2 shadow-none border-2"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="text-uppercase small fw-bold opacity-75">Valor da Contribuição (MT)</Form.Label>
                <Form.Control
                  type="number"
                  value={settingsFormData.contributionAmount}
                  onChange={(e) => setSettingsFormData({...settingsFormData, contributionAmount: e.target.value})}
                  required
                  placeholder="Ex: 500"
                  className="py-2 shadow-none border-2"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="text-uppercase small fw-bold opacity-75">Taxa de Juros de Empréstimo (%)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  value={settingsFormData.loanInterestRate}
                  onChange={(e) => setSettingsFormData({...settingsFormData, loanInterestRate: e.target.value})}
                  required
                  className="py-2 shadow-none border-2"
                />
                <Form.Text className="text-muted small">
                  Esta taxa será aplicada a todas as novas solicitações de crédito.
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="text-uppercase small fw-bold opacity-75">Frequência</Form.Label>
                <Form.Select
                  value={settingsFormData.contributionFrequency}
                  onChange={(e) => setSettingsFormData({...settingsFormData, contributionFrequency: e.target.value})}
                  required
                  className="py-2 shadow-none border-2"
                >
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                </Form.Select>
              </Form.Group>

              {settingsFormData.contributionFrequency === 'monthly' ? (
                <Form.Group className="mb-4">
                  <Form.Label className="text-uppercase small fw-bold opacity-75">Dia de Vencimento (Mensal)</Form.Label>
                  <div className="input-group">
                    <Form.Control
                      type="number"
                      min="1"
                      max="31"
                      value={settingsFormData.dueDay}
                      onChange={(e) => setSettingsFormData({ ...settingsFormData, dueDay: e.target.value })}
                      className="py-3 shadow-none bg-light border-0"
                      required
                    />
                    <Button 
                      variant="outline-secondary" 
                      className="border-0 bg-light px-3 fw-bold small text-primary"
                      onClick={() => setSettingsFormData({...settingsFormData, dueDay: new Date().getDate()})}
                    >
                      Usar Hoje
                    </Button>
                  </div>
                </Form.Group>
              ) : settingsFormData.contributionFrequency === 'weekly' ? (
                <Form.Group className="mb-4">
                  <Form.Label className="text-uppercase small fw-bold opacity-75">Dia da Semana (Vencimento)</Form.Label>
                  <Form.Select
                    value={settingsFormData.dueDay}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, dueDay: parseInt(e.target.value) })}
                    className="py-3 shadow-none bg-light border-0 rounded-3"
                    required
                  >
                    <option value="0">Domingo</option>
                    <option value="1">Segunda-feira</option>
                    <option value="2">Terça-feira</option>
                    <option value="3">Quarta-feira</option>
                    <option value="4">Quinta-feira</option>
                    <option value="5">Sexta-feira</option>
                    <option value="6">Sábado</option>
                  </Form.Select>
                </Form.Group>
              ) : null}

              {(settingsFormData.contributionFrequency === 'weekly' && settingsFormData.dueDay === new Date().getDay()) && (
                <Form.Group className="mb-4 bg-light p-3 rounded-3 border-start border-4 border-primary">
                  <Form.Check 
                    type="switch"
                    id="generate-now-switch"
                    label="Gerar primeira fatura hoje mesmo?"
                    checked={settingsFormData.generateNow}
                    onChange={(e) => setSettingsFormData({...settingsFormData, generateNow: e.target.checked})}
                    className="fw-bold text-primary"
                  />
                  <small className="text-muted d-block mt-1">
                    Como hoje é o dia de vencimento escolhido, você pode optar por já criar as faturas deste ciclo agora.
                  </small>
                </Form.Group>
              )}

              <div className="mb-4">
                <label className="text-uppercase small fw-bold opacity-75 d-block mb-3">Formas de Pagamento Aceites</label>
                {settingsFormData.paymentMethods.map((method, index) => (
                  <div key={index} className="bg-light p-3 rounded-3 mb-3 border position-relative">
                    <Form.Group className="mb-2">
                      <Form.Label className="small fw-bold">Tipo / Operadora</Form.Label>
                      <Form.Control
                        type="text"
                        value={method.type}
                        onChange={(e) => {
                          const newMethods = [...settingsFormData.paymentMethods];
                          newMethods[index].type = e.target.value;
                          setSettingsFormData({...settingsFormData, paymentMethods: newMethods});
                        }}
                        placeholder="Ex: M-Pesa, e-Mola, Standard Bank"
                        className="py-2 shadow-none"
                        required
                      />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label className="small fw-bold">Número de Conta / Telemóvel</Form.Label>
                      <Form.Control
                        type="text"
                        value={method.accountNumber || ''}
                        onChange={(e) => {
                          const newMethods = [...settingsFormData.paymentMethods];
                          newMethods[index].accountNumber = e.target.value;
                          setSettingsFormData({...settingsFormData, paymentMethods: newMethods});
                        }}
                        placeholder="Ex: 84XXXXXXX ou IBAN"
                        className="py-2 shadow-none"
                        required
                      />
                    </Form.Group>
                    <Form.Group className="mb-0">
                      <Form.Label className="small fw-bold">Nome do Titular (que aparece na conta)</Form.Label>
                      <Form.Control
                        type="text"
                        value={method.accountName}
                        onChange={(e) => {
                          const newMethods = [...settingsFormData.paymentMethods];
                          newMethods[index].accountName = e.target.value;
                          setSettingsFormData({...settingsFormData, paymentMethods: newMethods});
                        }}
                        placeholder="Ex: Nome do Admin ou Número"
                        className="py-2 shadow-none"
                        required
                      />
                    </Form.Group>
                    {settingsFormData.paymentMethods.length > 1 && (
                      <Button 
                        variant="link" 
                        className="text-danger p-0 position-absolute top-0 end-0 m-2 text-decoration-none small"
                        onClick={() => {
                          const newMethods = settingsFormData.paymentMethods.filter((_, i) => i !== index);
                          setSettingsFormData({...settingsFormData, paymentMethods: newMethods});
                        }}
                      >
                        ✕ remover
                      </Button>
                    )}
                  </div>
                ))}
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="w-100 fw-bold rounded-3 border-2"
                  onClick={() => {
                    setSettingsFormData({
                      ...settingsFormData, 
                      paymentMethods: [...settingsFormData.paymentMethods, { type: '', accountName: '', accountNumber: '' }]
                    });
                  }}
                >
                  + Adicionar Outra Forma
                </Button>
              </div>

              <Button 
                variant="primary" 
                type="submit" 
                className="w-100 py-3 fw-bold rounded-3" 
                disabled={updatingSettings}
              >
                {updatingSettings ? <Spinner animation="border" size="sm" /> : 'Salvar Alterações'}
              </Button>
            </Form>
          )}
        </Modal.Body>
      </Modal>

      {/* Loan Approval Modal */}
      <Modal show={showLoanModal} onHide={() => setShowLoanModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">Aprovar Empréstimo</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedLoan && (
            <Form onSubmit={handleLoanAction}>
              <div className="bg-light p-3 rounded-4 mb-4 border-0">
                <div className="d-flex justify-content-between mb-2">
                  <small className="text-muted">Membro</small>
                  <span className="fw-bold text-dark">{selectedLoan.User?.firstName} {selectedLoan.User?.lastName}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <small className="text-muted">Valor a Transferir</small>
                  <span className="fw-black text-primary">{selectedLoan.amountRequested} MT</span>
                </div>
                <div className="d-flex justify-content-between">
                  <small className="text-muted">Conta de Receção</small>
                  <span className="fw-bold text-dark font-monospace">{selectedLoan.User?.phone}</span>
                </div>
              </div>

              <Form.Group className="mb-4">
                <Form.Label className="text-uppercase small fw-bold opacity-75">Comprovativo de Saída (M-Pesa / Banco)</Form.Label>
                <Form.Control
                  type="file"
                  onChange={(e) => setDisbursementFile(e.target.files[0])}
                  required
                  accept="image/*,.pdf"
                  className="py-2 shadow-none border-2 border-dashed rounded-3"
                />
                <Form.Text className="text-muted small">
                  Anexe o print da transferência que acabou de fazer para o membro.
                </Form.Text>
              </Form.Group>

              <Button 
                variant="primary" 
                type="submit" 
                className="w-100 py-3 fw-bold rounded-3 shadow-sm"
                disabled={approvingLoan}
              >
                {approvingLoan ? <Spinner animation="border" size="sm" /> : 'Confirmar e Liberar Valor'}
              </Button>
            </Form>
          )}
        </Modal.Body>
      </Modal>

      <ModalRelatorioGrupo
        show={showReportModal}
        onHide={() => setShowReportModal(false)}
        group={selectedGroup}
      />

      <ModalListarFaturas
        show={showInvoicesModal}
        onHide={() => setShowInvoicesModal(false)}
        group={selectedGroup}
        onSelectInvoice={(invoice) => {
          // You might need a way to validate from here or just view
          setSelectedGroup(selectedGroup);
          setShowInvoicesModal(false);
          // For now, admins just view
        }}
      />

      {/* Upgrade Plans Modal */}
      <Modal show={showPlansModal} onHide={() => setShowPlansModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-black">Escolha o seu Plano</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 bg-light rounded-bottom-4">
          <p className="text-muted mb-4">Aumente seus limites e desbloqueie as notificações do Bot de WhatsApp!</p>
          <Row className="g-3">
            {allPlans.map(plan => (
              <Col md={4} key={plan.id}>
                <Card className={`border-0 shadow-sm rounded-4 h-100 ${plan.name === 'Premium' ? 'border-primary border border-2' : ''}`}>
                  <Card.Body className="p-4 d-flex flex-column">
                    <h5 className="fw-bold mb-1">{plan.name}</h5>
                    <h3 className="fw-black text-primary my-3">{Number(plan.monthlyPrice).toLocaleString()} <small className="fs-6 text-muted">MT</small></h3>
                    <ul className="list-unstyled mb-4 small flex-grow-1">
                      <li className="mb-2"><i className="bi bi-check-circle-fill text-success me-2"></i> {plan.groupLimit === -1 ? 'Grupos Ilimitados' : `Até ${plan.groupLimit} Grupos`}</li>
                      <li className="mb-2">
                        <i className={`bi ${plan.botEnabled ? 'bi-check-circle-fill text-success' : 'bi-x-circle text-muted'} me-2`}></i> 
                        Bot de WhatsApp
                      </li>
                      <li className="text-muted italic">{plan.description}</li>
                    </ul>
                    {subscription?.Plan?.id === plan.id ? (
                      <Button variant="outline-dark" className="w-100 rounded-pill fw-bold" disabled>Plano Atual</Button>
                    ) : (
                      <Button 
                        variant={plan.name === 'Premium' ? 'primary' : 'outline-primary'} 
                        className="w-100 rounded-pill fw-bold"
                        onClick={() => {
                          const msg = encodeURIComponent(`Olá! Quero fazer o upgrade para o plano ${plan.name} no FambaXitique.`);
                          window.open(`https://wa.me/258840000000?text=${msg}`, '_blank');
                        }}
                      >
                        Selecionar
                      </Button>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default DashboardAdmin;
