import mongoose from 'mongoose';
import { EmailOutboxModel } from '@coex/shared/core/models/email-outbox.model';
await mongoose.connect('mongodb://127.0.0.1:27020/worktello_signature_qa');
const email=await EmailOutboxModel.findOne({to:'sam@example.test'}).sort({createdAt:-1});
console.log(email?.text.match(/http:\/\/localhost:3126\/sign\/[A-Za-z0-9_-]{43}/)?.[0] ?? 'not queued');
await mongoose.disconnect();
