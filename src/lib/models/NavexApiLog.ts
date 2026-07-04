import mongoose, { Schema, Document } from "mongoose"

export interface INavexApiLog extends Document {
  endpoint: string
  method: string
  statusCode?: number
  requestBody?: string
  responseBody?: string
  errorMessage?: string
  duration?: number
  shipmentId?: mongoose.Types.ObjectId
  trackingCode?: string
  success: boolean
  isDemo?: boolean
  createdAt: Date
}

const NavexApiLogSchema = new Schema<INavexApiLog>(
  {
    endpoint: { type: String, required: true },
    method: { type: String, required: true },
    statusCode: { type: Number },
    requestBody: { type: String },
    responseBody: { type: String },
    errorMessage: { type: String },
    duration: { type: Number },
    shipmentId: { type: Schema.Types.ObjectId, ref: "Shipment" },
    trackingCode: { type: String },
    success: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
)

NavexApiLogSchema.index({ createdAt: -1 })
NavexApiLogSchema.index({ shipmentId: 1 })
NavexApiLogSchema.index({ trackingCode: 1 })

export const NavexApiLog = mongoose.models.NavexApiLog || mongoose.model<INavexApiLog>("NavexApiLog", NavexApiLogSchema)
