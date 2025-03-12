import { pgTable, text, serial, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  profileImage: text("profile_image"),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  idNumber: text("id_number").notNull(),
  address: text("address").notNull(),
  contactNumber: text("contact_number").notNull(),
  emergencyContact: text("emergency_contact").notNull(),
  bloodType: text("blood_type").notNull(),
  treatingDoctor: text("treating_doctor").notNull(),
  medicalHistory: text("medical_history").notNull(),
  documents: json("documents").$type<Array<{
    name: string;
    type: string;
    size: number;
    url?: string;
    uploadedAt?: string;
  }>>(),
  admissionDate: timestamp("admission_date").notNull(),
  transplantDate: timestamp("transplant_date"),
  lastUpdatedBy: integer("last_updated_by")
    .references(() => users.id)
    .notNull(),
  lastUpdatedAt: timestamp("last_updated_at").notNull(),
  auditLog: json("audit_log").$type<Array<{
    timestamp: string;
    userId: number;
    action: string;
  }>>().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
}).extend({
  email: z.string()
    .email("Correo electrónico inválido")
    .refine(
      (email) => {
        const lowercaseEmail = email.toLowerCase();
        return lowercaseEmail.endsWith("@gmail.com") || lowercaseEmail.endsWith("@hotmail.com");
      },
      "Solo se permiten correos de Gmail (@gmail.com) o Hotmail (@hotmail.com)"
    ),
  profileImage: z.string().nullable(),
});

const MAX_FILE_SIZE = 5000000; // 5MB
const ACCEPTED_FILE_TYPES = ["application/pdf", "image/x-ray", "image/jpeg", "image/png"];

export const fileSchema = z.object({
  name: z.string(),
  type: z.string().refine((val) => ACCEPTED_FILE_TYPES.includes(val), {
    message: "Tipo de archivo no permitido. Solo se aceptan PDFs y radiografías.",
  }),
  size: z.number().max(MAX_FILE_SIZE, "El archivo es demasiado grande. Máximo 5MB permitido."),
  url: z.string().optional(),
  uploadedAt: z.string().optional(),
});

export const insertPatientSchema = createInsertSchema(patients)
  .omit({ 
    id: true, 
    lastUpdatedBy: true, 
    lastUpdatedAt: true,
    auditLog: true,
    transplantDate: true,
    documents: true
  })
  .extend({
    firstName: z.string().min(1, "El nombre es requerido"),
    lastName: z.string().min(1, "El apellido es requerido"),
    address: z.string().min(1, "La dirección es requerida"),
    idNumber: z.string().min(1, "El número de identificación es requerido"),
    contactNumber: z.string().min(1, "El número de contacto es requerido"),
    emergencyContact: z.string().min(1, "El contacto de emergencia es requerido"),
    bloodType: z.string().min(1, "El tipo de sangre es requerido"),
    treatingDoctor: z.string().min(1, "El doctor tratante es requerido"),
    medicalHistory: z.string().min(1, "Los antecedentes médicos son requeridos"),
    admissionDate: z.coerce.date(),
    documents: z.array(fileSchema).optional()
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;