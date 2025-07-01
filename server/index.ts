import express from 'express';

const app = express();
app.use(express.json());

app.post('/sync', (req, res) => {
  console.log('Sync records', req.body);
  res.json({ status: 'ok' });
});

app.post('/logs', (req, res) => {
  console.log('Log entry', req.body);
  res.json({ status: 'ok' });
});

app.post('/conflicts', (req, res) => {
  console.log('Conflict alert', req.body);
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
