const flags = require('../config/featureFlags');
let ioInstance = null;
const pushSubscriptions = [];
let webpush = null;
let twilioClient = null;

function setSocketIO(io) { ioInstance = io; }
function emit(event, payload) {
  if (flags.NOTIFY_WEBSOCKET_ENABLED && ioInstance) ioInstance.emit(event, payload);
}

async function sendWebSocket(alert) {
  if (!flags.NOTIFY_WEBSOCKET_ENABLED) return { channel: 'websocket', skipped: true };
  if (!ioInstance) return { channel: 'websocket', skipped: true, reason: 'socket_not_attached' };
  ioInstance.emit('alert:new', alert);
  return { channel: 'websocket', sent: true };
}

function addPushSubscription(subscription) { pushSubscriptions.push(subscription); }
async function sendPush(alert) {
  if (!flags.NOTIFY_PUSH_ENABLED) return { channel: 'push', skipped: true };
  if (!flags.VAPID_PUBLIC_KEY || !flags.VAPID_PRIVATE_KEY) throw new Error('VAPID keys not configured');
  webpush ||= require('web-push');
  webpush.setVapidDetails(flags.VAPID_SUBJECT, flags.VAPID_PUBLIC_KEY, flags.VAPID_PRIVATE_KEY);
  const payload = JSON.stringify({ title: `ORCA ${alert.severity} Alert`, body: alert.message, region: alert.region, type: alert.type });
  const results = await Promise.allSettled(pushSubscriptions.map((sub) => webpush.sendNotification(sub, payload)));
  return { channel: 'push', sent: results.filter((r) => r.status === 'fulfilled').length, failed: results.filter((r) => r.status === 'rejected').length };
}

async function sendSms(alert) {
  if (!flags.NOTIFY_SMS_ENABLED) return { channel: 'sms', skipped: true };
  if (!flags.TWILIO_ACCOUNT_SID || !flags.TWILIO_AUTH_TOKEN || !flags.TWILIO_FROM_NUMBER) throw new Error('Twilio configuration missing');
  const recipients = flags.SMS_RECIPIENTS.split(',').map((x) => x.trim()).filter(Boolean);
  if (!recipients.length) return { channel: 'sms', sent: 0 };
  twilioClient ||= require('twilio')(flags.TWILIO_ACCOUNT_SID, flags.TWILIO_AUTH_TOKEN);
  const body = `ORCA ${alert.severity} ${alert.type}: ${alert.region}. ${alert.message}`.slice(0, 300);
  const results = await Promise.allSettled(recipients.map((to) => twilioClient.messages.create({ body, from: flags.TWILIO_FROM_NUMBER, to })));
  return { channel: 'sms', sent: results.filter((r) => r.status === 'fulfilled').length, failed: results.filter((r) => r.status === 'rejected').length };
}

async function notifyResolved(alert) {
  if (!flags.NOTIFY_WEBSOCKET_ENABLED || !ioInstance) return;
  ioInstance.emit('alert:resolved', alert);
}

async function dispatchNotification(alert) {
  const results = await Promise.allSettled([sendWebSocket(alert), sendPush(alert), sendSms(alert)]);
  return results.map((result, i) => result.status === 'fulfilled' ? result.value : { channel: ['websocket', 'push', 'sms'][i], error: result.reason.message });
}

function notifyResolved(alert) { emit('alert:resolved', alert); }

module.exports = { dispatchNotification, setSocketIO, addPushSubscription, notifyResolved };
