import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TaskApp from './TaskApp';
import AddTaskPage from './AddTaskPage';

function App() {
  return (
    <Router basename="/taskm">
      <Routes>
        <Route path="/" element={<TaskApp />} />
        <Route path="/add-task" element={<AddTaskPage />} />
      </Routes>
    </Router>
  );
}

export default App;