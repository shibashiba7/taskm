const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const tasksFilePath = path.join(__dirname, 'tasks.json');
const assigneesFilePath = path.join(__dirname, 'assignees.json');
const usersFilePath = path.join(__dirname, 'users.json'); // 追加
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // 環境変数から取得、なければデフォルト値

const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000', // 環境変数CORS_ORIGINがあればそれを使用、なければlocalhost:3000
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// 認証ミドルウェア
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // トークンがない場合

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // トークンが無効な場合
    req.user = user;
    next();
  });
};

// 保護されたルート
app.use('/api/tasks', authenticateToken);
app.use('/api/assignees', authenticateToken);



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

// --- User Functions ---
const readUsers = () => {
  try {
    const data = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT' || error.message.includes('Unexpected end of JSON input')) {
      return [];
    }
    throw error;
  }
};

const writeUsers = (users) => {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};

// --- Assignee API Endpoints ---
app.get('/api/assignees', (req, res) => {
  const users = readUsers();
  res.json(users.map(user => user.username)); // ユーザー名のみを返す
});

app.post('/api/assignees', async (req, res) => { // async を追加
  const users = readUsers();
  const { name, password } = req.body; // password を追加

  if (!name || !password) { // password のチェックを追加
    return res.status(400).send('Username and password are required.');
  }

  if (users.find(user => user.username === name)) { // username でチェック
    return res.status(409).send('User already exists.');
  }

  const hashedPassword = await bcrypt.hash(password, 10); // パスワードをハッシュ化
  const newUser = { username: name, password: hashedPassword }; // username を使用
  users.push(newUser);
  writeUsers(users);
  res.status(201).json({ name }); // name を返す
});

app.delete('/api/assignees/:name', (req, res) => {
  let users = readUsers();
  const nameToDelete = req.params.name;
  const initialLength = users.length;
  users = users.filter(user => user.username !== nameToDelete); // ユーザーを削除

  if (users.length === initialLength) {
    return res.status(404).send('User not found.');
  }

  writeUsers(users);
  res.status(204).send();
});

// --- Auth API Endpoints ---
app.post('/api/register', async (req, res) => {
  const users = readUsers();
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }

  if (users.find(user => user.username === username)) {
    return res.status(409).send('User already exists.');
  }

  const hashedPassword = await bcrypt.hash(password, 10); // パスワードをハッシュ化
  const newUser = { username, password: hashedPassword };
  users.push(newUser);
  writeUsers(users);
  res.status(201).send('User registered successfully.');
});

app.post('/api/login', async (req, res) => {
  const users = readUsers();
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }

  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(400).send('Invalid credentials.');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).send('Invalid credentials.');
  }

  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
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

  // 担当者（ユーザー）が存在するか確認
  const users = readUsers();
  const invalidAssignees = assigneeNames.filter(name => !users.some(user => user.username === name));
  if (invalidAssignees.length > 0) {
    return res.status(400).send(`Invalid assignees: ${invalidAssignees.join(', ')}. All assignees must be registered users.`);
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

  // 担当者（ユーザー）が存在するか確認
  const users = readUsers();
  const invalidAssignees = assigneeNames.filter(name => !users.some(user => user.username === name));
  if (invalidAssignees.length > 0) {
    return res.status(400).send(`Invalid assignees: ${invalidAssignees.join(', ')}. All assignees must be registered users.`);
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