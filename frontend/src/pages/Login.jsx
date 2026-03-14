import React, { useState } from 'react';
import api from '../api/axiosConfig';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';

const Login = ({ onLoginSuccess }) => {
  const [view, setView] = useState('login'); // login, register, forgot, reset
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    code: '',
    newPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/request-reset', { phone: formData.phone });
      setView('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao solicitar reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', {
        phone: formData.phone,
        code: formData.code,
        newPassword: formData.newPassword
      });
      alert('Senha redefinida com sucesso!');
      setView('login');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (view === 'login') {
        const res = await api.post('/auth/login', {
          phone: formData.phone,
          password: formData.password
        });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        onLoginSuccess(res.data.user);
      } else if (view === 'register') {
        await api.post('/auth/register', formData);
        alert('Conta criada com sucesso! Faça login agora.');
        setView('login');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="famba-gradient-bg min-vh-100 d-flex align-items-center justify-content-center p-3">
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={4}>
            <Card className="glass-card shadow-lg border-0 text-white p-4">
              <Card.Body>
                <div className="text-center mb-4">
                  <h1 className="h2 fw-black mb-1">
                    Famba<span className="text-primary">Xitique</span>
                  </h1>
                  <p className="text-light opacity-75 small text-center">
                    {view === 'login' ? 'Bem-vindo de volta!' : 
                     view === 'register' ? 'Comece a poupar hoje.' :
                     view === 'forgot' ? 'Recupere sua conta.' : 'Defina sua nova senha.'}
                  </p>
                </div>

                {error && (
                  <Alert variant="danger" className="text-center py-2 small border-0 bg-danger bg-opacity-10 text-danger">
                    {error}
                  </Alert>
                )}

                {view === 'login' || view === 'register' ? (
                   <Form onSubmit={handleSubmit}>
                   {view === 'register' && (
                     <Row className="g-2 mb-3">
                       <Col>
                         <Form.Label className="text-uppercase small fw-bold opacity-75 mb-1 px-1">Nome</Form.Label>
                         <Form.Control
                           type="text"
                           name="firstName"
                           value={formData.firstName}
                           onChange={handleChange}
                           required
                           placeholder="João"
                           className="bg-dark bg-opacity-50 border-secondary text-white rounded-3 py-2 px-3 focus-none shadow-none"
                         />
                       </Col>
                       <Col>
                         <Form.Label className="text-uppercase small fw-bold opacity-75 mb-1 px-1">Apelido</Form.Label>
                         <Form.Control
                           type="text"
                           name="lastName"
                           value={formData.lastName}
                           onChange={handleChange}
                           required
                           placeholder="Mavuso"
                           className="bg-dark bg-opacity-50 border-secondary text-white rounded-3 py-2 px-3 focus-none shadow-none"
                         />
                       </Col>
                     </Row>
                   )}
 
                   <Form.Group className="mb-3">
                     <Form.Label className="text-uppercase small fw-bold opacity-75 mb-1 px-1">Número de Telefone</Form.Label>
                     <Form.Control
                       type="tel"
                       name="phone"
                       value={formData.phone}
                       onChange={handleChange}
                       required
                       placeholder="Ex: 841234567"
                       className="bg-dark bg-opacity-50 border-secondary text-white rounded-3 py-2 px-3 focus-none shadow-none"
                     />
                     {view === 'register' && (
                       <Form.Text className="text-info small opacity-75 mt-1 d-block">
                         📱 O número deve ter WhatsApp para receber informações dos grupos.
                       </Form.Text>
                     )}
                   </Form.Group>
 
                   <Form.Group className="mb-4">
                     <div className="d-flex justify-content-between align-items-center mb-1">
                        <Form.Label className="text-uppercase small fw-bold opacity-75 mb-0 px-1">Senha</Form.Label>
                        {view === 'login' && (
                          <button 
                            type="button"
                            onClick={() => setView('forgot')}
                            className="btn btn-link text-primary p-0 small fw-bold text-decoration-none"
                            style={{ fontSize: '11px' }}
                          >
                            Esqueceu a senha?
                          </button>
                        )}
                     </div>
                     <Form.Control
                       type="password"
                       name="password"
                       value={formData.password}
                       onChange={handleChange}
                       required
                       placeholder="••••••••"
                       className="bg-dark bg-opacity-50 border-secondary text-white rounded-3 py-2 px-3 focus-none shadow-none"
                     />
                   </Form.Group>
 
                   <Button
                     variant="primary"
                     type="submit"
                     className="w-100 py-2 fw-bold text-uppercase tracking-wider shadow-sm"
                     disabled={loading}
                   >
                     {loading ? <Spinner animation="border" size="sm" /> : (view === 'login' ? 'Entrar' : 'Criar Conta')}
                   </Button>
                 </Form>
                ) : view === 'forgot' ? (
                  <Form onSubmit={handleRequestReset}>
                    <p className="small text-light opacity-75 mb-4 text-center px-2">
                       Introduza o número de telefone da sua conta para receber o código de recuperação.
                    </p>
                    <Form.Group className="mb-4">
                      <Form.Label className="text-uppercase small fw-bold opacity-75 mb-1 px-1">Número de Telefone</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        placeholder="Ex: 841234567"
                        className="bg-dark bg-opacity-50 border-secondary text-white rounded-3 py-2 px-3 focus-none shadow-none"
                      />
                    </Form.Group>
                    <Button variant="primary" type="submit" className="w-100 py-2 fw-bold rounded-3 mb-2" disabled={loading}>
                      {loading ? <Spinner animation="border" size="sm" /> : 'Enviar Código'}
                    </Button>
                    <Button variant="link" className="w-100 text-white opacity-75 small text-decoration-none" onClick={() => setView('login')}>
                      Voltar ao Login
                    </Button>
                  </Form>
                ) : (
                  <Form onSubmit={handleResetPassword}>
                    <p className="small text-light opacity-75 mb-4 text-center px-2">
                       Introduza o código de 6 dígitos enviado para o seu WhatsApp e a sua nova senha.
                    </p>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-uppercase small fw-bold opacity-75 mb-1 px-1">Código de Recuperação</Form.Label>
                      <Form.Control
                        type="text"
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        required
                        maxLength="6"
                        placeholder="000000"
                        className="bg-dark bg-opacity-50 border-secondary text-white rounded-3 py-2 px-3 focus-none shadow-none text-center tracking-widest fw-bold"
                      />
                    </Form.Group>
                    <Form.Group className="mb-4">
                      <Form.Label className="text-uppercase small fw-bold opacity-75 mb-1 px-1">Nova Senha</Form.Label>
                      <Form.Control
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        required
                        placeholder="••••••••"
                        className="bg-dark bg-opacity-50 border-secondary text-white rounded-3 py-2 px-3 focus-none shadow-none"
                      />
                    </Form.Group>
                    <Button variant="primary" type="submit" className="w-100 py-2 fw-bold rounded-3 mb-2" disabled={loading}>
                      {loading ? <Spinner animation="border" size="sm" /> : 'Confirmar Nova Senha'}
                    </Button>
                    <Button variant="link" className="w-100 text-white opacity-75 small text-decoration-none" onClick={() => setView('login')}>
                      Cancelar
                    </Button>
                  </Form>
                )}

                <div className="mt-4 text-center small text-light opacity-75">
                  {view === 'login' ? (
                    <p className="mb-0">
                      Não tem uma conta?{' '}
                      <button onClick={() => setView('register')} className="btn btn-link text-primary fw-bold p-0 small text-decoration-none">
                        Registe-se
                      </button>
                    </p>
                  ) : view === 'register' ? (
                    <p className="mb-0">
                      Já tem uma conta?{' '}
                      <button onClick={() => setView('login')} className="btn btn-link text-primary fw-bold p-0 small text-decoration-none">
                        Fazer Login
                      </button>
                    </p>
                  ) : null}
                </div>
              </Card.Body>
            </Card>
            <p className="mt-4 text-center text-muted small opacity-50">
              &copy; 2024 FambaXitique. Desenvolvido para Moçambique.
            </p>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;
