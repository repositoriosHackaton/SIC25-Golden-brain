import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, type InsertPatient, type Patient } from "@shared/schema";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, X } from "lucide-react";
import { useState } from "react";

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const phoneAreaCodes = ["0412", "0414", "0416", "0424", "0426"];

interface PatientFormProps {
  initialData?: Patient;
  onSubmit: (data: InsertPatient) => Promise<any>;
  isSubmitting?: boolean;
}

export function PatientForm({ initialData, onSubmit, isSubmitting }: PatientFormProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);

  // Estados para el número de contacto principal
  const [areaCode, setAreaCode] = useState(
    initialData?.contactNumber ? initialData.contactNumber.substring(0, 4) : phoneAreaCodes[0]
  );
  const [phoneNumber, setPhoneNumber] = useState(
    initialData?.contactNumber ? initialData.contactNumber.substring(4) : ""
  );

  // Estados para el contacto de emergencia
  const [emergencyAreaCode, setEmergencyAreaCode] = useState(
    initialData?.emergencyContact ? initialData.emergencyContact.substring(0, 4) : phoneAreaCodes[0]
  );
  const [emergencyNumber, setEmergencyNumber] = useState(
    initialData?.emergencyContact ? initialData.emergencyContact.substring(4) : ""
  );

  const form = useForm<InsertPatient>({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: {
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      idNumber: initialData?.idNumber || "",
      address: initialData?.address || "",
      contactNumber: initialData?.contactNumber || "",
      emergencyContact: initialData?.emergencyContact || "",
      bloodType: initialData?.bloodType || "",
      treatingDoctor: initialData?.treatingDoctor || "",
      medicalHistory: initialData?.medicalHistory || "",
      admissionDate: initialData?.admissionDate ? new Date(initialData.admissionDate) : new Date(),
    },
  });

  const handlePhoneChange = (value: string) => {
    // Solo permitir números y limitar a 7 dígitos
    const numericValue = value.replace(/\D/g, '').slice(0, 7);
    setPhoneNumber(numericValue);
    form.setValue("contactNumber", areaCode + numericValue);
  };

  const handleEmergencyPhoneChange = (value: string) => {
    // Solo permitir números y limitar a 7 dígitos
    const numericValue = value.replace(/\D/g, '').slice(0, 7);
    setEmergencyNumber(numericValue);
    form.setValue("emergencyContact", emergencyAreaCode + numericValue);
  };

  const handleAreaCodeChange = (value: string) => {
    setAreaCode(value);
    form.setValue("contactNumber", value + phoneNumber);
  };

  const handleEmergencyAreaCodeChange = (value: string) => {
    setEmergencyAreaCode(value);
    form.setValue("emergencyContact", value + emergencyNumber);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newFiles = Array.from(selectedFiles).filter(file => {
      const isValid = file.type === "application/pdf" || 
                     file.type.startsWith("image/");
      const isWithinSize = file.size <= 5000000; // 5MB

      if (!isValid) {
        toast({
          title: "Tipo de archivo no permitido",
          description: "Solo se aceptan PDFs y radiografías",
          variant: "destructive",
        });
      }

      if (!isWithinSize) {
        toast({
          title: "Archivo demasiado grande",
          description: "El tamaño máximo permitido es 5MB",
          variant: "destructive",
        });
      }

      return isValid && isWithinSize;
    });

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-primary">
              {initialData ? "Editar" : "Nuevo"} Paciente
            </h1>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 bg-card p-6 rounded-lg shadow-sm"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="idNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documento de Identidad</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Contacto</FormLabel>
                      <div className="flex gap-2">
                        <Select
                          value={areaCode}
                          onValueChange={handleAreaCodeChange}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="Código" />
                          </SelectTrigger>
                          <SelectContent>
                            {phoneAreaCodes.map((code) => (
                              <SelectItem key={code} value={code}>
                                {code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormControl>
                          <Input
                            {...field}
                            value={phoneNumber}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            placeholder="Número"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contacto de Emergencia</FormLabel>
                      <div className="flex gap-2">
                        <Select
                          value={emergencyAreaCode}
                          onValueChange={handleEmergencyAreaCodeChange}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="Código" />
                          </SelectTrigger>
                          <SelectContent>
                            {phoneAreaCodes.map((code) => (
                              <SelectItem key={code} value={code}>
                                {code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormControl>
                          <Input
                            {...field}
                            value={emergencyNumber}
                            onChange={(e) => handleEmergencyPhoneChange(e.target.value)}
                            placeholder="Número"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bloodType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Sangre</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione el tipo de sangre" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bloodTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="treatingDoctor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doctor Tratante</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="medicalHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Antecedentes Médicos</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Documentos Médicos</FormLabel>
                <div className="grid gap-4">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    multiple
                  />
                  {files.length > 0 && (
                    <div className="grid gap-2">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm truncate">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/")}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {initialData ? "Guardar Cambios" : "Crear Paciente"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default function CreatePatientPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: InsertPatient) => {
      try {
        const res = await apiRequest("POST", "/api/patients", data);
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Error al crear el paciente");
        }
        return res.json();
      } catch (error) {
        console.error("Error creating patient:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({ title: "Paciente creado exitosamente" });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear el paciente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <PatientForm
      onSubmit={createMutation.mutateAsync}
      isSubmitting={createMutation.isPending}
    />
  );
}