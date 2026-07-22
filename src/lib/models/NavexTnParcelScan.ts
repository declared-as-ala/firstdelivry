import mongoose, { Schema, Document } from "mongoose"

export type NavexTnScanMode = "HANDOVER_PREP" | "RETURN_RECEIVE" | "VERIFY"
export type NavexTnScanResult = "OK" | "DUPLICATE" | "UNKNOWN" | "BLOCKED"

/** One physical barcode scan event for a Navex.tn parcel — mirrors ParcelScan.ts. */
export interface INavexTnParcelScan extends Document {
  parcelId?: mongoose.Types.ObjectId
  trackingCode: string
  mode: NavexTnScanMode
  result: NavexTnScanResult
  message?: string
  operatorId?: mongoose.Types.ObjectId
  stationName?: string
  createdAt: Date
  updatedAt: Date
}

const NavexTnParcelScanSchema = new Schema<INavexTnParcelScan>(
  {
    parcelId: { type: Schema.Types.ObjectId, ref: "NavexTnParcel" },
    trackingCode: { type: String, required: true },
    mode: { type: String, enum: ["HANDOVER_PREP", "RETURN_RECEIVE", "VERIFY"], required: true },
    result: { type: String, enum: ["OK", "DUPLICATE", "UNKNOWN", "BLOCKED"], required: true },
    message: { type: String },
    operatorId: { type: Schema.Types.ObjectId, ref: "User" },
    stationName: { type: String },
  },
  { timestamps: true }
)

NavexTnParcelScanSchema.index({ trackingCode: 1 })
NavexTnParcelScanSchema.index({ mode: 1, createdAt: -1 })

export const NavexTnParcelScan =
  mongoose.models.NavexTnParcelScan || mongoose.model<INavexTnParcelScan>("NavexTnParcelScan", NavexTnParcelScanSchema)
