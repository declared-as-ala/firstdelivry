import mongoose, { Schema, Document } from "mongoose"

export type ScanMode = "HANDOVER_PREP" | "RETURN_RECEIVE" | "VERIFY"
export type ScanResult = "OK" | "DUPLICATE" | "UNKNOWN" | "BLOCKED" | "OVERRIDE"

/**
 * One physical barcode scan event. Logged for every attempt (success or failure)
 * so the warehouse has a full audit of what was scanned, when, and by whom.
 * A scan NEVER creates a parcel — it only references an existing one.
 */
export interface IParcelScan extends Document {
  parcelId?: mongoose.Types.ObjectId
  navexTrackingCode: string
  mode: ScanMode
  result: ScanResult
  override: boolean
  overrideReason?: string
  message?: string
  operatorId?: mongoose.Types.ObjectId
  stationName?: string
  isDemo?: boolean
  createdAt: Date
  updatedAt: Date
}

const ParcelScanSchema = new Schema<IParcelScan>(
  {
    parcelId: { type: Schema.Types.ObjectId, ref: "Order" },
    navexTrackingCode: { type: String, required: true },
    mode: { type: String, enum: ["HANDOVER_PREP", "RETURN_RECEIVE", "VERIFY"], required: true },
    result: { type: String, enum: ["OK", "DUPLICATE", "UNKNOWN", "BLOCKED", "OVERRIDE"], required: true },
    override: { type: Boolean, default: false },
    overrideReason: { type: String },
    message: { type: String },
    operatorId: { type: Schema.Types.ObjectId, ref: "User" },
    stationName: { type: String },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
)

ParcelScanSchema.index({ navexTrackingCode: 1 })
ParcelScanSchema.index({ mode: 1, createdAt: -1 })

export const ParcelScan =
  mongoose.models.ParcelScan || mongoose.model<IParcelScan>("ParcelScan", ParcelScanSchema)
