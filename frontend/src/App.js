import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TaskApp from './TaskApp';
import AddTaskPage from './AddTaskPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/tasks/:taskType" element={<TaskApp />} />
        <Route path="/add-task/:taskType" element={<AddTaskPage />} />
        <Route path="*" element={<Navigate to="/tasks/office" replace />} />
      </Routes>
    </Router>
  );
}

export default App;