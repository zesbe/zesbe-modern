import { loadConfig } from './dist/config/index.js';
import { MiniMaxProvider } from './dist/ai/minimax.js';

async function testChat() {
  console.log('=== Testing zesbe-modern Chat ===\n');

  try {
    // Load config
    const config = await loadConfig();
    console.log('✅ Config loaded');
    console.log('   Provider:', config.provider);
    console.log('   Model:', config.model);
    console.log('');

    if (!config.apiKey) {
      console.log('❌ No API key set.');
      return;
    }

    // Create provider
    const provider = new MiniMaxProvider(config.apiKey, config.baseUrl, config.model);
    console.log('✅ Provider created\n');

    // Test 1: Simple chat - debug what's returned
    console.log('Test 1: Simple question...');
    const startTime1 = Date.now();
    const response1 = await provider.chat({
      messages: [{ role: 'user', content: 'Say "Hello" only.' }],
      model: config.model,
      maxTokens: 50,
      temperature: 0.1,
    });
    console.log('   Type:', typeof response1);
    console.log('   Response:', JSON.stringify(response1).slice(0, 200));
    console.log('   Time:', (Date.now() - startTime1) + 'ms');
    console.log('');

    // Test 2: Streaming
    console.log('Test 2: Streaming response...');
    const startTime2 = Date.now();
    let streamedText = '';
    let chunkCount = 0;
    const stream = provider.chatStream({
      messages: [{ role: 'user', content: 'Count 1 to 3.' }],
      model: config.model,
      maxTokens: 100,
      temperature: 0.1,
    });

    for await (const chunk of stream) {
      chunkCount++;
      if (chunk.type === 'text' && chunk.content) {
        streamedText += chunk.content;
      }
      if (chunk.type === 'error') {
        console.log('   Error chunk:', chunk.error);
      }
    }
    console.log('   Chunks received:', chunkCount);
    console.log('   Response:', streamedText.trim());
    console.log('   Time:', (Date.now() - startTime2) + 'ms');
    console.log('');

    console.log('=== Test complete ===');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testChat();
