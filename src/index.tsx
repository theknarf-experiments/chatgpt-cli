#!/usr/bin/env -S yarn ts-node-esm
import dotenv from 'dotenv';
import { render } from 'ink';
import { Configuration, OpenAIApi } from "openai";
import { Command } from 'commander';
import App from './app.tsx';

dotenv.config();

const program = new Command();

program
	.command('chat')
	.description('REPL for chatting with ChatGPT from the terminal')
	.action(() => {
		const configuration = new Configuration({
			apiKey: process.env.OPENAI_API_KEY
		}) as any;

		const openai = new OpenAIApi(configuration) as any;

		render(<App openai={openai} />);
	});

program.parse();
