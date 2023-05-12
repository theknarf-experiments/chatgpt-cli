#!/usr/bin/env -S yarn ts-node-esm
import dotenv from 'dotenv';
import { render } from 'ink';
import { Configuration, OpenAIApi } from 'openai';
import { Command } from 'commander';
import fs from 'fs';
import App from './app.tsx';

dotenv.config();

const program = new Command();

program
	.command('chat')
	.description('REPL for chatting with ChatGPT from the terminal')
	.argument('[file]', 'Load previous chat file')
	.action(async (file) => {
		const configuration = new Configuration({
			apiKey: process.env.OPENAI_API_KEY
		}) as any;

		const openai = new OpenAIApi(configuration) as any;

		 if (file) {
				await fs.promises.access(file, fs.constants.F_OK | fs.constants.R_OK);
				const data = await fs.promises.readFile(file);
				const json = JSON.parse(data.toString());

			render(<App openai={openai} startingMessages={json} />);
		} else {
			render(<App openai={openai} />);
		}
	});

program.parse();
