// Quick script to check if tokens are valid
import 'dotenv/config';

const botToken = process.env.SLACK_BOT_TOKEN;
const appToken = process.env.SLACK_APP_TOKEN;
const signingSecret = process.env.SLACK_SIGNING_SECRET;

console.log('\n🔍 Checking environment variables...\n');

// Check Bot Token
if (!botToken) {
  console.log('❌ SLACK_BOT_TOKEN: NOT SET');
} else if (!botToken.startsWith('xoxb-')) {
  console.log('❌ SLACK_BOT_TOKEN: Invalid format (should start with xoxb-)');
  console.log(`   Current: ${botToken.substring(0, 10)}...`);
} else {
  console.log('✅ SLACK_BOT_TOKEN: SET (format looks correct)');
}

// Check App Token
if (!appToken) {
  console.log('❌ SLACK_APP_TOKEN: NOT SET (required for Socket Mode)');
} else if (!appToken.startsWith('xapp-')) {
  console.log('❌ SLACK_APP_TOKEN: Invalid format (should start with xapp-)');
  console.log(`   Current: ${appToken.substring(0, 10)}...`);
} else {
  console.log('✅ SLACK_APP_TOKEN: SET (format looks correct)');
}

// Check Signing Secret
if (!signingSecret) {
  console.log('❌ SLACK_SIGNING_SECRET: NOT SET');
} else if (signingSecret.length < 20) {
  console.log('⚠️  SLACK_SIGNING_SECRET: Looks too short (might be invalid)');
} else {
  console.log('✅ SLACK_SIGNING_SECRET: SET');
}

console.log('\n💡 If tokens are set but you still get invalid_auth:');
console.log('   1. Make sure tokens are copied correctly (no extra spaces)');
console.log('   2. Regenerate tokens in Slack app settings');
console.log('   3. Make sure Socket Mode is enabled in your Slack app');
console.log('   4. Verify the app is installed to your workspace\n');

