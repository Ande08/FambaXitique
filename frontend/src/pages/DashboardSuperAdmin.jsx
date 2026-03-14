import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { Container, Row, Col, Card, Button, Badge, Spinner, Table, Navbar, Nav } from 'react-bootstrap';

const DashboardSuperAdmin = ({ onLogout }) => {
  const [pendingGroups, setPendingGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalGroups: 0 });
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'all'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); 

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pendingRes, allRes, statsRes] = await Promise.all([
        api.get('/groups/pending-approval'),
        api.get('/groups/admin/all'),
        api.get('/groups/admin/stats')
      ]);
      setPendingGroups(pendingRes.data);
      setAllGroups(allRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Erro ao buscar dados do Admin:', err);
    } finally {
      setLoading(false);
    }
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
              <Nav.Link eventKey="all" className="rounded-pill px-4 ms-2">Todos os Grupos</Nav.Link>
            </Nav.Item>
          </Nav>
        </div>
        
        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" /></div>
        ) : (
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
      </Container>
    </div>
  );
};

export default DashboardSuperAdmin;
