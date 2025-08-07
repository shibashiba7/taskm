import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './TaskApp.css'; // 既存のCSSを再利用

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const TASKS_API_URL = `${API_BASE_URL}/api/tasks`;
const ASSIGNEES_API_URL = `${API_BASE_URL}/api/assignees`;

function AddTaskPage() {
  const navigate = useNavigate();
  const location = useLocation(); // useLocationを追加
  const [taskName, setTaskName] = useState('');
  const [assignees, setAssignees] = useState([]);
  const [assigneeSuggestions, setAssigneeSuggestions] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [currentAssignee, setCurrentAssignee] = useState('');

  useEffect(() => {
    fetchAssignees();
    // コピー元のタスクデータがあれば、stateを初期化
    if (location.state && location.state.taskToCopy) {
      const { taskToCopy } = location.state;
      setTaskName(taskToCopy.taskName);
      setAssignees(taskToCopy.assignees.map(a => a.name));
      setDueDate(taskToCopy.dueDate);
    }
  }, [location.state]); // location.stateが変更されたときに再実行

  const fetchAssignees = async () => {
    try {
      const response = await fetch(ASSIGNEES_API_URL);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setAssigneeSuggestions(data.sort());
    } catch (error) {
      console.error('担当者リストの取得に失敗しました:', error);
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!taskName || assignees.length === 0 || !dueDate) return;

    const newTask = { taskName, assignees: [...new Set(assignees)].join(','), dueDate };
    const response = await fetch(TASKS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    });

    if (response.ok) {
      setTaskName('');
      setAssignees([]);
      setDueDate('');
      setCurrentAssignee('');
      navigate('/'); // タスク一覧ページに戻る
    }
  };

  const handleAddAssigneeToTask = () => {
    const newAssignee = currentAssignee.trim();
    if (newAssignee && !assignees.includes(newAssignee)) {
      setAssignees([...assignees, newAssignee]);
    }
    setCurrentAssignee('');
  };

  const handleRemoveAssigneeFromTask = (assigneeToRemove) => {
    setAssignees(assignees.filter(assignee => assignee !== assigneeToRemove));
  };

  return (
    <div className="task-app-container">
      <div className="app-header">
        <h1>新しいタスクを追加</h1>
        <button onClick={() => navigate('/')} className="manage-assignees-button">タスク一覧に戻る</button>
      </div>

      <form onSubmit={addTask} className="task-form">
        <input
          type="text"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="タスク内容"
          required
          className="task-input"
        />
        <div className="assignee-input-section">
          <input
            list="assignee-suggestions"
            value={currentAssignee}
            onChange={(e) => setCurrentAssignee(e.target.value)}
            placeholder="担当者名を入力または選択"
            className="assignee-input"
          />
          <datalist id="assignee-suggestions">
            {assigneeSuggestions.map((name) => (<option key={name} value={name} />))}
          </datalist>
          <button type="button" onClick={handleAddAssigneeToTask} className="add-assignee-button">追加</button>
        </div>
        <div className="selected-assignees">
          {assignees.map(name => (
            <div key={name} className="selected-assignee">
              {name}
              <button type="button" onClick={() => handleRemoveAssigneeFromTask(name)} className="remove-assignee-button">x</button>
            </div>
          ))}
        </div>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
          className="date-input"
        />
        <button type="submit" className="submit-button">タスク追加</button>
      </form>
    </div>
  );
}

export default AddTaskPage;