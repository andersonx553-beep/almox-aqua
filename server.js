import express from 'express';

const app = express();
const port = 3001;

app.use(express.json());

app.get('/api/status', (request, response) => {
  response.json({
    sistema: 'ALMX',
    status: 'online',
    mensagem: 'Backend funcionando corretamente!',
  });
});

app.listen(port);