/* global Office */
// Office.js changes browser history APIs. Keep it outside the React form's window.
const form = document.getElementById('form');
let formReady = false,
  officeReady = false,
  emailMessage = null;
function ready() {
  if (formReady && officeReady)
    Office.context.ui.messageParent('ready', { targetOrigin: location.origin });
}
window.addEventListener('message', (event) => {
  if (
    event.origin !== location.origin ||
    event.source !== form.contentWindow ||
    event.data !== 'worktello-form-ready'
  )
    return;
  formReady = true;
  if (emailMessage) form.contentWindow.postMessage(emailMessage, location.origin);
  ready();
});
Office.onReady(() => {
  if (!Office.context.ui?.addHandlerAsync) return;
  Office.context.ui.addHandlerAsync(
    Office.EventType.DialogParentMessageReceived,
    (event) => {
      if (event.origin && event.origin !== location.origin) return;
      emailMessage = event.message;
      if (formReady) form.contentWindow.postMessage(emailMessage, location.origin);
    },
    (result) => {
      officeReady = result.status === Office.AsyncResultStatus.Succeeded;
      ready();
    },
  );
});
