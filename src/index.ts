import express from 'express';
import userRouter from './routes/user.router.js'; // Nota la extensión .js

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Server is OK');
});

app.use('/api', userRouter);  

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});