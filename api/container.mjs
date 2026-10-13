import { app } from '../server/app.js';
const port = Number(process.env.PORT || 80);
app.listen(port, '0.0.0.0');
