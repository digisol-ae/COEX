import { writeFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { hash } from '@node-rs/argon2';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { EmailSettingsModel } from '@coex/shared/core/models/email-settings.model';
import { connectToDatabase } from '../../../apps/web/src/lib/db';
import { runWithContext } from '../../../apps/web/src/lib/tenant-context';
import { createOrganisation } from '../../../apps/web/src/modules/crm/services/organisation.service';
import { createContact } from '../../../apps/web/src/modules/crm/services/contact.service';
import { createContract } from '../../../apps/web/src/modules/crm/services/contract.service';
import { generateAgreementDraft, getAgreementDraft, saveAgreementDraft } from '../../../apps/web/src/modules/crm/services/agreement.service';
async function main() {
  if (process.env.MONGODB_URI !== 'mongodb://127.0.0.1:27020/worktello_signature_qa') throw new Error('Isolated signature QA only');
  await connectToDatabase();
  const tenant = await TenantModel.create({ name: 'Signature QA', slug: `signature-qa-${Date.now()}` });
  const user = await UserModel.create({tenantId:tenant._id, name:'Signature QA Admin', email:'signature-qa@example.test',role:'tenant_admin',passwordHash:await hash('Signature-QA-Only-2026!')});
  await EmailSettingsModel.create({tenantId:tenant._id,outbound:{enabled:true}});
  await runWithContext({tenantId:tenant._id,userId:user._id,isPlatformAdmin:false},async()=>{
    const organisationId=await createOrganisation({name:'Synthetic Customer Ltd',kind:'client'});
    await createContact({organisationId,name:'Sam Customer',email:'sam@example.test'});
    const contractId=await createContract({organisationId,title:'Annual IT Support — Signing QA',type:'amc',startDate:'2026-11-03',endDate:'2027-11-02',billingFrequency:'yearly',value:'1200'});
    await generateAgreementDraft(contractId,'builtin:it-basic',{},0);
    const draft=(await getAgreementDraft(contractId))!;
    await saveAgreementDraft(contractId,'IT SUPPORT AGREEMENT\n\nCustomer: Synthetic Customer Ltd\nProvider: Signature QA\nTerm: 3 November 2026 to 2 November 2027\nAnnual fee: AED 1,200\n\nServices\nRemote helpdesk support during agreed business hours. Replacement parts require a separate quotation.\n\nAcceptance\nThe authorised customer representative may accept this agreement electronically.\n\nUnicode preservation: أحكام وشروط',true,draft.revision);
    writeFileSync('outputs/qa/agreement-signature/fixture.json',JSON.stringify({contractId,tenantId:String(tenant._id),userId:String(user._id)}));
    console.log(JSON.stringify({contractId}));
  });
  await mongoose.disconnect();
}
main().catch(e=>{console.error(e);process.exitCode=1});
