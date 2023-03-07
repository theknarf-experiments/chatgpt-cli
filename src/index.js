#!/usr/bin/env node
const { Configuration, OpenAIApi } = require("openai");
const readline = require('node:readline');
const { stdin: input, stdout: output } = require('node:process');
require('dotenv').config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});

const openai = new OpenAIApi(configuration);
const rl = readline.createInterface({ input, output });

// REPL
let messages = [];

const question = () =>
	new Promise(resolve => {
		rl.question('> ', resolve);
	});

(async () => {
	while(true) {
		const content = await question();
		messages.push({ role: 'user', content });

		//console.log(messages);

		const completion = await openai.createChatCompletion({
			model: "gpt-3.5-turbo",
			messages,
		});

		const message = completion.data.choices[0].message;
		messages.push(message);
		console.log(message.content, "\n");
	}

	rl.close();
})();
