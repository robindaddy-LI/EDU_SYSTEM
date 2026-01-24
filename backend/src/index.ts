import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;


import classSessionsRouter from './routes/classSessions';

app.use(cors());
app.use(express.json());

app.use('/api/v1/sessions', classSessionsRouter);

app.get('/', (req, res) => {
    res.send('Education System API is running!');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
