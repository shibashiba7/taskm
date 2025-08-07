import React, { useState, useEffect } from 'react';

function TaskEditForm({ task, assigneeSuggestions, onSave, onCancel }) {
  const [taskName, setTaskName] = useState(task.taskName);
  const [dueDate, setDueDate] = useState(task.dueDate.split('T')[0]); // YYYY-MM-DD 形式に変換
  const [selectedAssignees, setSelectedAssignees] = useState(task.assignees.map(a => a.name));
  const [newAssigneeInput, setNewAssigneeInput] = useState('');

  const handleAssigneeChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setSelectedAssignees([...selectedAssignees, value]);
    } else {
      setSelectedAssignees(selectedAssignees.filter(assignee => assignee !== value));
    }
  };

  const handleNewAssigneeAdd = (e) => {
    e.preventDefault();
    const name = newAssigneeInput.trim();
    if (name && !selectedAssignees.includes(name)) {
      setSelectedAssignees([...selectedAssignees, name]);
      setNewAssigneeInput('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!taskName || !dueDate || selectedAssignees.length === 0) {
      alert('タスク名、期日、担当者は必須です。');
      return;
    }
    onSave(task.id, {
      taskName,
      dueDate,
      assignees: selectedAssignees.join(','), // カンマ区切りで文字列として渡す
    });
  };

  return (
    <td colSpan="4"> {/* 4列を結合 */}
      <form onSubmit={handleSubmit} className="edit-task-form">
        <div className="form-group">
          <label>タスク名:</label>
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>期日:</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>担当者:</label>
          <div className="assignee-checkboxes">
            {assigneeSuggestions.map(assignee => (
              <label key={assignee}>
                <input
                  type="checkbox"
                  value={assignee}
                  checked={selectedAssignees.includes(assignee)}
                  onChange={handleAssigneeChange}
                />
                {assignee}
              </label>
            ))}
          </div>
          <div className="new-assignee-input">
            <input
              type="text"
              value={newAssigneeInput}
              onChange={(e) => setNewAssigneeInput(e.target.value)}
              placeholder="新しい担当者を追加"
            />
            <button type="button" onClick={handleNewAssigneeAdd}>追加</button>
          </div>
        </div>
        <div className="form-actions">
          <button type="submit">保存</button>
          <button type="button" onClick={onCancel}>キャンセル</button>
        </div>
      </form>
    </td>
  );
}

export default TaskEditForm;