/* global Office */
Office.onReady(() => {
  const button = document.getElementById('create'),
    status = document.getElementById('status'),
    files = document.getElementById('files');
  const item = Office.context.mailbox.item;
  if (!item || !item.itemId) {
    status.textContent = 'Open a received email first.';
    return;
  }
  const attachments = (item.attachments || []).filter((a) => !a.isInline);
  for (const file of attachments) {
    const label = document.createElement('label'),
      input = document.createElement('input');
    input.type = 'checkbox';
    input.value = file.id;
    input.disabled =
      file.attachmentType !== 'file' ||
      file.size > 3 * 1024 * 1024 ||
      !Office.context.requirements.isSetSupported('Mailbox', '1.8');
    label.append(
      input,
      document.createTextNode(file.name + (input.disabled ? ' (not supported or over 3MB)' : '')),
    );
    files.append(label);
  }
  status.textContent = 'Only this email and the attachments you select will be copied.';
  button.disabled = false;
  const read = (fn) =>
    new Promise((resolve, reject) =>
      fn((result) =>
        result.status === Office.AsyncResultStatus.Succeeded
          ? resolve(result.value)
          : reject(new Error(result.error.message)),
      ),
    );
  button.onclick = async () => {
    button.disabled = true;
    try {
      const body = await read((callback) => item.body.getAsync(Office.CoercionType.Text, callback));
      if (body.length > 30000)
        throw new Error('This email is too long. Shorten it or use a summary.');
      const selected = [];
      let bytes = 0;
      for (const input of files.querySelectorAll('input:checked')) {
        const file = attachments.find((a) => a.id === input.value);
        bytes += file.size;
        if (bytes > 10 * 1024 * 1024) throw new Error('Select no more than 10MB of attachments.');
        const content = await read((callback) => item.getAttachmentContentAsync(file.id, callback));
        if (content.format !== 'base64')
          throw new Error('This attachment format is not supported.');
        selected.push({
          fileName: file.name,
          contentType: file.contentType || 'application/octet-stream',
          base64: content.content,
        });
      }
      const email = {
        messageId: item.internetMessageId || item.itemId,
        mailbox: Office.context.mailbox.userProfile.emailAddress,
        title: item.subject,
        body,
        sender: `${item.from?.displayName || ''} <${item.from?.emailAddress || ''}>`,
        sentAt: item.dateTimeCreated?.toISOString() || '',
        attachments: selected,
      };
      const dialog = await read((callback) =>
        Office.context.ui.displayDialogAsync(
          location.origin + '/integrations/outlook/dialog.html',
          { height: 80, width: 55, displayInIframe: false },
          callback,
        ),
      );
      dialog.addEventHandler(Office.EventType.DialogMessageReceived, (event) => {
        if (event.origin && event.origin !== location.origin) return;
        if (event.message === 'ready')
          dialog.messageChild(JSON.stringify({ type: 'worktello-email', email }), {
            targetOrigin: location.origin,
          });
      });
      dialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
        button.disabled = false;
      });
      status.textContent = 'Review the email in the task window.';
    } catch (error) {
      status.textContent = error.message;
      button.disabled = false;
    }
  };
});
