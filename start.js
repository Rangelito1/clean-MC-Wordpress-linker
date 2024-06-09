import cron from 'node-cron';
import { exec } from 'child_process';

// Define la tarea que deseas ejecutar cada minuto y 15 segundos
const task = cron.schedule('*/1 * * * *', () => {
  // Ejecuta el archivo index.js
  exec('node index.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error al ejecutar el archivo: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Error de salida estándar: ${stderr}`);
      return;
    }
    console.log(`Salida estándar: ${stdout}`);
  });
}, {
  scheduled: true,
  timezone: 'America/New_York' // Ajusta la zona horaria según tu ubicación
});

// Inicia la tarea
task.start();
