import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { EmailOutboxModel } from '@coex/shared/core/models/email-outbox.model';
const fixture=JSON.parse(readFileSync('outputs/qa/agreement-signature/capture-fixture.json','utf8'));
await mongoose.connect('mongodb://127.0.0.1:27020/worktello_signature_qa');
const email=await EmailOutboxModel.findOne({tenantId:fixture.tenantId,kind:'password_reset'}).sort({createdAt:-1});
console.log(email?.text.match(/code is (\d{6})/)?.[1] ?? 'no code');
await mongoose.disconnect();
