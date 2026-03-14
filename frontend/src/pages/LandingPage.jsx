import React from 'react';
import { Container, Row, Col, Button, Card, Navbar, Nav, Badge } from 'react-bootstrap';

const LandingPage = ({ onStart }) => {
  return (
    <div className="bg-darker min-vh-100 text-white overflow-hidden">
      {/* Decorative Gradients */}
      <div className="position-absolute top-0 start-0 w-100 h-100 famba-gradient-bg" style={{ zIndex: 0, opacity: 0.6 }}></div>
      <div className="position-absolute top-0 end-0 p-5 rounded-circle bg-primary opacity-10 blur-3xl" style={{ width: '400px', height: '400px', filter: 'blur(100px)' }}></div>
      
      {/* Navbar */}
      <Navbar expand="lg" variant="dark" className="py-4 position-relative" style={{ zIndex: 10 }}>
        <Container>
          <Navbar.Brand href="#" className="fs-3 fw-black tracking-tighter">
            <span className="logo-f">F</span>amba<span className="logo-x">X</span>itique
          </Navbar.Brand>
          <Nav className="ms-auto">
            <Button 
                variant="outline-light" 
                className="rounded-pill px-4 fw-bold border-0 bg-white bg-opacity-10"
                onClick={onStart}
            >
              Entrar
            </Button>
          </Nav>
        </Container>
      </Navbar>

      {/* Hero Section */}
      <Container className="position-relative mt-5 pt-lg-5" style={{ zIndex: 10 }}>
        <Row className="align-items-center min-vh-75">
          <Col lg={6} className="text-center text-lg-start animate-fade-in">
            <Badge bg="primary" className="mb-3 px-3 py-2 rounded-pill bg-opacity-25 text-primary border border-primary border-opacity-25 fw-bold">
              🚀 O Futuro das Poupanças Sociais
            </Badge>
            <h1 className="display-2 fw-black mb-4 leading-tight">
              O Seu <span className="text-gradient">Xitique</span><br />
              Agora é Digital.
            </h1>
            <p className="lead text-white-50 mb-5 pe-lg-5">
              Automatize suas poupanças em grupo, receba alertas no WhatsApp e peça empréstimos com a confiança da sua comunidade. Simples, seguro e transparente.
            </p>
            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-lg-start">
              <Button 
                variant="primary" 
                size="lg" 
                className="rounded-pill px-5 py-3 fs-5 shadow-lg"
                onClick={onStart}
              >
                Começar Agora
              </Button>
              <Button 
                variant="outline-light" 
                size="lg" 
                className="rounded-pill px-5 py-3 fs-5 border-white border-opacity-25"
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              >
                Saber Mais
              </Button>
            </div>
          </Col>
          <Col lg={6} className="mt-5 mt-lg-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="position-relative">
              <div className="glass-card p-2 p-lg-4 rotate-3 shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&q=80&w=1000" 
                  alt="Finance App" 
                  className="img-fluid rounded-4 shadow"
                  style={{ minHeight: '400px', objectFit: 'cover' }}
                />
              </div>
              {/* Floating Badge */}
              <div className="position-absolute bottom-0 start-0 mb-n4 ms-n4 glass-card p-3 animate-bounce shadow-lg d-none d-md-block" style={{ width: '200px' }}>
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-success rounded-circle p-2"><i className="bi bi-check-lg text-white"></i></div>
                  <div>
                    <div className="small text-white-50">Depósito Confirmado</div>
                    <div className="fw-bold fs-5">1.000 MT</div>
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Features Section */}
      <Container id="features" className="py-5 my-5 position-relative" style={{ zIndex: 10 }}>
        <div className="text-center mb-5 pb-5">
          <h2 className="display-4 fw-black text-gradient">Porquê o FambaXitique?</h2>
          <p className="text-white-50 fs-5">Tudo o que você precisa para gerir o seu grupo financeiro.</p>
        </div>
        
        <Row className="g-4">
          <Col md={4} className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Card className="glass-card h-100 p-4">
              <div className="bg-primary rounded-4 p-3 mb-4 d-inline-block bg-opacity-10 border border-primary border-opacity-25" style={{ width: 'fit-content' }}>
                <i className="bi bi-whatsapp fs-3 text-primary"></i>
              </div>
              <h3 className="h4 fw-bold mb-3">Bot no WhatsApp</h3>
              <p className="text-white-50 mb-0">
                Receba lembretes de pagamento, códigos OTP e confirmações instantâneas diretamente no seu WhatsApp.
              </p>
            </Card>
          </Col>
          <Col md={4} className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Card className="glass-card h-100 p-4">
              <div className="bg-secondary rounded-4 p-3 mb-4 d-inline-block bg-opacity-10 border border-secondary border-opacity-25" style={{ width: 'fit-content' }}>
                <i className="bi bi-file-earmark-pdf fs-3 text-secondary"></i>
              </div>
              <h3 className="h4 fw-bold mb-3">Automação Total</h3>
              <p className="text-white-50 mb-0">
                Faturas geradas mensalmente e recibos PDF prontos para download. Sem papelada, sem confusão.
              </p>
            </Card>
          </Col>
          <Col md={4} className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <Card className="glass-card h-100 p-4">
              <div className="bg-info rounded-4 p-3 mb-4 d-inline-block bg-opacity-10 border border-info border-opacity-25" style={{ width: 'fit-content' }}>
                <i className="bi bi-shield-lock-fill fs-3 text-info"></i>
              </div>
              <h3 className="h4 fw-bold mb-3">Lending Comunitário</h3>
              <p className="text-white-50 mb-0">
                Solicite empréstimos com aprovação democrática. O grupo vota e o sistema gere os juros automaticamente.
              </p>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Footer / CTA */}
      <div className="py-5 text-center mt-5">
        <Container className="position-relative py-5">
            <div className="glass-card p-5 overflow-hidden position-relative">
                <div className="position-absolute top-0 start-0 w-100 h-100 bg-primary opacity-5"></div>
                <h2 className="display-5 fw-black mb-4 position-relative">Pronto para digitalizar o seu grupo?</h2>
                <Button 
                    variant="primary" 
                    size="lg" 
                    className="rounded-pill px-5 py-3 fs-5 position-relative shadow-lg border border-white border-opacity-10"
                    onClick={onStart}
                >
                    Criar conta agora
                </Button>
            </div>
            <div className="mt-5 text-white-50 small">
                © 2026 FambaXitique. Todos os direitos reservados.
            </div>
        </Container>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .blur-3xl { filter: blur(64px); }
        .rotate-3 { transform: rotate(3deg); transition: transform 0.5s ease; }
        .rotate-3:hover { transform: rotate(0deg); }
        .tracking-tighter { letter-spacing: -0.05em; }
        .fw-black { font-weight: 900; }
        .min-vh-75 { min-height: 75vh; }
      `}} />
    </div>
  );
};

export default LandingPage;
