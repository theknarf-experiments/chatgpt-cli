import {useState } from 'react';
import { Box, Text, Newline } from 'ink';
import Markdown from './Markdown.tsx';
import { CompletionInput } from './CompletionInput.tsx';
import Spinner from 'ink-spinner';
import fs from "fs";
import { v4 as uuidv4 } from 'uuid';

interface Message {
	role: String;
	content: String;
}
type Messages = Message[];

const Loader = () => {
	return <Text>
		<Text color="green">
			<Spinner type="dots" />
		</Text>
		{' Bip bop'}
	</Text>;
}

const App = ({ openai, startingMessages }) => {
	const [messages, setMessages] = useState<Messages>(startingMessages || []);
	const [loading, setLoading] = useState<boolean>(false);
	const [info, setInfo] = useState<string>("");

	const chat = async (messages : Messages) => {
		const completion = await openai.chat.completions.create({
			model: "gpt-3.5-turbo",
			messages,
		});

		setMessages((messages: Messages) => ([
			...messages,
			completion.data.choices[0].message,
		]));
		setLoading(false);
	}

	const submit = (content : string) => {
		setMessages((messages : Messages) => {
			let newMessages = [
				...messages,
				{ role: 'user', content },
			];
			setLoading(true);
			chat(newMessages);
			return newMessages;
		});
	};

	const slashCommands = [
		/*{value: 'refFile', label: 'refFile'},
		{value: 'spawnAGI', label: 'spawnAGI'},
		{value: 'setupChain', label: 'setupChain'},*/
	  {value: 'save', label: 'save'},
		{value: 'Hi there! How are you doing?', label: 'example'},
		{value: 'Help me build my intuition about ', label: 'intuition'},
		{value: 'exit', label: 'exit'},
	];

	const onCommand = async (item, setValue) => {
		switch(item.value) {
			case 'save':
				const filename = `./${uuidv4()}.json`;
				await fs.promises.writeFile(filename, JSON.stringify(messages));
				setInfo(`Chat saved as '${filename}'`);
				setValue('');
				break;

			case 'exit':
				process.exit(0);
				break;

			default:
				setValue(item.value);
		}
	}

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
			{loading && <Box><Loader /></Box>}
			{info && <Text>{info}</Text>}
			<Box>
				<CompletionInput slashCommands={slashCommands} onSubmit={submit} onCommand={onCommand} />
			</Box>
		</Box>
	);
}

export default App;
