import './App.css';
import Recorder from './components/Recorder';

/**
 * Main application component for VoxInterview
 * A voice-powered mock interview platform with AI feedback
 */
function App() {
  return (
    <div className='app-container'>
      <h1>VoxInterview</h1>
      <Recorder />
    </div>
  );
}

export default App;
