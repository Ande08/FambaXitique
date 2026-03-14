import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { Container, Row, Col, Card, Button, Badge, Spinner, Table, Navbar, Nav } from 'react-bootstrap';

const DashboardSuperAdmin = ({ onLogout }) => {
  const [pendingGroups, setPendingGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // ID of group being processed

  useEffect(() => {
    fetchPendingGroups();
  }, []);

  const fetchPendingGroups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/groups/pending-approval');
      setPendingGroups(res.data);
    } catch (err) {
      console.error('Erro ao buscar grupos pendentes:', err);
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="h3 fw-bold mb-4">Aprovação de Grupos</h1>
        
        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" /></div>
        ) : (
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0 align-middle">
                <thead className="bg-light">
                  <tr>
                    <th className="px-4 py-3">Nome do Grupo</th>
                    <th className="py-3">Criador</th>
                    <th className="py-3">Data</th>
                    <th className="py-3 text-end px-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingGroups.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-5 text-muted">
                        Nenhum pedido de criação pendente.
                      </td>
                    </tr>
                  ) : (
                    pendingGroups.map(group => (
                      <tr key={group.id}>
                        <td className="px-4 py-3">
                          <span className="fw-bold d-block">{group.name}</span>
                          <span className="text-muted small">{group.description}</span>
                        </td>
                        <td className="py-3">
                          {group.Creator?.firstName} {group.Creator?.lastName}
                          <br/><small className="text-muted">{group.Creator?.phone}</small>
                        </td>
                        <td className="py-3 small">
                          {new Date(group.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-end px-4">
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            className="me-2 fw-bold"
                            onClick={() => handleAction(group.id, 'rejected')}
                            disabled={actionLoading === group.id}
                          >
                            {actionLoading === group.id ? <Spinner animation="border" size="sm" /> : 'Rejeitar'}
                          </Button>
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="fw-bold"
                            onClick={() => handleAction(group.id, 'active')}
                            disabled={actionLoading === group.id}
                          >
                            {actionLoading === group.id ? <Spinner animation="border" size="sm" /> : 'Aprovar'}
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
      </Container>
    </div>
  );
};

export default DashboardSuperAdmin;
