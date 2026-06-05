// models/Session.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  userId: string;
  externalToken: string;   // token from Preproute backend — stored server-side only
  user: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: Date;
  expiresAt: Date;
}

const SessionSchema = new Schema<ISession>({
  userId:        { type: String, required: true, unique: true },
  externalToken: { type: String, required: true },
  user:          { type: Schema.Types.Mixed, required: true },
  createdAt:     { type: Date, default: Date.now },
  expiresAt:     { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
});

// TTL index to automatically remove expired documents
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);
