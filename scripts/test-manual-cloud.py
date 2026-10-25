#!/usr/bin/env python3
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

def load(name,path):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(path))
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
cloud=load('manual_cloud','manual-cloud.py')
sync=load('sync_manual','sync-manual.py')

def proposal():
    return {'summary':'Update task guide from implementation evidence.','updates':[{
      'id':'tasks','title':'Tasks','group':'Daily work','roles':['Agent'],'intro':'Create a task after reviewing its details.',
      'steps':[{'title':'Review','text':'Check the title and assignee.'}],'notes':['Live creation has not been verified.'],
      'evidencePaths':['apps/web/src/modules/integrations/teams/copilot-preview.ts']
    }],'resolutions':[]}

class ManualCloudTests(unittest.TestCase):
    def test_valid_evidence_and_proposal(self):
        self.assertEqual(cloud.validate_proposal(proposal())['updates'][0]['id'],'tasks')
    def test_path_traversal_is_rejected(self):
        with self.assertRaises(ValueError):cloud.evidence_path('docs/../../.env')
    def test_untracked_or_private_evidence_is_rejected(self):
        for path in ['.env','projects/example.md','docs/no-such-file.md']:
            with self.assertRaises(ValueError):cloud.evidence_path(path)
    def test_unexpected_fields_are_rejected(self):
        data=proposal();data['updates'][0]['command']='execute something'
        with self.assertRaises(ValueError):cloud.validate_proposal(data)
    def test_unapproved_links_and_credentials_are_rejected(self):
        for value in ['Click javascript:alert(1)','Open https://untrusted.invalid','sk-'+('a'*40)]:
            data=proposal();data['updates'][0]['intro']=value
            with self.assertRaises(ValueError):cloud.validate_proposal(data)
    def test_changes_are_labelled_drafts_and_keep_existing_images(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);(root/'docs/manual').mkdir(parents=True)
            initial={'chapters':[{'id':'tasks','images':[['kept.png','Existing verified image']],'related':[]}],'resolutions':[]}
            path=root/'docs/manual/content.json';path.write_text(json.dumps(initial))
            self.assertTrue(cloud.apply_proposal(proposal(),root))
            result=json.loads(path.read_text())['chapters'][0]
            self.assertEqual(result['status'],cloud.DRAFT)
            self.assertEqual(result['images'],initial['chapters'][0]['images'])
    def test_existing_resolution_cannot_be_overwritten(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);(root/'docs/manual').mkdir(parents=True)
            (root/'docs/manual/content.json').write_text(json.dumps({'chapters':[],'resolutions':[{'id':'known'}]}))
            data={'summary':'No overwrite allowed.','updates':[],'resolutions':[{'id':'known','title':'Known','symptom':'Symptom','cause':'Cause','fix':'Fix','verification':'Not independently verified.','evidencePaths':['apps/web/src/modules/integrations/teams/copilot-preview.ts']}]}
            with self.assertRaises(ValueError):cloud.apply_proposal(data,root)
    def test_archive_path_traversal_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            archive=Path(temp)/'bad.zip'
            with zipfile.ZipFile(archive,'w') as z:z.writestr('../outside','bad')
            with self.assertRaises(ValueError):sync.unpack_checked(archive,Path(temp)/'site')
    def test_archive_hash_mismatch_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            archive=Path(temp)/'bad.zip'
            with zipfile.ZipFile(archive,'w') as z:
                z.writestr('docs/manual/index.html','changed')
                z.writestr('START-HERE.html','start')
                z.writestr('PACKAGE-MANIFEST.json',json.dumps({'files':[{'path':'docs/manual/index.html','sha256':'bad'}]}))
            with self.assertRaises(ValueError):sync.unpack_checked(archive,Path(temp)/'site')
    def test_current_manual_packages_and_extracts_without_private_files(self):
        import subprocess
        with tempfile.TemporaryDirectory() as temp:
            archive=Path(temp)/'manual.zip'
            subprocess.run(['python3',str(cloud.ROOT/'scripts/package-manual.py'),'--output',str(archive)],check=True,capture_output=True)
            index=sync.unpack_checked(archive,Path(temp)/'site')
            self.assertTrue(index.is_file())
            with self.assertRaises(FileExistsError):sync.unpack_checked(archive,Path(temp)/'site')

if __name__=='__main__':unittest.main()
