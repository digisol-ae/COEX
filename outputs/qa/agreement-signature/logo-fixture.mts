import sharp from 'sharp';
await sharp({create:{width:200,height:70,channels:4,background:'#123456'}}).png().toFile('outputs/qa/agreement-signature/upload-logo.png');
