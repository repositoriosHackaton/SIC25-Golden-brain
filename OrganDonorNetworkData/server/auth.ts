import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        if (!username || !password) {
          return done(null, false, { message: "Usuario y contraseña son requeridos" });
        }

        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Usuario no encontrado" });
        }

        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Contraseña incorrecta" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ 
          message: "Usuario y contraseña son requeridos" 
        });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ 
          message: "El usuario ya existe" 
        });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ 
            message: "Error al iniciar sesión después del registro" 
          });
        }
        return res.status(201).json(user);
      });
    } catch (error) {
      console.error("Error en el registro:", error);
      res.status(500).json({ 
        message: "Error interno del servidor durante el registro" 
      });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return res.status(500).json({ 
          message: "Error interno del servidor durante el login" 
        });
      }
      if (!user) {
        return res.status(401).json({ 
          message: info?.message || "Credenciales inválidas" 
        });
      }
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ 
            message: "Error al iniciar sesión" 
          });
        }
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ 
          message: "Error al cerrar sesión" 
        });
      }
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        message: "No autenticado" 
      });
    }
    res.json(req.user);
  });

  app.patch("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        message: "No autenticado" 
      });
    }

    try {
      const { username, email, profileImage } = req.body;

      if (!username && !email && profileImage === undefined) {
        return res.status(400).json({
          message: "No se proporcionaron datos para actualizar"
        });
      }

      const updatedUser = await storage.updateUser(req.user.id, {
        username,
        email,
        profileImage
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error al actualizar el perfil:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Error al actualizar el perfil" 
      });
    }
  });
}