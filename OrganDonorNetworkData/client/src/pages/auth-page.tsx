import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { useLocation } from "wouter";
import { Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(1, "El usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const { toast } = useToast();

  if (user) {
    setLocation("/");
    return null;
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    // Validación de email
    if (!email.toLowerCase().endsWith("@gmail.com") && !email.toLowerCase().endsWith("@hotmail.com")) {
      toast({
        title: "Error de registro",
        description: "Solo se permiten correos de Gmail (@gmail.com) o Hotmail (@hotmail.com)",
        variant: "destructive"
      });
      return;
    }

    registerMutation.mutate({
      username: formData.get("username") as string,
      email: email,
      password: formData.get("password") as string,
      profileImage
    });
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-1/2 flex items-center justify-center p-8">
        <Tabs defaultValue="login" className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Iniciar Sesión</CardTitle>
              </CardHeader>
              <CardContent>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    loginMutation.mutate({
                      username: formData.get("username") as string,
                      password: formData.get("password") as string,
                    });
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="username">Usuario</Label>
                    <Input
                      id="username"
                      name="username"
                      placeholder="Ingrese su usuario"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Ingrese su contraseña"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Iniciar Sesión
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Crear una cuenta</CardTitle>
              </CardHeader>
              <CardContent>
                <form 
                  onSubmit={handleRegister}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Usuario</Label>
                    <Input
                      id="register-username"
                      name="username"
                      placeholder="Ingrese su usuario"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Correo Electrónico</Label>
                    <Input
                      id="register-email"
                      name="email"
                      type="email"
                      placeholder="Ingrese su correo electrónico (@gmail.com o @hotmail.com)"
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Solo se permiten correos de Gmail o Hotmail
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Contraseña</Label>
                    <Input
                      id="register-password"
                      name="password"
                      type="password"
                      placeholder="Ingrese su contraseña"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile">Foto de Perfil</Label>
                    <div className="flex items-center gap-4">
                      {profileImage && (
                        <img
                          src={profileImage}
                          alt="Vista previa"
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <Input
                          id="profile"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => document.getElementById("profile")?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Subir Foto
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Registrarse
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <div className="w-1/2 bg-primary/10 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold mb-4 text-primary">
            Sistema de Gestión de Donantes de Órganos
          </h1>
          <p className="text-lg text-muted-foreground">
            Un sistema integral para que los administradores hospitalarios gestionen las 
            donaciones de órganos y realicen seguimiento a la información de los pacientes 
            de manera segura.
          </p>
        </div>
      </div>
    </div>
  );
}