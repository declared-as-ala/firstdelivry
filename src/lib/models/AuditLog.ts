import mongoose, { Schema, Document } from "mongoose"

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId
  action: string
  entityType: string
  entityId?: string
  before?: Record<string, any>
  after?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  isDemo?: boolean
  createdAt: Date
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
)

AuditLogSchema.index({ createdAt: -1 })
AuditLogSchema.index({ entityType: 1, entityId: 1 })
AuditLogSchema.index({ action: 1 })

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema)
