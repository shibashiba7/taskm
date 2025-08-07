import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TaskApp.css'; // 既存のCSSを再利用

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token); // トークンを保存
        navigate('/tasks/office'); // ログイン成功後、タスク一覧へ
      } else {
        alert('ログインに失敗しました。');
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      alert('ログイン中にエラーが発生しました。');
    }
  };

  return (
    <div className="task-app-container">
      <div className="app-header">
        <h1>ログイン</h1>
      </div>
      <form onSubmit={handleLogin} className="task-form">
        <input
          type="text"
          placeholder="ユーザー名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="submit-button">ログイン</button>
        <button type="button" onClick={() => navigate('/register')} className="manage-assignees-button">新規登録はこちら</button>
      </form>
    </div>
  );
}

export default LoginPage;