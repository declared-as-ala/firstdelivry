import mongoose, { Schema, Document } from "mongoose"
import bcrypt from "bcryptjs"

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "WAREHOUSE_OPERATOR" | "FINANCE" | "VIEWER"

export interface IUser extends Document {
  name: string
  email: string
  password: string
  role: UserRole
  active: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
  comparePassword(password: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE_OPERATOR", "FINANCE", "VIEWER"],
      default: "VIEWER",
    },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
)

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return
  this.password = await bcrypt.hash(this.password, 12)
})

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password)
}

UserSchema.set("toJSON", {
  transform: (_doc: any, ret: any) => {
    delete ret.password
    return ret
  },
})

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
