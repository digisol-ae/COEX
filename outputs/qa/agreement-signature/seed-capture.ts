import { writeFileSync } from 'node:fs';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { hash } from '@node-rs/argon2';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { EmailSettingsModel } from '@coex/shared/core/models/email-settings.model';
import { EmailOutboxModel } from '@coex/shared/core/models/email-outbox.model';
import { connectToDatabase } from '../../../apps/web/src/lib/db';
import { runWithContext } from '../../../apps/web/src/lib/tenant-context';
import { createOrganisation } from '../../../apps/web/src/modules/crm/services/organisation.service';
import { createContact } from '../../../apps/web/src/modules/crm/services/contact.service';
import { createContract } from '../../../apps/web/src/modules/crm/services/contract.service';
import { generateAgreementDraft, getAgreementDraft, saveAgreementDraft } from '../../../apps/web/src/modules/crm/services/agreement.service';
import { requestAgreementSignature } from '../../../apps/web/src/modules/crm/services/agreement-signature.service';
async function main() {
  if (process.env.MONGODB_URI !== 'mongodb://127.0.0.1:27020/worktello_signature_qa') throw new Error('Isolated signature QA only');
  await connectToDatabase();
  const logo=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="90"><rect width="240" height="90" rx="8" fill="#123456"/><text x="120" y="58" text-anchor="middle" fill="white" font-family="Arial" font-size="38">QA LTD</text></svg>')).png().toBuffer();
  const tenant = await TenantModel.create({name:'Signature QA Ltd',slug:`capture-qa-${Date.now()}`,branding:{primaryColor:'#123456',letterhead:{logoDataUrl:'data:image/png;base64,'+logo.toString('base64'),address:'Example Business Centre\nDubai, United Arab Emirates',contact:'contracts@example.test',footer:'Synthetic QA only · Registration QA-123'}}});
  const user=await UserModel.create({tenantId:tenant._id,name:'Capture QA Admin',email:'capture-qa@example.test',role:'tenant_admin',passwordHash:await hash('Signature-QA-Only-2026!')});
  await EmailSettingsModel.create({tenantId:tenant._id,outbound:{enabled:true}});
  const fixtures: Record<string, {contractId:string; signingUrl:string; requestId:string}>={};
  await runWithContext({tenantId:tenant._id,userId:user._id,isPlatformAdmin:false},async()=>{
    const organisationId=await createOrganisation({name:'Synthetic Customer Ltd',kind:'client'});
    const contactId=await createContact({organisationId,name:'Sam Customer',email:'sam@example.test'});
    for (const method of ['drawn','uploaded','typed']) {
      const contractId=await createContract({organisationId,title:`${method} signature QA`,type:'amc',startDate:'2026-11-03',endDate:'2027-11-02',billingFrequency:'yearly',value:'1200'});
      await generateAgreementDraft(contractId,'builtin:it-basic',{},0);
      const draft=(await getAgreementDraft(contractId))!;
      await saveAgreementDraft(contractId,'SYNTHETIC IT SUPPORT AGREEMENT\n\nCustomer: Synthetic Customer Ltd\nProvider: Signature QA Ltd\nTerm: 3 November 2026 to 2 November 2027\nAnnual fee: AED 1,200\n\nRemote helpdesk support during agreed business hours. Replacement parts require a separate quotation.\n\nThis demonstration agreement has no legal or financial effect.\n\nUnicode: أحكام وشروط',true,draft.revision);
      const requestId=await requestAgreementSignature(contractId,contactId,draft.revision+1);
      const mail=(await EmailOutboxModel.findOne({messageId:`<agreement-signature-${requestId}@worktello.com>`}))!;
      fixtures[method]={contractId,requestId,signingUrl:mail.text.match(/http:\/\/localhost:3126\/sign\/[A-Za-z0-9_-]{43}/)![0]};
    }
  });
  const signature=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="160"><path d="M20 100 Q80 10 120 100 T230 100 L350 70" fill="none" stroke="black" stroke-width="5"/></svg>')).png().toBuffer();
  writeFileSync('outputs/qa/agreement-signature/signature-upload.png',signature);
  writeFileSync('outputs/qa/agreement-signature/capture-fixture.json',JSON.stringify({tenantId:String(tenant._id),fixtures}));
  console.log(JSON.stringify(fixtures));
  await mongoose.disconnect();
}
main().catch(e=>{console.error(e);process.exitCode=1});
