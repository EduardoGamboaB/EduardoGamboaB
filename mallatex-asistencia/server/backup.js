// Respaldo manual del archivo de datos (con rotación).
// Uso:  npm run backup   |   node server/backup.js
import { backup } from './db.js';

const keep = Number(process.env.BACKUP_KEEP) || 14;
const file = backup(keep);
console.log(file ? `Respaldo creado: ${file}` : 'No hay datos que respaldar todavía.');
