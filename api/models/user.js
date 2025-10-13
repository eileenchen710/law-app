const { Schema, model, models } = require('mongoose');

const ProviderEnum = ['wechat', 'anonymous', 'admin', 'password'];

const UserSchema = new Schema(
  {
    username: {
      type: String,
      trim: true,
      sparse: true
    },
    password_hash: {
      type: String,
      select: false
    },
    display_name: {
      type: String,
      trim: true
    },
    avatar_url: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    provider: {
      type: String,
      enum: ProviderEnum,
      default: 'anonymous'
    },
    metadata: {
      type: Object,
      default: {}
    },
    wechat: {
      openid: {
        type: String,
        sparse: true
      },
      unionid: {
        type: String,
        sparse: true
      },
      session_key: String
    },
    last_login_at: {
      type: Date
    },
    last_login_ip: {
      type: String,
      trim: true
    }
  },
  {
    collection: 'users',
    timestamps: true,
    versionKey: false
  }
);

UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ username: 1 }, { unique: true, sparse: true });
UserSchema.index({ phone: 1 }, { sparse: true });
UserSchema.index({ 'wechat.openid': 1 }, { unique: true, sparse: true });
UserSchema.index({ 'wechat.unionid': 1 }, { sparse: true });

module.exports = models.User || model('User', UserSchema);
