import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Patient } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Plus, LogOut, User, Menu, Edit, Moon, Sun, Settings, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useSidebar } from "@/hooks/use-sidebar";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import jsPDF from "jspdf";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { isCollapsed, toggle } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const { toast } = useToast();

  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const response = await apiRequest("DELETE", `/api/patients/${patientId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al eliminar el paciente");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({ title: "Paciente eliminado exitosamente" });
      setPatientToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar el paciente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredPatients = patients?.filter((patient) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      patient.firstName.toLowerCase().includes(searchLower) ||
      patient.lastName.toLowerCase().includes(searchLower) ||
      patient.idNumber.toLowerCase().includes(searchLower)
    );
  });

  const generatePDF = (patient: Patient) => {
    const doc = new jsPDF();

    // Configuración inicial
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    // Funciones auxiliares
    const addHeader = (text: string) => {
      doc.setFillColor(0, 123, 255); // Color azul para el encabezado
      doc.rect(0, y - 5, pageWidth, 15, "F");
      doc.setTextColor(255, 255, 255); // Texto blanco
      doc.setFontSize(16);
      doc.text(text, pageWidth / 2, y + 5, { align: "center" });
      doc.setTextColor(0, 0, 0); // Volver a texto negro
      y += 20;
    };

    const addSection = (title: string) => {
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(title, margin, y);
      doc.setFont(undefined, "normal");
      y += 7;
    };

    const addField = (label: string, value: string) => {
      const text = `${label}: ${value}`;
      doc.setFontSize(11);
      doc.text(text, margin, y);
      y += 7;
    };

    // Título principal
    addHeader("INFORMACIÓN DEL PACIENTE");

    // Datos personales
    addSection("Datos Personales");
    addField("Nombre Completo", `${patient.firstName} ${patient.lastName}`);
    addField("DNI", patient.idNumber);
    addField("Dirección", patient.address);
    addField("Teléfono", patient.contactNumber);
    addField("Contacto de Emergencia", patient.emergencyContact);
    y += 5;

    // Información médica
    addSection("Información Médica");
    addField("Tipo de Sangre", patient.bloodType);
    addField("Doctor Tratante", patient.treatingDoctor);
    addField("Fecha de Ingreso", format(new Date(patient.admissionDate), "PP", { locale: es }));
    y += 5;

    // Antecedentes médicos
    addSection("Antecedentes Médicos");
    const splitHistory = doc.splitTextToSize(patient.medicalHistory, contentWidth);
    doc.text(splitHistory, margin, y);
    y += splitHistory.length * 7;

    // Pie de página
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    const footer = `Generado el ${format(new Date(), "PPpp", { locale: es })}`;
    doc.text(footer, pageWidth / 2, pageHeight - 10, { align: "center" });

    // Guardar el PDF
    doc.save(`informe_paciente_${patient.idNumber}.pdf`);
  };

  function getInitials(name: string = ""): string {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Barra lateral */}
      <div
        className={cn(
          "bg-primary/5 border-r p-4 transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {!isCollapsed && (
              <h1 className="text-xl font-bold text-primary">
                Gestión de Donantes
              </h1>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="shrink-0"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            className={cn(
              "w-full flex items-center gap-2 p-2 rounded-md",
              isCollapsed ? "justify-center" : "justify-start"
            )}
            onClick={() => setLocation("/profile")}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.profileImage || undefined} alt={user?.username} />
              <AvatarFallback>{getInitials(user?.username)}</AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="text-left">
                <span className="block text-sm font-medium">{user?.username}</span>
                <span className="block text-xs text-muted-foreground">{user?.email}</span>
              </div>
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className={cn(
              "w-full",
              isCollapsed ? "justify-center px-0" : "justify-start"
            )}
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            {!isCollapsed && (
              <span className="ml-2">
                {theme === "light" ? "Modo Oscuro" : "Modo Claro"}
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            className={cn(
              "w-full",
              isCollapsed ? "justify-center px-0" : "justify-start"
            )}
            onClick={() => setLocation("/patients/new")}
          >
            <Plus className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Nuevo Paciente</span>}
          </Button>

          <Button
            variant="outline"
            className={cn(
              "w-full",
              isCollapsed ? "justify-center px-0" : "justify-start"
            )}
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Cerrar Sesión</span>}
          </Button>
        </div>
      </div>

      {/* Contenido principal */}
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Lista de Pacientes</h2>
          <div className="w-72">
            <Input
              placeholder="Buscar por nombre o documento de identidad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredPatients?.map((patient) => (
            <Card
              key={patient.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        INFORMACIÓN DEL PACIENTE
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generatePDF(patient)}
                        >
                          GENERAR INFORME
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/patients/${patient.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPatientToDelete(patient)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p>Nombre: {patient.firstName} {patient.lastName}</p>
                      <p>Documento de identidad: {patient.idNumber}</p>
                      <p>Dirección: {patient.address}</p>
                      <p>Teléfono: {patient.contactNumber}</p>
                      <p>Contacto de Emergencia: {patient.emergencyContact}</p>
                      <p>Tipo de Sangre: {patient.bloodType}</p>
                      <p>Doctor Tratante: {patient.treatingDoctor}</p>
                      <p>Fecha de Ingreso: {format(new Date(patient.admissionDate), "PP", { locale: es })}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <AlertDialog open={!!patientToDelete} onOpenChange={setPatientToDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al paciente {patientToDelete?.firstName} {patientToDelete?.lastName}.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (patientToDelete) {
                  deleteMutation.mutate(patientToDelete.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}