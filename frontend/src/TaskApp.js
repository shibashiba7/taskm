import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // 追加
import TaskEditForm from './TaskEditForm';
import './TaskApp.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const TASKS_API_URL = `${API_BASE_URL}/api/tasks`;
const ASSIGNEES_API_URL = `${API_BASE_URL}/api/assignees`;

function TaskApp() {
  const navigate = useNavigate(); // 追加
  const { taskType } = useParams(); // 追加
  const [tasks, setTasks] = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAssigneeModalOpen, setIsAssigneeModalOpen] = useState(false);
  const [newAssigneeName, setNewAssigneeName] = useState('');
  const [registerUsername, setRegisterUsername] = useState(''); // 追加
  const [registerPassword, setRegisterPassword] = useState(''); // 追加
  const [assigneeSuggestions, setAssigneeSuggestions] = useState([]);
  const [editingTaskId, setEditingTaskId] = useState(null); // 追加
  

  useEffect(() => {
    fetchTasks();
    fetchAssignees();
  }, [searchQuery, taskType]);

  const fetchTasks = useCallback(async () => {
    try {
      const url = searchQuery
        ? `${TASKS_API_URL}/search?q=${searchQuery}&type=${taskType}`
        : `${TASKS_API_URL}?type=${taskType}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();

      // isDeleted が false のタスクのみをフィルタリング
      const activeTasks = data.filter(task => !task.isDeleted);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const filteredOverdue = activeTasks.filter(task => { // activeTasks を使用
        const dueDate = new Date(task.dueDate);

        return dueDate.getTime() < today.getTime();
      });

      const filteredUpcoming = activeTasks.filter(task => { // activeTasks を使用
        const dueDate = new Date(task.dueDate);

        return dueDate.getTime() >= today.getTime();
      }).sort((a, b) => {
        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        return dateA.getTime() - dateB.getTime();
      });

      setOverdueTasks(filteredOverdue);
      setUpcomingTasks(filteredUpcoming);
      setTasks(activeTasks); // tasks stateも更新しておく
    } catch (error) {
      console.error('Fetch Error:', error);
    }
  }, [searchQuery, taskType]);

  const fetchAssignees = useCallback(async () => {
    try {
      const response = await fetch(ASSIGNEES_API_URL);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setAssigneeSuggestions(data.sort());
    } catch (error) {
      console.error('担当者リストの取得に失敗しました:', error);
    }
  }, []);

  

  

  const handleAssigneeUpdate = async (task, assigneeName, completed, comment) => {
    const response = await fetch(`${TASKS_API_URL}/${task.id}/assignee`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ assigneeName, completed }),
    });
    if (response.ok) fetchTasks();
  };

  const handleUpdateTask = async (taskId, updatedData) => {
    try {
      const response = await fetch(`${TASKS_API_URL}/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedData, taskType }),
      });
      if (!response.ok) throw new Error('Network response was not ok');
      setEditingTaskId(null); // 編集モードを終了
      fetchTasks(); // タスクリストを再取得
    } catch (error) {
      console.error('タスクの更新に失敗しました:', error);
      alert('タスクの更新に失敗しました。');
    }
  };

  const deleteTask = async (taskId) => {
    if (window.confirm('このタスクを削除しますか？')) {
      const response = await fetch(`${TASKS_API_URL}/${taskId}`, { method: 'DELETE' }); // type クエリパラメータを削除
      if (response.ok) {
        fetchTasks(); // アクティブなタスクリストを更新
      }
    }
  };

  const handleAddAssigneeInModal = async (e) => {
    e.preventDefault();
    const name = newAssigneeName.trim();
    if (!name) return;

    const response = await fetch(ASSIGNEES_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (response.ok) {
      setNewAssigneeName('');
      fetchAssignees(); // This will refresh the list
    } else if (response.status === 409) {
      alert('この担当者は既に追加されています。');
    }
  };

  const handleRegisterUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: registerUsername, password: registerPassword }),
      });

      if (response.ok) {
        alert('ユーザー登録が完了しました。');
        setRegisterUsername('');
        setRegisterPassword('');
      } else {
        alert('ユーザー登録に失敗しました。ユーザー名が既に存在するか、入力が正しくありません。');
      }
    } catch (error) {
      console.error('ユーザー登録エラー:', error);
      alert('ユーザー登録中にエラーが発生しました。');
    }
  };

  const handleDeleteAssignee = async (name) => {
    if (window.confirm(`担当者「${name}」を候補リストから削除しますか？`)) {
      const response = await fetch(`${ASSIGNEES_API_URL}/${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (response.ok) fetchAssignees();
    }
  };

  const handleCopyTask = (task) => {
    navigate('/add-task', { state: { taskToCopy: task } });
  };

  return (
    <div className="task-app-container">
      <div className="app-header">
        <h1>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-clipboard-check" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z"/>
            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
          </svg>
          タスク一覧 {taskType && `(${taskType})`}
        </h1>
        <div>
          <button onClick={() => setIsAssigneeModalOpen(true)} className="manage-assignees-button">担当者管理</button>
          <button onClick={() => navigate(`/add-task/${taskType}`)} className="add-task-button">タスク追加</button> {/* 追加 */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="タスクを検索..."
            className="search-input"
          />
        </div>
      </div>

      {isAssigneeModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>担当者管理</h2>
            <form onSubmit={handleAddAssigneeInModal} className="add-assignee-form">
              <input
                type="text"
                value={newAssigneeName}
                onChange={(e) => setNewAssigneeName(e.target.value)}
                placeholder="新しい担当者名"
                required
              />
              <button type="submit">追加</button>
            </form>

            <h3>新規ユーザー登録</h3> {/* 追加 */}
            <form onSubmit={handleRegisterUser} className="add-assignee-form"> {/* add-assignee-form を再利用 */}
              <input
                type="text"
                placeholder="ユーザー名"
                value={registerUsername}
                onChange={(e) => setRegisterUsername(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="パスワード"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                required
              />
              <button type="submit">登録</button>
            </form>
            <ul className="assignee-management-list">
              {assigneeSuggestions.map(name => (
                <li key={name}>
                  {name}
                  <button onClick={() => handleDeleteAssignee(name)} className="delete-assignee-button">削除</button>
                </li>
              ))}
            </ul>
            <button onClick={() => setIsAssigneeModalOpen(false)} className="close-modal-button">閉じる</button>
          </div>
        </div>
      )}

      <h2>現在のタスク</h2>
      <div className="task-table-container">
        <table className="task-table">
          <thead>
            <tr>
              <th>タスク内容</th>
              <th>期限</th>
              <th>担当者と進捗</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {upcomingTasks.map((task) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0); // 今日の日付の0時0分0秒に設定
              const dueDate = new Date(task.dueDate);
       // 期限日の0時0分0秒に設定

              const diffTime = dueDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              let rowClassName = '';
              if (diffDays < 0) { // 期限切れ
                rowClassName = 'overdue';
              } else if (diffDays <= 1) { // 1日以内
                rowClassName = 'due-soon-red';
              } else if (diffDays <= 3) { // 3日以内
                rowClassName = 'due-soon-yellow';
              }

              return (
                <tr key={task.id} className={rowClassName}>
                  {editingTaskId === task.id ? (
                    <TaskEditForm
                      task={task}
                      assigneeSuggestions={assigneeSuggestions}
                      onSave={handleUpdateTask}
                      onCancel={() => setEditingTaskId(null)}
                    />
                  ) : (
                    <>
                      <td>{task.taskName}</td>
                      <td>
                        {new Date(task.dueDate).toLocaleString('ja-JP', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', hourCycle: 'h23' })}時
                        
                      </td>
                      <td>
                        {task.assignees.map((assignee) => (
                          <div key={assignee.name} className="assignee-item">
                            <label>
                              <input
                                type="checkbox"
                                checked={assignee.completed}
                                onChange={() => handleAssigneeUpdate(task, assignee.name, !assignee.completed, assignee.comment)}
                              />
                              {assignee.name}
                              {assignee.completedAt && ` (完了: ${new Date(assignee.completedAt).toLocaleString()})`}
                            </label>
                            
                          </div>
                        ))}
                      </td>
                      <td>
                        <button onClick={() => setEditingTaskId(task.id)} className="edit-button">編集</button>
                        <button onClick={() => deleteTask(task.id)} className="delete-button">削除</button>
                        <button onClick={() => handleCopyTask(task)} className="copy-button">コピー</button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>期限切れタスク</h2>
      <div className="task-table-container">
        <table className="task-table">
          <thead>
            <tr>
              <th>タスク内容</th>
              <th>期限</th>
              <th>担当者と進捗</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {overdueTasks.map((task) => (
              <tr key={task.id} className="overdue">
                {editingTaskId === task.id ? (
                  <TaskEditForm
                    task={task}
                    assigneeSuggestions={assigneeSuggestions}
                    onSave={handleUpdateTask}
                    onCancel={() => setEditingTaskId(null)}
                  />
                ) : (
                  <>
                    <td>{task.taskName}</td>
                    <td>
                      {new Date(task.dueDate).toLocaleString('ja-JP', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', hourCycle: 'h23' })}時
                      
                    </td>
                    <td>
                      {task.assignees.map((assignee) => (
                        <div key={assignee.name} className="assignee-item">
                          <label>
                            <input
                              type="checkbox"
                              checked={assignee.completed}
                              onChange={() => handleAssigneeUpdate(task, assignee.name, !assignee.completed, assignee.comment)}
                            />
                            {assignee.name}
                            {assignee.completedAt && ` (完了: ${new Date(assignee.completedAt).toLocaleString()})`}
                          </label>
                          
                        </div>
                      ))}
                    </td>
                    <td>
                      <button onClick={() => setEditingTaskId(task.id)} className="edit-button">編集</button>
                      <button onClick={() => deleteTask(task.id)} className="delete-button">削除</button>
                      <button onClick={() => handleCopyTask(task)} className="copy-button">コピー</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      
    </div>
  );
}

export default TaskApp;
