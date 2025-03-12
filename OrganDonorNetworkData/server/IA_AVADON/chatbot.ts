import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

interface ChatbotResponse {
  response: string;
  success: boolean;
}

export class Chatbot {
  private pythonScriptPath: string;
  private intentionsPath: string;

  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    this.pythonScriptPath = path.join(__dirname, 'neural_chatbot.py');
    this.intentionsPath = path.join(__dirname, 'Biblioteca_de_intenciones.json');

    // Verificar que los archivos existan
    this.checkFiles();
  }

  private checkFiles() {
    const files = [
      { path: this.intentionsPath, name: 'Biblioteca de intenciones' },
      { path: this.pythonScriptPath, name: 'Script de Python' }
    ];

    files.forEach(file => {
      if (!fs.existsSync(file.path)) {
        throw new Error(`Error: ${file.name} no encontrado en ${file.path}`);
      }
      console.log(`${file.name} encontrado correctamente en ${file.path}`);
    });
  }

  async processMessage(message: string): Promise<ChatbotResponse> {
    return new Promise((resolve) => {
      console.log('Iniciando proceso de Python con:', {
        script: this.pythonScriptPath,
        message,
        intentionsPath: this.intentionsPath
      });

      const pythonProcess = spawn('python3', [
        this.pythonScriptPath,
        '--message', message,
        '--intentions', this.intentionsPath
      ]);

      let responseData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data: Buffer) => {
        console.log('Datos recibidos del script Python:', data.toString());
        responseData += data.toString();
      });

      pythonProcess.stderr.on('data', (data: Buffer) => {
        console.error('Error del script Python:', data.toString());
        errorData += data.toString();
      });

      pythonProcess.on('close', (code: number) => {
        console.log('Proceso Python terminado con código:', code);

        if (code !== 0 || errorData) {
          console.error('Error completo:', errorData);
          resolve({
            response: "Lo siento, hubo un error en el sistema. Por favor, intenta de nuevo en unos momentos.",
            success: false
          });
        } else {
          const cleanResponse = responseData.trim();
          resolve({
            response: cleanResponse || "Entiendo tu mensaje, pero necesito más información para ayudarte mejor.",
            success: true
          });
        }
      });

      // Manejar errores de spawn
      pythonProcess.on('error', (error) => {
        console.error('Error al iniciar el proceso Python:', error);
        resolve({
          response: "Error interno del sistema. Por favor, intenta más tarde.",
          success: false
        });
      });
    });
  }
}