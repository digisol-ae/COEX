"""Render the caption-only create-ticket tour. Requires Pillow; pass an output frame directory."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import sys
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
regular='/System/Library/Fonts/Supplemental/Arial.ttf'
bold='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
def font(n,b=False):return ImageFont.truetype(bold if b else regular,n)
steps=[('Open Tickets','Click Raise ticket to begin.','Raise ticket'),('Describe the request',"Choose whose words, then add subject and details.",'Subject'),('Set the right context','Choose Queue, Priority, Customer and Contact.','Customer'),('Add supporting details','Add Cc if needed. Paste or attach images, then preview.','Attachments'),('Review and create','Check the details, then click Raise ticket.','Raise ticket')]
for step,(title,caption,focus) in enumerate(steps):
 im=Image.new('RGB',(1280,720),'#f4f6f2');d=ImageDraw.Draw(im)
 def text(x,y,t,n=22,b=False,c='#22372f'):d.text((x,y),t,font=font(n,b),fill=c)
 def box(x,y,w,h,fill='#ffffff',stroke='#d9e2da',radius=12):d.rounded_rectangle((x,y,x+w,y+h),radius,fill=fill,outline=stroke,width=2)
 def field(x,y,w,label,value,highlight=False,h=37):
  text(x,y,label,17,True,c='#53695e');box(x,y+24,w,h,'#eef7ed' if highlight else '#ffffff','#36835b' if highlight else '#d9e2da',7);text(x+12,y+32,value,18)
 text(42,24,'COEX',28,True);text(914,31,'CREATE A TICKET · 20 SECONDS',16,True,c='#61776c')
 text(46,124,f'0{step+1} / 05',24,True,c='#36835b')
 # Left hand captions remain readable when the player is expanded.
 import textwrap
 y=182
 for line in textwrap.wrap(title,17):text(44,y,line,43,True);y+=53
 y+=18
 for line in textwrap.wrap(caption,29):text(46,y,line,27,c='#53695e');y+=37
 text(46,512,'Illustrated walkthrough',16,c='#74887d');text(46,537,'Demo data · No voiceover',16,c='#74887d')
 box(486,91,750,516,'#fafcf8')
 if step==0:
  text(516,115,'Tickets',30,True);box(1030,108,174,43,'#36835b','#36835b',9);text(1045,119,'Raise ticket',21,True,c='white')
  text(516,184,'Opened     Delayed     Missed',20,c='#53695e')
  for row in range(4):
   box(514,235+row*76,688,59,'#ffffff');text(533,249+row*76,['Demo support request','Email access issue','New workstation setup','Printer connection'][row],20)
  d.ellipse((1003,120,1014,131),fill='#36835b')
 elif step==4:
  text(516,113,'Ready to raise the ticket?',29,True)
  for i,(a,b) in enumerate([('Subject','Unable to sign in'),('Queue / Priority','Support / Normal'),('Customer / Contact','Demo customer / Demo contact'),('Attachment','screenshot.png · preview checked')]):
   text(518,179+i*68,a,17,True,c='#61776c');text(518,205+i*68,b,22)
  box(1003,505,196,50,'#36835b','#36835b',9);text(1021,518,'Raise ticket',24,True,c='white')
  text(518,567,'Your ticket opens after it is created.',18,c='#61776c')
 else:
  text(513,109,'New ticket',26,True)
  box(515,151,687,51,'#eef7ed' if step==1 else '#ffffff');text(529,165,"The customer's, recorded by me    /    Mine",19)
  field(515,218,687,'Subject','Unable to sign in',step==1)
  field(515,291,687,'What the customer told you','Please help restore access to my account.',step==1,h=47)
  field(515,374,330,'Queue','Support',step==2);field(870,374,332,'Priority','Normal',step==2)
  field(515,447,330,'Customer','Demo customer',step==2);field(870,447,332,'Contact','Demo contact',step==2)
  box(515,532,687,53,'#eef7ed' if step==3 else '#ffffff','#36835b' if step==3 else '#d9e2da');text(528,546,'Cc   ·   Attachments   ·   Paste image   ·   Preview',19)
 # Consistent footer and five-step progress.
 for i in range(5):
  box(44+i*240,649,226,8,'#36835b' if i<=step else '#dce6dc','#36835b' if i<=step else '#dce6dc',4)
 text(44,678,'Tickets → Raise ticket → Review → Raise ticket',16,c='#61776c')
 im.save(out/f'{step:02}.png')
