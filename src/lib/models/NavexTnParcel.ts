import mongoose, { Schema, Document } from "mongoose"

/**
 * Parcel tracked via Navex.tn — a separate carrier from First Delivery/Order.ts.
 * Same 3-status model, but Navex.tn's Récupération endpoint only ever returns
 * status/price/livreur info, never client name, phone, or product designation —
 * those fields stay empty unless entered by hand, they are NOT fetched from Navex.tn.
 */
export type NavexTnParcelStatus = "EN_COURS" | "PAYE" | "RETOUR"

export const NAVEX_TN_PARCEL_STATUSES: NavexTnParcelStatus[] = ["EN_COURS", "PAYE", "RETOUR"]

export interface INavexTnParcel extends Document {
  trackingCode: string
  codAmount?: number

  status: NavexTnParcelStatus
  navexRawEtat?: string
  navexRawMotif?: string
  livreur?: string
  livreurTel?: string

  handedToNavexAt?: Date
  paidAt?: Date
  returnAt?: Date
  lastSyncAt?: Date

  scannedBy?: mongoose.Types.ObjectId
  returnBy?: mongoose.Types.ObjectId

  createdAt: Date
  updatedAt: Date
}

const NavexTnParcelSchema = new Schema<INavexTnParcel>(
  {
    trackingCode: { type: String, required: true, unique: true },
    codAmount: { type: Number, min: 0 },

    status: { type: String, enum: NAVEX_TN_PARCEL_STATUSES, default: "EN_COURS" },
    navexRawEtat: { type: String },
    navexRawMotif: { type: String },
    livreur: { type: String },
    livreurTel: { type: String },

    handedToNavexAt: { type: Date },
    paidAt: { type: Date },
    returnAt: { type: Date },
    lastSyncAt: { type: Date },

    scannedBy: { type: Schema.Types.ObjectId, ref: "User" },
    returnBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

NavexTnParcelSchema.index({ status: 1 })
NavexTnParcelSchema.index({ handedToNavexAt: -1 })

export const NavexTnParcel = mongoose.models.NavexTnParcel || mongoose.model<INavexTnParcel>("NavexTnParcel", NavexTnParcelSchema)
