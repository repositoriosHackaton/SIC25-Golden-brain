import session from "express-session";
import createMemoryStore from "memorystore";
import { User, Patient, InsertUser, InsertPatient } from "@shared/schema";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User>;

  createPatient(patient: InsertPatient & { lastUpdatedBy: number }): Promise<Patient>;
  getPatient(id: number): Promise<Patient | undefined>;
  updatePatient(id: number, data: Partial<InsertPatient>, userId: number): Promise<Patient>;
  listPatients(): Promise<Patient[]>;
  deletePatient(id: number): Promise<void>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private patients: Map<number, Patient>;
  sessionStore: session.Store;
  private currentUserId: number;
  private currentPatientId: number;

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.currentUserId = 1;
    this.currentPatientId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const existing = await this.getUser(id);
    if (!existing) {
      throw new Error("Usuario no encontrado");
    }

    // Si se está actualizando el nombre de usuario, verificar que no exista
    if (data.username && data.username !== existing.username) {
      const existingUser = await this.getUserByUsername(data.username);
      if (existingUser) {
        throw new Error("El nombre de usuario ya está en uso");
      }
    }

    // Si se está actualizando el email, verificar el formato
    if (data.email) {
      const lowercaseEmail = data.email.toLowerCase();
      if (!lowercaseEmail.endsWith("@gmail.com") && !lowercaseEmail.endsWith("@hotmail.com")) {
        throw new Error("Solo se permiten correos de Gmail (@gmail.com) o Hotmail (@hotmail.com)");
      }
    }

    const updated: User = {
      ...existing,
      ...data,
      // Mantener la contraseña existente si no se está actualizando
      password: data.password || existing.password,
    };

    this.users.set(id, updated);
    console.log('Usuario actualizado:', updated);
    return updated;
  }

  async createPatient(patient: InsertPatient & { lastUpdatedBy: number }): Promise<Patient> {
    const id = this.currentPatientId++;
    const now = new Date();
    const newPatient: Patient = {
      id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      idNumber: patient.idNumber,
      address: patient.address,
      contactNumber: patient.contactNumber,
      emergencyContact: patient.emergencyContact,
      bloodType: patient.bloodType,
      treatingDoctor: patient.treatingDoctor,
      medicalHistory: patient.medicalHistory,
      admissionDate: patient.admissionDate,
      transplantDate: null,
      documents: patient.documents || [],
      lastUpdatedBy: patient.lastUpdatedBy,
      lastUpdatedAt: now,
      auditLog: [{
        timestamp: now.toISOString(),
        userId: patient.lastUpdatedBy,
        action: "Created patient record"
      }]
    };

    this.patients.set(id, newPatient);
    console.log("Patient created:", newPatient);
    return newPatient;
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async updatePatient(id: number, data: Partial<InsertPatient>, userId: number): Promise<Patient> {
    const existing = await this.getPatient(id);
    if (!existing) {
      throw new Error("Paciente no encontrado");
    }

    const now = new Date();
    const updated: Patient = {
      ...existing,
      ...data,
      documents: data.documents || existing.documents,
      lastUpdatedBy: userId,
      lastUpdatedAt: now,
      auditLog: [
        ...existing.auditLog,
        {
          timestamp: now.toISOString(),
          userId,
          action: "Updated patient record"
        }
      ]
    };

    this.patients.set(id, updated);
    return updated;
  }

  async listPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }

  async deletePatient(id: number): Promise<void> {
    const patient = await this.getPatient(id);
    if (!patient) {
      throw new Error("Paciente no encontrado");
    }
    this.patients.delete(id);
  }
}

export const storage = new MemStorage();