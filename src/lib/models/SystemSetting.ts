import mongoose, { Schema, Document } from "mongoose"

export interface ISystemSetting extends Document {
  key: string
  value: any
  group: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    group: { type: String, default: "general" },
    description: { type: String },
  },
  { timestamps: true }
)

export const SystemSetting = mongoose.models.SystemSetting || mongoose.model<ISystemSetting>("SystemSetting", SystemSettingSchema)
