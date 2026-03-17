import React, { useState, useEffect } from 'react';
import { Modal, Button, Row, Col, Card, Table, Spinner, Badge } from 'react-bootstrap';
import api from '../api/axiosConfig';

const ModalRelatorioGrupo = ({ show, onHide, group }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && group) {
      fetchReport();
    }
  }, [show, group]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/groups/${group.id}/report`);
      setReport(res.data);
    } catch (err) {
      console.error('Erro ao buscar relatório:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!group) return null;

  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable>
      <Modal.Header closeButton className="border-0 bg-light">
        <Modal.Title className="fw-bold">
          Relatório em Tempo Real: <span className="text-primary">{group.name}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4 bg-light">
        {loading || !report ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Gerando relatório detalhado...</p>
          </div>
        ) : (
          <>
            {/* Resumo de Faturas e Empréstimos */}
            <Row className="g-3 mb-4">
              <Col md={3}>
                <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-3">
                  <small className="text-muted text-uppercase fw-bold mb-1" style={{ fontSize: '10px' }}>Invoices (Pagas / Total)</small>
                  <h3 className="fw-black text-dark mb-0">{report.invoices.paid} / {report.invoices.total}</h3>
                  <div className="mt-2">
                    <Badge bg="success" className="me-1">Pagas: {report.invoices.paid}</Badge>
                    <Badge bg="danger">Atraso: {report.invoices.overdue}</Badge>
                  </div>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-3">
                  <small className="text-muted text-uppercase fw-bold mb-1" style={{ fontSize: '10px' }}>Arrecadação de Faturas</small>
                  <h3 className="fw-black text-success mb-0">{Number(report.invoices.paidAmount).toLocaleString()} MT</h3>
                  <small className="text-muted">Total esperado: {Number(report.invoices.totalAmount).toLocaleString()} MT</small>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-3">
                  <small className="text-muted text-uppercase fw-bold mb-1" style={{ fontSize: '10px' }}>Empréstimos Concedidos</small>
                  <h3 className="fw-black text-primary mb-0">{Number(report.loans.totalLoaned).toLocaleString()} MT</h3>
                  <div className="mt-2">
                    <Badge bg="info" className="me-1">Ativos: {report.loans.activeCount}</Badge>
                    <Badge bg="dark">Liquidados: {report.loans.settledCount}</Badge>
                  </div>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-3">
                  <small className="text-muted text-uppercase fw-bold mb-1" style={{ fontSize: '10px' }}>Lucro Gerado (Juros)</small>
                  <h3 className="fw-black text-info mb-0">{Number(report.loans.totalInterest).toLocaleString()} MT</h3>
                  <small className="text-muted">Taxa atual: {report.interestRate}%</small>
                </Card>
              </Col>
            </Row>

            {/* Tabela de Membros e Status */}
            <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4">
              <Card.Header className="bg-white py-3 border-0">
                <h6 className="fw-bold mb-0">Resumo por Membro</h6>
              </Card.Header>
              <div className="rounded-4 overflow-hidden border">
                {/* Desktop/Tablet Table View */}
                <div className="d-none d-md-block table-responsive">
                  <Table hover className="mb-0 align-middle">
                    <thead className="bg-light">
                      <tr>
                        <th className="px-4 py-3 border-0">Membro</th>
                        <th className="px-4 py-3 border-0 text-center">Faturas Pagas</th>
                        <th className="px-4 py-3 border-0 text-center">Faturas Pendentes</th>
                        <th className="px-4 py-3 border-0 text-center">Dívida Ativa</th>
                        <th className="px-4 py-3 border-0 text-end">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.members.map(member => (
                        <tr key={member.id}>
                          <td className="px-4 py-3">
                            <span className="fw-bold d-block">{member.name}</span>
                            <small className="text-muted">{member.phone}</small>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge bg="success" pill>{member.invoicesPaid}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge bg={member.invoicesPending > 0 ? 'danger' : 'light'} text={member.invoicesPending > 0 ? 'white' : 'dark'} pill>
                              {member.invoicesPending}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={Number(member.activeLoanBalance) > 0 ? 'text-danger fw-bold' : 'text-muted'}>
                              {Number(member.activeLoanBalance).toLocaleString()} MT
                            </span>
                          </td>
                          <td className="px-4 py-3 text-end">
                             <small className="text-primary fw-bold clickable" style={{cursor: 'pointer'}}>Detalhes</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="d-md-none p-3 bg-white">
                  {report.members.map(member => (
                    <div key={member.id} className="border rounded-4 p-3 mb-3 shadow-sm">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h6 className="fw-bold mb-0">{member.name}</h6>
                          <small className="text-muted">{member.phone}</small>
                        </div>
                        <Badge bg="success" pill>{member.invoicesPaid} Pagas</Badge>
                      </div>
                      
                      <Row className="g-2 small">
                        <Col xs={6}>
                          <small className="text-muted d-block opacity-75 text-uppercase fw-bold" style={{fontSize: '10px'}}>Pendentes</small>
                          <Badge bg={member.invoicesPending > 0 ? 'danger' : 'light'} text={member.invoicesPending > 0 ? 'white' : 'dark'} pill className="border">
                            {member.invoicesPending}
                          </Badge>
                        </Col>
                        <Col xs={6} className="text-end">
                          <small className="text-muted d-block opacity-75 text-uppercase fw-bold" style={{fontSize: '10px'}}>Dívida Ativa</small>
                          <span className={Number(member.activeLoanBalance) > 0 ? 'text-danger fw-bold' : 'text-muted'}>
                            {Number(member.activeLoanBalance).toLocaleString()} MT
                          </span>
                        </Col>
                      </Row>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <div className="bg-white p-3 rounded-4 border-0 shadow-sm">
                <p className="text-muted small mb-0">
                    * Este relatório é gerado em tempo real com base em todos os pagamentos validados e empréstimos aprovados até ao momento: <strong>{new Date().toLocaleString()}</strong>
                </p>
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer className="border-0 bg-light pb-4">
        <Button variant="primary" onClick={() => window.print()} className="fw-bold px-4 rounded-3 shadow-sm me-2">
            Imprimir Relatório
        </Button>
        <Button variant="dark" onClick={onHide} className="fw-bold px-4 rounded-3">
            Fechar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalRelatorioGrupo;
