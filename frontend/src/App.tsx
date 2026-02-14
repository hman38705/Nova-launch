import { Header, Container } from './components/Layout';
import { Card } from './components/UI';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header>
        {/* Wallet connect button will go here */}
      </Header>
      <Container>
        <Card title="Deploy Your Token">
          <p className="text-gray-600">
            Welcome to Stellar Token Deployer. Connect your wallet to get started.
          </p>
        </Card>
      </Container>
    </div>
  );
}

export default App;
