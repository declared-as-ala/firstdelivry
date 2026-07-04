import { z } from "zod"
import { TUNISIA_GOVERNORATES } from "../data/governorates"

const tunisianPhoneRegex = /^(?:\+216)?[2459][0-9]{7}$/

export const customerSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  phone: z.string().regex(tunisianPhoneRegex, "Numéro de téléphone tunisien invalide (ex: 2X123456 ou +2162X123456)"),
  phone2: z.string().regex(tunisianPhoneRegex, "Numéro de téléphone invalide").optional().or(z.literal("")),
  governorate: z.enum(TUNISIA_GOVERNORATES as any, { error: "Gouvernorat invalide" }),
  city: z.string().min(1, "Ville requise"),
  address: z.string().min(1, "Adresse requise"),
})

export const orderItemSchema = z.object({
  productName: z.string().min(1, "Nom du produit requis"),
  variant: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().int().min(1, "Quantité doit être >= 1"),
  unitPrice: z.number().min(0, "Prix unitaire doit être >= 0"),
})

export const orderSchema = z.object({
  externalOrderId: z.string().min(1, "ID commande externe requis"),
  source: z.string().default("manual"),
  customer: customerSchema,
  items: z.array(orderItemSchema).min(1, "Au moins un article requis"),
  codAmount: z.number().min(0.001, "Montant COD doit être > 0"),
  note: z.string().optional(),
  orderDate: z.string().or(z.date()).optional(),
})

export const importOrderRowSchema = z.object({
  externalOrderId: z.string().min(1, "ID commande requis"),
  customerName: z.string().min(1, "Nom client requis"),
  phone: z.string().regex(tunisianPhoneRegex, "Téléphone invalide"),
  phone2: z.string().regex(tunisianPhoneRegex).optional().or(z.literal("")),
  governorate: z.enum(TUNISIA_GOVERNORATES as any, { error: "Gouvernorat invalide" }),
  city: z.string().min(1, "Ville requise"),
  address: z.string().min(1, "Adresse requise"),
  codAmount: z.coerce.number().min(0.001, "Montant COD invalide"),
  items: z.string().optional(),
  totalQuantity: z.coerce.number().int().min(1).optional(),
  note: z.string().optional(),
  orderDate: z.string().optional(),
  source: z.string().optional(),
})

export const shipmentSchema = z.object({
  orderId: z.string().min(1, "ID commande requis"),
})

export const navexCreatePayloadSchema = z.object({
  orderId: z.string().min(1, "ID commande requis"),
})

export const scanSchema = z.object({
  trackingCode: z.string().min(1, "Code de suivi requis"),
  mode: z.enum(["HANDOVER_PREP", "RETURN_RECEIVE", "VERIFY"]),
  override: z.boolean().optional().default(false),
  overrideReason: z.string().optional(),
  stationName: z.string().optional(),
})

export const recetteImportSchema = z.object({
  recipeNumber: z.string().min(1, "Numéro de recette requis"),
  receivedDate: z.string().min(1, "Date requise"),
  source: z.string().default("manual"),
  totalAmount: z.coerce.number().min(0),
  notes: z.string().optional(),
})

export const recetteLineSchema = z.object({
  trackingCode: z.string().min(1, "Code suivi requis"),
  customerName: z.string().min(1, "Nom client requis"),
  navexStatus: z.string().min(1, "Statut requis"),
  amount: z.coerce.number().min(0, "Montant invalide"),
  deliveryDate: z.string().optional(),
  designation: z.string().optional(),
})

export const returnInspectionSchema = z.object({
  returnId: z.string().min(1, "ID retour requis"),
  status: z.enum(["GOOD_CONDITION", "DAMAGED", "INCOMPLETE"]),
  restocked: z.boolean().default(false),
  notes: z.string().optional(),
})

export const userSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe minimum 6 caractères").optional().or(z.literal("")),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE_OPERATOR", "FINANCE", "VIEWER"]),
  active: z.boolean().default(true),
})

export const settingsSchema = z.object({
  companyName: z.string().optional(),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  senderName: z.string().min(1, "Nom expéditeur requis"),
  senderLocation: z.string().min(1, "Localisation requise"),
  senderGovernorate: z.enum(TUNISIA_GOVERNORATES as any),
  navexBaseUrl: z.string().url("URL invalide").optional().or(z.literal("")),
  navexCreateEndpoint: z.string().optional(),
  navexStatusEndpoint: z.string().optional(),
  navexMultiStatusEndpoint: z.string().optional(),
  navexDeleteEndpoint: z.string().optional(),
  navexPendingEndpoint: z.string().optional(),
  labelPageSize: z.enum(["A4", "THERMAL_100x150"]).optional(),
})
