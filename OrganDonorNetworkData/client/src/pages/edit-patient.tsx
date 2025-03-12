import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Patient, InsertPatient } from "@shared/schema";
import { PatientForm } from "@/pages/patient-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function EditPatientPage() {
  const params = useParams();
  const patientId = params?.id ? parseInt(params.id, 10) : undefined;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: patient, isLoading, error } = useQuery<Patient>({
    queryKey: ["/api/patients", patientId],
    enabled: !!patientId && !isNaN(patientId),
    retry: false,
    queryFn: async () => {
      if (!patientId) throw new Error("ID de paciente no proporcionado");
      const response = await fetch(`/api/patients/${patientId}`);
      if (!response.ok) {
        throw new Error("Error al cargar el paciente");
      }
      return response.json();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertPatient) => {
      if (!patientId) throw new Error("ID de paciente no proporcionado");
      const res = await apiRequest("PATCH", `/api/patients/${patientId}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error al actualizar el paciente");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId] });
      toast({ title: "Paciente actualizado exitosamente" });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar el paciente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-semibold text-destructive">
          Paciente no encontrado
        </h2>
        <p className="text-muted-foreground mt-2">
          El paciente que buscas no existe o ha sido eliminado.
        </p>
      </div>
    );
  }

  return (
    <PatientForm
      initialData={patient}
      onSubmit={updateMutation.mutateAsync}
      isSubmitting={updateMutation.isPending}
    />
  );
}