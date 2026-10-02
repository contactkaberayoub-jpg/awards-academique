import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Veuillez saisir une adresse e-mail valide' }),
  password: z.string().min(1, { message: 'Le mot de passe est obligatoire' }),
  keepLoggedIn: z.boolean(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Veuillez saisir une adresse e-mail valide' }),
});

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' }),
    confirmPassword: z
      .string()
      .min(1, { message: 'Veuillez confirmer votre mot de passe' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Les mots de passe ne correspondent pas',
  });

export const registerSchema = z
  .object({
    firstName: z.string().min(1, { message: 'Le prénom est obligatoire' }),
    lastName: z.string().min(1, { message: 'Le nom est obligatoire' }),
    email: z.string().email({ message: 'Veuillez saisir une adresse e-mail valide' }),
    password: z.string().min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' }),
    confirmPassword: z.string().min(1, { message: 'Veuillez confirmer votre mot de passe' }),
    termsAccepted: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Les mots de passe ne correspondent pas',
  })
  .refine((data) => data.termsAccepted, {
    path: ['termsAccepted'],
    message: 'Vous devez accepter les conditions générales pour continuer',
  });

export const instructorRegisterSchema = z
  .object({
    firstName: z.string().min(1, { message: 'Le prénom est obligatoire' }),
    lastName: z.string().min(1, { message: 'Le nom est obligatoire' }),
    email: z.string().email({ message: 'Veuillez saisir une adresse e-mail valide' }),
    password: z.string().min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' }),
    confirmPassword: z.string().min(1, { message: 'Veuillez confirmer votre mot de passe' }),
    termsAccepted: z.boolean(),
    professionalTitle: z.string().trim().optional(),
    institution: z.string().trim().optional(),
    expertise: z.string().trim().optional(),
    linkedinUrl: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Les mots de passe ne correspondent pas',
  })
  .refine((data) => data.termsAccepted, {
    path: ['termsAccepted'],
    message: 'Vous devez accepter les conditions générales pour continuer',
  });
