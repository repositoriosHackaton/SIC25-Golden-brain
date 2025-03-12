import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertPatientSchema } from "@shared/schema";
import { Chatbot } from "./IA_AVADON/chatbot";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const chatbot = new Chatbot();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para guardar el feedback
function saveFeedback(feedback: {
  messageId: string;
  isPositive: boolean;
  userMessage: string;
  botResponse: string;
  timestamp: string;
}) {
  const feedbackPath = path.join(__dirname, 'IA_AVADON', 'feedback_data.json');

  let feedbackData = [];
  try {
    if (fs.existsSync(feedbackPath)) {
      feedbackData = JSON.parse(fs.readFileSync(feedbackPath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error al leer el archivo de feedback:', error);
  }

  feedbackData.push(feedback);

  try {
    // Asegurarse de que el directorio existe
    const dir = path.dirname(feedbackPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(feedbackPath, JSON.stringify(feedbackData, null, 2));
  } catch (error) {
    console.error('Error al guardar el feedback:', error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Nueva ruta para el feedback del chatbot
  app.post("/api/chat/feedback", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    try {
      const { messageId, isPositive, userMessage, botResponse } = req.body;

      saveFeedback({
        messageId,
        isPositive,
        userMessage,
        botResponse,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error al guardar feedback:", error);
      res.status(500).json({ 
        message: "Error al guardar el feedback",
        success: false 
      });
    }
  });

  // Ruta del chatbot
  app.post("/api/chat", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    try {
      const { message } = req.body;
      const response = await chatbot.processMessage(message);
      res.json(response);
    } catch (error) {
      console.error("Error en el chatbot:", error);
      res.status(500).json({ 
        message: "Error al procesar el mensaje",
        success: false 
      });
    }
  });

  // User profile route
  app.patch("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    try {
      const { username, email, profileImage } = req.body;
      const updatedUser = await storage.updateUser(req.user.id, {
        username,
        email,
        profileImage
      });
      res.json(updatedUser);
    } catch (error: any) {
      res.status(400).json({ 
        message: error.message || "Error al actualizar el perfil"
      });
    }
  });

  // Password update route
  app.patch("/api/user/password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    try {
      const { currentPassword, newPassword } = req.body;
      const user = await storage.getUser(req.user.id);

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // Comparamos las contraseñas directamente ya que están en texto plano en la memoria
      // En una aplicación real, deberíamos usar bcrypt o similar
      if (currentPassword !== user.password) {
        console.log('Contraseña proporcionada:', currentPassword);
        console.log('Contraseña almacenada:', user.password);
        return res.status(400).json({ message: "Contraseña actual incorrecta" });
      }

      const updatedUser = await storage.updateUser(req.user.id, {
        password: newPassword
      });

      res.json({ message: "Contraseña actualizada exitosamente" });
    } catch (error: any) {
      res.status(400).json({ 
        message: error.message || "Error al actualizar la contraseña"
      });
    }
  });

  app.get("/api/patients", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const patients = await storage.listPatients();
    res.json(patients);
  });

  app.get("/api/patients/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const patientId = parseInt(req.params.id, 10);
    if (isNaN(patientId)) {
      return res.status(400).json({ message: "ID de paciente inválido" });
    }

    try {
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente no encontrado" });
      }
      res.json(patient);
    } catch (error) {
      console.error("Error al obtener paciente:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/patients", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const validation = insertPatientSchema.safeParse({
        ...req.body,
        admissionDate: new Date(req.body.admissionDate)
      });

      if (!validation.success) {
        return res.status(400).json(validation.error);
      }

      const patient = await storage.createPatient({
        ...validation.data,
        lastUpdatedBy: req.user.id
      });

      res.status(201).json(patient);
    } catch (error) {
      console.error("Error al crear paciente:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.patch("/api/patients/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const patientId = parseInt(req.params.id, 10);
    if (isNaN(patientId)) {
      return res.status(400).json({ message: "ID de paciente inválido" });
    }

    try {
      const validation = insertPatientSchema.partial().safeParse({
        ...req.body,
        admissionDate: req.body.admissionDate ? new Date(req.body.admissionDate) : undefined
      });

      if (!validation.success) {
        return res.status(400).json(validation.error);
      }

      const patient = await storage.updatePatient(
        patientId,
        validation.data,
        req.user.id
      );

      res.json(patient);
    } catch (error: any) {
      console.error("Error al actualizar paciente:", error);
      if (error.message === "Paciente no encontrado") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.delete("/api/patients/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const patientId = parseInt(req.params.id, 10);
    if (isNaN(patientId)) {
      return res.status(400).json({ message: "ID de paciente inválido" });
    }

    try {
      await storage.deletePatient(patientId);
      res.json({ message: "Paciente eliminado correctamente" });
    } catch (error: any) {
      console.error("Error al eliminar paciente:", error);
      if (error.message === "Paciente no encontrado") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}