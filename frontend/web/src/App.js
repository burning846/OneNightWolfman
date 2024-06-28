import logo from './logo.svg';
import './App.css';
import Register from './components/Register';
import Login from './components/Login';

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import JoinRoom from './components/JoinRoom';
import Room from './components/Room';

function App() {
  return (
    // <div className="App">
    //   <header className="App-header">
    //     <img src={logo} className="App-logo" alt="logo" />
    //     <p>
    //       Edit <code>src/App.js</code> and save to reload.
    //     </p>
    //     <a
    //       className="App-link"
    //       href="https://reactjs.org"
    //       target="_blank"
    //       rel="noopener noreferrer"
    //     >
    //       Learn React
    //     </a>
      
    //   </header>

    //   <Login />
    //   <Register />
    // </div>

      <Router>
        <Routes>
          <Route path="/" element={<JoinRoom />} />
          <Route path="/room/:roomCode" element={<Room />} />
        </Routes>
      </Router>
  );
}

export default App;
