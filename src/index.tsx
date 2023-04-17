#!/usr/bin/env -S yarn ts-node-esm
import { Configuration, OpenAIApi } from "openai";
import React, {useState, useEffect} from 'react';
import dotenv from 'dotenv';
import { render, Box, Text, Newline } from 'ink';
import TextInput from 'ink-text-input';
import { marked } from 'marked';
import TerminalRenderer, { TerminalRendererOptions } from 'marked-terminal';

type Props = TerminalRendererOptions & {
	  children: string;
};

const Markdown = ({ children, ...options }: Props) => {
	marked.setOptions({ renderer: new TerminalRenderer(options) });
	return <Text>{marked(children).trim()}</Text>;
}

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}) as any;

const openai = new OpenAIApi(configuration) as any;

interface Message {
	role: String;
	content: String;
}
type Messages = Message[];

const App = () => {
	const [messages, setMessages] = useState<Messages>([]);
	const [value, setValue] = useState('');

	const chat = async (messages : Messages) => {
		const completion = await openai.createChatCompletion({
			model: "gpt-3.5-turbo",
			messages,
		});

		setMessages((messages: Messages) => ([
			...messages,
			completion.data.choices[0].message,
		]));
	}

	const submit = (content : string) => {
		setMessages((messages : Messages) => {
			let newMessages = [
				...messages,
				{ role: 'user', content },
			];
			chat(newMessages);
			return newMessages;
		});
		setValue('');
	};

	return (
		<Box flexDirection="column">
			<Box width="100%">
				<Text>
				{
					(messages || []).map((message : Message, i) => (
						<Text key={`message-${i}`}>
							<Text>{message.role == 'user' ? '$ ' : ''}</Text><Markdown>{ message.content }</Markdown>
							<Newline />
							<Newline />
						</Text>
					))
				}
				</Text>
			</Box>
			<Box>
				<Text>{">"}</Text>
				<TextInput
					value={value}
					onChange={setValue}
					onSubmit={submit}
				/>
			</Box>
		</Box>
	);
}

render(<App />);
