import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TaskApp.css'; // 既存のCSSを再利用

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        alert('登録が完了しました。ログインしてください。');
        navigate('/login');
      } else {
        alert('登録に失敗しました。ユーザー名が既に存在するか、入力が正しくありません。');
      }
    } catch (error) {
      console.error('登録エラー:', error);
      alert('登録中にエラーが発生しました。');
    }
  };

  return (
    <div className="task-app-container">
      <div className="app-header">
        <h1>新規登録</h1>
      </div>
      <form onSubmit={handleRegister} className="task-form">
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
        <button type="submit" className="submit-button">登録</button>
        <button type="button" onClick={() => navigate('/login')} className="manage-assignees-button">ログインはこちら</button>
      </form>
    </div>
  );
}

export default RegisterPage;