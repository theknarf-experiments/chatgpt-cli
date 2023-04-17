import React from 'react';
import { Text } from 'ink';
import { marked } from 'marked';
import TerminalRenderer, { TerminalRendererOptions } from 'marked-terminal';

type Props = TerminalRendererOptions & {
	  children: string;
};

const Markdown : React.FC<Props> = ({ children, ...options }) => {
	marked.setOptions({ renderer: new TerminalRenderer(options) });
	return <Text>{marked(children).trim()}</Text>;
}

export default Markdown;
