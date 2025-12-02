import express from 'express';
import {Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';    

dotenv.config();

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '3000');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response ) => {
  res.send('<h1>Welcome to InventoHub Server your one place to manage all inventory tasks!</h1>');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
