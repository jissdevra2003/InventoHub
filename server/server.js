import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';    

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('<h3>Welcome to InventoHub Server!</h3>');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});