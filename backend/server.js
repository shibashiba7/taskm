const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const tasksFilePath = path.join(__dirname, 'tasks.json');
const assigneesFilePath = path.join(__dirname, 'assignees.json');

const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000', // 環境変数CORS_ORIGINがあればそれを使用、なければlocalhost:3000
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// --- Assignee Functions ---
const readAssignees = () => {
  try {
    const data = fs.readFileSync(assigneesFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT' || error.message.includes('Unexpected end of JSON input')) {
      return [];
    }
    throw error;
  }
};

const writeAssignees = (assignees) => {
  fs.writeFileSync(assigneesFilePath, JSON.stringify(assignees, null, 2));
};

// --- Task Functions ---
const readTasks = () => {
  try {
    const data = fs.readFileSync(tasksFilePath, 'utf8');
    const tasks = JSON.parse(data);
    // isDeleted プロパティがないタスクにデフォルト値を設定
    return tasks.map(task => ({ ...task, isDeleted: task.isDeleted === undefined ? false : task.isDeleted }));
  } catch (error) {
    if (error.code === 'ENOENT' || error.message.includes('Unexpected end of JSON input')) {
      return [];
    }
    throw error;
  }
};

const writeTasks = (tasks) => {
  fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2));
};

// --- Assignee API Endpoints ---
app.get('/api/assignees', (req, res) => {
  res.json(readAssignees());
});

app.post('/api/assignees', (req, res) => {
  const assignees = readAssignees();
  const { name } = req.body;

  if (!name) {
    return res.status(400).send('Assignee name is required.');
  }
  if (assignees.includes(name)) {
    return res.status(409).send('Assignee already exists.');
  }

  assignees.push(name);
  writeAssignees(assignees);
  res.status(201).json({ name });
});

app.delete('/api/assignees/:name', (req, res) => {
  let assignees = readAssignees();
  const nameToDelete = req.params.name;
  const updatedAssignees = assignees.filter(a => a !== nameToDelete);

  if (assignees.length === updatedAssignees.length) {
    return res.status(404).send('Assignee not found.');
  }

  writeAssignees(updatedAssignees);
  res.status(204).send();
});


// --- Task API Endpoints ---
app.get('/api/tasks', (req, res) => {
  let tasks = readTasks();
  const { type, deleted } = req.query; // deleted を追加

  // isDeleted でフィルタリング
  if (deleted === 'true') {
    tasks = tasks.filter(task => task.isDeleted === true);
  } else {
    tasks = tasks.filter(task => task.isDeleted === false);
  }

  if (type) {
    const filteredTasks = tasks.filter(task => task.taskType === type);
    return res.json(filteredTasks);
  }
  res.json(tasks);
});

app.get('/api/tasks/search', (req, res) => {
  const query = req.query.q ? req.query.q.toLowerCase() : '';
  const type = req.query.type;
  let tasks = readTasks();

  if (type) {
    tasks = tasks.filter(task => task.taskType === type);
  }

  if (!query) {
    return res.json(tasks);
  }

  const filteredTasks = tasks.filter(task => {
    const taskNameMatch = task.taskName.toLowerCase().includes(query);
    const assigneeMatch = task.assignees.some(assignee => assignee.name.toLowerCase().includes(query));
    return taskNameMatch || assigneeMatch;
  });
  res.json(filteredTasks);
});

app.post('/api/tasks', (req, res) => {
  const tasks = readTasks();
  const { taskName, assignees, dueDate, taskType } = req.body;

  if (!taskName || !assignees || !dueDate || !taskType) {
    return res.status(400).send('Task name, assignees, due date, and task type are required.');
  }

  const assigneeNames = assignees.split(',').map(name => name.trim());

  // Add new assignees to the central list
  const allAssignees = readAssignees();
  let updated = false;
  assigneeNames.forEach(name => {
    if (!allAssignees.includes(name)) {
      allAssignees.push(name);
      updated = true;
    }
  });
  if (updated) {
    writeAssignees(allAssignees);
  }

  const assigneeArray = assigneeNames.map(name => ({
    name: name,
    completed: false,
    completedAt: null
  }));

  const newTask = {
    id: Date.now(),
    taskName,
    dueDate,
    assignees: assigneeArray,
    taskType,
    isDeleted: false, // 追加
  };

  tasks.push(newTask);
  writeTasks(tasks);
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id/assignee', (req, res) => {
  const tasks = readTasks();
  const taskId = parseInt(req.params.id);
  const { assigneeName, completed } = req.body;

  const taskIndex = tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) {
    return res.status(404).send('Task not found');
  }

  const task = tasks[taskIndex];
  const assigneeIndex = task.assignees.findIndex(a => a.name === assigneeName);
  if (assigneeIndex === -1) {
    return res.status(404).send('Assignee not found');
  }

  task.assignees[assigneeIndex].completed = completed;
  task.assignees[assigneeIndex].completedAt = completed ? new Date().toISOString() : null;

  writeTasks(tasks);
  res.json(task);
});

app.put('/api/tasks/:id', (req, res) => {
  const tasks = readTasks();
  const taskId = parseInt(req.params.id);
  const { taskName, assignees, dueDate, taskType } = req.body;

  const taskIndex = tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) {
    return res.status(404).send('Task not found.');
  }

  if (!taskName || !assignees || !dueDate || !taskType) {
    return res.status(400).send('Task name, assignees, due date, and task type are required.');
  }

  const assigneeNames = assignees.split(',').map(name => name.trim());

  // Add new assignees to the central list
  const allAssignees = readAssignees();
  let updatedAssigneesList = false;
  assigneeNames.forEach(name => {
    if (!allAssignees.includes(name)) {
      allAssignees.push(name);
      updatedAssigneesList = true;
    }
  });
  if (updatedAssigneesList) {
    writeAssignees(allAssignees);
  }

  const assigneeArray = assigneeNames.map(name => {
    // Preserve existing completion status and comment if assignee already exists for this task
    const existingAssignee = tasks[taskIndex].assignees.find(a => a.name === name);
    return {
      name: name,
      completed: existingAssignee ? existingAssignee.completed : false,
      completedAt: existingAssignee ? existingAssignee.completedAt : null
    };
  });

  const updatedTask = {
    ...tasks[taskIndex],
    taskName,
    dueDate,
    assignees: assigneeArray,
    taskType,
  };

  tasks[taskIndex] = updatedTask;
  writeTasks(tasks);
  res.json(updatedTask);
});

app.delete('/api/tasks/:id', (req, res) => {
  const tasks = readTasks();
  const taskId = parseInt(req.params.id);
  const taskIndex = tasks.findIndex((t) => t.id === taskId);

  if (taskIndex === -1) {
    return res.status(404).send('Task not found');
  }

  tasks[taskIndex].isDeleted = true; // isDeleted を true に設定
  writeTasks(tasks);
  res.status(200).json(tasks[taskIndex]); // 削除されたタスクを返す
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});