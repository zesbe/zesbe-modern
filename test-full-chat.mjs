import { loadConfig } from './dist/config/index.js';
import { MiniMaxProvider } from './dist/ai/minimax.js';
import { filterThinking, extractThinking, renderMarkdown } from './dist/utils/index.js';

async function testFullChat() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     ZESBE-MODERN - Full Chat Test (4 Questions)              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Load config
    const config = await loadConfig();
    console.log(`✅ Config: ${config.provider} / ${config.model}\n`);

    if (!config.apiKey) {
      console.log('❌ No API key set.');
      return;
    }

    const provider = new MiniMaxProvider(config.apiKey, config.baseUrl, config.model);

    // Test questions
    const questions = [
      'What is 2 + 2?',
      'Say hello in 3 different languages.',
      'What are the benefits of TypeScript?',
      'Write a simple hello world function in JavaScript.',
    ];

    let messages = [];
    let allPassed = true;

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`\n─────────────────────────────────────────────────────────────────`);
      console.log(`📝 Question ${i + 1}: ${question}`);
      console.log(`─────────────────────────────────────────────────────────────────`);

      messages.push({ role: 'user', content: question });

      const startTime = Date.now();
      let fullText = '';
      let chunkCount = 0;

      try {
        const stream = provider.chatStream({
          messages: messages,
          model: config.model,
          maxTokens: 500,
          temperature: 0.7,
        });

        for await (const chunk of stream) {
          chunkCount++;
          if (chunk.type === 'text' && chunk.content) {
            fullText += chunk.content;
            process.stdout.write('.');
          }
          if (chunk.type === 'error') {
            console.log('\n❌ Error chunk:', chunk.error);
            allPassed = false;
          }
        }

        const elapsed = Date.now() - startTime;
        console.log(''); // New line after dots

        // Filter thinking and get clean response
        const thinking = extractThinking(fullText);
        const filtered = filterThinking(fullText);

        if (thinking) {
          console.log(`\n💭 Thinking: ${thinking.slice(0, 100)}...`);
        }

        console.log(`\n🤖 Response (${(elapsed / 1000).toFixed(1)}s, ${chunkCount} chunks):`);
        console.log(`${filtered.trim()}`);

        // Add assistant response to history
        messages.push({ role: 'assistant', content: filtered });

        if (!filtered || filtered.trim().length === 0) {
          console.log('\n⚠️  Empty response!');
          allPassed = false;
        } else {
          console.log('\n✅ Response received successfully');
        }

      } catch (err) {
        console.log(`\n❌ Error: ${err.message}`);
        allPassed = false;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED - Chat functionality working correctly!');
    } else {
      console.log('⚠️  SOME TESTS FAILED - Check output above');
    }
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    console.error(error.stack);
  }
}

testFullChat();
