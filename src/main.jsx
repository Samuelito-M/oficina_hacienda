import { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class Protector extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error(error);
  }
  render() {
    if (this.state.error)
      return (
        <div className="wrap" style={{ paddingBlock: 40 }}>
          <div className="alert bad" role="alert">
            <b>Algo se trabó</b>
            <span>Recarga la página y vuelve a subir los archivos. Tu personal y las cédulas guardadas no se pierden.</span>
            <button className="mini solid" onClick={() => location.reload()}>
              Recargar
            </button>
          </div>
        </div>
      );
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Protector>
      <App />
    </Protector>
  </StrictMode>
);
