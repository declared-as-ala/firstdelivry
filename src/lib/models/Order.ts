import mongoose, { Schema, Document } from "mongoose"

/**
 * Parcel (Colis) — anti-loss control unit.
 *
 * A parcel exists only after it is physically scanned in "Remise à Navex", at
 * which point its real data is fetched from Navex. Only 3 statuses exist:
 *   EN_COURS — scanned out to Navex, not yet paid or returned
 *   PAYE     — Navex confirmed the COD was paid (payment sync)
 *   RETOUR   — physically scanned back at the warehouse ("Retour reçu")
 *
 * "À vérifier" is NOT a status — it is derived: EN_COURS older than the delay.
 */
export type ParcelStatus = "EN_COURS" | "PAYE" | "RETOUR"

export const PARCEL_STATUSES: ParcelStatus[] = ["EN_COURS", "PAYE", "RETOUR"]

export interface IOrder extends Document {
  navexTrackingCode: string
  codAmount: number
  designation?: string
  navexCreatedAt?: Date

  status: ParcelStatus
  navexRawStatus?: string

  handedToNavexAt?: Date   // Date remise à Navex (grouping key)
  paidAt?: Date            // Date paiement
  returnAt?: Date          // Date retour (physical scan)
  lastNavexSyncAt?: Date

  scannedBy?: mongoose.Types.ObjectId
  returnBy?: mongoose.Types.ObjectId

  createdAt: Date
  updatedAt: Date
}

const OrderSchema = new Schema<IOrder>(
  {
    navexTrackingCode: { type: String, required: true, unique: true },
    codAmount: { type: Number, required: true, min: 0 },
    designation: { type: String },
    navexCreatedAt: { type: Date },

    status: { type: String, enum: PARCEL_STATUSES, default: "EN_COURS" },
    navexRawStatus: { type: String },

    handedToNavexAt: { type: Date },
    paidAt: { type: Date },
    returnAt: { type: Date },
    lastNavexSyncAt: { type: Date },

    scannedBy: { type: Schema.Types.ObjectId, ref: "User" },
    returnBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

OrderSchema.index({ status: 1 })
OrderSchema.index({ handedToNavexAt: -1 })

export const Order = mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema)
export const Parcel = Order
