import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TaskApp from './TaskApp';
import AddTaskPage from './AddTaskPage';
import LoginPage from './LoginPage'; // 追加
import RegisterPage from './RegisterPage'; // 追加
import { AuthProvider, useAuth } from './AuthContext'; // 追加

// 保護されたルートコンポーネント
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  console.log('isAuthenticated:', isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;

function App() {
  return (
    <Router>
      <AuthProvider> {/* AuthProvider でラップ */}
        <Routes>
          <Route path="/login" element={<LoginPage />} /> {/* ログインページ */}
          <Route path="/register" element={<RegisterPage />} /> {/* 登録ページ */}

          {/* 保護されたルート */}
          <Route path="/tasks/:taskType" element={<PrivateRoute><TaskApp /></PrivateRoute>} />
          <Route path="/add-task/:taskType" element={<PrivateRoute><AddTaskPage /></PrivateRoute>} />
          
          {/* デフォルトルートをログインページにリダイレクト */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;