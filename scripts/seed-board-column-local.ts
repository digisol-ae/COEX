import mongoose from 'mongoose';
import { UserModel } from '@coex/shared/core/models/user.model';
import { SpaceModel } from '@coex/shared/tasks/models/space.model';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { runWithContext } from '../apps/web/src/lib/tenant-context';
import { createTask } from '../apps/web/src/modules/tasks/services/task.service';
import { createSpace } from '../apps/web/src/modules/tasks/services/space.service';
async function main() {
  const uri = process.env.MONGODB_URI;
  if (uri !== 'mongodb://127.0.0.1:27020/worktello_feedback_local') throw new Error('Isolated local database only');
  await mongoose.connect(uri);
  const actor = await UserModel.findOne({email:'feedback-admin@example.test',deletedAt:null});
  if (!actor) throw new Error('Missing QA user');
  await runWithContext({tenantId:actor.tenantId,userId:actor._id,isPlatformAdmin:false}, async()=>{
    const name='QA Board Columns 20261029';
    const existing=await SpaceModel.findOne({tenantId:actor.tenantId,name,deletedAt:null});
    const spaceId=existing?String(existing._id):await createSpace({name,description:'Synthetic per-column pagination QA only'});
    const groups: [string,number][] = process.env.COLUMN_QA_LONG === '1' ? [['To do',16],['In progress',7],['Blocked',1],['Done',44]] : [['To do',5],['In progress',7],['Blocked',1],['Done',44]];
    for(const [status,count] of groups) for(let index=1;index<=count;index++) {
      const title=`[Column QA] ${status} ${index}`;
      if(!await TaskModel.exists({tenantId:actor.tenantId,spaceId,title,deletedAt:null})) await createTask({spaceId,title,status});
    }
    console.log(JSON.stringify({spaceId,groups,database:mongoose.connection.name}));
  });
  await mongoose.disconnect();
}
main().catch(error=>{console.error(error);process.exitCode=1;});
