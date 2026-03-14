import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { Container, Row, Col, Card, Button, Badge, Spinner, Table, Navbar, Nav, Modal, Form } from 'react-bootstrap';

const DashboardSuperAdmin = ({ onLogout }) => {
  const [pendingGroups, setPendingGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalGroups: 0 });
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'all', 'plans'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); 
  const [planEditing, setPlanEditing] = useState(null); // Plan ID being edited
  const [pendingUpgrades, setPendingUpgrades] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [methodFormData, setMethodFormData] = useState({ type: '', accountName: '', accountNumber: '' });
  const [planForm, setPlanForm] = useState({ monthlyPrice: 0, groupLimit: 1, botEnabled: false, description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pendingRes, allRes, statsRes, plansRes, upgradesRes, methodsRes] = await Promise.all([
        api.get('/groups/pending-approval'),
        api.get('/groups/admin/all'),
        api.get('/groups/admin/stats'),
        api.get('/plans'),
        api.get('/plans/pending-upgrades'),
        api.get('/plans/payment-methods')
      ]);
      setPendingGroups(pendingRes.data);
      setAllGroups(allRes.data);
      setStats(statsRes.data);
      setPlans(plansRes.data);
      setPendingUpgrades(upgradesRes.data);
      setPaymentMethods(methodsRes.data);
    } catch (err) {
      console.error('Erro ao buscar dados do Admin:', err);
    } finally {
      setActionLoading(null);
      setLoading(false);
    }
  };

  const handleUpdatePlan = async () => {
    try {
      setActionLoading(planEditing);
      await api.put(`/plans/${planEditing}`, planForm);
      setPlanEditing(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao atualizar plano:', err);
      alert('Erro ao guardar alterações.');
    } finally {
      setActionLoading(null);
    }
  };

  const startEditPlan = (plan) => {
    setPlanEditing(plan.id);
    setPlanForm({
      monthlyPrice: plan.monthlyPrice,
      groupLimit: plan.groupLimit,
      botEnabled: plan.botEnabled,
      description: plan.description
    });
  };

  const fetchPendingGroups = fetchData; // Keep compatibility if needed

  const handleAction = async (id, status) => {
    try {
      setActionLoading(id);
      await api.post(`/groups/${id}/status`, { status });
      setPendingGroups(pendingGroups.filter(g => g.id !== id));
      setActionLoading(null);
      alert(`Grupo ${status === 'active' ? 'aprovado' : 'rejeitado'}!`);
    } catch (err) {
      setActionLoading(null);
      alert('Erro ao processar ação.');
    }
  };

  const handleApproveUpgrade = async (id) => {
    try {
      setActionLoading(id);
      await api.post(`/plans/approve-upgrade/${id}`);
      alert('Upgrade aprovado e mensagem enviada!');
      fetchData();
    } catch (err) {
      alert('Erro ao aprovar upgrade.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateMethod = async (e) => {
    e.preventDefault();
    try {
      await api.post('/plans/payment-methods', methodFormData);
      setShowMethodModal(false);
      setMethodFormData({ type: '', accountName: '', accountNumber: '' });
      fetchData();
    } catch (err) {
      alert('Erro ao criar método de pagamento.');
    }
  };

  return (
    <div className="bg-light min-vh-100">
      <Navbar bg="dark" variant="dark" className="shadow-sm mb-4">
        <Container>
          <Navbar.Brand className="fw-black">
            Famba<span className="text-primary">Xitique</span> <Badge bg="danger" className="ms-2 small">SUPER ADMIN</Badge>
          </Navbar.Brand>
          <Nav className="ms-auto">
            <Button variant="outline-light" size="sm" onClick={onLogout}>Sair</Button>
          </Nav>
        </Container>
      </Navbar>

      <Container>
        <Row className="mb-4">
          <Col md={6}>
            <Card className="border-0 shadow-sm rounded-4 bg-primary text-white">
              <Card.Body className="p-4 d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-white-50 mb-1">Total de Usuários</h6>
                  <h2 className="mb-0 fw-black">{stats.totalUsers}</h2>
                </div>
                <div className="bg-white bg-opacity-25 rounded-circle p-3">
                  <i className="bi bi-people-fill fs-3"></i>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="border-0 shadow-sm rounded-4 bg-dark text-white">
              <Card.Body className="p-4 d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-white-50 mb-1">Total de Grupos</h6>
                  <h2 className="mb-0 fw-black">{stats.totalGroups}</h2>
                </div>
                <div className="bg-primary rounded-circle p-3">
                  <i className="bi bi-grid-fill fs-3"></i>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h3 fw-bold mb-0">Gestão de Grupos</h1>
          <Nav variant="pills" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
            <Nav.Item>
              <Nav.Link eventKey="pending" className="rounded-pill px-4">Pendentes ({pendingGroups.length})</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="upgrades" className="rounded-pill px-4 ms-2">Upgrades ({pendingUpgrades.length})</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="all" className="rounded-pill px-4 ms-2">Todos os Grupos</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="plans" className="rounded-pill px-4 ms-2">Planos</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="methods" className="rounded-pill px-4 ms-2">Contas</Nav.Link>
            </Nav.Item>
          </Nav>
        </div>
          {loading ? (
          <div className="text-center py-5"><Spinner animation="border" /></div>
        ) : (
          <>
            {activeTab === 'plans' && (
              <Row className="g-4">
                {plans.map(plan => (
                  <Col md={4} key={plan.id}>
                    <Card className={`border-0 shadow-sm rounded-4 h-100 ${planEditing === plan.id ? 'border-primary border border-2' : ''}`}>
                      <Card.Body className="p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <h4 className="fw-black mb-0">{plan.name}</h4>
                          {plan.name === 'Premium' && <Badge bg="danger">POPULAR</Badge>}
                        </div>
                        {planEditing === plan.id ? (
                          <div className="mt-3">
                            <div className="mb-3">
                              <label className="small text-muted mb-1">Preço Mensal (MT)</label>
                              <input 
                                type="number" 
                                className="form-control form-control-sm" 
                                value={planForm.monthlyPrice}
                                onChange={e => setPlanForm({...planForm, monthlyPrice: e.target.value})}
                              />
                            </div>
                            <div className="mb-3">
                              <label className="small text-muted mb-1">Limite de Grupos (-1 = ilimitado)</label>
                              <input 
                                type="number" 
                                className="form-control form-control-sm" 
                                value={planForm.groupLimit}
                                onChange={e => setPlanForm({...planForm, groupLimit: e.target.value})}
                              />
                            </div>
                            <div className="mb-3">
                              <div className="form-check form-switch">
                                <input 
                                  className="form-check-input" 
                                  type="checkbox" 
                                  checked={planForm.botEnabled}
                                  onChange={e => setPlanForm({...planForm, botEnabled: e.target.checked})}
                                />
                                <label className="form-check-label small">Incluir Bot de WhatsApp</label>
                              </div>
                            </div>
                            <div className="d-flex gap-2">
                              <Button 
                                variant="primary" 
                                size="sm" 
                                className="w-100 fw-bold"
                                onClick={handleUpdatePlan}
                                disabled={actionLoading === plan.id}
                              >
                                {actionLoading === plan.id ? <Spinner animation="border" size="sm" /> : 'Guardar'}
                              </Button>
                              <Button variant="light" size="sm" className="w-100" onClick={() => setPlanEditing(null)}>Cancelar</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h2 className="fw-black text-primary my-3">{Number(plan.monthlyPrice).toLocaleString()} <small className="fs-6 text-muted">MT / mês</small></h2>
                            <ul className="list-unstyled mb-4">
                              <li className="mb-2"><i className="bi bi-check-circle-fill text-success me-2"></i> {plan.groupLimit === -1 ? 'Grupos Ilimitados' : `Até ${plan.groupLimit} Grupos`}</li>
                              <li className="mb-2">
                                <i className={`bi ${plan.botEnabled ? 'bi-check-circle-fill text-success' : 'bi-dash-circle text-muted'} me-2`}></i> 
                                Notificações Bot WhatsApp
                              </li>
                              <li className="text-muted small italic">{plan.description}</li>
                            </ul>
                            <Button 
                              variant="outline-primary" 
                              className="w-100 rounded-pill fw-bold"
                              onClick={() => startEditPlan(plan)}
                            >
                              Editar Pacote
                            </Button>
                          </>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}

            {activeTab === 'upgrades' && (
              <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                <Card.Body className="p-0">
                  <Table responsive hover className="mb-0 align-middle">
                    <thead className="bg-light">
                      <tr>
                        <th className="px-4 py-3 border-0">Usuário</th>
                        <th className="py-3 border-0">Plano Destino</th>
                        <th className="py-3 border-0">Comprovativo</th>
                        <th className="py-3 text-end px-4 border-0">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUpgrades.length === 0 ? (
                        <tr><td colSpan="4" className="text-center py-5">Nenhum pedido pendente</td></tr>
                      ) : (
                        pendingUpgrades.map(up => (
                          <tr key={up.id}>
                            <td className="px-4 py-3">
                              <span className="fw-bold">{up.User?.firstName} {up.User?.lastName}</span>
                              <br/><small>{up.User?.phone}</small>
                            </td>
                            <td className="py-3">
                              <Badge bg="primary">{up.Plan?.name}</Badge>
                              <br/><small className="text-muted">{up.amount} MT</small>
                            </td>
                            <td className="py-3">
                              {up.proofPath ? (
                                <a href={`${api.defaults.baseURL.replace('/api', '')}${up.proofPath}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-link text-primary p-0">
                                  Ver Imagem
                                </a>
                              ) : 'S/ Ref'}
                            </td>
                            <td className="py-3 text-end px-4">
                              <Button 
                                variant="success" 
                                size="sm" 
                                className="fw-bold rounded-pill px-3"
                                onClick={() => handleApproveUpgrade(up.id)}
                                disabled={actionLoading === up.id}
                              >
                                {actionLoading === up.id ? <Spinner animation="border" size="sm" /> : 'Aprovar'}
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}

            {activeTab === 'methods' && (
              <div>
                <div className="d-flex justify-content-between mb-4">
                  <h4 className="fw-bold">Contas para Recebimento</h4>
                  <Button variant="primary" size="sm" onClick={() => setShowMethodModal(true)}>Adicionar Conta</Button>
                </div>
                <Row className="g-3">
                  {paymentMethods.map(m => (
                    <Col md={4} key={m.id}>
                      <Card className="border-0 shadow-sm rounded-4">
                        <Card.Body className="p-4">
                            <h5 className="fw-bold">{m.type}</h5>
                            <p className="mb-1">{m.accountNumber}</p>
                            <small className="text-muted d-block mb-3">{m.accountName}</small>
                            <Badge bg={m.isActive ? 'success' : 'secondary'}>{m.isActive ? 'Ativo' : 'Inativo'}</Badge>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            )}

            {(activeTab === 'pending' || activeTab === 'all') && (
              <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                <Card.Body className="p-0">
                  <Table responsive hover className="mb-0 align-middle">
                    <thead className="bg-light">
                      <tr>
                        <th className="px-4 py-3 border-0">Nome do Grupo</th>
                        <th className="py-3 border-0">Criador</th>
                        <th className="py-3 border-0 text-center">Status</th>
                        <th className="py-3 border-0">Data</th>
                        <th className="py-3 text-end px-4 border-0">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activeTab === 'pending' ? pendingGroups : allGroups).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-5 text-muted">
                            Nenhum grupo encontrado nesta categoria.
                          </td>
                        </tr>
                      ) : (
                        (activeTab === 'pending' ? pendingGroups : allGroups).map(group => (
                          <tr key={group.id}>
                            <td className="px-4 py-3">
                              <span className="fw-bold d-block">{group.name}</span>
                              <span className="text-muted small">{group.description}</span>
                            </td>
                            <td className="py-3">
                              {group.Creator?.firstName} {group.Creator?.lastName}
                              <br/><small className="text-muted">{group.Creator?.phone}</small>
                            </td>
                            <td className="py-3 text-center">
                              <Badge bg={group.status === 'active' ? 'success' : group.status === 'blocked' ? 'danger' : group.status === 'pending' ? 'warning' : 'secondary'} className="rounded-pill px-3">
                                {group.status === 'active' ? 'Ativo' : group.status === 'blocked' ? 'Bloqueado' : group.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                              </Badge>
                            </td>
                            <td className="py-3 small">
                              {new Date(group.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 text-end px-4">
                              {group.status === 'pending' && (
                                <>
                                  <Button 
                                    variant="outline-danger" 
                                    size="sm" 
                                    className="me-2 fw-bold rounded-pill px-3"
                                    onClick={() => handleAction(group.id, 'rejected')}
                                    disabled={actionLoading === group.id}
                                  >
                                    {actionLoading === group.id ? <Spinner animation="border" size="sm" /> : 'Rejeitar'}
                                  </Button>
                                  <Button 
                                    variant="primary" 
                                    size="sm" 
                                    className="fw-bold rounded-pill px-3"
                                    onClick={() => handleAction(group.id, 'active')}
                                    disabled={actionLoading === group.id}
                                  >
                                    {actionLoading === group.id ? <Spinner animation="border" size="sm" /> : 'Aprovar'}
                                  </Button>
                                </>
                              )}
                              {group.status !== 'pending' && (
                                <div className="d-flex justify-content-end gap-2">
                                  {group.status === 'active' ? (
                                    <Button 
                                      variant="outline-warning" 
                                      size="sm" 
                                      className="fw-bold rounded-pill px-3 border-0"
                                      onClick={() => handleAction(group.id, 'blocked')}
                                      disabled={actionLoading === group.id}
                                    >
                                      {actionLoading === group.id ? <Spinner animation="border" size="sm" /> : <><i className="bi bi-slash-circle me-1"></i> Bloquear</>}
                                    </Button>
                                  ) : group.status === 'blocked' ? (
                                    <Button 
                                      variant="outline-success" 
                                      size="sm" 
                                      className="fw-bold rounded-pill px-3 border-0"
                                      onClick={() => handleAction(group.id, 'active')}
                                      disabled={actionLoading === group.id}
                                    >
                                      {actionLoading === group.id ? <Spinner animation="border" size="sm" /> : <><i className="bi bi-check-circle me-1"></i> Reativar</>}
                                    </Button>
                                  ) : (
                                    <span className="text-muted small italic">Rejeitado</span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}
          </>
        )}

      </Container>

      {/* Modal Add Payment Method */}
      <Modal show={showMethodModal} onHide={() => setShowMethodModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Adicionar Forma de Pagamento</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleCreateMethod}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Tipo (M-Pesa, E-Mola, Banco...)</Form.Label>
              <Form.Control 
                type="text" 
                required 
                value={methodFormData.type} 
                onChange={e => setMethodFormData({...methodFormData, type: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Número / Conta</Form.Label>
              <Form.Control 
                type="text" 
                required 
                value={methodFormData.accountNumber} 
                onChange={e => setMethodFormData({...methodFormData, accountNumber: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold">Titular da Conta</Form.Label>
              <Form.Control 
                type="text" 
                required 
                value={methodFormData.accountName} 
                onChange={e => setMethodFormData({...methodFormData, accountName: e.target.value})}
              />
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100 fw-bold py-2">Guardar Conta</Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default DashboardSuperAdmin;
