import mongoose from 'mongoose';

export interface UserZip {
  zipCode: string;
  count?: number;
  lastUsed?: Date;
}

const UserZipSchema = new mongoose.Schema<UserZip>({
  zipCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: /^\d{5}(-\d{4})?$/  // US ZIP code format (5 digits or 5+4)
  },
  count: {
    type: Number,
    default: 1
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
});

export const UserZipModel = mongoose.model<UserZip>('UserZip', UserZipSchema);
